'use strict';

/**
 * @file services/duty.service.js
 * @description Nghiệp vụ quản lý ca trực Studio CTV (FR-05, QUY_TAC.md Mục 6 & 7).
 * Hỗ trợ Quy trình đăng ký - sắp xếp ca trực 3 giai đoạn:
 * 1. Nhân sự tạo đợt đăng ký ca trực tháng mới (với quy tắc hạn chót tự động)
 * 2. CTV đăng ký thời gian có thể trực (Availability)
 * 3. Nhân sự sắp xếp và xác nhận lịch trực chính thức
 * 4. Nhân sự chỉnh sửa, điều chỉnh, xóa lịch trực đã xác nhận (ghi nhận lịch sử & gửi thông báo)
 * 5. Hiển thị sự vụ SV trên lịch trực (phân định với dữ liệu chấm công)
 */

const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const {
  StudioShift,
  DutyPeriod,
  ShiftRegistration,
  User,
  AttendanceRecord,
  Task,
  DutyScheduleHistory,
  MonthlyPayroll,
  sequelize,
} = require('../models');
const notificationService = require('./notification.service');

// Các khung giờ tiêu chuẩn theo ca (4 giờ/ca)
const SHIFT_TIMES = {
  S: { shiftType: 'MORNING', startTime: '07:30', endTime: '11:30' },
  C: { shiftType: 'AFTERNOON', startTime: '13:00', endTime: '17:00' },
  T: { shiftType: 'EVENING', startTime: '17:30', endTime: '21:30' },
  MORNING: { session: 'S', startTime: '07:30', endTime: '11:30' },
  AFTERNOON: { session: 'C', startTime: '13:00', endTime: '17:00' },
  EVENING: { session: 'T', startTime: '17:30', endTime: '21:30' },
  SANG: { session: 'S', startTime: '07:30', endTime: '11:30' },
  CHIEU: { session: 'C', startTime: '13:00', endTime: '17:00' },
  TOI: { session: 'T', startTime: '17:30', endTime: '21:30' },
};

const DOW_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();

/**
 * Tính toán hạn chót đăng ký mặc định theo quy tắc:
 * - Mặc định ngày hạn chót = ngày tạo bảng + 2 ngày
 * - Tháng/năm hạn chót = tháng/năm của đợt trực được chọn (m/y)
 * - Độc lập giữa ngày tạo và tháng của lịch trực
 */
const calculateDefaultDeadline = (m, y, creationDate = new Date()) => {
  const targetDay = creationDate.getDate() + 2;
  const maxDays = getDaysInMonth(m, y);
  const clampedDay = Math.min(targetDay, maxDays);
  return `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
};

// =========================================================================
// GIAI ĐOẠN 1: NHÂN SỰ TẠO VÀ QUẢN LÝ ĐỢT ĐĂNG KÝ CA TRỰC THÁNG MỚI
// =========================================================================

/**
 * Khởi tạo đợt đăng ký ca trực cho tháng mới
 */
const createDutyPeriod = async (adminUserId, data, ...rest) => {
  let month, year, registrationDeadline, note;
  if (typeof data === 'object' && data !== null) {
    month = data.month;
    year = data.year;
    registrationDeadline = data.registrationDeadline;
    note = data.note;
  } else {
    month = data;
    year = rest[0];
    registrationDeadline = rest[1];
    note = rest[2];
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (!m || !y || m < 1 || m > 12) {
    const error = new Error('Tháng và năm không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const daysInMonth = new Date(y, m, 0).getDate();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Kiểm tra không tạo trùng đợt đăng ký cùng tháng
  const existing = await DutyPeriod.findOne({
    where: { month: m, year: y },
  });

  if (existing) {
    if (['CANCELLED', 'ARCHIVED'].includes(existing.status)) {
      // Đợt đã bị hủy hoặc lưu trữ trước đó -> Xóa hoàn toàn bản ghi cũ để tạo đợt mới tinh
      await existing.destroy();
    } else {
      const error = new Error(`Đợt đăng ký ca trực Tháng ${m}/${y} đã được tạo trước đó. Nếu muốn làm mới hoàn toàn, vui lòng xóa đợt hiện tại trước.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Đảm bảo toàn bộ dữ liệu ca trực và đăng ký cũ trong tháng được làm sạch hoàn toàn để đợt mới để trống 100%
  await ShiftRegistration.destroy({
    where: { date: { [Op.between]: [startDate, endDate] } },
  });

  const residualShifts = await StudioShift.findAll({
    where: { date: { [Op.between]: [startDate, endDate] } },
    attributes: ['id'],
  });
  const residualShiftIds = residualShifts.map((s) => s.id);

  if (residualShiftIds.length > 0) {
    await AttendanceRecord.destroy({
      where: {
        [Op.or]: [
          { sourceId: { [Op.in]: residualShiftIds } },
          {
            sourceType: { [Op.in]: ['DUTY_SHIFT', 'STUDIO_SHIFT'] },
            date: { [Op.between]: [startDate, endDate] },
          },
          {
            symbol: 'LV',
            date: { [Op.between]: [startDate, endDate] },
          },
        ],
      },
    });
    await StudioShift.destroy({
      where: { date: { [Op.between]: [startDate, endDate] } },
    });
  }

  await DutyScheduleHistory.destroy({
    where: { date: { [Op.between]: [startDate, endDate] } },
  });

  // Quy tắc hạn chót tự động: Mặc định là 2 ngày sau ngày tạo bảng, tháng/năm theo tháng/năm lịch trực được chọn
  let finalDeadline = null;
  if (registrationDeadline && registrationDeadline.trim() !== '') {
    const parsed = new Date(registrationDeadline);
    if (!isNaN(parsed.getTime())) {
      finalDeadline = parsed;
    }
  } else {
    const defaultDateStr = calculateDefaultDeadline(m, y, new Date());
    finalDeadline = new Date(`${defaultDateStr}T23:59:59.999`);
  }

  const period = await DutyPeriod.create({
    month: m,
    year: y,
    status: 'OPEN',
    registrationDeadline: finalDeadline,
    note: note ? note.trim() : null,
    createdByUserId: adminUserId,
  });

  // Gửi thông báo in-app và email đến toàn bộ CTV đang hoạt động
  try {
    const adminUser = await User.findByPk(adminUserId, { attributes: ['fullName'] }).catch(() => null);
    const deadlineStr = finalDeadline
      ? ` (Hạn chót: ${new Date(finalDeadline).toLocaleDateString('vi-VN')})`
      : '';
    await notificationService.notifyCollaborators({
      senderName: adminUser?.fullName || 'Bộ phận Truyền thông',
      title: `Mở đợt đăng ký ca trực Studio Tháng ${m}/${y}`,
      message: `Bộ phận Truyền thông đã mở đợt đăng ký ca trực Tháng ${m}/${y}${deadlineStr}. Vui lòng truy cập để chọn các ngày/buổi bạn có thể tham gia trực.`,
      type: 'DUTY_PERIOD_OPEN',
      link: '/tasks',
      sendEmail: true,
      detailRows: [
        { label: 'Tháng đăng ký', value: `Tháng ${m}/${y}` },
        { label: 'Hạn chót đăng ký', value: finalDeadline ? new Date(finalDeadline).toLocaleDateString('vi-VN') : 'Theo thông báo' },
        ...(note && note.trim() ? [{ label: 'Ghi chú', value: note.trim() }] : []),
      ],
    });
  } catch (err) {
    console.error('Lỗi khi gửi thông báo tạo đợt trực:', err);
  }

  return period;
};

/**
 * Lấy danh sách các đợt đăng ký ca trực
 */
const getDutyPeriods = async (query = {}) => {
  const { year, status } = query;
  const where = {};
  if (year) where.year = parseInt(year, 10);
  if (status && status !== 'ALL') {
    where.status = status;
  } else if (!status) {
    // Mặc định chỉ lấy các đợt đang hoạt động (loại trừ đợt đã lưu trữ hoặc hủy)
    where.status = { [Op.notIn]: ['CANCELLED', 'ARCHIVED'] };
  }

  const periods = await DutyPeriod.findAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email'],
      },
      {
        model: User,
        as: 'confirmer',
        attributes: ['id', 'fullName', 'email'],
      },
    ],
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

  const now = new Date();
  const results = [];
  for (const p of periods) {
    const regCount = await ShiftRegistration.count({
      where: { periodId: p.id },
      distinct: true,
      col: 'user_id',
    });
    const assignedCount = await StudioShift.count({
      where: { periodId: p.id, status: { [Op.ne]: 'CANCELLED' } },
    });

    let isRegistrationExpired = false;
    if (p.registrationDeadline) {
      const d = new Date(p.registrationDeadline);
      d.setHours(23, 59, 59, 999);
      if (now > d) {
        isRegistrationExpired = true;
      }
    }

    results.push({
      ...p.toJSON(),
      registeredCtvCount: regCount,
      assignedShiftCount: assignedCount,
      isRegistrationExpired,
    });
  }

  return results;
};

/**
 * Cập nhật trạng thái đợt đăng ký ca trực (OPEN, CLOSED, ARRANGING, CONFIRMED)
 */
const updateDutyPeriodStatus = async (periodId, status, adminUserId) => {
  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  if (!['OPEN', 'CLOSED', 'ARRANGING', 'CONFIRMED'].includes(status)) {
    const error = new Error('Trạng thái không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  period.status = status;
  if (status === 'CONFIRMED') {
    period.confirmedByUserId = adminUserId;
    period.confirmedAt = new Date();
  }
  await period.save();

  return period;
};

/**
 * Kiểm tra các dữ liệu liên quan và tính an toàn trước khi xóa đợt đăng ký ca trực
 *
 * @param {string} periodId - ID của đợt đăng ký
 * @returns {Promise<object>} Báo cáo phân tích an toàn
 */
const checkPeriodDeletionSafety = async (periodId) => {
  const period = await DutyPeriod.findByPk(periodId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'confirmer', attributes: ['id', 'fullName', 'email'] },
    ],
  });

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  const { month: m, year: y } = period;
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Đếm số lượng CTV đăng ký nguyện vọng
  const regCount = await ShiftRegistration.count({
    where: {
      [Op.or]: [
        { periodId: period.id },
        { date: { [Op.between]: [startDate, endDate] } },
      ],
    },
    distinct: true,
    col: 'user_id',
  });

  // 2. Lấy danh sách ca phân công thuộc đợt / tháng
  const shifts = await StudioShift.findAll({
    where: {
      [Op.or]: [
        { periodId: period.id },
        { date: { [Op.between]: [startDate, endDate] } },
      ],
    },
  });

  const shiftCount = shifts.length;
  const confirmedShiftCount = shifts.filter((s) => s.status === 'CONFIRMED').length;
  const completedShiftCount = shifts.filter((s) => s.status === 'COMPLETED').length;

  const nowVN = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const pastShifts = shifts.filter((s) => s.date <= nowVN && s.status !== 'CANCELLED');
  const pastShiftCount = pastShifts.length;
  const futureShifts = shifts.filter((s) => s.date > nowVN && s.status !== 'CANCELLED');
  const futureShiftCount = futureShifts.length;

  // 3. Kiểm tra chấm công ca trực
  const shiftIds = shifts.map((s) => s.id);
  let attendanceCount = 0;
  if (shiftIds.length > 0) {
    attendanceCount = await AttendanceRecord.count({
      where: {
        [Op.or]: [
          { sourceId: { [Op.in]: shiftIds } },
          {
            sourceType: { [Op.in]: ['DUTY_SHIFT', 'STUDIO_SHIFT'] },
            date: { [Op.between]: [startDate, endDate] },
          },
          {
            symbol: 'LV',
            date: { [Op.between]: [startDate, endDate] },
          },
        ],
      },
    });
  }

  return {
    period: {
      id: period.id,
      month: period.month,
      year: period.year,
      status: period.status,
      note: period.note,
      registrationDeadline: period.registrationDeadline,
    },
    regCount,
    shiftCount,
    confirmedShiftCount,
    completedShiftCount,
    pastShiftCount,
    futureShiftCount,
    attendanceCount,
    isHardDeletable: true,
    hasHistoricalData: false,
    reason: null,
    guidance: 'Toàn bộ dữ liệu của đợt này bao gồm nguyện vọng CTV, ca trực và chấm công liên quan sẽ bị xóa hoàn toàn khỏi hệ thống. Khi tạo lại đợt mới, dữ liệu sẽ hoàn toàn được làm mới và để trống.',
    recommendedAction: 'DELETE',
  };
};

