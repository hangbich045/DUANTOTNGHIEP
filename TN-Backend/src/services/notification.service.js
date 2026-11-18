'use strict';

/**
 * @file services/notification.service.js
 * @description Service tập trung quản lý thông báo in-app và email giao dịch (FR-07).
 * - Khi phát sinh thông báo trên hệ thống, tự động gửi email song song (non-blocking) qua Nodemailer SMTP.
 * - Chống gửi trùng email (deduplication theo userId/email + cửa sổ chống lặp 10s + khóa in-flight).
 * - Ghi nhận đầy đủ trạng thái gửi email (PENDING / SENT / FAILED / SKIPPED), thời gian, messageId, lỗi và hỗ trợ gửi lại (retry).
 */

const { Notification, User, BorrowRequest, Equipment } = require('../models');
const { sendNotificationEmail, getSmtpStatus, isSmtpConfigured } = require('../config/mailer');
const { Op } = require('sequelize');

// Khóa chống gửi trùng đồng thời theo notificationId
const inFlightEmailIds = new Set();
// Bộ nhớ đệm chống lặp thông báo giống hệt nhau trong cửa sổ 10 giây
const recentNotificationCache = new Map();
const DEDUP_WINDOW_MS = 10 * 1000;

function cleanupDedupCache(now = Date.now()) {
  if (recentNotificationCache.size > 500) {
    for (const [k, ts] of recentNotificationCache.entries()) {
      if (now - ts > DEDUP_WINDOW_MS) {
        recentNotificationCache.delete(k);
      }
    }
  }
}

function buildDedupKey(userId, type, title, message) {
  return `${String(userId)}|${String(type || 'SYSTEM')}|${String(title || '').trim()}|${String(message || '').trim()}`;
}

function isDuplicateRecent(userId, type, title, message) {
  const now = Date.now();
  cleanupDedupCache(now);
  const key = buildDedupKey(userId, type, title, message);
  const prev = recentNotificationCache.get(key);
  if (prev && now - prev < DEDUP_WINDOW_MS) {
    return true;
  }
  recentNotificationCache.set(key, now);
  return false;
}

