'use strict';

/**
 * @file services/studioBooking.service.js
 * @description Service xử lý Business Logic cho Đặt phòng Studio.
 */

const { Op } = require('sequelize');
const { StudioBooking, User } = require('../models');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');

// Khoảng đệm tối thiểu giữa 2 ca đặt phòng Studio: 30 phút
const BUFFER_MS = 30 * 60 * 1000;

/**
 * Trích xuất thông tin ngày giờ theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string} dateInput
 */
const getVietnamTimeInfo = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const error = new Error('Định dạng thời gian không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }
  // Offset cố định sang giờ Việt Nam UTC+7
  const vnDate = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60 * 1000);
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  const dayOfWeek = vnDate.getDay(); // 0 = Chủ nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
  const hours = vnDate.getHours();
  const minutes = vnDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  return {
    dayOfWeek,
    hours,
    minutes,
    totalMinutes,
    dateString: `${year}-${month}-${day}`,
  };
};

/**
 * Định dạng hiển thị giờ Việt Nam: HH:mm dd/MM/yyyy
 */
const formatVNTime = (dateInput) => {
  const d = new Date(dateInput);
  const vnDate = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60 * 1000);
  const hours = String(vnDate.getHours()).padStart(2, '0');
  const minutes = String(vnDate.getMinutes()).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const year = vnDate.getFullYear();
  return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
};

/**
 * Ràng buộc khung giờ hoạt động Studio (Quy tắc nghiệp vụ Mục 4.1 & 4.2):
 * - Thứ Hai đến Thứ Bảy
 * - Ca sáng: 07:30 - 11:30 (450 phút - 690 phút)
 * - Ca chiều: 13:30 - 16:30 (810 phút - 990 phút)
 * - Chủ nhật: Studio đóng cửa
 * - Bắt đầu và kết thúc trong cùng 1 ca làm việc của ngày
 *
 * ĐẶC BIỆT: Riêng tài khoản ADMIN được phép tạo đặt phòng ngoài khung giờ quy định
 * (sáng sớm, tối, Chủ nhật, sự kiện cấp trường) và không bị giới hạn bởi quy tắc giờ hành chính.
 *
 * @param {Date|string} startTime
 * @param {Date|string} endTime
 * @param {string|null} role - Vai trò tài khoản ('ADMIN' | 'USER' | 'COLLABORATOR')
 */
const validateOperatingHours = (startTime, endTime, role = null) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error('Thời gian bắt đầu hoặc kết thúc không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  if (end.getTime() <= start.getTime()) {
    const error = new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
    error.statusCode = 400;
    throw error;
  }

  const startInfo = getVietnamTimeInfo(start);
  const endInfo = getVietnamTimeInfo(end);

  if (startInfo.dateString !== endInfo.dateString) {
    const error = new Error('Lịch đặt Studio phải bắt đầu và kết thúc trong cùng một ngày.');
    error.statusCode = 400;
    throw error;
  }

  // Riêng tài khoản ADMIN: Được phép tạo đặt phòng ngoài khung giờ quy định
  if (role === 'ADMIN') {
    return true;
  }

  // Đối với USER / CTV thường: Không cho đặt vào Chủ nhật
  if (startInfo.dayOfWeek === 0) {
    const error = new Error('Phòng Studio không hoạt động vào Chủ nhật. Vui lòng chọn lịch từ Thứ Hai đến Thứ Bảy.');
    error.statusCode = 400;
    throw error;
  }

  // Đối với USER / CTV thường: Bắt buộc trong ca sáng 07:30–11:30 hoặc ca chiều 13:30–16:30
  const isMorning = startInfo.totalMinutes >= 450 && endInfo.totalMinutes <= 690;
  const isAfternoon = startInfo.totalMinutes >= 810 && endInfo.totalMinutes <= 990;

  if (!isMorning && !isAfternoon) {
    const error = new Error(
      'Thời gian đặt phòng không nằm trong khung giờ hoạt động (Sáng: 07:30–11:30, Chiều: 13:30–16:30 từ Thứ Hai đến Thứ Bảy). Không cho phép đặt xuyên trưa hoặc ngoài giờ.'
    );
    error.statusCode = 400;
    throw error;
  }

  return true;
};

/**
 * Kiểm tra xung đột lịch Studio và khoảng đệm 30 phút (Buffer check):
 * Hai khoảng [startA, endA] và [startB, endB] vi phạm khi:
 * (startB < endA + 30m) && (endB > startA - 30m)
 */
const checkStudioConflict = async (studioName, startTime, endTime, excludeBookingId = null) => {
  const bufferedStart = new Date(new Date(startTime).getTime() - BUFFER_MS);
  const bufferedEnd = new Date(new Date(endTime).getTime() + BUFFER_MS);

  const where = {
    studioName,
    status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] },
    startTime: { [Op.lt]: bufferedEnd },
    endTime: { [Op.gt]: bufferedStart },
  };

  if (excludeBookingId) {
    where.id = { [Op.ne]: excludeBookingId };
  }

  return await StudioBooking.findOne({
    where,
    order: [['start_time', 'ASC']],
  });
};

/**
 * Lấy danh sách booking với Tìm kiếm, Lọc, Phân trang
 * @param {Object} query - { page, limit, status, studioName, startDate, endDate }
 * @param {Object} currentUser - { id, role }
 */
