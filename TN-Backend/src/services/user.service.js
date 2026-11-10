'use strict';

/**
 * @file services/user.service.js
 * @description Nghiệp vụ quản lý tài khoản người dùng, xử lý xóa an toàn & vô hiệu hóa (Disabled)
 * Tuân thủ quy tắc bảo vệ dữ liệu lịch sử của LHU Media Studio (QUY_TAC.md Mục 9).
 */

const { Op } = require('sequelize');
const {
  User,
  Task,
  AttendanceRecord,
  StudioShift,
  ShiftRegistration,
  DutyPeriod,
  MonthlyPayroll,
  BorrowRequest,
  StudioBooking,
} = require('../models');

/**
 * Kiểm tra người dùng có dữ liệu hoạt động/liên quan trong hệ thống hay không
 * @param {string} userId - UUID của người dùng
 * @returns {Promise<{ hasRelatedData: boolean, details: object }>}
 */
const checkUserHasRelatedData = async (userId) => {
  // 1. Công việc (Tasks): được phân công (assignee) hoặc người tạo (creator)
  const taskCount = await Task.count({
    where: {
      [Op.or]: [
        { assignedToUserId: userId },
        { createdByUserId: userId },
      ],
    },
  });

  // 2. Chấm công (AttendanceRecords)
  const attendanceCount = await AttendanceRecord.count({
    where: { userId },
  });

  // 3. Ca trực Studio (StudioShifts): người trực hoặc người duyệt
  const shiftCount = await StudioShift.count({
    where: {
      [Op.or]: [
        { userId },
        { confirmedByUserId: userId },
      ],
    },
  });

  // 4. Đăng ký ca trực rảnh (ShiftRegistrations)
  const registrationCount = await ShiftRegistration.count({
    where: { userId },
  });

  // 5. Đợt trực (DutyPeriods): người tạo hoặc người chốt
  const dutyPeriodCount = await DutyPeriod.count({
    where: {
      [Op.or]: [
        { createdByUserId: userId },
        { confirmedByUserId: userId },
      ],
    },
  });

  // 6. Bảng thù lao tháng (MonthlyPayrolls)
  const payrollCount = await MonthlyPayroll.count({
    where: { userId },
  });

  // 7. Yêu cầu mượn thiết bị (BorrowRequests)
  const borrowCount = await BorrowRequest.count({
    where: { userId },
  });

  // 8. Đặt phòng Studio (StudioBookings)
  const bookingCount = await StudioBooking.count({
    where: { userId },
  });

  const totalRecords =
    taskCount +
    attendanceCount +
    shiftCount +
    registrationCount +
    dutyPeriodCount +
    payrollCount +
    borrowCount +
    bookingCount;

  return {
    hasRelatedData: totalRecords > 0,
    details: {
      tasks: taskCount,
      attendance: attendanceCount,
      studioShifts: shiftCount,
      shiftRegistrations: registrationCount,
      dutyPeriods: dutyPeriodCount,
      payrolls: payrollCount,
      borrowRequests: borrowCount,
      studioBookings: bookingCount,
      total: totalRecords,
    },
  };
};

/**
 * Xóa hoặc Vô hiệu hóa người dùng theo quy tắc bảo toàn dữ liệu nghiệp vụ:
 * - Nếu tài khoản ĐÃ CÓ dữ liệu liên quan -> Chuyển sang trạng thái 'Disabled', KHÔNG xóa vật lý.
 * - Nếu tài khoản CHƯA CÓ dữ liệu liên quan -> Xóa vật lý an toàn khỏi CSDL.
 *
 * @param {string} adminUserId - UUID của Admin thực hiện
 * @param {string} targetUserId - UUID của tài khoản mục tiêu
 */
