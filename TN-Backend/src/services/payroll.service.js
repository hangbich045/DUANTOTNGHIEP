'use strict';

/**
 * @file services/payroll.service.js
 * @description Nghiệp vụ chấm công, thống kê công việc và tính lương CTV (FR-05).
 * Tuân thủ biểu mẫu thực tế của Bộ phận Truyền thông - Đại học Lạc Hồng (sheet T10.2026 và Sheet1).
 */

const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { User, Task, StudioShift, AttendanceRecord, MonthlyPayroll, sequelize } = require('../models');

// Thứ trong tuần tiếng Việt chuẩn Excel LHU
const DOW_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Chuyển đổi giữa shiftType của StudioShift và mã buổi S, C, T
 */
const shiftTypeToSession = (shiftType) => {
  if (shiftType === 'AFTERNOON') return 'C';
  if (shiftType === 'EVENING') return 'T';
  return 'S';
};

const sessionToShiftType = (session) => {
  if (session === 'C') return 'AFTERNOON';
  if (session === 'T') return 'EVENING';
  return 'MORNING';
};

/**
 * Lấy số ngày trong tháng
 */
const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Chuẩn hóa ngày thực hiện công việc (YYYY-MM-DD)
 * Tự động hỗ trợ cả định dạng DD/MM/YYYY, DD-MM-YYYY và sửa trường hợp date picker đảo 02/11 thành 2026-02-11
 */
const normalizeExecutionDate = (dateInput) => {
  if (!dateInput) {
    return new Date().toISOString().slice(0, 10);
  }

  let str = String(dateInput).trim().split('T')[0];

  // Nếu định dạng DD/MM/YYYY hoặc DD-MM-YYYY (ví dụ: 02/11/2026 hoặc 02-11-2026)
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // Khắc phục lỗi date picker en-US đảo ngày đầu tháng 11 (01..09/11) thành YYYY-0M-11
  const swappedNovMatch = str.match(/^(\d{4})-0([1-9])-11$/);
  if (swappedNovMatch) {
    return `${swappedNovMatch[1]}-11-0${swappedNovMatch[2]}`;
  }

  return str;
};

/**
 * Xác định danh sách buổi gán SV dựa theo tổng thời gian làm việc thực tế trong ngày (actualHours).
 * 
 * Quy tắc nghiệp vụ bắt buộc:
 * - Dưới 5 tiếng (bao gồm cả dưới 4h và từ 4 đến dưới 5h): SV buổi sáng (S)
 * - Từ 5 đến 8 tiếng: SV buổi sáng và chiều (S + C)
 * - Trên 8 tiếng: SV cả sáng, chiều và tối (S + C + T)
 * - 0 hoặc không có giờ: Không gán SV
 * 
 * @param {number} dayHours - Tổng giờ làm việc thực tế trong ngày
 * @returns {{ sessions: string[], isPendingConfirmation: boolean }}
 */
const getSessionsForDayHours = (dayHours) => {
  const h = parseFloat(dayHours) || 0;
  if (h <= 0) {
    return { sessions: [], isPendingConfirmation: false };
  }
  // Dưới 5 tiếng (từ 4 đến dưới 5 tiếng đã được chốt phân bổ buổi sáng): SV buổi sáng (S)
  if (h < 5) {
    return { sessions: ['S'], isPendingConfirmation: false };
  }
  if (h >= 5 && h <= 8) {
    return { sessions: ['S', 'C'], isPendingConfirmation: false };
  }
  if (h > 8) {
    return { sessions: ['S', 'C', 'T'], isPendingConfirmation: false };
  }
  return { sessions: ['S'], isPendingConfirmation: false };
};

/**
 * Tự động đồng bộ công việc COMPLETED của CTV trong ngày vào bảng AttendanceRecords (Database CSDL).
 * Tự động chuyển ký hiệu từ LV sang SV tại các buổi tương ứng.
 * 
 * @param {string} userId - UUID của CTV
 * @param {string|Date} executionDate - Ngày phát sinh công việc (YYYY-MM-DD)
 */
