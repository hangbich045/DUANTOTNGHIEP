'use strict';

/**
 * @file services/studioBooking.service.js
 * @description Service xử lý Business Logic cho Đặt phòng Studio.
 */

const { Op } = require('sequelize');
const { StudioBooking, User } = require('../models');

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
 */
const validateOperatingHours = (startTime, endTime) => {
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

  if (startInfo.dayOfWeek === 0) {
    const error = new Error('Phòng Studio không hoạt động vào Chủ nhật. Vui lòng chọn lịch từ Thứ Hai đến Thứ Bảy.');
    error.statusCode = 400;
    throw error;
  }

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
  if (currentUser.role !== 'ADMIN') {
    where.userId = currentUser.id;
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

  const { count, rows } = await StudioBooking.findAndCountAll({
    where,
    limit,
    offset,
    order: [['start_time', 'ASC']],
    include: [
      {
        model: User,
        as: 'booker',
        attributes: ['id', 'fullName', 'email', 'employeeCode'],
      },
    ],
  });

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
 */
const create = async (data, userId) => {
  // Map FE fields sang model fields
  const studioName = data.studioName || 'Studio LHU';
  const attendees = data.participants || data.attendees || 1;
  const fullName = data.fullName || null;

  // 1. Ràng buộc khung giờ hoạt động Studio (FR-03.3 & Quy tắc nghiệp vụ Mục 4.1)
  validateOperatingHours(data.startTime, data.endTime);

  // 2. Kiểm tra trùng lịch và khoảng đệm 30 phút với các lịch đã xác nhận (FR-03.3 & Quy tắc Mục 4.3, 4.5)
  const conflict = await checkStudioConflict(studioName, data.startTime, data.endTime);
  if (conflict) {
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
  } else if (action === 'cancel') {
    await booking.update({ status: 'CANCELLED', cancelReason });
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

module.exports = {
  findAll,
  create,
  processBooking,
  cancelByUser,
  validateOperatingHours,
  checkStudioConflict,
  getVietnamTimeInfo,
  BUFFER_MS,
};