/**
 * Xóa toàn bộ đợt đăng ký ca trực và tất cả dữ liệu liên quan (chỉ ADMIN)
 *
 * @param {string} adminUserId - ID người thực hiện (ADMIN)
 * @param {string} periodId - ID của đợt cần xóa
 * @param {object} options - Tùy chọn bổ sung (nếu có)
 * @returns {Promise<object>}
 */
const deleteDutyPeriod = async (adminUserId, periodId, options = {}) => {
  const admin = await User.findByPk(adminUserId);
  if (!admin || admin.role !== 'ADMIN') {
    const error = new Error('Chỉ Quản trị viên (ADMIN) mới có quyền xóa đợt đăng ký ca trực');
    error.statusCode = 403;
    throw error;
  }

  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  const { month: m, year: y } = period;
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const t = await sequelize.transaction();
  try {
    // 1. Tìm tất cả ca trực (StudioShift) liên kết với đợt này hoặc nằm trong tháng/năm này
    const shifts = await StudioShift.findAll({
      where: {
        [Op.or]: [
          { periodId: period.id },
          { date: { [Op.between]: [startDate, endDate] } },
        ],
      },
      attributes: ['id'],
      transaction: t,
    });
    const shiftIds = shifts.map((s) => s.id);

    // 2. Xóa toàn bộ bản ghi chấm công (AttendanceRecord) liên quan đến các ca trực của đợt này
    await AttendanceRecord.destroy({
      where: {
        [Op.or]: [
          ...(shiftIds.length > 0 ? [{ sourceId: { [Op.in]: shiftIds } }] : []),
          {
            sourceType: { [Op.in]: ['DUTY_SHIFT', 'STUDIO_SHIFT'] },
            date: { [Op.between]: [startDate, endDate] },
          },
          {
            symbol: 'LV',
            date: { [Op.between]: [startDate, endDate] },
          },
        ],
      },
      transaction: t,
    });

    // 3. Xóa toàn bộ lịch sử chỉnh sửa (DutyScheduleHistory) của đợt
    await DutyScheduleHistory.destroy({
      where: {
        [Op.or]: [
          { periodId: period.id },
          { date: { [Op.between]: [startDate, endDate] } },
        ],
      },
      transaction: t,
    });

    // 4. Xóa toàn bộ ca trực (StudioShift)
    await StudioShift.destroy({
      where: {
        [Op.or]: [
          { periodId: period.id },
          { date: { [Op.between]: [startDate, endDate] } },
        ],
      },
      transaction: t,
    });

    // 5. Xóa toàn bộ nguyện vọng đăng ký của CTV (ShiftRegistration)
    await ShiftRegistration.destroy({
      where: {
        [Op.or]: [
          { periodId: period.id },
          { date: { [Op.between]: [startDate, endDate] } },
        ],
      },
      transaction: t,
    });

    // 6. Xóa bản ghi DutyPeriod chính nó (và bất kỳ bản ghi DutyPeriod nào của tháng/năm này)
    await DutyPeriod.destroy({
      where: {
        [Op.or]: [
          { id: period.id },
          { month: m, year: y },
        ],
      },
      transaction: t,
    });

    // 7. Reset số buổi trực và giờ trực trong MonthlyPayroll nếu có
    if (MonthlyPayroll) {
      await MonthlyPayroll.update(
        {
          totalShiftCount: 0,
          shiftHours: 0,
        },
        {
          where: { month: m, year: y },
          transaction: t,
        }
      );
    }

    await t.commit();

    // 8. Tự động tính toán lại bảng lương/thù lao tháng (nếu có payroll service)
    try {
      const payrollService = require('./payroll.service');
      if (payrollService && typeof payrollService.calculateMonthlyPayroll === 'function') {
        await payrollService.calculateMonthlyPayroll(m, y);
      }
    } catch (payrollErr) {
      console.warn('Cảnh báo đồng bộ payroll sau khi xóa đợt trực:', payrollErr.message);
    }

    return {
      success: true,
      action: 'DELETED',
      message: `Đã xóa hoàn toàn đợt đăng ký ca trực Tháng ${m}/${y} cùng toàn bộ nguyện vọng, ca trực và dữ liệu liên quan.`,
      period: { id: period.id, month: m, year: y },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// =========================================================================
// GIAI ĐOẠN 2: CTV ĐĂNG KÝ THỜI GIAN CÓ THỂ TRỰC (AVAILABILITY)
// =========================================================================

/**
 * CTV đăng ký hoặc cập nhật các ngày/buổi có thể tham gia trực
 */
const registerAvailability = async (userId, data) => {
  const { periodId, slots, note } = data;

  if (!periodId || !Array.isArray(slots)) {
    const error = new Error('Vui lòng chọn đợt đăng ký và danh sách ca trực có thể tham gia');
    error.statusCode = 400;
    throw error;
  }

  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  // Chặn đăng ký khi đợt đã đóng hoặc đã xác nhận
  if (period.status !== 'OPEN') {
    const error = new Error('Đợt đăng ký này đã đóng hoặc đã được xác nhận lịch, không thể chỉnh sửa.');
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra thời hạn đăng ký
  if (period.registrationDeadline) {
    const deadline = new Date(period.registrationDeadline);
    deadline.setHours(23, 59, 59, 999);
    if (new Date() > deadline) {
      const error = new Error(`Đã hết thời hạn đăng ký ca trực cho đợt này (Hạn chót: ${deadline.toLocaleDateString('vi-VN')}).`);
      error.statusCode = 400;
      throw error;
    }
  }

  const t = await sequelize.transaction();
  try {
    // 1. Xóa toàn bộ đăng ký cũ của CTV trong đợt này
    await ShiftRegistration.destroy({
      where: { periodId, userId },
      transaction: t,
    });

    // 2. Thêm các slot đăng ký mới (khử trùng)
    const slotMap = new Map();
    for (const s of slots) {
      if (s.date && s.session && ['S', 'C', 'T'].includes(s.session)) {
        const key = `${s.date}_${s.session}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            periodId,
            userId,
            date: s.date,
            session: s.session,
            note: s.note || note || null,
          });
        }
      }
    }

    const recordsToCreate = Array.from(slotMap.values());
    if (recordsToCreate.length > 0) {
      await ShiftRegistration.bulkCreate(recordsToCreate, { transaction: t });
    }

    await t.commit();

    // 3. Thông báo in-app và email cho các Quản trị viên (ADMIN)
    try {
      const user = await User.findByPk(userId, { attributes: ['fullName', 'email'] });
      await notificationService.notifyAdmins({
        senderName: user?.fullName || 'Cộng tác viên',
        title: `CTV ${user?.fullName || ''} đã gửi đăng ký ca trực`,
        message: `Cộng tác viên ${user?.fullName || ''} đã cập nhật ${recordsToCreate.length} buổi có thể trực trong Tháng ${period.month}/${period.year}.`,
        type: 'DUTY_REGISTRATION_SUBMITTED',
        link: '/admin/duty',
        sendEmail: true,
        detailRows: [
          { label: 'Cộng tác viên', value: user?.email ? `${user.fullName} (${user.email})` : (user?.fullName || 'CTV') },
          { label: 'Đợt đăng ký', value: `Tháng ${period.month}/${period.year}` },
          { label: 'Số buổi đăng ký', value: `${recordsToCreate.length} buổi` },
        ],
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      count: recordsToCreate.length,
      message: `Đã lưu thành công ${recordsToCreate.length} buổi có thể trực trong Tháng ${period.month}/${period.year}.`,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách ca đăng ký của CTV trong một đợt
 */
const getCTVRegistrations = async (periodId, userId) => {
  const registrations = await ShiftRegistration.findAll({
    where: { periodId, userId },
    order: [['date', 'ASC'], ['session', 'ASC']],
  });
  return registrations;
};

// =========================================================================
// GIAI ĐOẠN 3 & 4: SẮP XẾP, XÁC NHẬN & CHỈNH SỬA LỊCH TRỰC CHÍNH THỨC
// =========================================================================

/**
 * Kiểm tra một ca trực đã kết thúc hay chưa dựa vào ngày trực và giờ kết thúc (endTime)
 */
const isShiftEnded = (shift, now = new Date()) => {
  if (!shift || !shift.date) return false;
  const dateStr = String(shift.date).slice(0, 10);
  let endTime = shift.endTime;
  if (!endTime || !endTime.includes(':')) {
    if (shift.shiftType === 'AFTERNOON') endTime = '17:00';
    else if (shift.shiftType === 'EVENING') endTime = '21:30';
    else endTime = '11:30';
  }

  const [endHour, endMinute] = endTime.split(':').map((v) => parseInt(v, 10));
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const shiftEndDate = new Date(y, m - 1, d, endHour, endMinute, 0, 0);

  return now >= shiftEndDate;
};

/**
 * Tự động chuyển các ca trực CONFIRMED đã kết thúc thời gian sang trạng thái COMPLETED
 * - Chỉ tự động hoàn thành những ca trực đã được Nhân sự xác nhận và phân công chính thức (CONFIRMED)
 * - Tuyệt đối không hoàn thành ca trực bị hủy (CANCELLED) hoặc chưa đến thời gian trực
 * - Idempotent: chỉ quét ca CONFIRMED, không bao giờ chạy trùng hay ghi nhận nhiều lần
 * - Hỗ trợ options.periodId để cô lập phạm vi khi cần (chống ảnh hưởng chéo đợt trực khác)
 */
const autoCompletePastConfirmedShifts = async (options = {}) => {
  let targetNow = new Date();
  let filterPeriodId = null;

  if (options instanceof Date) {
    targetNow = options;
  } else if (options && typeof options === 'object') {
    if (options.targetNow instanceof Date) targetNow = options.targetNow;
    if (options.periodId) filterPeriodId = options.periodId;
  }

  const todayStr = `${targetNow.getFullYear()}-${String(targetNow.getMonth() + 1).padStart(2, '0')}-${String(targetNow.getDate()).padStart(2, '0')}`;

  const where = {
    status: 'CONFIRMED',
    date: { [Op.lte]: todayStr },
  };

  if (filterPeriodId) {
    where.periodId = filterPeriodId;
  }

  const candidateShifts = await StudioShift.findAll({ where });

  if (!candidateShifts || candidateShifts.length === 0) {
    return { completedCount: 0, shifts: [] };
  }

  const completedShifts = [];
  for (const shift of candidateShifts) {
    if (isShiftEnded(shift, targetNow)) {
      shift.status = 'COMPLETED';
      await shift.save();
      completedShifts.push(shift);

      // Đảm bảo AttendanceRecord có ký hiệu 'LV' cho ca trực đã hoàn thành
      try {
        let sess = 'S';
        if (shift.shiftType === 'AFTERNOON') sess = 'C';
        else if (shift.shiftType === 'EVENING') sess = 'T';

        const shiftDateStr = String(shift.date).slice(0, 10);
        const dObj = new Date(shiftDateStr);
        const m = dObj.getMonth() + 1;
        const y = dObj.getFullYear();

        const existingAtt = await AttendanceRecord.findOne({
          where: {
            userId: shift.userId,
            date: shiftDateStr,
            session: sess,
          },
        });

        if (!existingAtt) {
          await AttendanceRecord.create({
            userId: shift.userId,
            date: shiftDateStr,
            session: sess,
            symbol: 'LV',
            sourceType: 'DUTY_SHIFT',
            sourceId: shift.id,
            hours: shift.hours || 4.0,
            month: m,
            year: y,
          });
        }
      } catch (attErr) {
        console.error('Lỗi đảm bảo AttendanceRecord khi tự động hoàn thành ca trực:', attErr);
      }
    }
  }

  return { completedCount: completedShifts.length, shifts: completedShifts };
};

/**
 * Lấy bảng tổng hợp đăng ký ca trực của tất cả CTV trong một đợt
 * Kèm thông tin sự vụ (Tasks) để hiển thị ký hiệu 'SV' trên Lịch trực
 */
const getPeriodRegistrationsSummary = async (periodId) => {
  // Tự động hoàn thành các ca trực đã kết thúc theo thời gian thực
  try {
    await autoCompletePastConfirmedShifts();
  } catch (autoErr) {
    console.error('Lỗi khi tự động hoàn thành ca trực:', autoErr);
  }

  const period = await DutyPeriod.findByPk(periodId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'confirmer', attributes: ['id', 'fullName', 'email'] },
    ],
  });

  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  const { month, year } = period;
  const daysCount = getDaysInMonth(month, year);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  // Tạo metadata các ngày trong tháng (an toàn theo giờ trưa 12:00 để thứ trong tuần luôn chuẩn xác)
  const daysMeta = [];
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(year, month - 1, d, 12, 0, 0);
    daysMeta.push({
      day: d,
      dayOfWeek: DOW_NAMES[dateObj.getDay()],
      isSunday: dateObj.getDay() === 0,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // 1. Lấy tất cả CTV đăng ký rảnh (ShiftRegistration) thuộc đúng đợt và tháng đang xét
  const registrations = await ShiftRegistration.findAll({
    where: {
      periodId,
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl'],
      },
    ],
    order: [['date', 'ASC'], ['session', 'ASC']],
  });

  // 2. Lấy tất cả ca trực đã được phân công (StudioShift) thuộc đúng đợt và tháng đang xét
  const assignedShifts = await StudioShift.findAll({
    where: {
      periodId,
      date: { [Op.between]: [startDate, endDate] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl'],
      },
    ],
    order: [['date', 'ASC'], ['shiftType', 'ASC']],
  });

  // 3. Lấy tất cả Tasks (sự vụ) trong tháng của các CTV (bất kể trạng thái mới giao hay hoàn thành)
  // để phục vụ hiển thị ký hiệu 'SV' trên Lịch trực Studio
  const monthTasks = await Task.findAll({
    where: {
      [Op.or]: [
        { executionDate: { [Op.between]: [startDate, endDate] } },
        {
          executionDate: null,
          deadline: { [Op.between]: [new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T23:59:59Z`)] },
        },
        {
          executionDate: null,
          deadline: null,
          createdAt: { [Op.between]: [new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T23:59:59Z`)] },
        },
      ],
    },
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  // Nhóm tasks theo `${dateStr}_${userId}` và theo `dateStr`
  const tasksByUserAndDate = {};
  const tasksByDate = {};

  for (const t of monthTasks) {
    if (!t.assignedToUserId) continue;
    let rawDate = t.executionDate
      ? String(t.executionDate).slice(0, 10)
      : (t.startTime
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(t.startTime))
          : (t.deadline ? t.deadline.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10)));

    let dateStr = rawDate;
    if (!(dateStr.length === 10 && dateStr.startsWith(`${year}-`))) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }

    // Nghiêm ngặt chỉ ghi nhận các sự vụ SV thuộc phạm vi tháng đang chọn (không lấy tháng trước hoặc sau)
    if (dateStr < startDate || dateStr > endDate) {
      continue;
    }

    const key = `${dateStr}_${t.assignedToUserId}`;
    if (!tasksByUserAndDate[key]) tasksByUserAndDate[key] = [];

    const taskItem = {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      taskType: t.taskType,
      otherTaskType: t.otherTaskType,
      actualHours: parseFloat(t.actualHours) || 0,
      isExternal: t.isExternal,
      deadline: t.deadline,
      executionDate: t.executionDate,
      shiftSession: t.shiftSession,
      startTime: t.startTime || null,
      note: t.note,
      location: t.location || null,
      campus: t.campus || null,
      room: t.room || null,
      assignedToUserId: t.assignedToUserId,
      assigneeName: t.assignee?.fullName || '',
    };

    tasksByUserAndDate[key].push(taskItem);

    if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
    tasksByDate[dateStr].push(taskItem);
  }

  // Tổ chức cấu trúc ma trận theo ngày và buổi
  const slots = {};
  for (const dm of daysMeta) {
    slots[dm.dateStr] = {
      S: { registered: [], assigned: [] },
      C: { registered: [], assigned: [] },
      T: { registered: [], assigned: [] },
    };
  }

  for (const reg of registrations) {
    const dStr = reg.date;
    const sess = reg.session;
    if (slots[dStr] && slots[dStr][sess]) {
      const userTasks = tasksByUserAndDate[`${dStr}_${reg.userId}`] || [];
      slots[dStr][sess].registered.push({
        id: reg.id,
        user: reg.collaborator,
        note: reg.note,
        tasks: userTasks,
        hasTask: userTasks.length > 0,
      });
    }
  }

  for (const shift of assignedShifts) {
    const dStr = shift.date;
    let sess = 'S';
    if (shift.shiftType === 'AFTERNOON') sess = 'C';
    else if (shift.shiftType === 'EVENING') sess = 'T';

    if (slots[dStr] && slots[dStr][sess]) {
      const userTasks = tasksByUserAndDate[`${dStr}_${shift.userId}`] || [];
      slots[dStr][sess].assigned.push({
        shiftId: shift.id,
        user: shift.collaborator,
        status: shift.status,
        note: shift.note,
        tasks: userTasks,
        hasTask: userTasks.length > 0,
      });
    }
  }

  return {
    period,
    daysCount,
    daysMeta,
    slots,
    tasksByUserAndDate,
    tasksByDate,
  };
};

/**
 * Nhân sự sắp xếp / phân công ca trực (Lưu tạm hoặc chỉnh sửa lịch đã xác nhận)
 * - Khi đợt đang OPEN/CLOSED/ARRANGING: Cập nhật phân công dự kiến
 * - Khi đợt đã CONFIRMED: Admin ĐƯỢC PHÉP chỉnh sửa/xóa, hệ thống tự động:
 *   1. Kiểm tra trùng ca và điều kiện CTV Active
 *   2. Cập nhật StudioShift & đồng bộ sang AttendanceRecord ('LV')
 *   3. Ghi nhận lịch sử chỉnh sửa (DutyScheduleHistory)
 *   4. Tự động gửi thông báo chi tiết đến các CTV bị ảnh hưởng
 */
const assignShifts = async (adminUserId, periodId, assignments, options = {}) => {
  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  const adminUser = await User.findByPk(adminUserId, { attributes: ['id', 'fullName', 'email'] });
  const isPeriodConfirmed = period.status === 'CONFIRMED';
  const reason = options.reason || 'Nhân sự điều chỉnh lịch trực';

  // Kiểm tra trùng ca: Cùng 1 CTV không được phân công 2 ca cùng 1 buổi trong 1 ngày
  const seen = new Set();
  for (const a of assignments) {
    if (!a.userId || !a.date || !a.session) continue;
    const key = `${a.userId}_${a.date}_${a.session}`;
    if (seen.has(key)) {
      const error = new Error(`Phát hiện phân công trùng ca cho CTV vào ngày ${a.date} buổi ${a.session}`);
      error.statusCode = 400;
      throw error;
    }
    seen.add(key);
  }

  // Ràng buộc nghiệp vụ: Chỉ phân công ca trực cho CTV (COLLABORATOR) đang Active
  const assignedUserIds = [...new Set(assignments.map((a) => a.userId).filter(Boolean))];
  if (assignedUserIds.length > 0) {
    const assignedUsers = await User.findAll({
      where: { id: { [Op.in]: assignedUserIds } },
    });
    const userMap = new Map(assignedUsers.map((u) => [u.id, u]));

    for (const uid of assignedUserIds) {
      const u = userMap.get(uid);
      if (!u) {
        const error = new Error(`Không tìm thấy người dùng có ID ${uid}`);
        error.statusCode = 404;
        throw error;
      }
      if (u.role !== 'COLLABORATOR') {
        const error = new Error(`Chỉ có thể phân công ca trực cho Cộng tác viên (COLLABORATOR). Người dùng ${u.fullName} có vai trò ${u.role}.`);
        error.statusCode = 400;
        throw error;
      }
      if (u.status !== 'Active' || !u.isActive) {
        const error = new Error(`Không thể phân công ca trực cho tài khoản không hoạt động: ${u.fullName} (Trạng thái: ${u.status || 'Khóa'}).`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const t = await sequelize.transaction();
  try {
    // Lấy các ca trực hiện tại trước khi cập nhật
    const existingShifts = await StudioShift.findAll({
      where: {
        periodId,
        status: { [Op.ne]: 'CANCELLED' },
      },
      include: [{ model: User, as: 'collaborator', attributes: ['id', 'fullName', 'email'] }],
      transaction: t,
    });

    const existingMap = new Map();
    for (const s of existingShifts) {
      const sess = s.shiftType === 'AFTERNOON' ? 'C' : (s.shiftType === 'EVENING' ? 'T' : 'S');
      const key = `${s.date}_${sess}_${s.userId}`;
      existingMap.set(key, s);
    }

    const newAssignmentMap = new Map();
    for (const a of assignments) {
      if (!a.userId || !a.date || !a.session) continue;
      const key = `${a.date}_${a.session}_${a.userId}`;
      newAssignmentMap.set(key, a);
    }

    const historyRecords = [];
    const affectedUserNotifications = [];

    // 1. Xử lý các ca bị xóa (có trong existing nhưng không có trong assignments)
    for (const [key, oldShift] of existingMap.entries()) {
      if (!newAssignmentMap.has(key)) {
        const sess = oldShift.shiftType === 'AFTERNOON' ? 'C' : (oldShift.shiftType === 'EVENING' ? 'T' : 'S');
        await oldShift.destroy({ transaction: t });

        // Nếu đợt đã CONFIRMED, xóa chấm công tương ứng
        if (isPeriodConfirmed) {
          await AttendanceRecord.destroy({
            where: {
              userId: oldShift.userId,
              date: oldShift.date,
              session: sess,
              sourceType: 'DUTY_SHIFT',
            },
            transaction: t,
          });

          // Ghi nhận lịch sử xóa
          historyRecords.push({
            periodId,
            shiftId: oldShift.id,
            changedByUserId: adminUserId,
            action: 'DELETE',
            targetUserId: oldShift.userId,
            date: oldShift.date,
            session: sess,
            oldValue: JSON.stringify({
              userId: oldShift.userId,
              fullName: oldShift.collaborator?.fullName,
              date: oldShift.date,
              session: sess,
            }),
            newValue: null,
            reason,
          });

          // Thông báo cho CTV bị xóa ca
          affectedUserNotifications.push({
            userId: oldShift.userId,
            title: `Điều chỉnh ca trực Studio Tháng ${period.month}/${period.year}`,
            message: `Ca trực ngày ${oldShift.date} (Buổi ${sess === 'S' ? 'Sáng' : sess === 'C' ? 'Chiều' : 'Tối'}) của bạn đã được Nhân sự ${adminUser?.fullName || 'Admin'} hủy hoặc điều chỉnh.`,
            type: 'DUTY_SCHEDULE_UPDATED',
            link: '/tasks',
          });
        }
      }
    }

    // 2. Xử lý các ca mới được thêm
    for (const [key, a] of newAssignmentMap.entries()) {
      if (!existingMap.has(key)) {
        const timing = SHIFT_TIMES[a.session] || SHIFT_TIMES.S;
        const newShift = await StudioShift.create(
          {
            periodId,
            userId: a.userId,
            date: a.date,
            shiftType: timing.shiftType,
            startTime: timing.startTime,
            endTime: timing.endTime,
            hours: 4.0,
            status: 'CONFIRMED',
            attendanceSymbol: 'LV',
            note: a.note || null,
            confirmedByUserId: adminUserId,
          },
          { transaction: t }
        );

        // Nếu đợt đã CONFIRMED, đồng bộ ngay sang AttendanceRecord
        if (isPeriodConfirmed) {
          const shiftDate = new Date(a.date);
          const m = shiftDate.getMonth() + 1;
          const y = shiftDate.getFullYear();

          const existingCell = await AttendanceRecord.findOne({
            where: { userId: a.userId, date: a.date, session: a.session },
            transaction: t,
          });

          if (!existingCell) {
            await AttendanceRecord.create(
              {
                userId: a.userId,
                date: a.date,
                session: a.session,
                symbol: 'LV',
                hours: 4.0,
                month: m,
                year: y,
                sourceType: 'DUTY_SHIFT',
                sourceId: newShift.id,
              },
              { transaction: t }
            );
          }

          // Ghi nhận lịch sử thêm mới
          historyRecords.push({
            periodId,
            shiftId: newShift.id,
            changedByUserId: adminUserId,
            action: 'ADD',
            targetUserId: a.userId,
            date: a.date,
            session: a.session,
            oldValue: null,
            newValue: JSON.stringify({
              userId: a.userId,
              date: a.date,
              session: a.session,
            }),
            reason,
          });

          // Thông báo cho CTV được phân công mới
          affectedUserNotifications.push({
            userId: a.userId,
            title: `Phân công ca trực Studio Tháng ${period.month}/${period.year}`,
            message: `Bạn đã được Nhân sự ${adminUser?.fullName || 'Admin'} phân công ca trực ngày ${a.date} (Buổi ${a.session === 'S' ? 'Sáng' : a.session === 'C' ? 'Chiều' : 'Tối'}).`,
            type: 'DUTY_SCHEDULE_UPDATED',
            link: '/tasks',
          });
        }
      }
    }

    // Chuyển trạng thái period sang ARRANGING nếu đang là OPEN/CLOSED
    if (!isPeriodConfirmed && (period.status === 'OPEN' || period.status === 'CLOSED')) {
      period.status = 'ARRANGING';
      await period.save({ transaction: t });
    }

    // Lưu các bản ghi lịch sử chỉnh sửa nếu có
    if (historyRecords.length > 0) {
      await DutyScheduleHistory.bulkCreate(historyRecords, { transaction: t });
    }

    await t.commit();

    // Gửi thông báo in-app và email đến các CTV bị ảnh hưởng (ngoài transaction)
    if (affectedUserNotifications.length > 0) {
      try {
        const adminUser = await User.findByPk(adminUserId, { attributes: ['fullName'] }).catch(() => null);
        const senderLabel = adminUser?.fullName || 'Bộ phận Truyền thông';
        for (const item of affectedUserNotifications) {
          await notificationService.createNotification({
            userId: item.userId,
            senderName: senderLabel,
            title: item.title,
            message: item.message,
            type: item.type || 'DUTY_SCHEDULE_UPDATED',
            link: item.link || '/tasks',
            sendEmail: true,
            detailRows: [
              { label: 'Đợt trực', value: `Tháng ${period.month}/${period.year}` },
              { label: 'Người điều chỉnh', value: senderLabel },
            ],
          });
        }
      } catch (notifErr) {
        console.error('Lỗi khi gửi thông báo cập nhật ca trực:', notifErr);
      }
    }

    return {
      success: true,
      count: assignments.length,
      historyCount: historyRecords.length,
      message: isPeriodConfirmed
        ? `Đã cập nhật lịch trực chính thức thành công! Đã ghi nhận ${historyRecords.length} thay đổi và gửi thông báo đến các CTV liên quan.`
        : `Đã lưu phân công ${assignments.length} ca trực thành công!`,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Nhân sự xác nhận lịch trực tháng chính thức (CONFIRMED)
 */
const confirmPeriodSchedule = async (adminUserId, periodId) => {
  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    // 1. Chuyển trạng thái đợt sang CONFIRMED
    period.status = 'CONFIRMED';
    period.confirmedByUserId = adminUserId;
    period.confirmedAt = new Date();
    await period.save({ transaction: t });

    // 2. Cập nhật tất cả ca trực trong đợt sang CONFIRMED
    await StudioShift.update(
      {
        status: 'CONFIRMED',
        confirmedByUserId: adminUserId,
      },
      {
        where: {
          periodId,
          status: { [Op.ne]: 'CANCELLED' },
        },
        transaction: t,
      }
    );

    // 3. Tự động đồng bộ ca trực vào Bảng chấm công (AttendanceRecords) với ký hiệu 'LV'
    const shifts = await StudioShift.findAll({
      where: { periodId, status: 'CONFIRMED' },
      transaction: t,
    });

    for (const s of shifts) {
      const shiftDate = new Date(s.date);
      const m = shiftDate.getMonth() + 1;
      const y = shiftDate.getFullYear();

      let sess = 'S';
      if (s.shiftType === 'AFTERNOON') sess = 'C';
      else if (s.shiftType === 'EVENING') sess = 'T';

      const existingCell = await AttendanceRecord.findOne({
        where: { userId: s.userId, date: s.date, session: sess },
        transaction: t,
      });

      if (!existingCell) {
        await AttendanceRecord.create(
          {
            userId: s.userId,
            date: s.date,
            session: sess,
            symbol: 'LV',
            hours: 4.0,
            month: m,
            year: y,
            sourceType: 'DUTY_SHIFT',
            sourceId: s.id,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    // 4. Gửi thông báo in-app và email có theo dõi trạng thái đến từng CTV có ca trực chính thức
    try {
      const ctvIds = [...new Set(shifts.map((s) => s.userId))];
      const adminUser = await User.findByPk(adminUserId, { attributes: ['fullName'] }).catch(() => null);
      const senderLabel = adminUser?.fullName || 'Bộ phận Truyền thông';
      const ctvUsers = await User.findAll({
        where: { id: ctvIds },
        attributes: ['id', 'fullName', 'email'],
      });
      const userById = new Map(ctvUsers.map((u) => [u.id, u]));

      for (const cid of ctvIds) {
        const u = userById.get(cid);
        const myShiftCount = shifts.filter((s) => s.userId === cid).length;
        await notificationService.createNotification({
          userId: cid,
          userEmail: u?.email || null,
          recipientName: u?.fullName || null,
          senderName: senderLabel,
          title: `Lịch trực Studio Tháng ${period.month}/${period.year} đã được phê duyệt`,
          message: `Bộ phận Truyền thông đã xác nhận lịch trực chính thức Tháng ${period.month}/${period.year}. Bạn được phân công ${myShiftCount} ca trực Studio trong tháng này. Vui lòng kiểm tra lịch trực tại trang Nhiệm vụ & Ca trực.`,
          type: 'DUTY_SCHEDULE_CONFIRMED',
          link: '/tasks',
          sendEmail: true,
          detailRows: [
            { label: 'Tháng trực', value: `Tháng ${period.month}/${period.year}` },
            { label: 'Số ca được xếp', value: `${myShiftCount} ca (4 giờ/ca)` },
            { label: 'Trạng thái', value: 'Lịch trực chính thức' },
          ],
        });
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      message: `Đã xác nhận lịch trực chính thức Tháng ${period.month}/${period.year} thành công!`,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách lịch sử chỉnh sửa của một đợt trực
 */
const getScheduleHistories = async (periodId) => {
  const histories = await DutyScheduleHistory.findAll({
    where: { periodId },
    include: [
      { model: User, as: 'changer', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'targetCollaborator', attributes: ['id', 'fullName', 'email', 'employeeCode'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  return histories;
};

// =========================================================================
// CÁC HÀM XỬ LÝ CA TRỰC ĐƠN LẺ & TƯƠNG THÍCH NGƯỢC
// =========================================================================

const registerShift = async (userId, data, userRole = 'COLLABORATOR') => {
  const { date, shiftType, note } = data;
  const targetUserId = (userRole === 'ADMIN' && data.userId) ? data.userId : userId;

  if (!date || !shiftType) {
    const error = new Error('Vui lòng chọn ngày và ca trực');
    error.statusCode = 400;
    throw error;
  }

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

  let dbShiftType = 'MORNING';
  let startTime = '07:30';
  let endTime = '11:30';
  if (shiftType === 'CHIEU' || shiftType === 'AFTERNOON') {
    dbShiftType = 'AFTERNOON';
    startTime = '13:00';
    endTime = '17:00';
  } else if (shiftType === 'TOI' || shiftType === 'EVENING') {
    dbShiftType = 'EVENING';
    startTime = '17:30';
    endTime = '21:30';
  }

  const existingShift = await StudioShift.findOne({
    where: {
      userId: targetUserId,
      date,
      shiftType: dbShiftType,
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  if (existingShift) {
    const error = new Error(`Đã có ca trực này vào ngày ${date}`);
    error.statusCode = 400;
    throw error;
  }

  const dObj = new Date(date);
  const m = dObj.getMonth() + 1;
  const y = dObj.getFullYear();
  const period = await DutyPeriod.findOne({ where: { month: m, year: y } });

  const shift = await StudioShift.create({
    periodId: period ? period.id : null,
    userId: targetUserId,
    date,
    shiftType: dbShiftType,
    startTime,
    endTime,
    hours: 4.0,
    status: userRole === 'ADMIN' ? 'CONFIRMED' : 'REGISTERED',
    attendanceSymbol: 'LV',
    note: note ? note.trim() : null,
    confirmedByUserId: userRole === 'ADMIN' ? userId : null,
  });

  return shift;
};

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

  // Thông báo in-app và email cho CTV về ca trực đã được xác nhận
  try {
    const adminUser = await User.findByPk(adminUserId, { attributes: ['fullName'] }).catch(() => null);
    const shiftLabel = shift.shiftType === 'MORNING' ? 'Sáng (07:30–11:30)' : shift.shiftType === 'AFTERNOON' ? 'Chiều (13:00–17:00)' : 'Tối (17:30–21:30)';
    await notificationService.createNotification({
      userId: shift.userId,
      senderName: adminUser?.fullName || 'Bộ phận Truyền thông',
      title: '✅ Ca trực Studio của bạn đã được xác nhận',
      message: `Ca trực ngày ${shift.date} (${shiftLabel}) của bạn đã được Nhân sự xác nhận chính thức.`,
      type: 'DUTY_SCHEDULE_CONFIRMED',
      link: '/tasks',
      sendEmail: true,
      detailRows: [
        { label: 'Ngày trực', value: String(shift.date) },
        { label: 'Buổi trực', value: shiftLabel },
        { label: 'Trạng thái', value: 'Đã xác nhận' },
      ],
    });
  } catch {
    // ignore
  }

  return shift;
};

const completeShift = async (shiftId, userId, userRole) => {
  const shift = await StudioShift.findByPk(shiftId);
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
    throw error;
  }

  // Bỏ quyền CTV tự bấm hoàn thành - hệ thống tự động hoàn thành khi hết giờ trực
  if (userRole !== 'ADMIN') {
    const error = new Error('Hệ thống tự động ghi nhận hoàn thành ca trực khi hết giờ trực, CTV không cần tự xác nhận.');
    error.statusCode = 403;
    throw error;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const shiftDate = new Date(shift.date);
  shiftDate.setHours(0, 0, 0, 0);

  if (shiftDate > today) {
    const error = new Error('Không thể xác nhận hoàn thành cho ca trực trong tương lai (Quy tắc TC-04)');
    error.statusCode = 400;
    throw error;
  }

  shift.status = 'COMPLETED';
  await shift.save();

  return shift;
};

/**
 * Xóa hoặc hủy ca trực
 * - Nếu Admin xóa ca trực trong đợt đã CONFIRMED: Xóa ca trực, xóa AttendanceRecord và gửi thông báo cho CTV
 */
const cancelShift = async (shiftId, userId, userRole, reason = '') => {
  const shift = await StudioShift.findByPk(shiftId, {
    include: [{ model: User, as: 'collaborator', attributes: ['id', 'fullName', 'email'] }],
  });
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
    throw error;
  }

  if (userRole !== 'ADMIN' && shift.userId !== userId) {
    const error = new Error('Bạn không có quyền hủy ca trực này');
    error.statusCode = 403;
    throw error;
  }

  const sess = shift.shiftType === 'AFTERNOON' ? 'C' : (shift.shiftType === 'EVENING' ? 'T' : 'S');
  const wasConfirmed = shift.status === 'CONFIRMED';
  const periodId = shift.periodId;
  const targetUserId = shift.userId;
  const shiftDate = shift.date;

  // Thực hiện xóa ca trực
  await shift.destroy();

  // Đồng bộ xóa chấm công nếu ca trực đã được xác nhận
  if (wasConfirmed) {
    await AttendanceRecord.destroy({
      where: {
        userId: targetUserId,
        date: shiftDate,
        session: sess,
        sourceType: 'DUTY_SHIFT',
      },
    });

    if (userRole === 'ADMIN') {
      // Ghi lịch sử chỉnh sửa
      try {
        await DutyScheduleHistory.create({
          periodId,
          shiftId,
          changedByUserId: userId,
          action: 'DELETE',
          targetUserId,
          date: shiftDate,
          session: sess,
          oldValue: JSON.stringify({
            userId: targetUserId,
            fullName: shift.collaborator?.fullName,
            date: shiftDate,
            session: sess,
          }),
          newValue: null,
          reason: reason || 'Nhân sự xóa ca trực',
        });
      } catch (histErr) {
        console.error('Lỗi ghi lịch sử xóa ca trực:', histErr);
      }

      // Thông báo in-app và email cho CTV bị xóa ca
      try {
        const adminUser = await User.findByPk(userId, { attributes: ['fullName'] }).catch(() => null);
        const sessLabel = sess === 'S' ? 'Sáng' : sess === 'C' ? 'Chiều' : 'Tối';
        await notificationService.createNotification({
          userId: targetUserId,
          senderName: adminUser?.fullName || 'Bộ phận Truyền thông',
          title: 'Hủy ca trực Studio',
          message: `Ca trực ngày ${shiftDate} (Buổi ${sessLabel}) của bạn đã được Nhân sự xóa khỏi lịch trực chính thức.`,
          type: 'DUTY_SCHEDULE_UPDATED',
          link: '/tasks',
          sendEmail: true,
          detailRows: [
            { label: 'Ngày trực', value: String(shiftDate) },
            { label: 'Buổi trực', value: `Buổi ${sessLabel}` },
            { label: 'Lý do', value: reason || 'Điều chỉnh lịch trực' },
          ],
        });
      } catch (notifErr) {
        console.error('Lỗi gửi thông báo hủy ca trực:', notifErr);
      }
    }
  }

  return { success: true, message: 'Đã xóa ca trực thành công!' };
};

/**
 * Lấy danh sách ca trực (hỗ trợ CTV xem toàn bộ lịch trực Studio trong tháng)
 */
const getShifts = async (query, user) => {
  // Tự động hoàn thành các ca trực đã kết thúc theo thời gian thực
  try {
    await autoCompletePastConfirmedShifts();
  } catch (autoErr) {
    console.error('Lỗi khi tự động hoàn thành ca trực:', autoErr);
  }

  const { month, year, userId, status, periodId, startDate, endDate } = query;
  const where = {};

  if (periodId) {
    where.periodId = periodId;
  } else if (startDate && endDate) {
    where.date = { [Op.between]: [startDate, endDate] };
  } else if (month && year) {
    const sDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const eDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    where.date = { [Op.between]: [sDate, eDate] };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Nếu truyền userId: lọc theo CTV cụ thể. Nếu không truyền: cho phép xem toàn bộ ca trực trong tháng
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

/**
 * Format thông tin chi tiết một task (sự vụ) phục vụ Tooltip & Ghi chú Lịch trực tuần
 */
const formatTaskInfo = (t) => {
  const creatorName = t.creator?.fullName || 'Nhân sự BPTT';
  const creatorAvatar = t.creator?.avatarUrl || null;
  let createdAtFormatted = '';
  if (t.createdAt) {
    const cd = new Date(t.createdAt);
    const hours = String(cd.getHours()).padStart(2, '0');
    const mins = String(cd.getMinutes()).padStart(2, '0');
    const day = cd.getDate();
    const month = cd.getMonth() + 1;
    createdAtFormatted = `${hours}:${mins} ${day} thg ${month}`;
  }

  // Xác định địa điểm thực hiện (ưu tiên t.location, t.campus, t.room trong DB)
  let location = t.location || '';
  if (!location) {
    if (t.campus && t.room) location = `${t.campus} - ${t.room}`;
    else if (t.campus) location = t.campus;
    else if (t.room) location = t.room;
  }
  if (!location) {
    const text = `${t.note || ''} ${t.title || ''} ${t.description || ''}`;
    const match = text.match(/(A\d{3}|B\d{3}|C\d{3}|Studio|Hội trường [A-Z\d]|Cơ sở \d|Phòng \d+)/i);
    if (match) location = match[0];
  }

  // Định dạng thời gian thực hiện theo chuẩn Việt Nam (UTC+7)
  let executionTimeFormatted = '';
  if (t.startTime) {
    const d = new Date(t.startTime);
    if (!isNaN(d.getTime())) {
      const f = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      });
      const parts = f.formatToParts(d);
      const gp = (type) => parts.find((p) => p.type === type)?.value || '';
      executionTimeFormatted = `${gp('hour')}:${gp('minute')}, ${gp('day')}/${gp('month')}/${gp('year')}`;
    }
  } else if (t.deadline) {
    const d = new Date(t.deadline);
    if (!isNaN(d.getTime())) {
      const f = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      });
      const parts = f.formatToParts(d);
      const gp = (type) => parts.find((p) => p.type === type)?.value || '';
      executionTimeFormatted = `Hạn chót: ${gp('hour')}:${gp('minute')}, ${gp('day')}/${gp('month')}/${gp('year')}`;
    }
  } else if (t.executionDate) {
    const parts = String(t.executionDate).slice(0, 10).split('-');
    if (parts.length === 3) {
      executionTimeFormatted = `Ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      executionTimeFormatted = `Ngày ${t.executionDate}`;
    }
  } else {
    executionTimeFormatted = 'Chưa xác định';
  }

  let calc = { normalHours: 0, overtimeHours: 0, sundayHours: 0, multiplier: 1.0, convertedHours: parseFloat(t.actualHours) || 0, isHighlighted: false, multiplierNote: '', reason: '' };
  try {
    const { calculateTaskHoursAndMultiplier } = require('./payroll.service');
    calc = calculateTaskHoursAndMultiplier(t);
  } catch (err) {}

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    taskType: t.taskType,
    otherTaskType: t.otherTaskType,
    actualHours: parseFloat(t.actualHours) || 0,
    normalHours: calc.normalHours,
    overtimeHours: calc.overtimeHours,
    sundayHours: calc.sundayHours,
    multiplier: calc.multiplier,
    convertedHours: calc.convertedHours,
    isHighlighted: calc.isHighlighted,
    multiplierNote: calc.multiplierNote,
    multiplierReason: calc.reason,
    status: t.status,
    startTime: t.startTime || null,
    deadline: t.deadline,
    executionTimeFormatted,
    executionDate: t.executionDate,
    shiftSession: t.shiftSession,
    assignedToUserId: t.assignedToUserId,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          fullName: t.assignee.fullName,
          email: t.assignee.email,
          employeeCode: t.assignee.employeeCode,
          avatarUrl: t.assignee.avatarUrl,
          role: t.assignee.role,
        }
      : null,
    feedback: t.feedback,
    resultLink: t.resultLink,
    proofFile: t.proofFile,
    note: t.note,
    location,
    campus: t.campus || null,
    room: t.room || null,
    creatorName,
    creatorAvatar,
    createdAtFormatted,
    fullDisplay: `${t.taskType ? t.taskType + ' - ' : ''}${t.title}${location && !t.title.includes(location) ? ' - ' + location : (t.note ? ' - ' + t.note : '')}`,
  };
};

/**
 * Lấy BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (Dạng bảng tuần chuẩn tham chiếu)
 * Hiển thị toàn bộ nhân sự / CTV theo 7 ngày trong tuần, mỗi ngày 3 buổi: Sáng (S), Chiều (C), Tối (T).
 * Các ký hiệu: LV, SV, NL, DP, NP, SX
 * Rê chuột vào ô SV hiển thị tooltip chứa tên sự vụ, thời gian giao, người giao, địa điểm.
 * Hỗ trợ tự động cập nhật thời gian thực, highlight ngày hiện tại và điều hướng tuần / tháng linh hoạt.
 */
const getWeeklySchedule = async (query = {}, user) => {
  // 1. Tự động hoàn thành các ca trực quá hạn theo thời gian thực
  try {
    await autoCompletePastConfirmedShifts();
  } catch (e) {
    console.error('Lỗi autoCompletePastConfirmedShifts khi lấy lịch tuần:', e);
  }

  // 2. Tính toán khoảng thời gian tuần (Thứ Hai đến Chủ Nhật) an toàn theo múi giờ địa phương
  let targetDate;
  if (query.startDate && query.startDate.length === 10) {
    const [y, m, d] = query.startDate.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  } else if (query.date && query.date.length === 10) {
    const [y, m, d] = query.date.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    targetDate = new Date();
    targetDate.setHours(12, 0, 0, 0);
  }

  const dayOfWeek = targetDate.getDay(); // 0 là Chủ Nhật, 1 là Thứ Hai...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = d.getDay();
    weekDays.push({
      dateStr,
      dayName: dayNames[dow],
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      formattedDate: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      isSunday: dow === 0,
      isToday: dateStr === todayStr,
    });
  }

  const startDate = weekDays[0].dateStr;
  const endDate = weekDays[6].dateStr;

  // 3. Lấy tất cả ca trực trong tuần (CONFIRMED hoặc COMPLETED)
  const shifts = await StudioShift.findAll({
    where: {
      date: { [Op.between]: [startDate, endDate] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'role'],
      },
    ],
    order: [['date', 'ASC'], ['shiftType', 'ASC']],
  });

  // 3b. Lấy các buổi CTV đăng ký nguyện vọng có thể trực (Availability) trong tuần
  const registrations = await ShiftRegistration.findAll({
    where: {
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'role'],
      },
    ],
  });

  const registrationsByUserAndDate = {};
  for (const reg of registrations) {
    const k = `${reg.userId}_${reg.date}`;
    if (!registrationsByUserAndDate[k]) registrationsByUserAndDate[k] = {};
    registrationsByUserAndDate[k][reg.session] = reg;
  }

  // 3c. Lấy thông tin đợt trực tương ứng với tuần này
  const midDay = weekDays[3] || weekDays[0];
  const dutyPeriod = await DutyPeriod.findOne({
    where: {
      month: midDay.month,
      year: midDay.year,
    },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'confirmer', attributes: ['id', 'fullName', 'email'] },
    ],
  });

  // 4. Lấy tất cả Tasks trong tuần (sự vụ)
  const tasks = await Task.findAll({
    where: {
      [Op.or]: [
        { executionDate: { [Op.between]: [startDate, endDate] } },
        {
          executionDate: null,
          startTime: {
            [Op.between]: [
              new Date(`${startDate}T00:00:00Z`),
              new Date(`${endDate}T23:59:59Z`),
            ],
          },
        },
        {
          executionDate: null,
          deadline: {
            [Op.between]: [
              new Date(`${startDate}T00:00:00Z`),
              new Date(`${endDate}T23:59:59Z`),
            ],
          },
        },
        {
          executionDate: null,
          deadline: null,
          createdAt: {
            [Op.between]: [
              new Date(`${startDate}T00:00:00Z`),
              new Date(`${endDate}T23:59:59Z`),
            ],
          },
        },
      ],
    },
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'role'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  // 5. Lấy danh sách nhân sự (COLLABORATOR và ADMIN)
  const activeUsers = await User.findAll({
    where: {
      role: { [Op.in]: ['COLLABORATOR', 'ADMIN'] },
      status: { [Op.ne]: 'DELETED' },
    },
    attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'role'],
    order: [['fullName', 'ASC']],
  });

  // Đảm bảo các user có ca trực hoặc task trong tuần này đều có mặt
  const userMap = new Map();
  for (const u of activeUsers) {
    userMap.set(u.id, u.toJSON ? u.toJSON() : u);
  }
  for (const s of shifts) {
    if (s.collaborator && !userMap.has(s.collaborator.id)) {
      userMap.set(s.collaborator.id, s.collaborator.toJSON ? s.collaborator.toJSON() : s.collaborator);
    }
  }
  for (const t of tasks) {
    if (t.assignee && !userMap.has(t.assignee.id)) {
      userMap.set(t.assignee.id, t.assignee.toJSON ? t.assignee.toJSON() : t.assignee);
    }
  }

  const usersList = Array.from(userMap.values()).sort((a, b) =>
    (a.fullName || '').localeCompare(b.fullName || '', 'vi')
  );

  // 6. Nhóm ca trực theo `${userId}_${dateStr}`
  const shiftsByUserAndDate = {};
  for (const s of shifts) {
    const k = `${s.userId}_${s.date}`;
    if (!shiftsByUserAndDate[k]) shiftsByUserAndDate[k] = [];
    shiftsByUserAndDate[k].push(s);
  }

  // 7. Nhóm tasks theo `${userId}_${dateStr}`
  const tasksByUserAndDate = {};
  for (const t of tasks) {
    if (!t.assignedToUserId) continue;
    let rawDate = t.executionDate
      ? String(t.executionDate).slice(0, 10)
      : (t.startTime
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(t.startTime))
          : (t.deadline ? t.deadline.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10)));

    let dateStr = rawDate;
    if (dateStr.length !== 10) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }

    const k = `${t.assignedToUserId}_${dateStr}`;
    if (!tasksByUserAndDate[k]) tasksByUserAndDate[k] = [];
    tasksByUserAndDate[k].push(t);
  }

  // 8. Xây dựng ma trận tuần cho từng User
  const rows = [];
  const columnTotals = {
    days: {},
    totalShifts: 0,
    sc: 0,
    sv: 0,
    d: 0,
    dp: 0,
    np: 0,
    sx: 0,
    dk: 0,
  };

  for (const wd of weekDays) {
    columnTotals.days[wd.dateStr] = { S: 0, C: 0, T: 0 };
  }

  let stt = 1;
  for (const u of usersList) {
    const userRow = {
      stt: stt++,
      user: {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        employeeCode: u.employeeCode,
        avatarUrl: u.avatarUrl,
        role: u.role,
      },
      days: {},
      summary: {
        totalShifts: 0,
        sc: 0,
        sv: 0,
        d: 0,
        dp: 0,
        np: 0,
        sx: 0,
        dk: 0,
      },
    };

    for (const wd of weekDays) {
      const dStr = wd.dateStr;
      const dayShifts = shiftsByUserAndDate[`${u.id}_${dStr}`] || [];
      const dayTasks = tasksByUserAndDate[`${u.id}_${dStr}`] || [];

      // Phân bổ session cho ngày
      const daySlot = {
        S: { symbol: '', shift: null, tasks: [], hasNote: false, isOfficial: false, isWish: false },
        C: { symbol: '', shift: null, tasks: [], hasNote: false, isOfficial: false, isWish: false },
        T: { symbol: '', shift: null, tasks: [], hasNote: false, isOfficial: false, isWish: false },
        dayTasks: dayTasks.map((t) => formatTaskInfo(t)),
      };

      // 1. Gán ca trực studio chính thức (được Nhân sự xác nhận)
      for (const s of dayShifts) {
        let sess = 'S';
        if (s.shiftType === 'AFTERNOON') sess = 'C';
        else if (s.shiftType === 'EVENING') sess = 'T';

        let sym = 'LV';
        if (s.attendanceSymbol === 'NL') sym = 'NL';
        else if (s.attendanceSymbol === 'DP' || (s.note && s.note.toUpperCase().includes('DP'))) sym = 'DP';

        daySlot[sess].symbol = sym;
        daySlot[sess].isOfficial = true;
        daySlot[sess].shift = {
          id: s.id,
          shiftType: s.shiftType,
          status: s.status,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
        };
        if (s.note) daySlot[sess].hasNote = true;
      }

      // 1b. Gán các buổi CTV đăng ký nguyện vọng rảnh (nếu chưa có ca trực chính thức)
      const userRegs = registrationsByUserAndDate[`${u.id}_${dStr}`];
      if (userRegs) {
        for (const sess of ['S', 'C', 'T']) {
          if (userRegs[sess] && !daySlot[sess].symbol) {
            daySlot[sess].symbol = 'ĐK';
            daySlot[sess].isWish = true;
            daySlot[sess].registration = {
              id: userRegs[sess].id,
              session: userRegs[sess].session,
              note: userRegs[sess].note,
            };
            daySlot[sess].hasNote = true;
            userRow.summary.dk++;
            columnTotals.dk++;
          }
        }
      }

      // 2. Gán sự vụ (SV)
      if (dayTasks.length > 0) {
        for (const t of dayTasks) {
          const formattedT = formatTaskInfo(t);
          let sess = t.shiftSession;
          if (!['S', 'C', 'T'].includes(sess)) {
            if (t.actualHours >= 5 && t.actualHours <= 8) {
              daySlot.S.symbol = 'SV';
              daySlot.S.tasks.push(formattedT);
              daySlot.S.hasNote = true;

              daySlot.C.symbol = 'SV';
              daySlot.C.tasks.push(formattedT);
              daySlot.C.hasNote = true;
              continue;
            } else if (t.actualHours > 8) {
              daySlot.S.symbol = 'SV';
              daySlot.S.tasks.push(formattedT);
              daySlot.S.hasNote = true;

              daySlot.C.symbol = 'SV';
              daySlot.C.tasks.push(formattedT);
              daySlot.C.hasNote = true;

              daySlot.T.symbol = 'SV';
              daySlot.T.tasks.push(formattedT);
              daySlot.T.hasNote = true;
              continue;
            } else {
              sess = daySlot.S.symbol === 'LV' ? 'C' : 'S';
            }
          }

          daySlot[sess].symbol = 'SV';
          daySlot[sess].tasks.push(formattedT);
          daySlot[sess].hasNote = true;
        }
      }

      // Cập nhật thống kê cột (Lưu ý: Đăng ký nguyện vọng 'ĐK' không tính vào ca làm việc chính thức)
      for (const sess of ['S', 'C', 'T']) {
        const sym = daySlot[sess].symbol;
        if (sym && sym !== 'ĐK') {
          columnTotals.days[dStr][sess]++;
          userRow.summary.totalShifts++;

          if (sym === 'LV') userRow.summary.sc++;
          else if (sym === 'SV') userRow.summary.sv++;
          else if (sym === 'DP') userRow.summary.dp++;
          else if (sym === 'NP') userRow.summary.np++;
          else if (sym === 'SX') userRow.summary.sx++;

          if (sess === 'T') userRow.summary.d++;
        }
      }

      userRow.days[dStr] = daySlot;
    }

    // Cộng dồn grand totals
    columnTotals.totalShifts += userRow.summary.totalShifts;
    columnTotals.sc += userRow.summary.sc;
    columnTotals.sv += userRow.summary.sv;
    columnTotals.d += userRow.summary.d;
    columnTotals.dp += userRow.summary.dp;
    columnTotals.np += userRow.summary.np;
    columnTotals.sx += userRow.summary.sx;

    rows.push(userRow);
  }

  return {
    weekRange: {
      startDate,
      endDate,
      title: `BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (Ngày ${weekDays[0].formattedDate.slice(0, 5)} - ${weekDays[6].formattedDate})`,
    },
    weekDays,
    rows,
    columnTotals,
    todayStr,
    dutyPeriod: dutyPeriod
      ? {
          id: dutyPeriod.id,
          month: dutyPeriod.month,
          year: dutyPeriod.year,
          status: dutyPeriod.status,
          registrationDeadline: dutyPeriod.registrationDeadline,
        }
      : null,
  };
};

