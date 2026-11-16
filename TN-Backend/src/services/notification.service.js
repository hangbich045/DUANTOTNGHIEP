'use strict';

/**
 * @file services/notification.service.js
 * @description Service tập trung quản lý thông báo in-app và email giao dịch (FR-07).
 * Tuân thủ Quy tắc nghiệp vụ Mục 10 (LHU Media Studio).
 */

const { Notification, User, BorrowRequest, Equipment } = require('../models');
const { sendNotificationEmail } = require('../config/mailer');
const { Op } = require('sequelize');

/**
 * Tạo một thông báo in-app và tùy chọn gửi email giao dịch kèm theo
 *
 * @param {Object} params
 * @param {string} params.userId - ID người nhận thông báo
 * @param {string} params.title - Tiêu đề ngắn gọn
 * @param {string} params.message - Nội dung chi tiết
 * @param {string} [params.type='SYSTEM'] - Mã sự kiện (TASK_ASSIGNED, BORROW_REQUEST_APPROVED...)
 * @param {string} [params.link=null] - Đường dẫn xem chi tiết trên giao diện (/tasks, /profile...)
 * @param {boolean} [params.sendEmail=false] - Có gửi kèm email giao dịch không
 * @param {string} [params.userEmail=null] - Email người nhận (nếu đã có sẵn, tránh query lại User)
 * @param {Array<{label: string, value: string}>} [params.detailRows=[]] - Các dòng chi tiết đính kèm email
 * @returns {Promise<Notification>}
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = false,
  userEmail = null,
  detailRows = [],
}) => {
  if (!userId || !title || !message) {
    throw new Error('userId, title và message là bắt buộc để tạo thông báo');
  }

  // 1. Tạo bản ghi in-app notification
  const notif = await Notification.create({
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    link,
    isRead: false,
  });

  // 2. Gửi email giao dịch bất đồng bộ nếu được yêu cầu (non-blocking, không chặn transaction nghiệp vụ)
  if (sendEmail) {
    (async () => {
      try {
        let recipientEmail = userEmail;
        if (!recipientEmail) {
          const user = await User.findByPk(userId, { attributes: ['id', 'email', 'status', 'isActive'] });
          if (user && user.email && user.status !== 'Disabled') {
            recipientEmail = user.email;
          }
        }

        if (recipientEmail && recipientEmail.includes('@')) {
          await sendNotificationEmail(recipientEmail, {
            title,
            message,
            link,
            type,
            detailRows,
          });
        }
      } catch (err) {
        console.warn(`[createNotification] Không thể gửi email giao dịch tới user ${userId}:`, err.message);
      }
    })();
  }

  return notif;
};

/**
 * Gửi thông báo đến toàn bộ Quản trị viên (ADMIN) đang hoạt động
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type='SYSTEM']
 * @param {string} [params.link=null]
 * @param {boolean} [params.sendEmail=false]
 * @param {Array<{label: string, value: string}>} [params.detailRows=[]]
 * @returns {Promise<number>} Số lượng thông báo đã tạo
 */
const notifyAdmins = async ({
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = false,
  detailRows = [],
}) => {
  try {
    const admins = await User.findAll({
      where: {
        role: 'ADMIN',
        status: { [Op.ne]: 'Disabled' },
        isActive: true,
      },
      attributes: ['id', 'email'],
    });

    if (!admins || admins.length === 0) return 0;

    const notifs = admins.map((adm) => ({
      userId: adm.id,
      title: title.trim(),
      message: message.trim(),
      type,
      link,
      isRead: false,
    }));

    await Notification.bulkCreate(notifs);

    if (sendEmail) {
      for (const adm of admins) {
        if (adm.email) {
          sendNotificationEmail(adm.email, { title, message, link, type, detailRows }).catch(() => {});
        }
      }
    }

    return notifs.length;
  } catch (err) {
    console.warn('[notifyAdmins] Lỗi tạo thông báo cho Admin:', err.message);
    return 0;
  }
};