const deleteOrDisableUser = async (adminUserId, targetUserId) => {
  // 1. Chặn Admin tự xóa/vô hiệu hóa chính mình
  if (adminUserId === targetUserId) {
    const error = new Error('Không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Tìm user trong CSDL
  const user = await User.findByPk(targetUserId);
  if (!user) {
    const error = new Error('Người dùng không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  // 3. Kiểm tra dữ liệu liên quan
  const { hasRelatedData, details } = await checkUserHasRelatedData(targetUserId);

  if (hasRelatedData) {
    // Trường hợp 1: Đã có dữ liệu -> Chuyển sang 'Disabled', giữ nguyên user_id và dữ liệu lịch sử
    await user.update({
      status: 'Disabled',
      isActive: false,
    });

    const reasons = [];
    if (details.tasks > 0) reasons.push(`${details.tasks} công việc`);
    if (details.attendance > 0) reasons.push(`${details.attendance} bản ghi chấm công`);
    if (details.studioShifts > 0) reasons.push(`${details.studioShifts} ca trực Studio`);
    if (details.shiftRegistrations > 0) reasons.push(`${details.shiftRegistrations} lượt đăng ký ca trực`);
    if (details.payrolls > 0) reasons.push(`${details.payrolls} bảng tính thù lao`);
    if (details.borrowRequests > 0) reasons.push(`${details.borrowRequests} đơn mượn thiết bị`);
    if (details.studioBookings > 0) reasons.push(`${details.studioBookings} lượt đặt phòng`);

    const reasonStr = reasons.length > 0 ? ` (${reasons.join(', ')})` : '';

    return {
      action: 'DISABLED',
      message: `Tài khoản đã có dữ liệu hoạt động trong hệ thống${reasonStr} nên đã được chuyển sang trạng thái Vô hiệu hóa (Disabled) để bảo toàn dữ liệu lịch sử.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
      },
      details,
    };
  } else {
    // Trường hợp 2: Chưa có bất kỳ dữ liệu nào liên quan -> Xóa vật lý
    try {
      await user.destroy();
      return {
        action: 'DELETED',
        message: 'Tài khoản chưa có dữ liệu liên quan đã được xóa hoàn toàn khỏi hệ thống.',
        userId: targetUserId,
      };
    } catch (sqlErr) {
      // Bắt các lỗi ràng buộc khóa ngoại (foreign key constraint error) nếu có
      if (
        sqlErr.name === 'SequelizeForeignKeyConstraintError' ||
        (sqlErr.message && sqlErr.message.includes('REFERENCE constraint'))
      ) {
        // Fallback an toàn: Vô hiệu hóa thay vì ném lỗi SQL thô ra cho người dùng
        await user.update({
          status: 'Disabled',
          isActive: false,
        });
        return {
          action: 'DISABLED',
          message: 'Tài khoản có dữ liệu liên kết nên đã được chuyển sang trạng thái Vô hiệu hóa (Disabled) để bảo toàn dữ liệu.',
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            status: 'Disabled',
            isActive: false,
          },
        };
      }
      throw sqlErr;
    }
  }
};

/**
 * Khóa / Mở khóa tài khoản (Active <-> Locked)
 */
const toggleUserActiveStatus = async (adminUserId, targetUserId) => {
  if (adminUserId === targetUserId) {
    const error = new Error('Không thể tự thao tác trên tài khoản của chính mình.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByPk(targetUserId);
  if (!user) {
    const error = new Error('Người dùng không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  let newStatus;
  let newActive;

  // Nếu đang Active -> Locked (Khóa tạm thời)
  // Nếu đang Locked hoặc Disabled -> Active (Mở khóa / Kích hoạt lại)
  if (user.status === 'Active' || (user.isActive && user.status !== 'Locked' && user.status !== 'Disabled')) {
    newStatus = 'Locked';
    newActive = false;
  } else {
    newStatus = 'Active';
    newActive = true;
  }

  await user.update({
    status: newStatus,
    isActive: newActive,
  });

  const { password: _, ...result } = user.toJSON();
  return {
    status: newStatus,
    isActive: newActive,
    message: newActive
      ? 'Tài khoản đã được mở khóa và kích hoạt hoạt động.'
      : 'Tài khoản đã được chuyển sang trạng thái Tạm khóa (Locked).',
    user: result,
  };
};

/**
 * Lấy danh sách Cộng tác viên (COLLABORATOR) chuẩn hóa cho dropdown và bộ lọc
 * Tuân thủ quy tắc nghiệp vụ LHU Media Studio:
 * 1. CHỈ lấy người dùng có vai trò COLLABORATOR (tuyệt đối không lấy USER hoặc ADMIN).
 * 2. Phân định rõ 2 mục đích sử dụng:
 *    - Phân công mới (purpose='assign' hoặc status='Active'): CHỈ trả về CTV Active (đang hoạt động).
 *    - Bộ lọc lịch sử / Báo cáo (purpose='filter' hoặc status='ALL'): Trả về TẤT CẢ CTV (kể cả Disabled / Locked để xem dữ liệu cũ).
 * 3. Sắp xếp thứ tự bảng chữ cái A-Z theo Họ tên (fullName).
 * 4. Hỗ trợ tìm kiếm theo Họ tên, Email, Mã nhân viên.
 *
 * @param {object} query - { purpose, status, search }
 * @returns {Promise<Array>}
 */
const getCollaborators = async (query = {}) => {
  const where = {
    role: 'COLLABORATOR',
  };

  const purpose = query.purpose; // 'assign' | 'filter'
  const statusParam = query.status; // 'Active' | 'ALL' | 'Locked' | 'Disabled'

  if (purpose === 'assign' || statusParam === 'Active') {
    // Chỉ lấy CTV Active đang hoạt động để phân công
    where.status = 'Active';
    where.isActive = true;
  } else if (statusParam && statusParam !== 'ALL') {
    where.status = statusParam;
  }
  // Nếu purpose === 'filter' hoặc statusParam === 'ALL', không lọc status để lấy đầy đủ cả CTV cũ/nghỉ việc

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where[Op.or] = [
      { fullName: { [Op.like]: `%${s}%` } },
      { email: { [Op.like]: `%${s}%` } },
      { employeeCode: { [Op.like]: `%${s}%` } },
    ];
  }

  const collaborators = await User.findAll({
    where,
    attributes: [
      'id',
      'fullName',
      'email',
      'employeeCode',
      'avatarUrl',
      'phone',
      'role',
      'status',
      'isActive',
      'createdAt',
    ],
    order: [['fullName', 'ASC']],
  });

  return collaborators;
};

module.exports = {
  checkUserHasRelatedData,
  deleteOrDisableUser,
  toggleUserActiveStatus,
  getCollaborators,
};