const findAll = async (query, currentUser) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  const where = {};

  // RBAC: USER & COLLABORATOR chỉ xem booking của mình, ADMIN xem được tất cả
  // Riêng chế độ calendar=true: Cho phép xem toàn bộ lịch CONFIRMED/COMPLETED/PENDING để hiển thị chính xác các khung giờ đã có lịch
  if (currentUser.role !== 'ADMIN') {
    if (query.calendar === 'true') {
      where[Op.or] = [
        { status: { [Op.in]: ['CONFIRMED', 'COMPLETED', 'PENDING'] } },
        { userId: currentUser.id },
      ];
    } else {
      where.userId = currentUser.id;
    }
  }

  // Lọc theo trạng thái
  if (query.status) {
    where.status = query.status;
  }

  // Lọc theo tên phòng
  if (query.studioName) {
    where.studioName = { [Op.like]: `%${query.studioName}%` };
  }

  // Lọc theo khoảng thời gian
  if (query.startDate && query.endDate) {
    where.startTime = {
      [Op.between]: [new Date(query.startDate), new Date(query.endDate)],
    };
  }

  // Nếu calendar=true và không truyền limit cụ thể -> Không phân trang để hiển thị trọn vẹn sự kiện trên lịch
  const isCalendar = query.calendar === 'true';
  const findOptions = {
    where,
    order: [['start_time', 'ASC']],
    include: [
      {
        model: User,
        as: 'booker',
        attributes: ['id', 'fullName', 'email', 'employeeCode'],
      },
    ],
  };

  if (!isCalendar) {
    findOptions.limit = limit;
    findOptions.offset = offset;
  }

  const { count, rows } = await StudioBooking.findAndCountAll(findOptions);

  return {
    items: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Tạo booking mới (kiểm tra khung giờ hoạt động, trùng lịch và khoảng đệm 30 phút)
 * @param {Object} data
 * @param {string} userId
 * @param {Object} currentUser - { id, role }
 */
const create = async (data, userId, currentUser = null) => {
  // Map FE fields sang model fields
  const studioName = data.studioName || 'Studio LHU';
  const attendees = data.participants || data.attendees || 1;
  const fullName = data.fullName || null;
  const role = currentUser?.role || null;
  const isForce = Boolean(data.force) && role === 'ADMIN';

  // 1. Ràng buộc khung giờ hoạt động Studio (USER tuân thủ nghiêm ngặt, ADMIN được phép ngoài giờ)
  validateOperatingHours(data.startTime, data.endTime, role);

  // 2. Kiểm tra trùng lịch và khoảng đệm 30 phút với các lịch đã xác nhận (FR-03.3 & Quy tắc Mục 4.3, 4.5)
  // Cả ADMIN và USER đều phải kiểm tra xung đột với các lịch đã xác nhận
  const conflict = await checkStudioConflict(studioName, data.startTime, data.endTime);
  if (conflict && !isForce) {
    const error = new Error(
      `Phòng "${studioName}" đã có lịch được xác nhận hoặc vi phạm khoảng đệm 30 phút giữa 2 ca đặt (từ ${formatVNTime(conflict.startTime)} đến ${formatVNTime(conflict.endTime)}). Vui lòng chọn thời gian khác.`
    );
    error.statusCode = 409;
    throw error;
  }

  const booking = await StudioBooking.create({
    studioName,
    fullName,
    purpose: data.purpose,
    startTime: data.startTime,
    endTime: data.endTime,
    attendees,
    notes: data.notes || null,
    userId,
    status: 'PENDING',
  });

  // Gửi thông báo in-app cho Admin biết có yêu cầu đặt phòng Studio mới (FR-07)
  notificationService
    .notifyAdmins({
      title: '📅 Yêu cầu đặt phòng Studio mới',
      message: `Có yêu cầu đặt phòng "${studioName}" cho mục đích "${data.purpose}" (${attendees} người). Khung giờ: ${new Date(data.startTime).toLocaleString('vi-VN')} - ${new Date(data.endTime).toLocaleTimeString('vi-VN')}.`,
      type: 'STUDIO_BOOKING_REQUEST',
      link: '/admin/bookings',
      sendEmail: false,
      detailRows: [
        { label: 'Phòng Studio', value: studioName },
        { label: 'Mục đích', value: data.purpose },
        { label: 'Số người', value: `${attendees} người` },
        { label: 'Thời gian', value: `${new Date(data.startTime).toLocaleString('vi-VN')} – ${new Date(data.endTime).toLocaleTimeString('vi-VN')}` },
      ],
    })
    .catch(() => {});

  return StudioBooking.findByPk(booking.id, {
    include: [{ model: User, as: 'booker', attributes: ['id', 'fullName', 'email'] }],
  });
};

/**
 * [ADMIN] Xác nhận hoặc huỷ booking (kiểm tra lại xung đột lúc duyệt theo FR-03.5 & Quy tắc Mục 4.8)
 * @param {string} bookingId
 * @param {string} action - 'confirm' | 'cancel'
 * @param {string} [cancelReason]
 * @param {Object} [options] - { force?: boolean, adminNote?: string }
 */
const processBooking = async (bookingId, action, cancelReason = null, options = {}) => {
  const booking = await StudioBooking.findByPk(bookingId);

  if (!booking) {
    const error = new Error('Booking không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'PENDING') {
    const error = new Error(`Booking đã ở trạng thái "${booking.status}", không thể xử lý lại.`);
    error.statusCode = 400;
    throw error;
  }

  if (action === 'confirm') {
    // Backend kiểm tra xung đột lại tại thời điểm duyệt để tránh xác nhận trùng lịch
    const conflict = await checkStudioConflict(
      booking.studioName,
      booking.startTime,
      booking.endTime,
      booking.id
    );

    if (conflict && !options.force) {
      return {
        status: 'warning',
        message: `Phòng "${booking.studioName}" đã có lịch khác được xác nhận trong cùng khung giờ hoặc vi phạm khoảng đệm 30 phút (từ ${formatVNTime(conflict.startTime)} đến ${formatVNTime(conflict.endTime)}). Bạn có chắc chắn muốn duyệt đè lịch (hoạt động ưu tiên cấp trường)?`,
        conflictBookingId: conflict.id,
      };
    }

    const updatedNotes = options.adminNote
      ? (booking.notes ? `${booking.notes}\n[Ghi chú duyệt]: ${options.adminNote}` : options.adminNote)
      : booking.notes;

    await booking.update({ status: 'CONFIRMED', notes: updatedNotes });

    // Gửi thông báo in-app và email xác nhận duyệt đặt phòng cho người dùng (FR-07)
    notificationService
      .createNotification({
        userId: booking.userId,
        title: '✅ Lịch đặt phòng Studio đã được xác nhận',
        message: `Lịch đặt phòng "${booking.studioName}" cho mục đích "${booking.purpose}" của bạn đã được Quản trị viên duyệt xác nhận thành công.`,
        type: 'STUDIO_BOOKING_APPROVED',
        link: '/profile',
        sendEmail: true,
        detailRows: [
          { label: 'Phòng Studio', value: booking.studioName },
          { label: 'Mục đích', value: booking.purpose },
          { label: 'Thời gian', value: `${new Date(booking.startTime).toLocaleString('vi-VN')} – ${new Date(booking.endTime).toLocaleTimeString('vi-VN')}` },
          { label: 'Trạng thái', value: 'ĐÃ XÁC NHẬN (CONFIRMED)' },
        ],
      })
      .catch(() => {});
  } else if (action === 'cancel') {
    await booking.update({ status: 'CANCELLED', cancelReason });

    // Gửi thông báo in-app và email từ chối đặt phòng cho người dùng (FR-07)
    notificationService
      .createNotification({
        userId: booking.userId,
        title: '❌ Lịch đặt phòng Studio không được duyệt',
        message: `Lịch đặt phòng "${booking.studioName}" của bạn đã bị từ chối/hủy bỏ.${cancelReason ? ` Lý do: ${cancelReason}` : ''}`,
        type: 'STUDIO_BOOKING_REJECTED',
        link: '/profile',
        sendEmail: true,
        detailRows: [
          { label: 'Phòng Studio', value: booking.studioName },
          { label: 'Lý do từ chối', value: cancelReason || 'Không có lý do chi tiết' },
          { label: 'Trạng thái', value: 'ĐÃ HỦY (CANCELLED)' },
        ],
      })
      .catch(() => {});
  } else {
    const error = new Error('Action không hợp lệ. Chỉ chấp nhận "confirm" hoặc "cancel".');
    error.statusCode = 400;
    throw error;
  }

  return booking;
};

/**
 * Người dùng tự huỷ booking của mình
 * @param {string} bookingId
 * @param {string} userId
 */
const cancelByUser = async (bookingId, userId) => {
  const booking = await StudioBooking.findByPk(bookingId);

  if (!booking) {
    const error = new Error('Booking không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  if (booking.userId !== userId) {
    const error = new Error('Bạn không có quyền huỷ booking này.');
    error.statusCode = 403;
    throw error;
  }

  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    const error = new Error('Không thể huỷ booking đã hoàn thành hoặc đã huỷ.');
    error.statusCode = 400;
    throw error;
  }

  await booking.update({ status: 'CANCELLED', cancelReason: 'Người dùng tự huỷ' });
  return booking;
};

/**
 * [FR-03.6] Dời lịch / Chỉnh sửa lịch đặt phòng Studio (kèm kiểm tra xung đột)
 * @param {string} bookingId - ID của booking cần dời lịch
 * @param {Object} data - { startTime, endTime, studioName, purpose, attendees, participants, notes, rescheduleReason, force }
 * @param {Object} currentUser - { id, role }
 */
const reschedule = async (bookingId, data, currentUser) => {
  const booking = await StudioBooking.findByPk(bookingId, {
    include: [{ model: User, as: 'booker', attributes: ['id', 'fullName', 'email'] }],
  });

  if (!booking) {
    const error = new Error('Booking không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  // 1. Phân quyền: USER/COLLABORATOR chỉ được dời lịch booking của chính mình
  if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.id) {
    const error = new Error('Bạn không có quyền dời lịch đặt phòng này.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Kiểm tra trạng thái: Không được dời lịch booking đã hủy hoặc đã hoàn thành
  if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
    const error = new Error(`Không thể dời lịch đơn đặt phòng đã ở trạng thái "${booking.status}".`);
    error.statusCode = 400;
    throw error;
  }

  const newStartTime = data.startTime ? new Date(data.startTime) : new Date(booking.startTime);
  const newEndTime = data.endTime ? new Date(data.endTime) : new Date(booking.endTime);
  const newStudioName = data.studioName || booking.studioName;
  const newPurpose = data.purpose || booking.purpose;
  const newAttendees = data.participants || data.attendees || booking.attendees;
  const rescheduleReason = data.rescheduleReason || data.reason || null;
  const isForce = Boolean(data.force) && currentUser.role === 'ADMIN';

  // 3. Ràng buộc thời gian: Không được dời lịch về thời điểm trong quá khứ
  const now = new Date();
  if (newStartTime.getTime() < now.getTime()) {
    const error = new Error('Thời gian bắt đầu mới không thể ở trong quá khứ.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Ràng buộc khung giờ hoạt động Studio (USER tuân thủ, ADMIN được dời ngoài giờ)
  validateOperatingHours(newStartTime, newEndTime, currentUser.role);

  // 5. Kiểm tra xung đột lịch và khoảng đệm 30 phút, loại trừ chính booking hiện tại
  const conflict = await checkStudioConflict(newStudioName, newStartTime, newEndTime, booking.id);
  if (conflict) {
    if (currentUser.role === 'ADMIN' && !isForce) {
      return {
        status: 'warning',
        message: `Phòng "${newStudioName}" đã có lịch khác được xác nhận trong cùng khung giờ hoặc vi phạm khoảng đệm 30 phút (từ ${formatVNTime(conflict.startTime)} đến ${formatVNTime(conflict.endTime)}). Bạn có chắc chắn muốn dời đè lịch (hoạt động ưu tiên cấp trường)?`,
        conflictBookingId: conflict.id,
      };
    }
    if (!isForce) {
      const error = new Error(
        `Phòng "${newStudioName}" đã có lịch được xác nhận hoặc vi phạm khoảng đệm 30 phút giữa 2 ca đặt (từ ${formatVNTime(conflict.startTime)} đến ${formatVNTime(conflict.endTime)}). Vui lòng chọn thời gian khác.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // 6. Ghi lại lịch sử dời lịch vào notes
  const oldTimeStr = `${formatVNTime(booking.startTime)} – ${formatVNTime(booking.endTime)}`;
  const newTimeStr = `${formatVNTime(newStartTime)} – ${formatVNTime(newEndTime)}`;
  const actorRoleName = currentUser.role === 'ADMIN' ? 'Quản trị viên' : 'Người đặt';
  const historyLog = `[Dời lịch lúc ${formatVNTime(new Date())} bởi ${actorRoleName}]: Lịch cũ (${oldTimeStr}) ➔ Lịch mới (${newTimeStr}).${rescheduleReason ? ` Lý do: ${rescheduleReason}` : ''}`;

  const updatedNotes = booking.notes
    ? `${booking.notes}\n${historyLog}`
    : historyLog;

  // 7. Xác định trạng thái mới sau khi dời lịch:
  // - Nếu Admin dời lịch: Giữ nguyên trạng thái (CONFIRMED nếu đã CONFIRMED, hoặc PENDING).
  // - Nếu User dời lịch khi booking đang CONFIRMED: Tự động chuyển về PENDING để Admin duyệt lại khung giờ mới.
  let newStatus = booking.status;
  if (currentUser.role !== 'ADMIN' && booking.status === 'CONFIRMED') {
    newStatus = 'PENDING';
  }

  await booking.update({
    studioName: newStudioName,
    startTime: newStartTime,
    endTime: newEndTime,
    purpose: newPurpose,
    attendees: newAttendees,
    notes: data.notes !== undefined ? (data.notes ? `${data.notes}\n${historyLog}` : historyLog) : updatedNotes,
    status: newStatus,
  });

  // 8. Gửi thông báo in-app và email giao dịch (FR-07):
  if (currentUser.role === 'ADMIN') {
    notificationService
      .createNotification({
        userId: booking.userId,
        title: '🔄 Lịch đặt phòng Studio đã được dời lịch',
        message: `Quản trị viên đã thay đổi lịch đặt phòng "${newStudioName}" của bạn sang: ${newTimeStr}.${rescheduleReason ? ` Lý do: ${rescheduleReason}` : ''}`,
        type: 'STUDIO_BOOKING_RESCHEDULED',
        link: '/history',
        sendEmail: true,
        detailRows: [
          { label: 'Phòng Studio', value: newStudioName },
          { label: 'Lịch cũ', value: oldTimeStr },
          { label: 'Lịch mới', value: newTimeStr },
          { label: 'Lý do dời lịch', value: rescheduleReason || 'Điều phối lịch Studio' },
          { label: 'Trạng thái', value: newStatus === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN (CONFIRMED)' : 'CHỜ DUYỆT (PENDING)' },
        ],
      })
      .catch(() => {});
  } else {
    notificationService
      .notifyAdmins({
        title: '🔄 Yêu cầu dời lịch đặt phòng Studio',
        message: `Người dùng "${booking.booker?.fullName || 'Người đặt'}" đã dời lịch đặt phòng "${newStudioName}" sang: ${newTimeStr}.${rescheduleReason ? ` Lý do: ${rescheduleReason}` : ''}`,
        type: 'STUDIO_BOOKING_REQUEST',
        link: '/admin/requests',
        sendEmail: false,
        detailRows: [
          { label: 'Phòng Studio', value: newStudioName },
          { label: 'Người đặt', value: booking.booker?.fullName || 'N/A' },
          { label: 'Lịch cũ', value: oldTimeStr },
          { label: 'Lịch mới', value: newTimeStr },
          { label: 'Lý do dời', value: rescheduleReason || 'Người dùng thay đổi lịch' },
        ],
      })
      .catch(() => {});
  }

  return booking;
};

/**
 * Lấy danh sách các khung giờ còn trống được hệ thống gợi ý cho một ngày cụ thể
 * @param {string} dateString - Ngày YYYY-MM-DD
 * @param {string} studioName - Tên phòng Studio (mặc định: 'Studio LHU')
 * @param {string} role - Vai trò người dùng ('USER' | 'COLLABORATOR' | 'ADMIN')
 */
const getAvailableSlots = async (dateString, studioName = 'Studio LHU', role = 'USER') => {
  if (!dateString) {
    const error = new Error('Vui lòng cung cấp ngày cần tra cứu lịch phòng (date=YYYY-MM-DD).');
    error.statusCode = 400;
    throw error;
  }

  const [y, m, d] = dateString.split('-').map(Number);
  if (!y || !m || !d) {
    const error = new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  // Ngày trong tuần theo giờ VN
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const dayOfWeek = dateObj.getDay();
  const dayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = dayNames[dayOfWeek];
  const isSunday = dayOfWeek === 0;

  // Nếu là Chủ nhật và không phải ADMIN -> Studio đóng cửa
  if (isSunday && role !== 'ADMIN') {
    return {
      isOpen: false,
      date: dateString,
      dayOfWeek,
      dayName,
      isSunday: true,
      message: 'Phòng Studio không hoạt động vào Chủ nhật. Vui lòng chọn lịch từ Thứ Hai đến Thứ Bảy.',
      shifts: [],
      morningSlots: [],
      afternoonSlots: [],
      eveningSlots: [],
      allAvailableSlots: [],
    };
  }

  // Lấy các ca đặt phòng đã có lịch (CONFIRMED, COMPLETED, PENDING, APPROVED) trong ngày đó
  const vnStartOfDay = new Date(`${dateString}T00:00:00+07:00`);
  const vnEndOfDay = new Date(`${dateString}T23:59:59.999+07:00`);

  const studioCondition = studioName
    ? {
        [Op.or]: [
          { studioName: studioName.trim() },
          { studioName: { [Op.like]: `%${studioName.trim()}%` } },
        ],
      }
    : {};

  const confirmedBookings = await StudioBooking.findAll({
    where: {
      ...studioCondition,
      status: { [Op.in]: ['CONFIRMED', 'COMPLETED', 'PENDING', 'APPROVED'] },
      startTime: { [Op.lt]: new Date(vnEndOfDay.getTime() + BUFFER_MS) },
      endTime: { [Op.gt]: new Date(vnStartOfDay.getTime() - BUFFER_MS) },
    },
    order: [['start_time', 'ASC']],
  });

  // Chuyển các booking đã có thành các khoảng bị khóa (có cộng đệm 30 phút ở cả 2 đầu) theo số phút trong ngày (0 - 1440)
  const blockedIntervals = confirmedBookings.map((b) => {
    const sInfo = getVietnamTimeInfo(b.startTime);
    const eInfo = getVietnamTimeInfo(b.endTime);

    let sMin = sInfo.dateString === dateString ? sInfo.totalMinutes : 0;
    let eMin = eInfo.dateString === dateString ? eInfo.totalMinutes : 1440;

    // Đảm bảo eMin > sMin trong cùng ngày
    if (sInfo.dateString === dateString && eInfo.dateString === dateString && eMin <= sMin) {
      eMin = sMin + 30;
    }

    return {
      start: Math.max(0, sMin - 30),
      end: Math.min(1440, eMin + 30),
      actualStart: sMin,
      actualEnd: eMin,
      id: b.id,
      status: b.status,
    };
  });

  // Kiểm tra 1 khoảng [sMin, eMin] có bị trùng hoặc vi phạm đệm 30 phút không
  const isSlotAvailable = (sMin, eMin) => {
    return !blockedIntervals.some((b) => sMin < b.end && eMin > b.start);
  };

  const toVnIso = (timeStr) => {
    return `${dateString}T${timeStr}:00+07:00`;
  };

  const minToTime = (min) => {
    const hh = String(Math.floor(min / 60)).padStart(2, '0');
    const mm = String(min % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Kiểm tra thời gian hiện tại nếu ngày tra cứu là hôm nay
  const now = new Date();
  const nowInfo = getVietnamTimeInfo(now);
  const isToday = nowInfo.dateString === dateString;
  const currentMinutes = nowInfo.totalMinutes;

  // Khung giờ mẫu chuẩn theo quy định:
  // Ca sáng: 07:30 (450p) – 11:30 (690p)
  // Ca chiều: 13:30 (810p) – 16:30 (990p)
  // Ca tối (cho Admin hoặc đặt ngoài giờ): 17:30 (1050p) – 21:30 (1290p)
  const morningWindows = [
    { start: '07:30', end: '09:30', sMin: 450, eMin: 570, duration: '2 giờ' },
    { start: '08:00', end: '10:00', sMin: 480, eMin: 600, duration: '2 giờ' },
    { start: '09:30', end: '11:30', sMin: 570, eMin: 690, duration: '2 giờ' },
    { start: '07:30', end: '11:30', sMin: 450, eMin: 690, duration: 'Trọn ca sáng (4 giờ)' },
  ];

  const afternoonWindows = [
    { start: '13:30', end: '15:00', sMin: 810, eMin: 900, duration: '1.5 giờ' },
    { start: '13:30', end: '15:30', sMin: 810, eMin: 930, duration: '2 giờ' },
    { start: '14:30', end: '16:30', sMin: 870, eMin: 990, duration: '2 giờ' },
    { start: '13:30', end: '16:30', sMin: 810, eMin: 990, duration: 'Trọn ca chiều (3 giờ)' },
  ];

  const eveningWindows = [
    { start: '17:30', end: '19:30', sMin: 1050, eMin: 1170, duration: '2 giờ' },
    { start: '19:30', end: '21:30', sMin: 1170, eMin: 1290, duration: '2 giờ' },
    { start: '17:30', end: '21:30', sMin: 1050, eMin: 1290, duration: 'Trọn ca tối (4 giờ)' },
  ];

  // Helper tính slot khả dụng và bổ sung các khoảng trống liên tục (free gaps)
  const buildSessionSlots = (candidateWindows, sessionStartMin, sessionEndMin, sessionName) => {
    const slotsMap = new Map();

    // 1. Kiểm tra các candidate windows
    for (const w of candidateWindows) {
      if (isToday && w.sMin <= currentMinutes) continue;
      if (isSlotAvailable(w.sMin, w.eMin)) {
        const key = `${w.start}-${w.end}`;
        slotsMap.set(key, {
          id: `${sessionName}_${w.start}_${w.end}`,
          session: sessionName,
          startTime: w.start,
          endTime: w.end,
          startIso: toVnIso(w.start),
          endIso: toVnIso(w.end),
          label: `${w.start} – ${w.end}`,
          duration: w.duration,
          durationMinutes: w.eMin - w.sMin,
        });
      }
    }

    // 2. Tự động tính toán các khoảng trống (gaps) liên tục trong phiên
    const intersecting = blockedIntervals
      .filter((b) => b.start < sessionEndMin && b.end > sessionStartMin)
      .map((b) => ({
        start: Math.max(sessionStartMin, b.start),
        end: Math.min(sessionEndMin, b.end),
      }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const cur of intersecting) {
      if (merged.length === 0) {
        merged.push(cur);
      } else {
        const last = merged[merged.length - 1];
        if (cur.start <= last.end) {
          last.end = Math.max(last.end, cur.end);
        } else {
          merged.push(cur);
        }
      }
    }

    let pointer = sessionStartMin;
    for (const b of merged) {
      if (b.start > pointer) {
        const gapDuration = b.start - pointer;
        if (gapDuration >= 30 && (!isToday || pointer > currentMinutes)) {
          const sStr = minToTime(pointer);
          const eStr = minToTime(b.start);
          const key = `${sStr}-${eStr}`;
          if (!slotsMap.has(key)) {
            const h = Math.floor(gapDuration / 60);
            const m = gapDuration % 60;
            const durText = h > 0 ? (m > 0 ? `${h}h${m}p` : `${h} giờ`) : `${m} phút`;
            slotsMap.set(key, {
              id: `gap_${sessionName}_${sStr}_${eStr}`,
              session: sessionName,
              startTime: sStr,
              endTime: eStr,
              startIso: toVnIso(sStr),
              endIso: toVnIso(eStr),
              label: `${sStr} – ${eStr}`,
              duration: durText,
              durationMinutes: gapDuration,
            });
          }
        }
      }
      pointer = Math.max(pointer, b.end);
    }

    if (sessionEndMin - pointer >= 30 && (!isToday || pointer > currentMinutes)) {
      const sStr = minToTime(pointer);
      const eStr = minToTime(sessionEndMin);
      const key = `${sStr}-${eStr}`;
      if (!slotsMap.has(key)) {
        const gapDuration = sessionEndMin - pointer;
        const h = Math.floor(gapDuration / 60);
        const m = gapDuration % 60;
        const durText = h > 0 ? (m > 0 ? `${h}h${m}p` : `${h} giờ`) : `${m} phút`;
        slotsMap.set(key, {
          id: `gap_${sessionName}_${sStr}_${eStr}`,
          session: sessionName,
          startTime: sStr,
          endTime: eStr,
          startIso: toVnIso(sStr),
          endIso: toVnIso(eStr),
          label: `${sStr} – ${eStr}`,
          duration: durText,
          durationMinutes: gapDuration,
        });
      }
    }

    const verifiedSlots = Array.from(slotsMap.values()).filter((slot) => {
      const sParts = slot.startTime.split(':').map(Number);
      const eParts = slot.endTime.split(':').map(Number);
      const sMin = sParts[0] * 60 + sParts[1];
      const eMin = eParts[0] * 60 + eParts[1];
      return isSlotAvailable(sMin, eMin);
    });

    return verifiedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const morningSlots = !isSunday || role === 'ADMIN'
    ? buildSessionSlots(morningWindows, 450, 690, 'Sáng')
    : [];

  const afternoonSlots = !isSunday || role === 'ADMIN'
    ? buildSessionSlots(afternoonWindows, 810, 990, 'Chiều')
    : [];

  const eveningSlots = role === 'ADMIN'
    ? buildSessionSlots(eveningWindows, 1050, 1290, 'Tối')
    : [];

  const allAvailableSlots = [...morningSlots, ...afternoonSlots, ...eveningSlots];

  const shifts = [
    {
      id: 'MORNING',
      name: 'Ca Sáng',
      operatingHours: '07:30 – 11:30',
      availableSlots: morningSlots,
    },
    {
      id: 'AFTERNOON',
      name: 'Ca Chiều',
      operatingHours: '13:30 – 16:30',
      availableSlots: afternoonSlots,
    },
  ];

  if (role === 'ADMIN') {
    shifts.push({
      id: 'EVENING',
      name: 'Ca Tối (Đặc quyền ADMIN)',
      operatingHours: '17:30 – 21:30',
      availableSlots: eveningSlots,
    });
  }

  return {
    isOpen: true,
    date: dateString,
    dayOfWeek,
    dayName,
    isSunday,
    confirmedBookingsCount: confirmedBookings.length,
    shifts,
    morningSlots,
    afternoonSlots,
    eveningSlots,
    allAvailableSlots,
  };
};

/**
 * Tính toán trạng thái xác nhận sử dụng Studio 4 cấp độ:
 * 1. Chưa đến ngày đặt (FUTURE_BOOKING)
 * 2. Chờ xác nhận người dùng (WAITING_USER_CHECKIN)
 * 3. Chờ ADMIN xác nhận / Chờ xác nhận có mặt (WAITING_ADMIN_CONFIRM)
 * 4. Đã xác nhận sử dụng (USAGE_CONFIRMED)
 * Kèm trường hợp: Không đến sử dụng / Quá hạn (ABSENT)
 *
 * @param {Object} booking
 * @returns {Object} attendanceInfo
 */
const computeAttendanceInfo = (booking) => {
  if (!booking) return null;
  const status = booking.status;

  // Nếu chưa duyệt hoặc đã hủy
  if (status === 'PENDING') {
    return {
      code: 'PENDING_APPROVAL',
      label: 'Chờ duyệt đặt phòng',
      color: 'accent',
      canUserCheckIn: false,
      canAdminConfirm: false,
    };
  }

  if (['CANCELLED', 'REJECTED'].includes(status)) {
    return {
      code: status,
      label: status === 'CANCELLED' ? 'Đã hủy' : 'Bị từ chối',
      color: 'error',
      canUserCheckIn: false,
      canAdminConfirm: false,
    };
  }

  const userCheckInAt = booking.userCheckInAt || booking.user_check_in_at || null;
  const adminConfirmedAt = booking.adminConfirmedAt || booking.admin_confirmed_at || null;
  const attendanceStatus = booking.attendanceStatus || booking.attendance_status || 'NOT_ARRIVED';

  // 4. Đã xác nhận sử dụng
  if (adminConfirmedAt || attendanceStatus === 'ADMIN_CONFIRMED' || status === 'COMPLETED') {
    return {
      code: 'USAGE_CONFIRMED',
      label: 'Đã xác nhận sử dụng',
      color: 'success',
      canUserCheckIn: false,
      canAdminConfirm: false,
      userCheckInAt,
      adminConfirmedAt,
    };
  }

  // Trường hợp đã đánh dấu vắng mặt
  if (attendanceStatus === 'ABSENT') {
    return {
      code: 'ABSENT',
      label: 'Không đến sử dụng',
      subLabel: 'Vắng mặt',
      color: 'error',
      canUserCheckIn: false,
      canAdminConfirm: false,
      userCheckInAt,
      adminConfirmedAt,
    };
  }

  // 3. Chờ ADMIN xác nhận (Chờ xác nhận có mặt)
  if (userCheckInAt || attendanceStatus === 'USER_CHECKED_IN') {
    return {
      code: 'WAITING_ADMIN_CONFIRM',
      label: 'Chờ ADMIN xác nhận',
      subLabel: 'Chờ xác nhận có mặt',
      color: 'info',
      canUserCheckIn: false,
      canAdminConfirm: true,
      userCheckInAt,
      adminConfirmedAt: null,
    };
  }

  const startInfo = getVietnamTimeInfo(booking.startTime);
  const nowInfo = getVietnamTimeInfo(new Date());

  // 1. Chưa đến ngày đặt
  if (startInfo.dateString > nowInfo.dateString) {
    return {
      code: 'FUTURE_BOOKING',
      label: 'Chưa đến ngày đặt',
      color: 'muted',
      canUserCheckIn: false,
      canAdminConfirm: false,
      bookingDate: startInfo.dateString,
      userCheckInAt: null,
      adminConfirmedAt: null,
    };
  }

  // 2. Chờ xác nhận người dùng (Đúng ngày đặt phòng)
  if (startInfo.dateString === nowInfo.dateString) {
    return {
      code: 'WAITING_USER_CHECKIN',
      label: 'Chờ xác nhận người dùng',
      color: 'warning',
      canUserCheckIn: true,
      canAdminConfirm: true,
      bookingDate: startInfo.dateString,
      userCheckInAt: null,
      adminConfirmedAt: null,
    };
  }

  // Xử lý trường hợp người dùng không đến (quá hạn ngày đặt)
  return {
    code: 'ABSENT',
    label: 'Không đến sử dụng',
    subLabel: 'Quá hạn điểm danh',
    color: 'error',
    canUserCheckIn: false,
    canAdminConfirm: true,
    bookingDate: startInfo.dateString,
    userCheckInAt: null,
    adminConfirmedAt: null,
  };
};

/**
 * [USER / CTV] Xác nhận đã đến sử dụng Studio theo lịch đăng ký
 * - Chỉ cho phép xác nhận trong ngày đặt phòng
 * - Không cho phép xác nhận trùng lặp
 * - Gửi thông báo đến ADMIN và chuyển sang "Chờ xác nhận có mặt"
 *
 * @param {string} bookingId
 * @param {Object} currentUser - { id, role, fullName }
 * @param {Object} [reqInfo] - { ip, userAgent }
 */
const checkIn = async (bookingId, currentUser, reqInfo = {}) => {
  const booking = await StudioBooking.findByPk(bookingId, {
    include: [{ model: User, as: 'booker', attributes: ['id', 'fullName', 'email', 'employeeCode'] }],
  });

  if (!booking) {
    const error = new Error('Lịch đặt phòng Studio không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  // Phân quyền: Chỉ người đặt phòng hoặc ADMIN mới được check-in
  if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.id) {
    const error = new Error('Bạn không có quyền xác nhận cho lịch đặt phòng này.');
    error.statusCode = 403;
    throw error;
  }

  // Chỉ cho phép xác nhận cho lịch đã được duyệt
  if (booking.status === 'PENDING') {
    const error = new Error('Lịch đặt phòng này đang chờ Quản trị viên phê duyệt, chưa thể xác nhận đã đến.');
    error.statusCode = 400;
    throw error;
  }

  if (['CANCELLED', 'REJECTED'].includes(booking.status)) {
    const error = new Error(`Không thể xác nhận cho lịch đặt phòng đã ở trạng thái "${booking.status}".`);
    error.statusCode = 400;
    throw error;
  }

  // Chống xác nhận trùng lặp
  if (booking.userCheckInAt || booking.attendanceStatus === 'USER_CHECKED_IN') {
    const error = new Error(
      `Lịch đặt phòng này đã được xác nhận đã đến vào lúc ${formatVNTime(booking.userCheckInAt || new Date())}. Không thể xác nhận trùng lặp.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (booking.adminConfirmedAt || booking.attendanceStatus === 'ADMIN_CONFIRMED' || booking.status === 'COMPLETED') {
    const error = new Error('Lịch đặt phòng này đã được Quản trị viên xác nhận hoàn tất sử dụng.');
    error.statusCode = 400;
    throw error;
  }

  // Ràng buộc thời gian: Chỉ cho phép người dùng xác nhận trong ngày đặt phòng
  const bookingTimeInfo = getVietnamTimeInfo(booking.startTime);
  const now = new Date();
  const nowInfo = getVietnamTimeInfo(now);

  if (currentUser.role !== 'ADMIN' && bookingTimeInfo.dateString !== nowInfo.dateString) {
    if (bookingTimeInfo.dateString > nowInfo.dateString) {
      const error = new Error(
        `Chưa đến ngày đặt phòng! Bạn chỉ có thể nhấn "Xác nhận đã đến" vào đúng ngày sử dụng: ${bookingTimeInfo.dateString} (${formatVNTime(booking.startTime)}).`
      );
      error.statusCode = 400;
      throw error;
    } else {
      const error = new Error(
        `Lịch đặt phòng này đã quá hạn ngày sử dụng (${bookingTimeInfo.dateString}). Không thể xác nhận có mặt sau ngày đặt.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Cập nhật Database
  await booking.update({
    userCheckInAt: now,
    attendanceStatus: 'USER_CHECKED_IN',
  });

  const bookerName = booking.booker?.fullName || booking.fullName || 'Người đặt';

  // Gửi thông báo đến ADMIN
  notificationService
    .notifyAdmins({
      title: '📍 Người dùng đã xác nhận đến Studio',
      message: `Người dùng "${bookerName}" đã xác nhận có mặt sử dụng phòng "${booking.studioName}" theo lịch ngày ${bookingTimeInfo.dateString} (${formatVNTime(booking.startTime)}). Vui lòng kiểm tra và xác nhận sử dụng.`,
      type: 'STUDIO_USER_CHECKED_IN',
      link: '/admin/requests',
      sendEmail: false,
      detailRows: [
        { label: 'Phòng Studio', value: booking.studioName },
        { label: 'Người dùng', value: bookerName },
        { label: 'Khung giờ đặt', value: `${new Date(booking.startTime).toLocaleTimeString('vi-VN')} – ${new Date(booking.endTime).toLocaleTimeString('vi-VN')}` },
        { label: 'Thời gian xác nhận đến', value: formatVNTime(now) },
        { label: 'Trạng thái', value: 'Chờ ADMIN xác nhận (Chờ xác nhận có mặt)' },
      ],
    })
    .catch(() => {});

  // Ghi AuditLog
  auditLogService
    .recordLog({
      userId: currentUser.id,
      action: 'CHECK_IN',
      resource: 'STUDIO_BOOKING',
      resourceId: booking.id,
      details: {
        studioName: booking.studioName,
        bookerName,
        startTime: booking.startTime,
        userCheckInAt: now.toISOString(),
      },
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
    })
    .catch(() => {});

  const attendanceInfo = computeAttendanceInfo(booking);

  return {
    booking,
    attendanceInfo,
  };
};

/**
 * [ADMIN] Xác nhận đã sử dụng phòng Studio để hoàn tất quy trình
 *
 * @param {string} bookingId
 * @param {Object} currentUser - Admin user { id, role, fullName }
 * @param {Object} [options] - { adminNote }
 * @param {Object} [reqInfo] - { ip, userAgent }
 */
const confirmUsage = async (bookingId, currentUser, options = {}, reqInfo = {}) => {
  if (currentUser.role !== 'ADMIN') {
    const error = new Error('Chỉ Quản trị viên (ADMIN) mới có quyền xác nhận đã sử dụng phòng Studio.');
    error.statusCode = 403;
    throw error;
  }

  const booking = await StudioBooking.findByPk(bookingId, {
    include: [{ model: User, as: 'booker', attributes: ['id', 'fullName', 'email'] }],
  });

  if (!booking) {
    const error = new Error('Lịch đặt phòng Studio không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  if (['CANCELLED', 'REJECTED'].includes(booking.status)) {
    const error = new Error(`Không thể xác nhận sử dụng cho lịch đặt đã ở trạng thái "${booking.status}".`);
    error.statusCode = 400;
    throw error;
  }

  // Chống xác nhận trùng lặp
  if (booking.adminConfirmedAt || booking.attendanceStatus === 'ADMIN_CONFIRMED' || booking.status === 'COMPLETED') {
    const error = new Error(
      `Lịch đặt phòng này đã được Quản trị viên xác nhận sử dụng vào lúc ${formatVNTime(booking.adminConfirmedAt || new Date())}. Không thể xác nhận trùng lặp.`
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const adminName = currentUser.fullName || 'Quản trị viên';
  const adminNote = options.adminNote || 'Quản trị viên đã xác nhận hoàn tất sử dụng phòng Studio.';
  const historyLog = `[Xác nhận đã sử dụng lúc ${formatVNTime(now)} bởi ${adminName}]: ${adminNote}`;
  const updatedNotes = booking.notes ? `${booking.notes}\n${historyLog}` : historyLog;

  await booking.update({
    adminConfirmedAt: now,
    attendanceStatus: 'ADMIN_CONFIRMED',
    status: 'COMPLETED',
    notes: updatedNotes,
  });

  // Gửi thông báo đến người đặt phòng
  notificationService
    .createNotification({
      userId: booking.userId,
      title: '🎉 Hoàn tất xác nhận sử dụng Studio',
      message: `Quản trị viên đã xác nhận bạn đã hoàn tất buổi sử dụng phòng "${booking.studioName}" theo lịch đặt lúc ${formatVNTime(booking.startTime)}.`,
      type: 'STUDIO_USAGE_CONFIRMED',
      link: '/history',
      sendEmail: true,
      detailRows: [
        { label: 'Phòng Studio', value: booking.studioName },
        { label: 'Khung giờ', value: `${new Date(booking.startTime).toLocaleTimeString('vi-VN')} – ${new Date(booking.endTime).toLocaleTimeString('vi-VN')} (${formatVNTime(booking.startTime).split(' ngày ')[1]})` },
        { label: 'Thời gian Admin xác nhận', value: formatVNTime(now) },
        { label: 'Trạng thái', value: 'ĐÃ XÁC NHẬN SỬ DỤNG (HOÀN THÀNH)' },
      ],
    })
    .catch(() => {});

  // Ghi AuditLog
  auditLogService
    .recordLog({
      userId: currentUser.id,
      action: 'CONFIRM_USAGE',
      resource: 'STUDIO_BOOKING',
      resourceId: booking.id,
      details: {
        note: adminNote,
        adminConfirmedAt: now.toISOString(),
      },
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
    })
    .catch(() => {});

  const attendanceInfo = computeAttendanceInfo(booking);

  return {
    booking,
    attendanceInfo,
  };
};

/**
 * [ADMIN] Đánh dấu người dùng không đến sử dụng Studio (Vắng mặt)
 *
 * @param {string} bookingId
 * @param {Object} currentUser
 * @param {Object} [options] - { reason }
 * @param {Object} [reqInfo]
 */
const markAbsent = async (bookingId, currentUser, options = {}, reqInfo = {}) => {
  if (currentUser.role !== 'ADMIN') {
    const error = new Error('Chỉ Quản trị viên (ADMIN) mới có quyền thao tác.');
    error.statusCode = 403;
    throw error;
  }

  const booking = await StudioBooking.findByPk(bookingId);
  if (!booking) {
    const error = new Error('Lịch đặt phòng Studio không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const reason = options.reason || 'Người dùng không đến sử dụng Studio theo lịch đăng ký.';
  const historyLog = `[Đánh dấu vắng mặt lúc ${formatVNTime(now)} bởi Quản trị viên]: ${reason}`;
  const updatedNotes = booking.notes ? `${booking.notes}\n${historyLog}` : historyLog;

  await booking.update({
    attendanceStatus: 'ABSENT',
    notes: updatedNotes,
  });

  auditLogService
    .recordLog({
      userId: currentUser.id,
      action: 'MARK_ABSENT',
      resource: 'STUDIO_BOOKING',
      resourceId: booking.id,
      details: { note: reason },
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
    })
    .catch(() => {});

  return {
    booking,
    attendanceInfo: computeAttendanceInfo(booking),
  };
};

module.exports = {
  findAll,
  create,
  processBooking,
  cancelByUser,
  reschedule,
  validateOperatingHours,
  checkStudioConflict,
  getAvailableSlots,
  getVietnamTimeInfo,
  computeAttendanceInfo,
  checkIn,
  confirmUsage,
  markAbsent,
  BUFFER_MS,
};