const syncTaskAttendanceToDatabase = async (userId, executionDate) => {
  if (!userId || !executionDate) return null;

  const dateStr = normalizeExecutionDate(executionDate);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  // 1. Chỉ lấy tất cả task COMPLETED (đã được Nhân sự nghiệm thu chính thức) của CTV trong ngày này
  const tasks = await Task.findAll({
    where: {
      assignedToUserId: userId,
      status: 'COMPLETED',
    },
  });

  const dayTasks = tasks.filter((t) => {
    const rawDate = t.executionDate
      ? String(t.executionDate).slice(0, 10)
      : (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
    const tDate = normalizeExecutionDate(rawDate);
    return tDate === dateStr;
  });

  const totalDayHours = dayTasks.reduce((sum, t) => sum + (parseFloat(t.actualHours) || 0), 0);
  const { sessions: targetSessions, isPendingConfirmation } = getSessionsForDayHours(totalDayHours);

  // Nếu rơi vào khoảng từ 4 đến dưới 5 tiếng: giữ nguyên trạng thái hiện tại
  if (isPendingConfirmation) {
    return {
      userId,
      date: dateStr,
      totalDayHours,
      isPendingConfirmation: true,
      message: 'Từ 4 đến dưới 5 tiếng: Giữ nguyên trạng thái hiện tại và chờ xác nhận.',
    };
  }

  // 2. Lấy các ca trực Studio của CTV trong ngày này (nếu có)
  const todayShifts = await StudioShift.findAll({
    where: {
      userId,
      date: dateStr,
      status: { [Op.in]: ['COMPLETED', 'CONFIRMED'] },
    },
  });

  const shiftsBySession = {};
  for (const s of todayShifts) {
    const sess = shiftTypeToSession(s.shiftType);
    shiftsBySession[sess] = s;
  }

  // 3. Phân bổ SV cho các buổi trong targetSessions (chuyển LV sang SV)
  for (const sess of targetSessions) {
    let rec = await AttendanceRecord.findOne({
      where: { userId, date: dateStr, session: sess },
    });

    const hoursPerSession = targetSessions.length > 0 ? totalDayHours / targetSessions.length : 0;

    if (rec) {
      rec.symbol = 'SV';
      rec.sourceType = 'TASK';
      rec.sourceId = dayTasks[0] ? dayTasks[0].id : null;
      rec.hours = hoursPerSession;
      rec.month = month;
      rec.year = year;
      await rec.save();
    } else {
      await AttendanceRecord.create({
        userId,
        date: dateStr,
        session: sess,
        symbol: 'SV',
        sourceType: 'TASK',
        sourceId: dayTasks[0] ? dayTasks[0].id : null,
        hours: hoursPerSession,
        month,
        year,
      });
    }
  }

  // 4. Với các buổi KHÔNG thuộc targetSessions:
  // Nếu trước đó từng có bản ghi do TASK tạo mà nay không còn thuộc targetSessions (do giảm giờ / xóa task)
  const otherSessions = ['S', 'C', 'T'].filter((s) => !targetSessions.includes(s));
  for (const otherSess of otherSessions) {
    const rec = await AttendanceRecord.findOne({
      where: { userId, date: dateStr, session: otherSess },
    });

    if (rec && rec.sourceType === 'TASK') {
      const shift = shiftsBySession[otherSess];
      if (shift) {
        rec.symbol = shift.attendanceSymbol || 'LV';
        rec.sourceType = 'DUTY_SHIFT';
        rec.sourceId = shift.id;
        rec.hours = 4.0;
        await rec.save();
      } else {
        await rec.destroy();
      }
    }
  }

  return {
    userId,
    date: dateStr,
    totalDayHours,
    targetSessions,
    isPendingConfirmation: false,
  };
};

/**
 * Đồng bộ tất cả công việc COMPLETED của CTV trong tháng vào bảng AttendanceRecords
 */
const syncAllCompletedTasksToAttendance = async (month, year) => {
  const whereTask = { status: 'COMPLETED' };

  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const daysCount = getDaysInMonth(m, y);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;
    whereTask[Op.or] = [
      { executionDate: { [Op.between]: [startDate, endDate] } },
      {
        executionDate: null,
        completedAt: {
          [Op.between]: [new Date(`${startDate}T00:00:00Z`), new Date(`${endDate}T23:59:59Z`)],
        },
      },
    ];
  }

  const tasks = await Task.findAll({ where: whereTask });
  const userDatePairs = new Set();

  for (const t of tasks) {
    if (!t.assignedToUserId) continue;
    const dateStr = t.executionDate
      ? String(t.executionDate).slice(0, 10)
      : (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
    userDatePairs.add(`${t.assignedToUserId}|${dateStr}`);
  }

  // Quét thêm tất cả AttendanceRecord hiện có mang sourceType = 'TASK' để kiểm tra và dọn sạch các bản ghi chưa được nghiệm thu
  const existingTaskRecords = await AttendanceRecord.findAll({
    where: {
      sourceType: 'TASK',
      ...(month && year ? { month: parseInt(month, 10), year: parseInt(year, 10) } : {}),
    },
  });
  for (const rec of existingTaskRecords) {
    userDatePairs.add(`${rec.userId}|${rec.date}`);
  }

  for (const pair of userDatePairs) {
    const [userId, dateStr] = pair.split('|');
    await syncTaskAttendanceToDatabase(userId, dateStr);
  }
};

/**
 * Tính toán và tổng hợp dữ liệu tiền công tháng (FR-05, QUY_TAC.md Mục 7)
 * Áp dụng đầy đủ 7 quy tắc bắt buộc và các testcase TC-03, TC-04, TC-05, TC-06, TC-07.
 */
const calculateMonthlyPayroll = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysCount = getDaysInMonth(m, y);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Tự động đồng bộ CSDL và tự động hoàn thành các ca trực đã kết thúc trước khi tính toán
  const dutyService = require('./duty.service');
  try {
    await dutyService.autoCompletePastConfirmedShifts();
  } catch (dutyErr) {
    console.error('Lỗi tự động hoàn thành ca trực trong calculateMonthlyPayroll:', dutyErr);
  }
  await syncAllCompletedTasksToAttendance(m, y);

  // 1. Lấy tất cả CTV trong hệ thống
  const collaborators = await User.findAll({
    where: { role: 'COLLABORATOR' },
    attributes: ['id', 'fullName', 'email', 'employeeCode'],
    order: [['fullName', 'ASC']],
  });

  const payrollResults = [];

  for (const ctv of collaborators) {
    // 2. Lấy các ca trực Studio của CTV trong tháng
    // TC-04: Ca trực tương lai hoặc chưa kết thúc giờ trực TUYỆT ĐỐI không được tính tiền trước!
    const shifts = await StudioShift.findAll({
      where: {
        userId: ctv.id,
        date: { [Op.between]: [startDate, endDate] },
        status: { [Op.in]: ['COMPLETED', 'CONFIRMED'] },
      },
    });

    // Lọc chỉ tính ca trực đã hoàn thành theo thời gian thực (đã kết thúc giờ trực)
    const validShifts = shifts.filter((s) => s.status === 'COMPLETED');

    // 3. Lấy các công việc Tasks đã hoàn thành trong tháng
    // TC-03: Chỉ tính công việc đã COMPLETED (loại trừ IN_PROGRESS, PENDING_APPROVAL, REVISION_REQUESTED)
    const allTasks = await Task.findAll({
      where: {
        assignedToUserId: ctv.id,
        status: 'COMPLETED',
      },
      order: [['executionDate', 'ASC'], ['completedAt', 'ASC']],
    });

    // Lọc các task thuộc tháng/năm đang xét
    const monthTasks = allTasks.filter((t) => {
      const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      const taskDateStr = normalizeExecutionDate(rawDate);
      return taskDateStr >= startDate && taskDateStr <= endDate;
    });

    // Gom nhóm task theo ngày để xác định các buổi SV chuyển đổi (tránh tính trùng thời gian)
    const tasksByDay = {};
    for (const task of monthTasks) {
      const rawDate = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
      const taskDateStr = normalizeExecutionDate(rawDate);
      if (!tasksByDay[taskDateStr]) {
        tasksByDay[taskDateStr] = { dateStr: taskDateStr, totalHours: 0, tasks: [] };
      }
      tasksByDay[taskDateStr].totalHours += parseFloat(task.actualHours) || 0;
      tasksByDay[taskDateStr].tasks.push(task);
    }

    const svSessionsByDate = {};
    for (const [dStr, dayInfo] of Object.entries(tasksByDay)) {
      const { sessions: targetSessions, isPendingConfirmation } = getSessionsForDayHours(dayInfo.totalHours);
      if (!isPendingConfirmation && targetSessions.length > 0) {
        svSessionsByDate[dStr] = targetSessions;
      }
    }

    // Không tính trùng thời gian giữa công việc và ca trực:
    // Nếu ca trực rơi vào buổi đã chuyển thành SV thì ca trực đó không tính vào LV
    const actualLvShifts = validShifts.filter((s) => {
      const sDateStr = String(s.date).slice(0, 10);
      const sess = shiftTypeToSession(s.shiftType);
      const svSessions = svSessionsByDate[sDateStr] || [];
      return !svSessions.includes(sess);
    });

    const totalShiftCount = actualLvShifts.length; // Sum LV (không tính trùng ca trực đã chuyển thành SV)
    const shiftHours = totalShiftCount * 4.0;   // Giờ LV = Sum LV * 4

    let taskHours = 0;
    let overtimeHours = 0;
    let sundayHours = 0;
    let calculatedTaskHours = 0;

    for (const task of monthTasks) {
      const hours = parseFloat(task.actualHours) || 0;
      taskHours += hours;

      const taskDateStr = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
      const taskDate = new Date(taskDateStr);
      const isSunday = task.isSunday || taskDate.getDay() === 0;

      // TC-06: Chống nhân chồng hệ số:
      // Nếu vào Chủ nhật và sau 16:30 -> chỉ áp dụng hệ số 2.0 (không nhân 1.5 x 2.0)
      if (isSunday) {
        sundayHours += hours;
        calculatedTaskHours += hours * 2.0;
      } else if (task.isOvertime || parseFloat(task.overtimeHours) > 0) {
        const otH = parseFloat(task.overtimeHours) > 0 ? parseFloat(task.overtimeHours) : hours;
        const normalH = Math.max(0, hours - otH);
        overtimeHours += otH;
        calculatedTaskHours += normalH * 1.0 + otH * 1.5;
      } else {
        calculatedTaskHours += hours * 1.0;
      }
    }

    const totalStandardHours = shiftHours + taskHours; // Tổng giờ thực tế (Cột Tổng trên Sheet1)
    const totalCalculatedHours = shiftHours * 1.0 + calculatedTaskHours; // Tổng giờ quy đổi sau hệ số
    const hourlyRate = 20000.00;
    const totalAmount = Math.round(totalCalculatedHours * hourlyRate); // Cột Tiền trên Sheet1

    // 4. Lưu / Cập nhật vào MonthlyPayroll
    let payroll = await MonthlyPayroll.findOne({
      where: { userId: ctv.id, month: m, year: y },
    });

    if (payroll) {
      payroll.totalShiftCount = totalShiftCount;
      payroll.shiftHours = shiftHours;
      payroll.taskHours = taskHours;
      payroll.overtimeHours = overtimeHours;
      payroll.sundayHours = sundayHours;
      payroll.totalStandardHours = totalStandardHours;
      payroll.totalCalculatedHours = totalCalculatedHours;
      payroll.hourlyRate = hourlyRate;
      payroll.totalAmount = totalAmount;
      payroll.calculatedAt = new Date();
      await payroll.save();
    } else {
      payroll = await MonthlyPayroll.create({
        userId: ctv.id,
        month: m,
        year: y,
        totalShiftCount,
        shiftHours,
        taskHours,
        overtimeHours,
        sundayHours,
        totalStandardHours,
        totalCalculatedHours,
        hourlyRate,
        totalAmount,
        status: 'DRAFT',
        calculatedAt: new Date(),
      });
    }

    payrollResults.push({
      ctv: {
        id: ctv.id,
        fullName: ctv.fullName,
        email: ctv.email,
        employeeCode: ctv.employeeCode,
      },
      payroll,
      tasksCount: monthTasks.length,
    });
  }

  return payrollResults;
};

