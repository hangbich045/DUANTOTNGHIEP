'use strict';

/**
 * @file services/duty.service.js
 * @description Nghiệp vụ quản lý ca trực Studio CTV (FR-05, QUY_TAC.md Mục 6 & 7).
 */

const { Op } = require('sequelize');
const { StudioShift, User, AttendanceRecord } = require('../models');

/**
 * CTV đăng ký ca trực Studio
 * @param {string} userId - ID của CTV
 * @param {Object} data - { date, shiftType, note }
 */
const registerShift = async (userId, data, userRole = 'COLLABORATOR') => {
  const { date, shiftType, note } = data;
  const targetUserId = (userRole === 'ADMIN' && data.userId) ? data.userId : userId;

  if (!date || !shiftType) {
    const error = new Error('Vui lòng chọn ngày và ca trực');
    error.statusCode = 400;
    throw error;
  }

  // 1. Kiểm tra ngày đăng ký không được trong quá khứ đối với CTV tự đăng ký
  if (userRole !== 'ADMIN') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);

    if (shiftDate < today) {
      const error = new Error('Không thể đăng ký ca trực cho ngày trong quá khứ');
      error.statusCode = 400;
      throw error;
    }
  }

  // 2. Chặn đăng ký trùng ca trong cùng một ngày của CTV
  const existingShift = await StudioShift.findOne({
    where: {
      userId: targetUserId,
      date,
      shiftType,
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  if (existingShift) {
    const error = new Error(`Đã có ca trực này vào ngày ${date}`);
    error.statusCode = 400;
    throw error;
  }

  // Thiết lập giờ bắt đầu và kết thúc tiêu chuẩn 4 giờ
  let startTime = '07:30';
  let endTime = '11:30';
  if (shiftType === 'AFTERNOON') {
    startTime = '13:30';
    endTime = '17:30';
  } else if (shiftType === 'EVENING') {
    startTime = '17:30';
    endTime = '21:30';
  }

  const shift = await StudioShift.create({
    userId: targetUserId,
    date,
    shiftType,
    startTime,
    endTime,
    hours: 4.00,
    status: userRole === 'ADMIN' ? 'CONFIRMED' : 'REGISTERED',
    attendanceSymbol: 'LV',
    note: note ? note.trim() : null,
    confirmedByUserId: userRole === 'ADMIN' ? userId : null,
  });

  return shift;
};

/**
 * Nhân sự (Admin) duyệt và xác nhận ca trực Studio
 * @param {string} shiftId
 * @param {string} adminUserId
 */
const confirmShift = async (shiftId, adminUserId) => {
  const shift = await StudioShift.findByPk(shiftId);
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
    throw error;
  }

  if (shift.status === 'CANCELLED') {
    const error = new Error('Không thể xác nhận ca trực đã bị hủy');
    error.statusCode = 400;
    throw error;
  }

  shift.status = 'CONFIRMED';
  shift.confirmedByUserId = adminUserId;
  await shift.save();

  return shift;
};

/**
 * Xác nhận hoàn thành ca trực thực tế
 * @param {string} shiftId
 * @param {string} userId
 * @param {string} userRole
 */
const completeShift = async (shiftId, userId, userRole) => {
  const shift = await StudioShift.findByPk(shiftId);
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
    throw error;
  }

  // TC-04: Không thể xác nhận hoàn thành ca trực tương lai
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const shiftDate = new Date(shift.date);
  shiftDate.setHours(0, 0, 0, 0);

  if (shiftDate > today) {
    const error = new Error('Không thể xác nhận hoàn thành cho ca trực trong tương lai (Quy tắc TC-04)');
    error.statusCode = 400;
    throw error;
  }

  // TC-07: CTV không được tự ý duyệt hoàn thành ca trực nếu chưa có quyền Admin
  if (userRole !== 'ADMIN' && shift.userId !== userId) {
    const error = new Error('Bạn không có quyền thao tác trên ca trực này');
    error.statusCode = 403;
    throw error;
  }

  shift.status = 'COMPLETED';
  if (userRole === 'ADMIN') {
    shift.confirmedByUserId = userId;
  }
  await shift.save();

  return shift;
};

/**
 * Hủy ca trực
 * @param {string} shiftId
 * @param {string} userId
 * @param {string} userRole
 */
const cancelShift = async (shiftId, userId, userRole) => {
  const shift = await StudioShift.findByPk(shiftId);
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
    throw error;
  }

  if (shift.status === 'COMPLETED') {
    const error = new Error('Không thể hủy ca trực đã hoàn thành');
    error.statusCode = 400;
    throw error;
  }

  if (userRole !== 'ADMIN' && shift.userId !== userId) {
    const error = new Error('Bạn không có quyền hủy ca trực này');
    error.statusCode = 403;
    throw error;
  }

  shift.status = 'CANCELLED';
  await shift.save();

  return shift;
};

/**
 * Lấy danh sách ca trực theo tháng/năm
 * @param {Object} query - { month, year, userId, status }
 * @param {Object} user - User đang đăng nhập
 */
const getShifts = async (query, user) => {
  const { month, year, userId, status } = query;
  const where = {};

  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Tính ngày cuối tháng
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    where.date = { [Op.between]: [startDate, endDate] };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Phân quyền: CTV có thể lọc theo userId của mình hoặc xem lịch chung
  if (userId) {
    where.userId = userId;
  }

  const shifts = await StudioShift.findAll({
    where,
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'role'],
      },
      {
        model: User,
        as: 'confirmer',
        attributes: ['id', 'fullName', 'email'],
      },
    ],
    order: [['date', 'ASC'], ['shiftType', 'ASC']],
  });

  return shifts;
};

module.exports = {
  registerShift,
  confirmShift,
  completeShift,
  cancelShift,
  getShifts,
};

