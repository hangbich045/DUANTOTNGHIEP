'use strict';

/**
 * @file services/duty.service.js
 * @description Nghiệp vụ quản lý ca trực Studio CTV (FR-05, QUY_TAC.md Mục 6 & 7).
 * Hỗ trợ Quy trình đăng ký - sắp xếp ca trực 3 giai đoạn:
 * 1. Nhân sự tạo đợt đăng ký ca trực tháng mới
 * 2. CTV đăng ký thời gian có thể trực (Availability)
 * 3. Nhân sự sắp xếp và xác nhận lịch trực chính thức
 */

const { Op } = require('sequelize');
const {
  StudioShift,
  DutyPeriod,
  ShiftRegistration,
  Notification,
  User,
  AttendanceRecord,
  sequelize,
} = require('../models');

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

// =========================================================================
// GIAI ĐOẠN 1: NHÂN SỰ TẠO VÀ QUẢN LÝ ĐỢT ĐĂNG KÝ CA TRỰC THÁNG MỚI
// =========================================================================

/**
 * Khởi tạo đợt đăng ký ca trực cho tháng mới
 */
const createDutyPeriod = async (adminUserId, data) => {
  const { month, year, registrationDeadline, note } = data;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (!m || !y || m < 1 || m > 12) {
    const error = new Error('Tháng và năm không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra không tạo trùng đợt đăng ký cùng tháng
  const existing = await DutyPeriod.findOne({
    where: { month: m, year: y },
  });

  if (existing) {
    const error = new Error(`Đợt đăng ký ca trực Tháng ${m}/${y} đã được tạo trước đó`);
    error.statusCode = 400;
    throw error;
  }

  const period = await DutyPeriod.create({
    month: m,
    year: y,
    status: 'OPEN',
    registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
    note: note ? note.trim() : null,
    createdByUserId: adminUserId,
  });

  // Gửi thông báo đến toàn bộ CTV đang hoạt động
  try {
    const collaborators = await User.findAll({
      where: { role: 'COLLABORATOR', isActive: true },
      attributes: ['id'],
    });

    if (collaborators.length > 0) {
      const deadlineStr = registrationDeadline
        ? ` (Hạn chót: ${new Date(registrationDeadline).toLocaleDateString('vi-VN')})`
        : '';
      const notifs = collaborators.map((c) => ({
        userId: c.id,
        title: `Mở đợt đăng ký ca trực Studio Tháng ${m}/${y}`,
        message: `Bộ phận Truyền thông đã mở đợt đăng ký ca trực Tháng ${m}/${y}${deadlineStr}. Vui lòng truy cập để chọn các ngày/buổi bạn có thể tham gia trực.`,
        type: 'DUTY_PERIOD_OPEN',
        link: '/tasks',
      }));
      await Notification.bulkCreate(notifs);
    }
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
  if (status && status !== 'ALL') where.status = status;

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

  // Đính kèm số lượng CTV đã đăng ký
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
    results.push({
      ...p.toJSON(),
      registeredCtvCount: regCount,
      assignedShiftCount: assignedCount,
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

  // Kiểm tra thời hạn nếu có
  if (period.registrationDeadline) {
    const deadline = new Date(period.registrationDeadline);
    deadline.setHours(23, 59, 59, 999);
    if (new Date() > deadline) {
      const error = new Error('Đã hết thời hạn đăng ký ca trực cho đợt này.');
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

    // 3. Thông báo cho Admin (Người tạo đợt)
    try {
      const user = await User.findByPk(userId, { attributes: ['fullName'] });
      await Notification.create({
        userId: period.createdByUserId,
        title: `CTV ${user?.fullName || ''} đã gửi đăng ký ca trực`,
        message: `Cộng tác viên ${user?.fullName || ''} đã cập nhật ${recordsToCreate.length} buổi có thể trực trong Tháng ${period.month}/${period.year}.`,
        type: 'DUTY_REGISTRATION_SUBMITTED',
        link: '/admin/duty',
      });
    } catch {
      // bỏ qua lỗi gửi notif
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
// GIAI ĐOẠN 3: NHÂN SỰ SẮP XẾP VÀ XÁC NHẬN LỊCH TRỰC THÁNG
// =========================================================================

/**
 * Lấy bảng tổng hợp đăng ký ca trực của tất cả CTV trong một đợt (phục vụ xếp lịch)
 */
const getPeriodRegistrationsSummary = async (periodId) => {
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

  // Tạo metadata các ngày trong tháng
  const daysMeta = [];
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(year, month - 1, d);
    daysMeta.push({
      day: d,
      dayOfWeek: DOW_NAMES[dateObj.getDay()],
      isSunday: dateObj.getDay() === 0,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // 1. Lấy tất cả CTV đăng ký rảnh (ShiftRegistration)
  const registrations = await ShiftRegistration.findAll({
    where: { periodId },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl'],
      },
    ],
    order: [['date', 'ASC'], ['session', 'ASC']],
  });

  // 2. Lấy tất cả ca trực đã được phân công (StudioShift)
  const assignedShifts = await StudioShift.findAll({
    where: {
      periodId,
      status: { [Op.ne]: 'CANCELLED' },
    },
    include: [
      {
        model: User,
        as: 'collaborator',
        attributes: ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl'],
      },
    ],
  });

  // Tổ chức cấu trúc ma trận theo ngày và buổi
  // slotMap[dateStr][session] = { registeredCTVs: [], assignedCTVs: [] }
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
      slots[dStr][sess].registered.push({
        id: reg.id,
        user: reg.collaborator,
        note: reg.note,
      });
    }
  }

  for (const shift of assignedShifts) {
    const dStr = shift.date;
    let sess = 'S';
    if (shift.shiftType === 'AFTERNOON') sess = 'C';
    else if (shift.shiftType === 'EVENING') sess = 'T';

    if (slots[dStr] && slots[dStr][sess]) {
      slots[dStr][sess].assigned.push({
        shiftId: shift.id,
        user: shift.collaborator,
        status: shift.status,
        note: shift.note,
      });
    }
  }

  return {
    period,
    daysCount,
    daysMeta,
    slots,
  };
};

/**
 * Nhân sự sắp xếp / phân công ca trực (Lưu tạm hoặc cập nhật phân công)
 */
const assignShifts = async (adminUserId, periodId, assignments) => {
  const period = await DutyPeriod.findByPk(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy đợt đăng ký ca trực');
    error.statusCode = 404;
    throw error;
  }

  if (period.status === 'CONFIRMED') {
    const error = new Error('Lịch trực của đợt này đã được chốt và xác nhận chính thức, không thể sửa đổi.');
    error.statusCode = 400;
    throw error;
  }

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
    // 1. Xóa các ca trực cũ được phân công trong đợt này mà chưa COMPLETED
    await StudioShift.destroy({
      where: {
        periodId,
        status: { [Op.in]: ['REGISTERED', 'CONFIRMED'] },
      },
      transaction: t,
    });

    // 2. Tạo các ca trực phân công mới
    const shiftsToCreate = [];
    for (const a of assignments) {
      if (!a.userId || !a.date || !a.session) continue;
      const timing = SHIFT_TIMES[a.session] || SHIFT_TIMES.S;
      shiftsToCreate.push({
        periodId,
        userId: a.userId,
        date: a.date,
        shiftType: timing.shiftType,
        startTime: timing.startTime,
        endTime: timing.endTime,
        hours: 4.00,
        status: 'CONFIRMED', // Đã được phân công
        attendanceSymbol: 'LV',
        note: a.note || null,
        confirmedByUserId: adminUserId,
      });
    }

    if (shiftsToCreate.length > 0) {
      await StudioShift.bulkCreate(shiftsToCreate, { transaction: t });
    }

    // Chuyển trạng thái period sang ARRANGING nếu đang là OPEN/CLOSED
    if (period.status === 'OPEN' || period.status === 'CLOSED') {
      period.status = 'ARRANGING';
      await period.save({ transaction: t });
    }

    await t.commit();
    return { success: true, count: shiftsToCreate.length };
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

    // 3. Tự động ghi nhận ca trực vào Bảng chấm công (AttendanceRecords) với ký hiệu 'LV'
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

      // Kiểm tra hoặc tạo cell attendance
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

    // 4. Gửi thông báo đến từng CTV có ca trực chính thức
    try {
      const ctvIds = [...new Set(shifts.map((s) => s.userId))];
      const notifs = ctvIds.map((cid) => ({
        userId: cid,
        title: `Lịch trực Studio Tháng ${period.month}/${period.year} đã được phê duyệt`,
        message: `Bộ phận Truyền thông đã xác nhận lịch trực chính thức Tháng ${period.month}/${period.year}. Vui lòng kiểm tra lịch trực của bạn tại trang Nhiệm vụ & Ca trực.`,
        type: 'DUTY_SCHEDULE_CONFIRMED',
        link: '/tasks',
      }));
      await Notification.bulkCreate(notifs);
    } catch {
      // ignore notif error
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

// =========================================================================
// CÁC HÀM XỬ LÝ CA TRỰC ĐƠN LẺ HIỆN CÓ (TƯƠNG THÍCH NGƯỢC)
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

  // Tìm periodId tương ứng nếu có
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
    hours: 4.00,
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

  return shift;
};

const completeShift = async (shiftId, userId, userRole) => {
  const shift = await StudioShift.findByPk(shiftId);
  if (!shift) {
    const error = new Error('Không tìm thấy ca trực');
    error.statusCode = 404;
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

  if (userRole !== 'ADMIN' && shift.userId !== userId) {
    const error = new Error('Bạn không có quyền thao tác trên ca trực này (Quy tắc TC-07)');
    error.statusCode = 403;
    throw error;
  }

  shift.status = 'COMPLETED';
  await shift.save();

  return shift;
};

const cancelShift = async (shiftId, userId, userRole) => {
  const shift = await StudioShift.findByPk(shiftId);
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

  shift.status = 'CANCELLED';
  await shift.save();

  return shift;
};

const getShifts = async (query, user) => {
  const { month, year, userId, status, periodId } = query;
  const where = {};

  if (periodId) {
    where.periodId = periodId;
  } else if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    where.date = { [Op.between]: [startDate, endDate] };
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

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
  createDutyPeriod,
  getDutyPeriods,
  updateDutyPeriodStatus,
  registerAvailability,
  getCTVRegistrations,
  getPeriodRegistrationsSummary,
  assignShifts,
  confirmPeriodSchedule,
  registerShift,
  confirmShift,
  completeShift,
  cancelShift,
  getShifts,
};