/**
 * Lấy dữ liệu Bảng chấm công chi tiết ma trận (Sheet1)
 * Trả về danh sách CTV, mỗi CTV gồm 3 dòng S-C-T, các ngày 1..daysInMonth và các cột tổng hợp AI-AO.
 */
const getTimesheetData = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysCount = getDaysInMonth(m, y);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  const dutyService = require('./duty.service');
  try {
    await dutyService.autoCompletePastConfirmedShifts();
  } catch (dutyErr) {
    console.error('Lỗi tự động hoàn thành ca trực trong getTimesheetData:', dutyErr);
  }

  try {
    await syncAllCompletedTasksToAttendance(m, y);
  } catch (syncErr) {
    console.error('Lỗi syncAllCompletedTasksToAttendance trong getTimesheetData:', syncErr);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Danh sách ngày và thứ
  const daysHeader = [];
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(y, m - 1, d);
    const dow = DOW_NAMES[dateObj.getDay()];
    daysHeader.push({ day: d, dow, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  // Danh sách CTV
  const collaborators = await User.findAll({
    where: { role: 'COLLABORATOR' },
    attributes: ['id', 'fullName', 'email', 'employeeCode'],
    order: [['fullName', 'ASC']],
  });

  const rows = [];
  let grandTotalAmount = 0;

  for (let idx = 0; idx < collaborators.length; idx++) {
    const ctv = collaborators[idx];

    // Lấy ca trực Studio của CTV trong tháng
    const shifts = await StudioShift.findAll({
      where: {
        userId: ctv.id,
        date: { [Op.between]: [startDate, endDate] },
        status: { [Op.in]: ['COMPLETED', 'CONFIRMED'] },
      },
    });

    // Lấy các Task đã hoàn thành (COMPLETED) đã được Nhân sự nghiệm thu của CTV trong tháng
    const allTasks = await Task.findAll({
      where: {
        assignedToUserId: ctv.id,
        status: 'COMPLETED',
      },
    });

    const monthTasks = allTasks.filter((t) => {
      const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      const taskDateStr = normalizeExecutionDate(rawDate);
      return taskDateStr >= startDate && taskDateStr <= endDate;
    });

    // Lấy bản ghi AttendanceRecord ghi đè nếu có
    const manualRecords = await AttendanceRecord.findAll({
      where: {
        userId: ctv.id,
        month: m,
        year: y,
      },
    });

    // Xây dựng ma trận 3 buổi S, C, T cho từng ngày
    const sessions = ['S', 'C', 'T'];
    const sessionData = {
      S: { session: 'S', days: {}, lvCount: 0, svCount: 0 },
      C: { session: 'C', days: {}, lvCount: 0, svCount: 0 },
      T: { session: 'T', days: {}, lvCount: 0, svCount: 0 },
    };

    // Khởi tạo các ngày rỗng
    for (const sess of sessions) {
      for (let d = 1; d <= daysCount; d++) {
        sessionData[sess].days[d] = '';
      }
    }

    // Điền ca trực Studio (LV)
    for (const shift of shifts) {
      const shiftDate = new Date(shift.date);
      const dayNum = shiftDate.getDate();
      let sess = 'S';
      if (shift.shiftType === 'AFTERNOON') sess = 'C';
      else if (shift.shiftType === 'EVENING') sess = 'T';

      // Chỉ đánh dấu nếu ca trực đã hoàn thành theo thời gian thực
      if (shift.status === 'COMPLETED') {
        sessionData[sess].days[dayNum] = shift.attendanceSymbol || 'LV';
      }
    }

    // Điền công việc sự vụ (SV) theo quy tắc phân bổ buổi bắt buộc
    const tasksByDay = {};
    for (const task of monthTasks) {
      const rawDate = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
      const taskDateStr = normalizeExecutionDate(rawDate);
      const dayNum = parseInt(taskDateStr.split('-')[2], 10);
      if (!tasksByDay[dayNum]) {
        tasksByDay[dayNum] = { dateStr: taskDateStr, totalHours: 0, tasks: [] };
      }
      tasksByDay[dayNum].totalHours += parseFloat(task.actualHours) || 0;
      tasksByDay[dayNum].tasks.push(task);
    }

    const pendingConfirmationDays = [];

    // Tự động phân bổ SV theo tổng thời gian làm việc thực tế trong ngày:
    // - Dưới 4 tiếng: SV buổi sáng (S)
    // - Từ 5 đến 8 tiếng: SV buổi sáng và chiều (S + C)
    // - Trên 8 tiếng: SV cả sáng, chiều và tối (S + C + T)
    // - Từ 4 đến dưới 5 tiếng: Giữ nguyên trạng thái hiện tại và báo cáo xác nhận
    for (const [dayNumStr, dayInfo] of Object.entries(tasksByDay)) {
      const dayNum = parseInt(dayNumStr, 10);
      const { sessions: targetSessions, isPendingConfirmation } = getSessionsForDayHours(dayInfo.totalHours);

      if (isPendingConfirmation) {
        pendingConfirmationDays.push({
          date: dayInfo.dateStr,
          day: dayNum,
          totalHours: dayInfo.totalHours,
          taskCount: dayInfo.tasks.length,
          message: `Ngày ${dayNum}/${m} có tổng thời gian làm việc thực tế: ${dayInfo.totalHours} giờ (từ 4 đến dưới 5 tiếng) - Giữ nguyên trạng thái hiện tại chờ Nhân sự xác nhận quy tắc.`,
        });
        // Giữ nguyên trạng thái hiện tại (nếu có ca trực LV thì giữ LV, nếu trống thì giữ trống)
      } else {
        for (const sess of targetSessions) {
          // Tự động cập nhật ký hiệu chấm công từ LV sang SV tại ngày tương ứng
          sessionData[sess].days[dayNum] = 'SV';
        }
      }
    }

    // Điền các bản ghi thủ công / nghỉ lễ NL
    for (const rec of manualRecords) {
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      if (rec.session && sessionData[rec.session]) {
        if (rec.symbol === 'NL') {
          sessionData[rec.session].days[dayNum] = 'NL';
        } else if (rec.sourceType === 'MANUAL') {
          sessionData[rec.session].days[dayNum] = rec.symbol;
        }
      }
    }

    // Đếm số lượng LV và SV của từng buổi
    for (const sess of sessions) {
      for (let d = 1; d <= daysCount; d++) {
        const val = sessionData[sess].days[d];
        if (val === 'LV') sessionData[sess].lvCount++;
        else if (val === 'SV') sessionData[sess].svCount++;
      }
    }

    // Tổng số buổi LV của cả 3 ca
    const sumLV = sessionData.S.lvCount + sessionData.C.lvCount + sessionData.T.lvCount; // Col AK
    const gioLV = sumLV * 4.0; // Col AL

    // Giờ sự vụ (Giờ SV) = tổng actualHours từ các công việc COMPLETED
    let gioSV = 0;
    let gioOt = 0;
    let gioSunday = 0;
    let calculatedTaskHours = 0;

    for (const task of monthTasks) {
      const hours = parseFloat(task.actualHours) || 0;
      gioSV += hours;

      const taskDateStr = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
      const taskDate = new Date(taskDateStr);
      const isSunday = task.isSunday || taskDate.getDay() === 0;

      // TC-06: Chống nhân chồng hệ số:
      // Nếu vào Chủ nhật và sau 16:30 -> chỉ áp dụng hệ số 2.0 (không nhân 1.5 x 2.0)
      if (isSunday) {
        gioSunday += hours;
        calculatedTaskHours += hours * 2.0;
      } else if (task.isOvertime || parseFloat(task.overtimeHours) > 0) {
        const otH = parseFloat(task.overtimeHours) > 0 ? parseFloat(task.overtimeHours) : hours;
        const normalH = Math.max(0, hours - otH);
        gioOt += otH;
        calculatedTaskHours += normalH * 1.0 + otH * 1.5;
      } else {
        calculatedTaskHours += hours * 1.0;
      }
    }

    const tongGio = gioLV + calculatedTaskHours; // Col AN: Tổng giờ quy đổi sau hệ số
    const tien = Math.round(tongGio * 20000); // Col AO: Thù lao = Tổng giờ quy đổi * 20.000 đ
    grandTotalAmount += tien;

    const ctvInfo = {
      id: ctv.id,
      fullName: ctv.fullName,
      email: ctv.email,
      employeeCode: ctv.employeeCode,
      status: ctv.status,
    };

    rows.push({
      stt: idx + 1,
      ctv: ctvInfo,
      user: ctvInfo, // Đồng bộ alias 'user' tương thích hoàn hảo với MyTasksPage
      sessions: [
        {
          session: 'S',
          days: sessionData.S.days,
          lv: sessionData.S.lvCount,
          sv: sessionData.S.svCount,
          lvCount: sessionData.S.lvCount,
          svCount: sessionData.S.svCount,
          sumLV,
          sumLv: sumLV,
          gioLV,
          gioLv: gioLV,
          gioSV,
          gioSv: gioSV,
          tongGio,
          tien,
        },
        {
          session: 'C',
          days: sessionData.C.days,
          lv: sessionData.C.lvCount,
          sv: sessionData.C.svCount,
          lvCount: sessionData.C.lvCount,
          svCount: sessionData.C.svCount,
          sumLV,
          sumLv: sumLV,
          gioLV,
          gioLv: gioLV,
          gioSV,
          gioSv: gioSV,
          tongGio,
          tien,
        },
        {
          session: 'T',
          days: sessionData.T.days,
          lv: sessionData.T.lvCount,
          sv: sessionData.T.svCount,
          lvCount: sessionData.T.lvCount,
          svCount: sessionData.T.svCount,
          sumLV,
          sumLv: sumLV,
          gioLV,
          gioLv: gioLV,
          gioSV,
          gioSv: gioSV,
          tongGio,
          tien,
        },
      ],
      summary: {
        sumLV,
        sumLv: sumLV,
        gioLV,
        gioLv: gioLV,
        gioSV,
        gioSv: gioSV,
        gioOt,
        gioSunday,
        tongGio,
        tien,
      },
      pendingConfirmationDays,
    });
  }

  const daysMeta = daysHeader.map((dh) => ({
    day: dh.day,
    dayOfWeek: dh.dow,
    isSunday: Boolean(dh.isSunday || dh.dow === 'CN'),
    dateStr: dh.dateStr,
  }));

  const allPendingConfirmations = [];
  for (const r of rows) {
    if (r.pendingConfirmationDays && r.pendingConfirmationDays.length > 0) {
      for (const p of r.pendingConfirmationDays) {
        allPendingConfirmations.push({
          ctv: r.ctv,
          ...p,
        });
      }
    }
  }

  return {
    month: m,
    year: y,
    daysCount,
    daysHeader,
    daysMeta, // Đồng bộ alias 'daysMeta' cho MyTasksPage
    rows,
    grandTotalAmount,
    pendingConfirmations: allPendingConfirmations,
  };
};

/**
 * Lấy dữ liệu Bảng thống kê công việc tháng (T10.2026 format)
 * Danh sách đầu việc chi tiết nhóm theo CTV: STT, Họ và tên, Ngày, Nội dung, Nhiệm vụ, Thực hiện, Tổng giờ, Ghi chú.
 */
const getTasksSummaryData = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysCount = getDaysInMonth(m, y);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  const collaborators = await User.findAll({
    where: { role: 'COLLABORATOR' },
    attributes: ['id', 'fullName', 'email', 'employeeCode'],
    order: [['fullName', 'ASC']],
  });

  const ctvGroups = [];

  for (let idx = 0; idx < collaborators.length; idx++) {
    const ctv = collaborators[idx];

    const tasks = await Task.findAll({
      where: {
        assignedToUserId: ctv.id,
        status: 'COMPLETED',
      },
      order: [['executionDate', 'ASC'], ['completedAt', 'ASC'], ['createdAt', 'ASC']],
    });

    const monthTasks = tasks.filter((t) => {
      const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      const taskDateStr = normalizeExecutionDate(rawDate);
      return taskDateStr >= startDate && taskDateStr <= endDate;
    });

    let totalHours = 0;
    const taskItems = monthTasks.map((t) => {
      const h = parseFloat(t.actualHours) || 0;
      totalHours += h;
      const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      const dateStr = normalizeExecutionDate(rawDate);

      return {
        id: t.id,
        date: dateStr,
        content: t.description || t.title,
        title: t.title,
        taskType: t.taskType === 'Khác' && t.otherTaskType ? `Khác: ${t.otherTaskType}` : t.taskType || 'Sự vụ',
        hours: h,
        note: t.note || (t.isOvertime ? 'Làm tối ngoài giờ' : ''),
      };
    });

    ctvGroups.push({
      stt: idx + 1,
      ctv: {
        id: ctv.id,
        fullName: ctv.fullName,
        email: ctv.email,
        employeeCode: ctv.employeeCode,
      },
      totalHours,
      tasks: taskItems,
    });
  }

  return {
    month: m,
    year: y,
    ctvGroups,
  };
};

/**
 * Xuất file Excel Bảng chấm công tháng (chuẩn sheet Sheet1)
 */
const exportTimesheetExcel = async (month, year, res) => {
  const data = await getTimesheetData(month, year);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1', {
    pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4 Landscape
  });

  // 1. Header dòng 1: Tên đơn vị
  sheet.mergeCells('A1:L1');
  const cellA1 = sheet.getCell('A1');
  cellA1.value = 'BỘ PHẬN TRUYỀN THÔNG -  TRUNG TÂM TUYỂN SINH & QUAN HỆ CÔNG CHÚNG';
  cellA1.font = { name: 'Arial', size: 10, bold: true };
  cellA1.alignment = { vertical: 'middle', horizontal: 'left' };

  // 2. Header dòng 2: Tiêu đề BẢNG CHẤM CÔNG THÁNG MM/YYYY
  const lastColLetter = ExcelJS.Workbook ? 'AO' : 'AO';
  sheet.mergeCells(`A2:AO2`);
  const cellA2 = sheet.getCell('A2');
  cellA2.value = `BẢNG CHẤM CÔNG THÁNG ${String(data.month).padStart(2, '0')}/${data.year}`;
  cellA2.font = { name: 'Arial', size: 14, bold: true };
  cellA2.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Dòng 4: Thứ (T2, T3, T4, T5, T6, T7, CN)
  // Dòng 5: Ngày (1..daysCount)
  sheet.mergeCells('A4:A5');
  sheet.getCell('A4').value = 'Stt';
  sheet.mergeCells('B4:B5');
  sheet.getCell('B4').value = 'Họ tên';
  sheet.mergeCells('C4:C5');
  sheet.getCell('C4').value = 'Buổi';

  // Điền thứ và ngày từ cột D (col 4)
  for (let i = 0; i < data.daysCount; i++) {
    const colIdx = 4 + i;
    sheet.getCell(4, colIdx).value = data.daysHeader[i].dow;
    sheet.getCell(5, colIdx).value = data.daysHeader[i].day;
  }

  // Các cột tổng hợp cuối bảng
  const colAI = 4 + data.daysCount;     // LV
  const colAJ = colAI + 1;              // SV
  const colAK = colAI + 2;              // Sum LV
  const colAL = colAI + 3;              // Giờ LV
  const colAM = colAI + 4;              // Giờ SV
  const colAN = colAI + 5;              // Tổng
  const colAO = colAI + 6;              // Tiền

  sheet.mergeCells(4, colAI, 5, colAI);
  sheet.getCell(4, colAI).value = 'LV';
  sheet.mergeCells(4, colAJ, 5, colAJ);
  sheet.getCell(4, colAJ).value = 'SV';
  sheet.mergeCells(4, colAK, 5, colAK);
  sheet.getCell(4, colAK).value = 'Sum LV';
  sheet.mergeCells(4, colAL, 5, colAL);
  sheet.getCell(4, colAL).value = 'Giờ LV';
  sheet.mergeCells(4, colAM, 5, colAM);
  sheet.getCell(4, colAM).value = 'Giờ SV';
  sheet.mergeCells(4, colAN, 5, colAN);
  sheet.getCell(4, colAN).value = 'Tổng';
  sheet.mergeCells(4, colAO, 5, colAO);
  sheet.getCell(4, colAO).value = 'Tiền';

  // Format header rows 4 & 5
  for (let r = 4; r <= 5; r++) {
    const row = sheet.getRow(r);
    row.height = 22;
    for (let c = 1; c <= colAO; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  // 4. Điền dữ liệu các CTV (mỗi CTV 3 dòng S, C, T)
  let currentRow = 6;
  const moneyRowIndices = [];

  for (const item of data.rows) {
    const startR = currentRow;
    const endR = currentRow + 2;

    // Merge Stt & Họ tên cho 3 dòng
    sheet.mergeCells(startR, 1, endR, 1);
    sheet.getCell(startR, 1).value = item.stt;
    sheet.getCell(startR, 1).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(startR, 2, endR, 2);
    sheet.getCell(startR, 2).value = item.ctv.fullName;
    sheet.getCell(startR, 2).alignment = { vertical: 'middle', horizontal: 'left' };

    // Điền 3 dòng S, C, T
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const rIdx = startR + sIdx;
      const sess = item.sessions[sIdx];
      const row = sheet.getRow(rIdx);
      row.height = 18;

      row.getCell(3).value = sess.session; // S, C, T
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      // Điền ký hiệu các ngày
      for (let d = 1; d <= data.daysCount; d++) {
        const colIdx = 3 + d;
        const symbol = sess.days[d] || '';
        row.getCell(colIdx).value = symbol;
        row.getCell(colIdx).alignment = { vertical: 'middle', horizontal: 'center' };
        if (symbol === 'LV') {
          row.getCell(colIdx).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0066CC' } };
        } else if (symbol === 'SV') {
          row.getCell(colIdx).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9900CC' } };
        } else if (symbol === 'NL') {
          row.getCell(colIdx).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFCC0000' } };
        }
      }

      // Cột AI (LV) và AJ (SV) của từng buổi
      row.getCell(colAI).value = sess.lv;
      row.getCell(colAI).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(colAJ).value = sess.sv;
      row.getCell(colAJ).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Merge các cột tổng hợp AK, AL, AM, AN, AO trên 3 dòng
    sheet.mergeCells(startR, colAK, endR, colAK);
    sheet.getCell(startR, colAK).value = item.summary.sumLV;
    sheet.getCell(startR, colAK).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(startR, colAL, endR, colAL);
    sheet.getCell(startR, colAL).value = item.summary.gioLV;
    sheet.getCell(startR, colAL).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(startR, colAM, endR, colAM);
    sheet.getCell(startR, colAM).value = item.summary.gioSV;
    sheet.getCell(startR, colAM).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(startR, colAN, endR, colAN);
    sheet.getCell(startR, colAN).value = item.summary.tongGio;
    sheet.getCell(startR, colAN).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells(startR, colAO, endR, colAO);
    sheet.getCell(startR, colAO).value = item.summary.tien;
    sheet.getCell(startR, colAO).numFmt = '#,##0';
    sheet.getCell(startR, colAO).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getCell(startR, colAO).font = { name: 'Arial', size: 9, bold: true };

    moneyRowIndices.push(startR);

    // Kẻ border cho toàn bộ khối 3 dòng của CTV
    for (let r = startR; r <= endR; r++) {
      for (let c = 1; c <= colAO; c++) {
        sheet.getCell(r, c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    currentRow += 3;
  }

  // 5. Dòng Tổng cộng tiền
  const totalRowIdx = currentRow;
  sheet.getRow(totalRowIdx).height = 22;
  sheet.getCell(totalRowIdx, colAO).value = data.grandTotalAmount;
  sheet.getCell(totalRowIdx, colAO).numFmt = '#,##0';
  sheet.getCell(totalRowIdx, colAO).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF990000' } };
  sheet.getCell(totalRowIdx, colAO).alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getCell(totalRowIdx, colAO).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'double' },
    right: { style: 'thin' },
  };

  currentRow += 2;

  // 6. Bảng mô tả chi tiết ký hiệu & Chữ ký
  const legendStartRow = currentRow;
  sheet.mergeCells(legendStartRow, 2, legendStartRow, 10);
  sheet.getCell(legendStartRow, 2).value = 'Bảng mô tả chi tiết';
  sheet.getCell(legendStartRow, 2).font = { name: 'Arial', size: 9, bold: true };

  sheet.mergeCells(legendStartRow, 19, legendStartRow, 25);
  sheet.getCell(legendStartRow, 19).value = 'LÃNH ĐẠO ĐƠN VỊ';
  sheet.getCell(legendStartRow, 19).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow, 19).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(legendStartRow, 27, legendStartRow, 34);
  sheet.getCell(legendStartRow, 27).value = 'NGƯỜI CHẤM CÔNG';
  sheet.getCell(legendStartRow, 27).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow, 27).alignment = { vertical: 'middle', horizontal: 'center' };

  // LV
  sheet.getCell(legendStartRow + 1, 2).value = 'LV';
  sheet.getCell(legendStartRow + 1, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0066CC' } };
  sheet.mergeCells(legendStartRow + 1, 3, legendStartRow + 1, 10);
  sheet.getCell(legendStartRow + 1, 3).value = 'Trực - làm việc tại STUDIO';
  sheet.getCell(legendStartRow + 1, 3).font = { name: 'Arial', size: 9 };

  // SV
  sheet.getCell(legendStartRow + 2, 2).value = 'SV';
  sheet.getCell(legendStartRow + 2, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9900CC' } };
  sheet.mergeCells(legendStartRow + 2, 3, legendStartRow + 2, 10);
  sheet.getCell(legendStartRow + 2, 3).value = 'Làm sự vụ';
  sheet.getCell(legendStartRow + 2, 3).font = { name: 'Arial', size: 9 };

  // NL
  sheet.getCell(legendStartRow + 3, 2).value = 'NL';
  sheet.getCell(legendStartRow + 3, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFCC0000' } };
  sheet.mergeCells(legendStartRow + 3, 3, legendStartRow + 3, 10);
  sheet.getCell(legendStartRow + 3, 3).value = 'Nghỉ lễ';
  sheet.getCell(legendStartRow + 3, 3).font = { name: 'Arial', size: 9 };

  // Ký tên đại diện
  sheet.mergeCells(legendStartRow + 5, 19, legendStartRow + 5, 25);
  sheet.getCell(legendStartRow + 5, 19).value = 'Huỳnh Thúc Hiếu';
  sheet.getCell(legendStartRow + 5, 19).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow + 5, 19).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(legendStartRow + 5, 27, legendStartRow + 5, 34);
  sheet.getCell(legendStartRow + 5, 27).value = 'Khuất Kiều Diễm Nhi';
  sheet.getCell(legendStartRow + 5, 27).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow + 5, 27).alignment = { vertical: 'middle', horizontal: 'center' };

  // Đặt độ rộng cột
  sheet.getColumn(1).width = 5;   // Stt
  sheet.getColumn(2).width = 24;  // Họ tên
  sheet.getColumn(3).width = 6;   // Buổi
  for (let c = 4; c <= 4 + data.daysCount; c++) {
    sheet.getColumn(c).width = 4.2; // Các ngày
  }
  sheet.getColumn(colAI).width = 6;
  sheet.getColumn(colAJ).width = 6;
  sheet.getColumn(colAK).width = 8;
  sheet.getColumn(colAL).width = 8;
  sheet.getColumn(colAM).width = 8;
  sheet.getColumn(colAN).width = 8;
  sheet.getColumn(colAO).width = 14;

  if (res) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="BANG_CHAM_CONG_THANG_${String(data.month).padStart(2, '0')}_${data.year}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  return workbook;
};

/**
 * Xuất file Excel Bảng thống kê công việc tháng (chuẩn sheet T10.2026)
 */
const exportTasksSummaryExcel = async (month, year, res) => {
  const data = await getTasksSummaryData(month, year);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`T${data.month}.${data.year}`, {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  // 1. Header dòng 1: Cơ quan chủ quản và Quốc hiệu
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'TRƯỜNG ĐẠI HỌC LẠC HỒNG';
  sheet.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('E1:H1');
  sheet.getCell('E1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  sheet.getCell('E1').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('E1').alignment = { vertical: 'middle', horizontal: 'center' };

  // Header dòng 2: Trung tâm và Tiêu ngữ
  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = 'TT. TUYỂN SINH & QUAN HỆ CÔNG CHÚNG';
  sheet.getCell('A2').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('E2:H2');
  sheet.getCell('E2').value = 'Độc lập - Tự do -  Hạnh phúc';
  sheet.getCell('E2').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('E2').alignment = { vertical: 'middle', horizontal: 'center' };

  // Header dòng 3: Địa danh, ngày tháng
  sheet.mergeCells('E3:H3');
  sheet.getCell('E3').value = `Đồng Nai, ngày        tháng     năm ${data.year}`;
  sheet.getCell('E3').font = { name: 'Arial', size: 10, italic: true };
  sheet.getCell('E3').alignment = { vertical: 'middle', horizontal: 'center' };

  // Header dòng 4: Tiêu đề THỐNG KÊ Cộng tác viên thực hiện công việc sự vụ
  sheet.mergeCells('A4:H4');
  sheet.getCell('A4').value = `THỐNG KÊ \nCộng tác viên thực hiện công việc sự vụ (Tháng ${data.month})`;
  sheet.getCell('A4').font = { name: 'Arial', size: 13, bold: true };
  sheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.getRow(4).height = 36;

  // Header dòng 5: Tên cột
  const headers = ['Stt', 'Họ và tên', 'Ngày', 'Nội dung sự vụ', 'Nhiệm vụ', 'Thực hiện (giờ)', 'Tổng \n(giờ)', 'Ghi chú'];
  const headerRow = sheet.getRow(5);
  headerRow.height = 26;

  for (let c = 1; c <= 8; c++) {
    const cell = headerRow.getCell(c);
    cell.value = headers[c - 1];
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // 2. Điền dữ liệu nhóm theo từng CTV
  let currentRow = 6;

  for (const group of data.ctvGroups) {
    if (group.tasks.length === 0) continue;

    const startR = currentRow;
    const endR = currentRow + group.tasks.length - 1;

    // Merge Stt & Họ và tên
    if (endR > startR) {
      sheet.mergeCells(startR, 1, endR, 1);
      sheet.mergeCells(startR, 2, endR, 2);
      sheet.mergeCells(startR, 7, endR, 7); // Tổng (giờ)
    }

    sheet.getCell(startR, 1).value = group.stt;
    sheet.getCell(startR, 1).alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getCell(startR, 2).value = group.ctv.fullName;
    sheet.getCell(startR, 2).alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell(startR, 7).value = group.totalHours;
    sheet.getCell(startR, 7).numFmt = '#,##0.0';
    sheet.getCell(startR, 7).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(startR, 7).font = { name: 'Arial', size: 9, bold: true };

    // Từng đầu việc
    for (let tIdx = 0; tIdx < group.tasks.length; tIdx++) {
      const task = group.tasks[tIdx];
      const rIdx = startR + tIdx;
      const row = sheet.getRow(rIdx);

      row.getCell(3).value = task.date;
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(4).value = task.content;
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      row.getCell(5).value = task.taskType;
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

      row.getCell(6).value = task.hours;
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).numFmt = '#,##0.0';

      row.getCell(8).value = task.note;
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    currentRow = endR + 1;
  }

  // 3. Khối chữ ký cuối bảng
  currentRow += 2;
  const signRow = currentRow;
  sheet.getRow(signRow).height = 20;

  sheet.mergeCells(signRow, 1, signRow, 3);
  sheet.getCell(signRow, 1).value = 'P.GIÁM ĐỐC';
  sheet.getCell(signRow, 1).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(signRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(signRow, 4, signRow, 5);
  sheet.getCell(signRow, 4).value = 'TRƯỞNG BỘ PHẬN';
  sheet.getCell(signRow, 4).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(signRow, 4).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(signRow, 6, signRow, 8);
  sheet.getCell(signRow, 6).value = 'NGƯỜI LẬP BẢNG';
  sheet.getCell(signRow, 6).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(signRow, 6).alignment = { vertical: 'middle', horizontal: 'center' };

  // Đặt độ rộng các cột
  sheet.getColumn(1).width = 6;   // Stt
  sheet.getColumn(2).width = 24;  // Họ và tên
  sheet.getColumn(3).width = 13;  // Ngày
  sheet.getColumn(4).width = 46;  // Nội dung sự vụ
  sheet.getColumn(5).width = 26;  // Nhiệm vụ
  sheet.getColumn(6).width = 14;  // Thực hiện (giờ)
  sheet.getColumn(7).width = 12;  // Tổng (giờ)
  sheet.getColumn(8).width = 26;  // Ghi chú

  if (res) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="THONG_KE_CONG_VIEC_THANG_${String(data.month).padStart(2, '0')}_${data.year}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  return workbook;
};

/**
 * Cập nhật ô chấm công thủ công (Admin override hoặc thêm NL)
 */
const updateAttendanceCell = async (data) => {
  const { userId, date, session, symbol, hours, note } = data;

  if (!userId || !date || !session) {
    const error = new Error('Thiếu thông tin cập nhật chấm công');
    error.statusCode = 400;
    throw error;
  }

  // Hạng mục 2: Kiểm soát chặt chẽ ký hiệu SV ở Backend
  if (symbol === 'SV') {
    // Chỉ cho phép chọn SV khi CTV có công việc tương ứng được ghi nhận trong Bảng thống kê công việc của đúng ngày đó
    const tasks = await Task.findAll({
      where: {
        assignedToUserId: userId,
        status: 'COMPLETED',
      },
    });

    const hasMatchingTask = tasks.some((t) => {
      const taskDateStr = t.executionDate
        ? String(t.executionDate).slice(0, 10)
        : (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      return taskDateStr === date;
    });

    if (!hasMatchingTask) {
      const error = new Error('Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.');
      error.statusCode = 400;
      throw error;
    }
  }

  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  let rec = await AttendanceRecord.findOne({
    where: { userId, date, session },
  });

  if (rec) {
    rec.symbol = symbol || '';
    if (hours !== undefined) rec.hours = hours;
    if (note !== undefined) rec.note = note;
    await rec.save();
  } else {
    rec = await AttendanceRecord.create({
      userId,
      date,
      session,
      symbol: symbol || '',
      hours: hours || 0,
      month,
      year,
      note,
      sourceType: symbol === 'NL' ? 'HOLIDAY' : 'MANUAL',
    });
  }

  return rec;
};

module.exports = {
  getDaysInMonth,
  normalizeExecutionDate,
  getSessionsForDayHours,
  syncTaskAttendanceToDatabase,
  syncAllCompletedTasksToAttendance,
  calculateMonthlyPayroll,
  getTimesheetData,
  getTasksSummaryData,
  exportTimesheetExcel,
  exportTasksSummaryExcel,
  updateAttendanceCell,
};