/**
 * Gửi thông báo đến toàn bộ CTV (COLLABORATOR) đang hoạt động
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type='SYSTEM']
 * @param {string} [params.link=null]
 * @param {boolean} [params.sendEmail=false]
 * @param {Array<{label: string, value: string}>} [params.detailRows=[]]
 * @returns {Promise<number>}
 */
const notifyCollaborators = async ({
  title,
  message,
  type = 'SYSTEM',
  link = null,
  sendEmail = false,
  detailRows = [],
}) => {
  try {
    const collabs = await User.findAll({
      where: {
        role: 'COLLABORATOR',
        status: { [Op.ne]: 'Disabled' },
        isActive: true,
      },
      attributes: ['id', 'email'],
    });

    if (!collabs || collabs.length === 0) return 0;

    const notifs = collabs.map((c) => ({
      userId: c.id,
      title: title.trim(),
      message: message.trim(),
      type,
      link,
      isRead: false,
    }));

    await Notification.bulkCreate(notifs);

    if (sendEmail) {
      for (const c of collabs) {
        if (c.email) {
          sendNotificationEmail(c.email, { title, message, link, type, detailRows }).catch(() => {});
        }
      }
    }

    return notifs.length;
  } catch (err) {
    console.warn('[notifyCollaborators] Lỗi tạo thông báo cho CTV:', err.message);
    return 0;
  }
};

/**
 * Kiểm tra các đơn mượn thiết bị đã quá hạn (returnDate < NOW) và gửi thông báo nhắc nợ
 * Tự động chuyển đơn sang trạng thái OVERDUE nếu đang ở trạng thái HANDED_OVER.
 *
 * @returns {Promise<{ updatedCount: number, notifiedCount: number }>}
 */
const checkAndNotifyOverdueBorrowRequests = async () => {
  try {
    const now = new Date();

    // 1. Tìm các đơn HANDED_OVER đã vượt quá hạn trả
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
      // Cập nhật trạng thái đơn sang OVERDUE
      await req.update({ status: 'OVERDUE' });
      updatedCount++;

      // Gửi thông báo cảnh báo cho người mượn
      if (req.requester) {
        await createNotification({
          userId: req.requester.id,
          userEmail: req.requester.email,
          title: '⚠️ CẢNH BÁO: Thiết bị mượn đã quá hạn hoàn trả',
          message: `Đơn mượn thiết bị "${req.equipment?.name || 'Thiết bị'}" (Mã: ${req.equipment?.code || '—'}) của bạn đã quá hạn trả từ ngày ${new Date(req.returnDate).toLocaleDateString('vi-VN')}. Vui lòng mang thiết bị đến Studio để hoàn tất thủ tục trả máy ngay.`,
          type: 'BORROW_OVERDUE',
          link: '/profile',
          sendEmail: true,
          detailRows: [
            { label: 'Thiết bị', value: `${req.equipment?.name || ''} (${req.equipment?.code || ''})` },
            { label: 'Số lượng', value: `${req.quantity} cái` },
            { label: 'Hạn trả ban đầu', value: new Date(req.returnDate).toLocaleDateString('vi-VN') },
            { label: 'Trạng thái', value: 'QUÁ HẠN (OVERDUE)' },
          ],
        });
        notifiedCount++;
      }

      // Gửi thông báo cho Admin biết để xử lý
      await notifyAdmins({
        title: `⚠️ Thiết bị quá hạn: ${req.requester?.fullName || 'Người mượn'} chưa trả máy`,
        message: `Đơn mượn của ${req.requester?.fullName || 'Người mượn'} (${req.requester?.email || ''}) đối với "${req.equipment?.name}" đã quá hạn từ ngày ${new Date(req.returnDate).toLocaleDateString('vi-VN')}.`,
        type: 'BORROW_OVERDUE',
        link: '/admin/requests',
        sendEmail: false,
      });
    }

    return { updatedCount, notifiedCount };
  } catch (err) {
    console.error('[checkAndNotifyOverdueBorrowRequests] Lỗi kiểm tra nợ quá hạn:', err);
    return { updatedCount: 0, notifiedCount: 0, error: err.message };
  }
};

module.exports = {
  createNotification,
  notifyAdmins,
  notifyCollaborators,
  checkAndNotifyOverdueBorrowRequests,
};