function parseDetailRows(emailMetadata) {
  if (!emailMetadata) return [];
  try {
    const parsed = JSON.parse(emailMetadata);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Thực thi gửi email cho một bản ghi Notification đã lưu và cập nhật trạng thái vào DB.
 * Không bao giờ ném lỗi ra ngoài làm gián đoạn nghiệp vụ chính.
 *
 * @param {Object} notif - Instance Notification từ Sequelize
 * @param {Object} [options]
 * @param {string|null} [options.recipientEmail]
 * @param {string|null} [options.recipientName]
 * @param {Array} [options.detailRows]
 * @param {boolean} [options.forceResend=false]
 * @returns {Promise<{ status: string, messageId?: string, error?: string, skipped?: boolean }>}
 */
const deliverEmailForNotification = async (notif, options = {}) => {
  if (!notif || !notif.id) {
    return { status: 'SKIPPED', error: 'Bản ghi thông báo không hợp lệ' };
  }

  const { forceResend = false } = options;

  // Chống gửi trùng nếu email đã SENT thành công trước đó (trừ khi Admin chủ động bấm Gửi lại)
  if (!forceResend && notif.emailStatus === 'SENT') {
    return { status: 'SENT', skipped: true, messageId: notif.emailMessageId || null };
  }

  // Chống chạy trùng đồng thời trên cùng 1 notificationId
  if (inFlightEmailIds.has(notif.id)) {
    return { status: notif.emailStatus || 'PENDING', skipped: true };
  }

  inFlightEmailIds.add(notif.id);
  try {
    let recipientEmail = options.recipientEmail || notif.recipientEmail || null;
    let recipientName = options.recipientName || null;

    if (!recipientEmail || !recipientName) {
      const user = await User.findByPk(notif.userId, {
        attributes: ['id', 'fullName', 'email', 'status', 'isActive'],
      });
      if (!user || user.status === 'Disabled' || !user.isActive) {
        const reason = 'Tài khoản người nhận không tồn tại hoặc đã bị vô hiệu hóa';
        if (typeof notif.update === 'function') {
          await notif.update({ emailStatus: 'SKIPPED', emailError: reason }).catch(() => {});
        }
        return { status: 'SKIPPED', error: reason };
      }
      if (!recipientEmail) recipientEmail = user.email;
      if (!recipientName) recipientName = user.fullName;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      const reason = 'Người nhận chưa có địa chỉ email hợp lệ';
      if (typeof notif.update === 'function') {
        await notif.update({ emailStatus: 'SKIPPED', emailError: reason }).catch(() => {});
      }
      return { status: 'SKIPPED', error: reason };
    }

    if (!isSmtpConfigured()) {
      const reason = 'Chưa cấu hình SMTP_USER / SMTP_PASS trong .env';
      if (typeof notif.update === 'function') {
        await notif
          .update({
            recipientEmail,
            emailStatus: 'SKIPPED',
            emailError: reason,
          })
          .catch(() => {});
      }
      return { status: 'SKIPPED', error: reason };
    }

    const detailRows = Array.isArray(options.detailRows)
      ? options.detailRows
      : parseDetailRows(notif.emailMetadata);

    const res = await sendNotificationEmail(recipientEmail, {
      title: notif.title,
      message: notif.message,
      link: notif.link,
      type: notif.type,
      senderName: notif.senderName || 'Hệ thống LHU Media Studio',
      recipientName,
      occurredAt: notif.createdAt || new Date(),
      detailRows,
    });

    const nextRetryCount = (Number(notif.emailRetryCount) || 0) + 1;

    if (res.success) {
      if (typeof notif.update === 'function') {
        await notif
          .update({
            recipientEmail,
            emailStatus: 'SENT',
            emailSentAt: new Date(),
            emailMessageId: res.messageId || null,
            emailError: null,
            emailRetryCount: nextRetryCount,
          })
          .catch(() => {});
      }
      return { status: 'SENT', messageId: res.messageId || null };
    }

    const failStatus = res.reason === 'SMTP_NOT_CONFIGURED' || res.reason === 'INVALID_RECIPIENT' ? 'SKIPPED' : 'FAILED';
    const failError = res.error || res.reason || 'Lỗi gửi email không xác định';
    if (typeof notif.update === 'function') {
      await notif
        .update({
          recipientEmail,
          emailStatus: failStatus,
          emailError: failError,
          emailRetryCount: nextRetryCount,
        })
        .catch(() => {});
    }
    return { status: failStatus, error: failError };
  } catch (err) {
    const nextRetryCount = (Number(notif.emailRetryCount) || 0) + 1;
    if (typeof notif.update === 'function') {
      await notif
        .update({
          emailStatus: 'FAILED',
          emailError: err.message || 'Lỗi ngoại lệ khi gửi email',
          emailRetryCount: nextRetryCount,
        })
        .catch(() => {});
    }
    return { status: 'FAILED', error: err.message };
  } finally {
    inFlightEmailIds.delete(notif.id);
  }
};

/**
 * Tạo một thông báo in-app và tự động gửi email song song (mặc định sendEmail = true)
 *
 * @param {Object} params
 * @param {string} params.userId - ID người nhận thông báo
 * @param {string} params.title - Tiêu đề ngắn gọn
 * @param {string} params.message - Nội dung chi tiết
 * @param {string} [params.type='SYSTEM'] - Mã sự kiện
 * @param {string} [params.link=null] - Đường dẫn trang chi tiết trên website
 * @param {boolean} [params.sendEmail=true] - Có gửi email song song không (mặc định true)
 * @param {string} [params.senderName='Hệ thống LHU Media Studio'] - Tên người gửi / tác nhân phát sinh
 * @param {string} [params.userEmail=null] - Email người nhận nếu đã có sẵn
 * @param {string} [params.recipientName=null] - Tên người nhận nếu đã có sẵn
 * @param {Array<{label: string, value: string}>} [params.detailRows=[]] - Bảng thông tin liên quan
 * @param {boolean} [params.awaitEmail=false] - Đợi gửi email hoàn tất (phục vụ kiểm thử)
 * @param {boolean} [params.allowDuplicate=false] - Bỏ qua cửa sổ chống lặp 10s nếu cần
 * @returns {Promise<Notification|null>}
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = true,
  senderName = 'Hệ thống LHU Media Studio',
  userEmail = null,
  recipientName = null,
  detailRows = [],
  awaitEmail = false,
  allowDuplicate = false,
}) => {
  if (!userId || !title || !message) {
    throw new Error('userId, title và message là bắt buộc để tạo thông báo');
  }

  const cleanTitle = String(title).trim();
  const cleanMessage = String(message).trim();

  // Chống gửi trùng thông báo & email giống hệt nhau trong cửa sổ 10 giây
  if (!allowDuplicate && isDuplicateRecent(userId, type, cleanTitle, cleanMessage)) {
    return null;
  }

  let resolvedEmail = userEmail;
  let resolvedName = recipientName;
  if (!resolvedEmail || !resolvedName) {
    try {
      const u = await User.findByPk(userId, { attributes: ['id', 'fullName', 'email', 'status', 'isActive'] });
      if (u) {
        if (!resolvedEmail) resolvedEmail = u.email;
        if (!resolvedName) resolvedName = u.fullName;
      }
    } catch {
      // ignore lookup error so in-app notification is still created
    }
  }

  // 1. Tạo bản ghi in-app notification (luôn giữ nguyên chức năng thông báo trên website)
  const notif = await Notification.create({
    userId,
    title: cleanTitle,
    message: cleanMessage,
    type,
    link,
    isRead: false,
    senderName: senderName ? String(senderName).trim() : 'Hệ thống LHU Media Studio',
    recipientEmail: resolvedEmail || null,
    emailStatus: sendEmail ? 'PENDING' : 'SKIPPED',
    emailError: sendEmail ? null : 'Không bật gửi email cho thông báo này',
    emailRetryCount: 0,
    emailMetadata: Array.isArray(detailRows) && detailRows.length > 0 ? JSON.stringify(detailRows) : null,
  });

  // 2. Gửi email song song (non-blocking để không bao giờ làm gián đoạn nghiệp vụ chính)
  if (sendEmail) {
    const emailPromise = deliverEmailForNotification(notif, {
      recipientEmail: resolvedEmail,
      recipientName: resolvedName,
      detailRows,
    });
    if (awaitEmail) {
      await emailPromise;
    } else {
      emailPromise.catch((err) => {
        console.warn(`[createNotification] Lỗi gửi email tới user ${userId}:`, err.message);
      });
    }
  }

  return notif;
};

/**
 * Helper chung gửi thông báo + email đến một danh sách người dùng đã được lọc trùng userId và email
 */
const notifyUserList = async (
  users,
  {
    title,
    message,
    type = 'SYSTEM',
    link = null,
    sendEmail = true,
    senderName = 'Hệ thống LHU Media Studio',
    detailRows = [],
    excludeUserId = null,
    awaitEmail = false,
  }
) => {
  if (!Array.isArray(users) || users.length === 0) return 0;

  // Chống gửi nhầm / gửi trùng theo userId và theo địa chỉ email
  const seenUserIds = new Set();
  const seenEmails = new Set();
  const cleanTitle = String(title).trim();
  const cleanMessage = String(message).trim();
  const metadataJson = Array.isArray(detailRows) && detailRows.length > 0 ? JSON.stringify(detailRows) : null;

  const uniqueRecipients = [];
  for (const u of users) {
    if (!u || !u.id) continue;
    if (excludeUserId && String(u.id) === String(excludeUserId)) continue;
    if (seenUserIds.has(u.id)) continue;
    if (isDuplicateRecent(u.id, type, cleanTitle, cleanMessage)) continue;

    seenUserIds.add(u.id);
    const normEmail = u.email ? String(u.email).trim().toLowerCase() : null;
    const shouldEmailThisRecipient = Boolean(sendEmail && normEmail && !seenEmails.has(normEmail));
    if (shouldEmailThisRecipient) {
      seenEmails.add(normEmail);
    }

    uniqueRecipients.push({
      user: u,
      shouldEmail: shouldEmailThisRecipient,
      email: u.email || null,
    });
  }

  if (uniqueRecipients.length === 0) return 0;

  const createdNotifs = await Promise.all(
    uniqueRecipients.map((item) =>
      Notification.create({
        userId: item.user.id,
        title: cleanTitle,
        message: cleanMessage,
        type,
        link,
        isRead: false,
        senderName: senderName ? String(senderName).trim() : 'Hệ thống LHU Media Studio',
        recipientEmail: item.email,
        emailStatus: item.shouldEmail ? 'PENDING' : 'SKIPPED',
        emailError: item.shouldEmail ? null : (sendEmail ? 'Trùng địa chỉ email trong cùng đợt gửi hoặc thiếu email' : 'Tắt gửi email'),
        emailRetryCount: 0,
        emailMetadata: metadataJson,
      })
    )
  );

  // Gửi email song song (non-blocking)
  const dispatchAll = async () => {
    for (let i = 0; i < createdNotifs.length; i++) {
      const item = uniqueRecipients[i];
      if (!item.shouldEmail) continue;
      await deliverEmailForNotification(createdNotifs[i], {
        recipientEmail: item.email,
        recipientName: item.user.fullName || null,
        detailRows,
      });
    }
  };

  if (awaitEmail) {
    await dispatchAll();
  } else {
    dispatchAll().catch((err) => {
      console.warn('[notifyUserList] Lỗi khi gửi loạt email thông báo:', err.message);
    });
  }

  return createdNotifs.length;
};

/**
 * Gửi thông báo + email đến toàn bộ Quản trị viên (ADMIN) đang hoạt động
 */
const notifyAdmins = async ({
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = true,
  senderName = 'Hệ thống LHU Media Studio',
  detailRows = [],
  excludeUserId = null,
  awaitEmail = false,
}) => {
  try {
    const admins = await User.findAll({
      where: {
        role: 'ADMIN',
        status: { [Op.notIn]: ['Disabled', 'Locked'] },
        isActive: true,
      },
      attributes: ['id', 'fullName', 'email'],
    });

    return await notifyUserList(admins, {
      title,
      message,
      type,
      link,
      sendEmail,
      senderName,
      detailRows,
      excludeUserId,
      awaitEmail,
    });
  } catch (err) {
    console.warn('[notifyAdmins] Lỗi tạo thông báo cho Admin:', err.message);
    return 0;
  }
};

/**
 * Gửi thông báo + email đến toàn bộ CTV (COLLABORATOR) đang hoạt động
 */
const notifyCollaborators = async ({
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = true,
  senderName = 'Hệ thống LHU Media Studio',
  detailRows = [],
  excludeUserId = null,
  awaitEmail = false,
}) => {
  try {
    const collabs = await User.findAll({
      where: {
        role: 'COLLABORATOR',
        status: { [Op.notIn]: ['Disabled', 'Locked'] },
        isActive: true,
      },
      attributes: ['id', 'fullName', 'email'],
    });

    return await notifyUserList(collabs, {
      title,
      message,
      type,
      link,
      sendEmail,
      senderName,
      detailRows,
      excludeUserId,
      awaitEmail,
    });
  } catch (err) {
    console.warn('[notifyCollaborators] Lỗi tạo thông báo cho CTV:', err.message);
    return 0;
  }
};

/**
 * Kiểm tra các đơn mượn thiết bị đã quá hạn (returnDate < NOW) và gửi thông báo + email nhắc nợ
 * Tự động chuyển đơn sang trạng thái OVERDUE nếu đang ở trạng thái HANDED_OVER.
 */
const checkAndNotifyOverdueBorrowRequests = async () => {
  try {
    const now = new Date();

    const overdueRequests = await BorrowRequest.findAll({
      where: {
        status: 'HANDED_OVER',
        returnDate: {
          [Op.lt]: now,
        },
      },
      include: [
        { model: User, as: 'requester', attributes: ['id', 'fullName', 'email'] },
        { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'code'] },
      ],
    });

    let updatedCount = 0;
    let notifiedCount = 0;

    for (const req of overdueRequests) {
      await req.update({ status: 'OVERDUE' });
      updatedCount++;

      // Gửi thông báo + email cảnh báo cho người mượn
      if (req.requester) {
        await createNotification({
          userId: req.requester.id,
          userEmail: req.requester.email,
          recipientName: req.requester.fullName,
          senderName: 'Hệ thống nhắc hạn LHU Media Studio',
          title: '⚠️ CẢNH BÁO: Thiết bị mượn đã quá hạn hoàn trả',
          message: `Đơn mượn thiết bị "${req.equipment?.name || 'Thiết bị'}" (Mã: ${req.equipment?.code || '—'}) của bạn đã quá hạn trả từ ngày ${new Date(req.returnDate).toLocaleDateString('vi-VN')}. Vui lòng mang thiết bị đến Studio để hoàn tất thủ tục trả máy ngay.`,
          type: 'BORROW_OVERDUE',
          link: '/history',
          sendEmail: true,
          detailRows: [
            { label: 'Thiết bị', value: `${req.equipment?.name || ''} (${req.equipment?.code || ''})` },
            { label: 'Số lượng', value: `${req.quantity} cái` },
            { label: 'Hạn trả ban đầu', value: new Date(req.returnDate).toLocaleDateString('vi-VN') },
            { label: 'Trạng thái', value: 'Quá hạn hoàn trả' },
          ],
        });
        notifiedCount++;
      }

      // Gửi thông báo + email cho Admin biết để xử lý
      await notifyAdmins({
        senderName: 'Hệ thống nhắc hạn LHU Media Studio',
        title: `⚠️ Thiết bị quá hạn: ${req.requester?.fullName || 'Người mượn'} chưa trả máy`,
        message: `Đơn mượn của ${req.requester?.fullName || 'Người mượn'} (${req.requester?.email || ''}) đối với "${req.equipment?.name}" đã quá hạn từ ngày ${new Date(req.returnDate).toLocaleDateString('vi-VN')}.`,
        type: 'BORROW_OVERDUE',
        link: '/admin/requests',
        sendEmail: true,
        detailRows: [
          { label: 'Người mượn', value: `${req.requester?.fullName || '—'} (${req.requester?.email || '—'})` },
          { label: 'Thiết bị', value: `${req.equipment?.name || ''} (${req.equipment?.code || ''})` },
          { label: 'Hạn trả', value: new Date(req.returnDate).toLocaleDateString('vi-VN') },
        ],
      });
    }

    return { updatedCount, notifiedCount };
  } catch (err) {
    console.error('[checkAndNotifyOverdueBorrowRequests] Lỗi kiểm tra nợ quá hạn:', err);
    return { updatedCount: 0, notifiedCount: 0, error: err.message };
  }
};

/**
 * Helper dùng chung đếm thống kê trạng thái gửi email thông báo (DRY)
 */
const getEmailDeliveryStats = async () => {
  const [sent, failed, pending, skipped] = await Promise.all([
    Notification.count({ where: { emailStatus: 'SENT' } }),
    Notification.count({ where: { emailStatus: 'FAILED' } }),
    Notification.count({ where: { emailStatus: 'PENDING' } }),
    Notification.count({ where: { emailStatus: 'SKIPPED' } }),
  ]);

  return {
    total: sent + failed + pending + skipped,
    sent,
    failed,
    pending,
    skipped,
  };
};

/**
 * [ADMIN] Tra cứu lịch sử & trạng thái gửi email thông báo toàn hệ thống
 */
const getEmailDeliveryLogs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};
  if (query.emailStatus && query.emailStatus !== 'ALL') {
    where.emailStatus = query.emailStatus;
  }
  if (query.type && query.type !== 'ALL') {
    where.type = query.type;
  }
  if (query.search && String(query.search).trim()) {
    const kw = `%${String(query.search).trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: kw } },
      { message: { [Op.like]: kw } },
      { recipientEmail: { [Op.like]: kw } },
      { senderName: { [Op.like]: kw } },
    ];
  }

  const [{ count, rows }, stats] = await Promise.all([
    Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'role'],
        },
      ],
    }),
    getEmailDeliveryStats(),
  ]);

  return {
    items: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
    stats,
  };
};

/**
 * [ADMIN] Gửi lại email cho một thông báo cụ thể (hỗ trợ retry khi FAILED/PENDING/SKIPPED hoặc theo yêu cầu)
 */
const resendNotificationEmail = async (notificationId) => {
  const notif = await Notification.findByPk(notificationId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'status', 'isActive'],
      },
    ],
  });

  if (!notif) {
    const err = new Error('Không tìm thấy bản ghi thông báo');
    err.statusCode = 404;
    throw err;
  }

  const delivery = await deliverEmailForNotification(notif, {
    recipientEmail: notif.recipientEmail || notif.user?.email || null,
    recipientName: notif.user?.fullName || null,
    forceResend: true,
  });

  await notif.reload();
  return { notification: notif, delivery };
};

/**
 * [ADMIN] Gửi lại hàng loạt các email thông báo đang bị lỗi (FAILED)
 */
const resendFailedEmails = async (limit = 50) => {
  const maxBatch = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const failedNotifs = await Notification.findAll({
    where: { emailStatus: 'FAILED' },
    limit: maxBatch,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'status', 'isActive'],
      },
    ],
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notif of failedNotifs) {
    const res = await deliverEmailForNotification(notif, {
      recipientEmail: notif.recipientEmail || notif.user?.email || null,
      recipientName: notif.user?.fullName || null,
      forceResend: true,
    });
    if (res.status === 'SENT') sent++;
    else if (res.status === 'FAILED') failed++;
    else skipped++;
  }

  return {
    attempted: failedNotifs.length,
    sent,
    failed,
    skipped,
  };
};

/**
 * [ADMIN] Kiểm tra trạng thái cấu hình & kết nối SMTP + thống kê gửi email
 */
const getEmailSystemStatus = async () => {
  const [smtp, stats] = await Promise.all([getSmtpStatus(), getEmailDeliveryStats()]);

  return { smtp, stats };
};

module.exports = {
  createNotification,
  notifyAdmins,
  notifyCollaborators,
  notifyUserList,
  deliverEmailForNotification,
  checkAndNotifyOverdueBorrowRequests,
  getEmailDeliveryLogs,
  resendNotificationEmail,
  resendFailedEmails,
  getEmailSystemStatus,
  _clearDedupCacheForTest: () => {
    recentNotificationCache.clear();
    inFlightEmailIds.clear();
  },
};