/**
 * Helper chuyển số thứ tự cột (1-based) sang chữ cái cột Excel (A, B, ..., Z, AA, AB...)
 */
const colIndexToLetter = (colIdx) => {
  let letter = '';
  let n = colIdx;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
};

/**
 * Xuất file Excel Bảng phân công lịch trực tuần (mẫu BPTT)
 * - ADMIN: xuất toàn bộ nhân sự BPTT theo bộ lọc đang chọn (date, search, role)
 * - COLLABORATOR: chỉ được xuất dữ liệu lịch trực & sự vụ cá nhân của chính mình (RBAC)
 */
const exportWeeklyScheduleExcel = async (query = {}, currentUser, res) => {
  const data = await getWeeklySchedule(query, currentUser);
  const isCollaborator = currentUser && currentUser.role === 'COLLABORATOR';

  let filteredRows = data.rows || [];
  if (isCollaborator) {
    filteredRows = filteredRows.filter((r) => r.user && r.user.id === currentUser.id);
  } else {
    if (query.role && query.role !== 'ALL') {
      filteredRows = filteredRows.filter((r) => r.user && r.user.role === query.role);
    }
    if (query.search && String(query.search).trim()) {
      const kw = String(query.search).trim().toLowerCase();
      filteredRows = filteredRows.filter((r) => {
        const u = r.user || {};
        return (
          (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
          (u.employeeCode && u.employeeCode.toLowerCase().includes(kw)) ||
          (u.email && u.email.toLowerCase().includes(kw))
        );
      });
    }
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU Media Studio System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lich_Truc_Tuan', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };
  const headerBorder = {
    top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    right: { style: 'thin', color: { argb: 'FF1E3A8A' } },
  };

  const totalCols = 31; // A..D (4) + 7*3 (21 -> E..Y) + 6 summary (Z..AE)
  const lastColLetter = colIndexToLetter(totalCols); // AE

  // Banner tiêu đề
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const orgCell = sheet.getCell('A1');
  orgCell.value = 'TRƯỜNG ĐẠI HỌC LẠC HỒNG - BỘ PHẬN TRUYỀN THÔNG (LHU MEDIA STUDIO)';
  orgCell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  orgCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 22;

  sheet.mergeCells(`A2:${lastColLetter}2`);
  const titleCell = sheet.getCell('A2');
  const startFmt = data.weekDays[0]?.formattedDate || '';
  const endFmt = data.weekDays[6]?.formattedDate || '';
  titleCell.value = isCollaborator
    ? `LỊCH LÀM VIỆC & TRỰC STUDIO CÁ NHÂN (${startFmt} - ${endFmt})`
    : `BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (${startFmt} - ${endFmt})`;
  titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 26;

  const nowVN = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const filterParts = [];
  if (isCollaborator) {
    filterParts.push(`Cá nhân: ${currentUser.fullName || currentUser.email}`);
  } else {
    if (query.role && query.role !== 'ALL') {
      filterParts.push(`Vai trò: ${query.role === 'ADMIN' ? 'Nhân sự' : 'CTV'}`);
    }
    if (query.search && String(query.search).trim()) {
      filterParts.push(`Tìm kiếm: "${String(query.search).trim()}"`);
    }
  }
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const metaCell = sheet.getCell('A3');
  metaCell.value = `Thời điểm xuất: ${nowVN}${filterParts.length ? `  |  Phạm vi: ${filterParts.join(' • ')}` : '  |  Phạm vi: Toàn bộ nhân sự BPTT'}`;
  metaCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;
  sheet.getRow(4).height = 8;

  // Header 2 tầng (Row 5 & Row 6)
  const fixedHeaders = [
    { col: 1, label: 'STT', width: 6 },
    { col: 2, label: 'Họ và tên', width: 26 },
    { col: 3, label: 'Vai trò', width: 12 },
    { col: 4, label: 'Tổng ca', width: 10 },
  ];
  for (const h of fixedHeaders) {
    const colLetter = colIndexToLetter(h.col);
    sheet.mergeCells(`${colLetter}5:${colLetter}6`);
    const cell = sheet.getCell(`${colLetter}5`);
    cell.value = h.label;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getColumn(h.col).width = h.width;
    sheet.getCell(`${colLetter}5`).border = headerBorder;
    sheet.getCell(`${colLetter}6`).border = headerBorder;
  }

  // 7 ngày trong tuần (E..Y)
  for (let i = 0; i < data.weekDays.length; i++) {
    const wd = data.weekDays[i];
    const startCol = 5 + i * 3;
    const c1 = colIndexToLetter(startCol);
    const c3 = colIndexToLetter(startCol + 2);
    sheet.mergeCells(`${c1}5:${c3}5`);
    const dayCell = sheet.getCell(`${c1}5`);
    dayCell.value = `${wd.dayName}\n${wd.formattedDate.slice(0, 5)}`;
    dayCell.font = {
      name: 'Times New Roman',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    dayCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: wd.isSunday ? 'FF9F1239' : 'FF1D4ED8' },
    };
    dayCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const sessions = ['S', 'C', 'T'];
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const sc = startCol + sIdx;
      sheet.getColumn(sc).width = 5.5;
      sheet.getCell(5, sc).border = headerBorder;
      const subCell = sheet.getCell(6, sc);
      subCell.value = sessions[sIdx];
      subCell.font = {
        name: 'Times New Roman',
        size: 10,
        bold: true,
        color: { argb: wd.isSunday ? 'FF9F1239' : 'FF1E3A8A' },
      };
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: wd.isSunday ? 'FFFFE4E6' : 'FFDBEAFE' },
      };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.border = headerBorder;
    }
  }

  // Các cột thống kê tổng hợp (Z..AE)
  const summaryHeaders = [
    { col: 26, label: 'LV\n(Trực)', width: 8 },
    { col: 27, label: 'SV\n(Sự vụ)', width: 8 },
    { col: 28, label: 'Đêm\n(Ca T)', width: 8 },
    { col: 29, label: 'DP', width: 7 },
    { col: 30, label: 'NP', width: 7 },
    { col: 31, label: 'ĐK\n(Rảnh)', width: 8 },
  ];
  for (const sh of summaryHeaders) {
    const colLetter = colIndexToLetter(sh.col);
    sheet.mergeCells(`${colLetter}5:${colLetter}6`);
    const cell = sheet.getCell(`${colLetter}5`);
    cell.value = sh.label;
    cell.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getColumn(sh.col).width = sh.width;
    sheet.getCell(`${colLetter}5`).border = headerBorder;
    sheet.getCell(`${colLetter}6`).border = headerBorder;
  }

  sheet.getRow(5).height = 30;
  sheet.getRow(6).height = 20;

  const symbolStyles = {
    LV: { fill: 'FFDBEAFE', color: 'FF1E40AF', bold: true, italic: false },
    SV: { fill: 'FFFEF3C7', color: 'FF92400E', bold: true, italic: false },
    ĐK: { fill: 'FFECFDF5', color: 'FF047857', bold: false, italic: true },
    DP: { fill: 'FFF3E8FF', color: 'FF6B21A8', bold: true, italic: false },
    NP: { fill: 'FFF1F5F9', color: 'FF475569', bold: true, italic: false },
    NL: { fill: 'FFFFE4E6', color: 'FFBE123C', bold: true, italic: false },
    SX: { fill: 'FFE0F2FE', color: 'FF0369A1', bold: true, italic: false },
  };

  let curRow = 7;
  const startDataRow = 7;
  const collectedTasks = [];
  const seenTaskKey = new Set();

  if (filteredRows.length === 0) {
    sheet.mergeCells(`A7:${lastColLetter}7`);
    const emptyCell = sheet.getCell('A7');
    emptyCell.value = 'Không có dữ liệu lịch trực phù hợp với bộ lọc trong tuần này.';
    emptyCell.font = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(7).height = 28;
    for (let c = 1; c <= totalCols; c++) {
      sheet.getCell(7, c).border = thinBorder;
    }
    curRow = 8;
  } else {
    filteredRows.forEach((rowData, idx) => {
      const r = curRow;
      const excelRow = sheet.getRow(r);
      excelRow.height = 22;

      const u = rowData.user || {};
      const cStt = sheet.getCell(r, 1);
      cStt.value = idx + 1;
      cStt.alignment = { horizontal: 'center', vertical: 'middle' };

      const cName = sheet.getCell(r, 2);
      cName.value = u.employeeCode ? `${u.fullName} (${u.employeeCode})` : (u.fullName || '');
      cName.alignment = { horizontal: 'left', vertical: 'middle' };

      const cRole = sheet.getCell(r, 3);
      cRole.value = u.role === 'ADMIN' ? 'Nhân sự' : 'CTV';
      cRole.alignment = { horizontal: 'center', vertical: 'middle' };

      const cTotal = sheet.getCell(r, 4);
      cTotal.value = {
        formula: `COUNTA(E${r}:Y${r})-COUNTIF(E${r}:Y${r},"ĐK")`,
        result: rowData.summary?.totalShifts || 0,
      };
      cTotal.alignment = { horizontal: 'center', vertical: 'middle' };
      cTotal.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

      for (let dIdx = 0; dIdx < data.weekDays.length; dIdx++) {
        const wd = data.weekDays[dIdx];
        const dayObj = rowData.days?.[wd.dateStr];
        const startCol = 5 + dIdx * 3;

        if (dayObj?.dayTasks && dayObj.dayTasks.length > 0) {
          for (const t of dayObj.dayTasks) {
            const tk = `${t.id}_${u.id}_${wd.dateStr}`;
            if (!seenTaskKey.has(tk)) {
              seenTaskKey.add(tk);
              collectedTasks.push({
                dateStr: wd.dateStr,
                formattedDate: wd.formattedDate,
                dayName: wd.dayName,
                userName: u.fullName || '',
                userRole: u.role === 'ADMIN' ? 'Nhân sự' : 'CTV',
                task: t,
              });
            }
          }
        }

        const sessList = ['S', 'C', 'T'];
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const sess = sessList[sIdx];
          const slot = dayObj?.[sess];
          const sym = slot?.symbol || '';
          const cell = sheet.getCell(r, startCol + sIdx);
          cell.value = sym ? sym : null;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;

          if (sym && symbolStyles[sym]) {
            const st = symbolStyles[sym];
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.fill } };
            cell.font = { name: 'Times New Roman', size: 10, bold: st.bold, italic: st.italic, color: { argb: st.color } };
          } else {
            cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF334155' } };
            if (wd.isSunday) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
            }
          }
        }
      }

      // Cột tổng hợp theo dòng
      const sumCells = [
        { col: 26, formula: `COUNTIF(E${r}:Y${r},"LV")`, result: rowData.summary?.sc || 0 },
        { col: 27, formula: `COUNTIF(E${r}:Y${r},"SV")`, result: rowData.summary?.sv || 0 },
        { col: 28, value: rowData.summary?.d || 0 },
        { col: 29, formula: `COUNTIF(E${r}:Y${r},"DP")`, result: rowData.summary?.dp || 0 },
        { col: 30, formula: `COUNTIF(E${r}:Y${r},"NP")`, result: rowData.summary?.np || 0 },
        { col: 31, formula: `COUNTIF(E${r}:Y${r},"ĐK")`, result: rowData.summary?.dk || 0 },
      ];
      for (const sc of sumCells) {
        const cell = sheet.getCell(r, sc.col);
        cell.value = sc.formula ? { formula: sc.formula, result: sc.result } : sc.value;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: sc.col <= 27, color: { argb: 'FF0F172A' } };
        cell.border = thinBorder;
      }

      for (let c = 1; c <= 4; c++) {
        const cell = sheet.getCell(r, c);
        if (c !== 4) {
          cell.font = { name: 'Times New Roman', size: 10, bold: c === 2, color: { argb: 'FF0F172A' } };
        }
        cell.border = thinBorder;
      }

      curRow++;
    });

    // Dòng TỔNG CỘNG
    const lastDataRow = curRow - 1;
    const totalRow = sheet.getRow(curRow);
    totalRow.height = 24;
    sheet.mergeCells(`A${curRow}:C${curRow}`);
    const tLabel = sheet.getCell(curRow, 1);
    tLabel.value = `TỔNG CỘNG (${filteredRows.length} nhân sự)`;
    tLabel.alignment = { horizontal: 'center', vertical: 'middle' };

    const totalShiftsVal = filteredRows.reduce((acc, r) => acc + (r.summary?.totalShifts || 0), 0);
    sheet.getCell(curRow, 4).value = {
      formula: `SUM(D${startDataRow}:D${lastDataRow})`,
      result: totalShiftsVal,
    };

    for (let dIdx = 0; dIdx < data.weekDays.length; dIdx++) {
      const wd = data.weekDays[dIdx];
      const startCol = 5 + dIdx * 3;
      const sessList = ['S', 'C', 'T'];
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const cIdx = startCol + sIdx;
        const cLet = colIndexToLetter(cIdx);
        const sess = sessList[sIdx];
        const countResult = filteredRows.reduce((acc, r) => {
          const sym = r.days?.[wd.dateStr]?.[sess]?.symbol;
          return acc + (sym && sym !== 'ĐK' ? 1 : 0);
        }, 0);
        sheet.getCell(curRow, cIdx).value = {
          formula: `COUNTA(${cLet}${startDataRow}:${cLet}${lastDataRow})-COUNTIF(${cLet}${startDataRow}:${cLet}${lastDataRow},"ĐK")`,
          result: countResult,
        };
      }
    }

    const sumKeys = ['sc', 'sv', 'd', 'dp', 'np', 'dk'];
    sumKeys.forEach((k, idx) => {
      const cIdx = 26 + idx;
      const cLet = colIndexToLetter(cIdx);
      const val = filteredRows.reduce((acc, r) => acc + (r.summary?.[k] || 0), 0);
      sheet.getCell(curRow, cIdx).value = {
        formula: `SUM(${cLet}${startDataRow}:${cLet}${lastDataRow})`,
        result: val,
      };
    });

    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(curRow, c);
      cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      if (c > 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = headerBorder;
    }
    curRow++;
  }

  // Ghi chú ký hiệu
  curRow++;
  sheet.mergeCells(`A${curRow}:${lastColLetter}${curRow}`);
  const legendCell = sheet.getCell(curRow, 1);
  legendCell.value = 'Chú thích ký hiệu:  LV = Trực Studio chính thức (4 giờ/ca)  |  SV = Tham gia sự vụ / công việc được phân công  |  ĐK = Nguyện vọng CTV đăng ký có thể trực (chưa chốt)  |  DP = Dự phòng  |  NP = Nghỉ phép  |  S/C/T = Sáng / Chiều / Tối';
  legendCell.font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  legendCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(curRow).height = 20;

  // =========================================================================
  // SHEET 2: CHI TIẾT SỰ VỤ TRONG TUẦN
  // =========================================================================
  const taskSheet = workbook.addWorksheet('Chi_Tiet_Su_Vu_Tuan', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  taskSheet.mergeCells('A1:L1');
  taskSheet.getCell('A1').value = `CHI TIẾT SỰ VỤ / CÔNG VIỆC TRONG TUẦN (${startFmt} - ${endFmt})`;
  taskSheet.getCell('A1').font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  taskSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  taskSheet.getRow(1).height = 26;

  taskSheet.mergeCells('A2:L2');
  taskSheet.getCell('A2').value = 'Các dòng tô nền vàng hổ phách là sự vụ có áp dụng hệ số ngoài giờ (×1,5) hoặc Chủ nhật (×2,0).';
  taskSheet.getCell('A2').font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF92400E' } };
  taskSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  taskSheet.getRow(2).height = 18;
  taskSheet.getRow(3).height = 8;

  const taskHeaders = [
    { label: 'STT', width: 6 },
    { label: 'Ngày thực hiện', width: 14 },
    { label: 'Thứ', width: 12 },
    { label: 'Buổi', width: 9 },
    { label: 'Nhân sự / CTV', width: 24 },
    { label: 'Nội dung công việc', width: 36 },
    { label: 'Loại nhiệm vụ', width: 18 },
    { label: 'Giờ thực tế', width: 12 },
    { label: 'Hệ số', width: 10 },
    { label: 'Giờ quy đổi', width: 12 },
    { label: 'Địa điểm', width: 20 },
    { label: 'Ghi chú / Hệ số', width: 28 },
  ];
  const thRow = taskSheet.getRow(4);
  thRow.height = 26;
  taskHeaders.forEach((h, i) => {
    taskSheet.getColumn(i + 1).width = h.width;
    const cell = thRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = headerBorder;
  });

  collectedTasks.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.userName.localeCompare(b.userName, 'vi'));

  if (collectedTasks.length === 0) {
    taskSheet.mergeCells('A5:L5');
    const emptyT = taskSheet.getCell('A5');
    emptyT.value = 'Không có sự vụ / công việc nào được ghi nhận trong tuần này.';
    emptyT.font = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF64748B' } };
    emptyT.alignment = { horizontal: 'center', vertical: 'middle' };
    taskSheet.getRow(5).height = 26;
    for (let c = 1; c <= 12; c++) taskSheet.getCell(5, c).border = thinBorder;
  } else {
    const sessLabel = { S: 'Sáng', C: 'Chiều', T: 'Tối' };
    collectedTasks.forEach((item, idx) => {
      const r = 5 + idx;
      const t = item.task || {};
      const actualH = Number(t.actualHours || 0);
      const mult = Number(t.multiplier || 1);
      const convH = Number(t.convertedHours != null ? t.convertedHours : Number((actualH * mult).toFixed(2)));
      const isHighlight = mult > 1 || Boolean(t.isHighlighted);
      const row = taskSheet.getRow(r);
      row.height = 22;

      const values = [
        idx + 1,
        item.formattedDate,
        item.dayName,
        sessLabel[t.shiftSession] || t.shiftSession || '—',
        item.userName,
        t.title || '',
        t.taskType || t.otherTaskType || 'Sự vụ',
        actualH,
        mult,
        { formula: `ROUND(H${r}*I${r},2)`, result: convH },
        t.location || [t.campus, t.room].filter(Boolean).join(' - ') || '—',
        t.multiplierNote || t.note || '',
      ];

      values.forEach((v, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = v;
        cell.font = {
          name: 'Times New Roman',
          size: 10,
          bold: isHighlight && (cIdx === 8 || cIdx === 9),
          color: { argb: isHighlight ? 'FF92400E' : 'FF0F172A' },
        };
        if (isHighlight) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        }
        cell.border = thinBorder;
        if ([0, 1, 2, 3, 7, 8, 9].includes(cIdx)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
        if (cIdx === 7 || cIdx === 9) cell.numFmt = '0.##';
        if (cIdx === 8) cell.numFmt = '"×"0.0';
      });
    });

    const totalTaskRowIdx = 5 + collectedTasks.length;
    const tr = taskSheet.getRow(totalTaskRowIdx);
    tr.height = 24;
    taskSheet.mergeCells(`A${totalTaskRowIdx}:G${totalTaskRowIdx}`);
    tr.getCell(1).value = `TỔNG CỘNG (${collectedTasks.length} sự vụ)`;
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const sumAct = collectedTasks.reduce((s, it) => s + Number(it.task?.actualHours || 0), 0);
    const sumConv = collectedTasks.reduce((s, it) => {
      const a = Number(it.task?.actualHours || 0);
      const m = Number(it.task?.multiplier || 1);
      return s + Number(it.task?.convertedHours != null ? it.task.convertedHours : (a * m));
    }, 0);

    tr.getCell(8).value = { formula: `SUM(H5:H${totalTaskRowIdx - 1})`, result: Number(sumAct.toFixed(2)) };
    tr.getCell(8).numFmt = '0.##';
    tr.getCell(10).value = { formula: `SUM(J5:J${totalTaskRowIdx - 1})`, result: Number(sumConv.toFixed(2)) };
    tr.getCell(10).numFmt = '0.##';

    for (let c = 1; c <= 12; c++) {
      const cell = tr.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      if (c >= 8) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = headerBorder;
    }
  }

  const startSlug = (data.weekRange.startDate || '').replace(/-/g, '');
  const endSlug = (data.weekRange.endDate || '').replace(/-/g, '');
  const prefix = isCollaborator ? 'LHU_Media_Lich_Truc_Ca_Nhan' : 'LHU_Media_Lich_Truc_Tuan';
  const filename = `${prefix}_${startSlug}_${endSlug}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  createDutyPeriod,
  getDutyPeriods,
  updateDutyPeriodStatus,
  checkPeriodDeletionSafety,
  deleteDutyPeriod,
  registerAvailability,
  getCTVRegistrations,
  getPeriodRegistrationsSummary,
  assignShifts,
  confirmPeriodSchedule,
  getScheduleHistories,
  registerShift,
  confirmShift,
  completeShift,
  cancelShift,
  getShifts,
  getWeeklySchedule,
  exportWeeklyScheduleExcel,
  calculateDefaultDeadline,
  isShiftEnded,
  autoCompletePastConfirmedShifts,
};
