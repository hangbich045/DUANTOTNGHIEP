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
 * Định dạng số giờ sang tiếng Việt: 2.5 -> '2,5', 4.0 -> '4'
 */
const formatHoursVi = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const val = Number(parseFloat(num).toFixed(2));
  return String(val).replace('.', ',');
};

/**
 * Kiểm tra xem một công việc có phải là công việc KỸ THUẬT SỰ KIỆN hay không
 * (Chụp ảnh, quay phim/quay video sự kiện, kỹ thuật sự kiện, highlight, tiktok...).
 * 
 * Danh sách 7 nhóm công việc được nhân giờ theo quy định:
 * 1. Chụp & xử lý hình (chụp hình, chụp ảnh, chụp & xử lý hình sự kiện)
 * 2. Quay phim
 * 3. Quay highlight
 * 4. Quay clip TikTok
 * 5. MC bản tin
 * 6. Thư ký trường quay
 * 7. Diễn viên
 *
 * Các công việc KHÔNG được nhân giờ (luôn áp dụng hệ số 1,0):
 * - Viết content, Viết kịch bản, Thiết kế
 * - Dựng clip highlight, Dựng clip TikTok, Dựng phim
 */
const isMultiplierEligibleTask = (task = {}) => {
  const typeStr = (task.taskType || '').trim().toLowerCase();
  const otherStr = (task.otherTaskType || '').trim().toLowerCase();
  const titleStr = (task.title || '').trim().toLowerCase();
  const descStr = (task.description || '').trim().toLowerCase();

  // 1. Kiểm tra 7 nhóm công việc được nhân giờ theo taskType
  // 1.1. Chụp & xử lý hình
  if (
    typeStr.includes('chụp & xử lý') ||
    typeStr.includes('chụp hình') ||
    typeStr.includes('chụp ảnh') ||
    typeStr.includes('xử lý hình') ||
    typeStr === 'chụp & xử lý hình sự kiện'
  ) {
    return true;
  }

  // 1.2. Quay phim (không bao gồm dựng phim)
  if (typeStr === 'quay phim' || (typeStr.startsWith('quay phim') && !typeStr.includes('dựng'))) {
    return true;
  }

  // 1.3. Quay highlight (không bao gồm dựng clip highlight)
  if (typeStr === 'quay highlight' || (typeStr.includes('quay highlight') && !typeStr.includes('dựng'))) {
    return true;
  }

  // 1.4. Quay clip tiktok (không bao gồm dựng clip tiktok)
  if (
    (typeStr.includes('quay clip tiktok') || typeStr.includes('quay tiktok')) &&
    !typeStr.includes('dựng')
  ) {
    return true;
  }

  // 1.5. MC bản tin
  if (typeStr === 'mc bản tin' || typeStr.includes('mc bản tin') || typeStr === 'mc') {
    return true;
  }

  // 1.6. Thư ký trường quay
  if (typeStr === 'thư ký trường quay' || typeStr.includes('thư ký trường quay')) {
    return true;
  }

  // 1.7. Diễn viên
  if (typeStr === 'diễn viên' || typeStr.includes('diễn viên')) {
    return true;
  }

  // 2. Chặn các công việc không thuộc danh sách nhân giờ
  if (
    typeStr.includes('viết content') ||
    typeStr.includes('viết kịch bản') ||
    typeStr.includes('thiết kế') ||
    typeStr.includes('dựng clip') ||
    typeStr.includes('dựng phim') ||
    typeStr.includes('dựng highlight') ||
    typeStr.includes('dựng tiktok')
  ) {
    return false;
  }

  // 3. Với công việc loại 'Khác' hoặc không có taskType: kiểm tra chi tiết trong otherTaskType, title
  const contextToCheck = `${otherStr} ${titleStr} ${descStr}`.toLowerCase();
  if (
    contextToCheck.includes('chụp & xử lý') ||
    contextToCheck.includes('chụp hình') ||
    contextToCheck.includes('chụp ảnh') ||
    contextToCheck.includes('quay phim') ||
    contextToCheck.includes('quay highlight') ||
    contextToCheck.includes('quay clip tiktok') ||
    contextToCheck.includes('quay tiktok') ||
    contextToCheck.includes('mc bản tin') ||
    contextToCheck.includes('thư ký trường quay') ||
    contextToCheck.includes('diễn viên')
  ) {
    // Nếu trong context có từ khóa "dựng" mà không có từ khóa "quay"/"chụp" chính thức
    if (contextToCheck.includes('dựng') && !/(quay|chụp|mc|thư ký|diễn viên)/.test(contextToCheck)) {
      return false;
    }
    return true;
  }

  return false;
};

const isTechnicalTask = isMultiplierEligibleTask;

/**
 * Tính toán số giờ thực tế, giờ thường, giờ ngoài giờ (x1.5), giờ Chủ nhật (x2.0),
 * tổng giờ quy đổi và tạo câu ghi chú chuẩn hóa cho từng công việc.
 * 
 * Tuân thủ nghiêm ngặt 100% các quy tắc nghiệp vụ:
 * 1. Mức cơ bản: 20.000 đ/giờ.
 * 2. Kỹ thuật sau 16:30 T2-T7: nhân 1,5.
 * 3. Kỹ thuật Chủ nhật: nhân 2.
 * 4. Nếu vừa Chủ nhật vừa ngoài giờ: chỉ nhân 2 (ưu tiên hệ số Chủ nhật, không nhân chồng).
 * 5. Các công việc còn lại: nhân 1.
 * 6. Tách rõ từng khoảng giờ: nếu công việc kéo dài qua 16:30, phần trước 16:30 tính x1.0, phần sau 16:30 tính x1.5.
 * 
 * @param {object} task - Đối tượng Task từ CSDL
 * @returns {{
 *   actualHours: number,
 *   normalHours: number,
 *   overtimeHours: number,
 *   sundayHours: number,
 *   multiplier: number,
 *   convertedHours: number,
 *   isHighlighted: boolean,
 *   isSunday: boolean,
 *   isOvertime: boolean,
 *   multiplierNote: string,
 *   fullNote: string,
 *   reason: string
 * }}
 */
const calculateTaskHoursAndMultiplier = (task = {}) => {
  const actualHours = parseFloat(task.actualHours) || 0;
  if (actualHours <= 0) {
    return {
      actualHours: 0,
      normalHours: 0,
      overtimeHours: 0,
      sundayHours: 0,
      multiplier: 1.0,
      convertedHours: 0,
      isHighlighted: false,
      isSunday: false,
      isOvertime: false,
      multiplierNote: '',
      fullNote: task.note || '',
      reason: 'Chưa có giờ thực hiện',
    };
  }

  // 1. Xác định ngày và thứ
  let rawDate = task.executionDate;
  if (!rawDate && task.startTime) {
    rawDate = typeof task.startTime === 'string' ? task.startTime.slice(0, 10) : task.startTime.toISOString().slice(0, 10);
  }
  if (!rawDate && task.completedAt) {
    rawDate = typeof task.completedAt === 'string' ? task.completedAt.slice(0, 10) : task.completedAt.toISOString().slice(0, 10);
  }
  if (!rawDate && task.createdAt) {
    rawDate = typeof task.createdAt === 'string' ? task.createdAt.slice(0, 10) : task.createdAt.toISOString().slice(0, 10);
  }
  const dateStr = normalizeExecutionDate(rawDate);
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const isSunday = dt.getDay() === 0;

  // 2. Kiểm tra có phải công việc kỹ thuật sự kiện hay không
  const isTech = isTechnicalTask(task);

  // NẾU KHÔNG PHẢI KỸ THUẬT: Áp dụng hệ số 1.0 cho toàn bộ giờ
  if (!isTech) {
    return {
      actualHours,
      normalHours: actualHours,
      overtimeHours: 0,
      sundayHours: 0,
      multiplier: 1.0,
      convertedHours: actualHours * 1.0,
      isHighlighted: false,
      isSunday: false,
      isOvertime: false,
      multiplierNote: '',
      fullNote: task.note || '',
      reason: 'Công việc tiêu chuẩn (hệ số 1,0)',
    };
  }

  // NẾU LÀ KỸ THUẬT:
  // TRƯỜNG HỢP 1: CHỦ NHẬT (x2.0)
  if (isSunday) {
    // Kiểm tra xem có làm ngoài giờ sau 16:30 vào Chủ nhật không
    let isAfter1630OnSunday = false;
    if (task.startTime) {
      const st = new Date(task.startTime);
      if (!isNaN(st.getTime())) {
        const startHour = st.getHours() + st.getMinutes() / 60;
        if (startHour >= 16.5 || (startHour + actualHours) > 16.5) {
          isAfter1630OnSunday = true;
        }
      }
    }
    if (task.shiftSession === 'T' || task.isOvertime || (task.note && /(sau 16:30|16h30|ngoài giờ|buổi tối|làm tối)/i.test(task.note))) {
      isAfter1630OnSunday = true;
    }

    const multiplier = 2.0;
    const convertedHours = Math.round(actualHours * multiplier * 100) / 100;
    const multiplierNote = isAfter1630OnSunday
      ? `Chủ nhật (ưu tiên hệ số Chủ nhật): ${formatHoursVi(actualHours)} giờ × 2`
      : `Chủ nhật: ${formatHoursVi(actualHours)} giờ × 2`;

    const fullNote = task.note ? `${task.note} | ${multiplierNote}` : multiplierNote;

    return {
      actualHours,
      normalHours: 0,
      overtimeHours: 0,
      sundayHours: actualHours,
      multiplier,
      convertedHours,
      isHighlighted: true,
      isSunday: true,
      isOvertime: isAfter1630OnSunday,
      multiplierNote,
      fullNote,
      reason: isAfter1630OnSunday
        ? 'Làm nhiệm vụ sự vụ/trường quay vào Chủ nhật ngoài giờ (ưu tiên hệ số Chủ nhật 2.0, không cộng dồn)'
        : 'Làm nhiệm vụ sự vụ/trường quay vào Chủ nhật (hệ số 2.0)',
    };
  }

  // TRƯỜNG HỢP 2: TỪ THỨ HAI ĐẾN THỨ BẢY (T2 - T7)
  // Cần tách rõ từng khoảng giờ: trong giờ (x1.0) và ngoài giờ sau 16:30 (x1.5)
  let normalHours = actualHours;
  let overtimeHours = 0;

  // Cách A: Xác định theo startTime (thời gian bắt đầu chính xác)
  if (task.startTime) {
    const st = new Date(task.startTime);
    if (!isNaN(st.getTime())) {
      const startDec = st.getHours() + st.getMinutes() / 60;
      const endDec = startDec + actualHours;
      const cutoff = 16.5; // 16:30

      if (startDec >= cutoff) {
        // Hoàn toàn sau 16:30
        overtimeHours = actualHours;
        normalHours = 0;
      } else if (endDec <= cutoff) {
        // Hoàn toàn trước 16:30
        normalHours = actualHours;
        overtimeHours = 0;
      } else {
        // Bắt đầu trước 16:30, kết thúc sau 16:30 -> Tách 2 khoảng
        normalHours = Math.round((cutoff - startDec) * 100) / 100;
        overtimeHours = Math.round((actualHours - normalHours) * 100) / 100;
      }
    }
  } else if (task.overtimeHours && parseFloat(task.overtimeHours) > 0) {
    // Cách B: Nhân sự đã nhập cụ thể số giờ sau 16:30 khi nghiệm thu
    const ot = Math.min(actualHours, parseFloat(task.overtimeHours));
    overtimeHours = ot;
    normalHours = Math.round((actualHours - ot) * 100) / 100;
  } else if (task.shiftSession === 'T') {
    // Ca Tối (17:30 - 21:30): Hoàn toàn sau 16:30
    overtimeHours = actualHours;
    normalHours = 0;
  } else if (task.shiftSession === 'C') {
    // Ca Chiều (13:00 - 17:00): 13:00 đến 16:30 là 3.5 tiếng
    if (actualHours > 3.5) {
      normalHours = 3.5;
      overtimeHours = Math.round((actualHours - 3.5) * 100) / 100;
    } else {
      normalHours = actualHours;
      overtimeHours = 0;
    }
  } else if (task.isOvertime || (task.note && /(sau 16:30|16h30|ngoài giờ|buổi tối|làm tối)/i.test(task.note))) {
    // Có ghi chú ngoài giờ nhưng không rõ mốc: mặc định tính toàn bộ giờ là ngoài giờ nếu note nêu rõ
    overtimeHours = actualHours;
    normalHours = 0;
  }

  // Đảm bảo không âm và tổng bằng actualHours
  normalHours = Math.max(0, normalHours);
  overtimeHours = Math.max(0, Math.min(actualHours, overtimeHours));
  if (Math.abs(normalHours + overtimeHours - actualHours) > 0.01) {
    normalHours = Math.max(0, Math.round((actualHours - overtimeHours) * 100) / 100);
  }

  if (overtimeHours > 0) {
    const convertedHours = Math.round((normalHours * 1.0 + overtimeHours * 1.5) * 100) / 100;
    let multiplierNote = '';
    if (normalHours > 0) {
      multiplierNote = `Trong giờ: ${formatHoursVi(normalHours)} giờ × 1,0; Ngoài giờ: ${formatHoursVi(overtimeHours)} giờ × 1,5`;
    } else {
      multiplierNote = `Ngoài giờ: ${formatHoursVi(overtimeHours)} giờ × 1,5`;
    }

    const fullNote = task.note ? `${task.note} | ${multiplierNote}` : multiplierNote;

    return {
      actualHours,
      normalHours,
      overtimeHours,
      sundayHours: 0,
      multiplier: normalHours === 0 ? 1.5 : Math.round((convertedHours / actualHours) * 100) / 100,
      convertedHours,
      isHighlighted: true,
      isSunday: false,
      isOvertime: true,
      multiplierNote,
      fullNote,
      reason: normalHours > 0
        ? `Làm nhiệm vụ sự vụ/trường quay: ${formatHoursVi(normalHours)}h trong giờ (x1.0) và ${formatHoursVi(overtimeHours)}h ngoài giờ sau 16:30 (x1.5)`
        : `Làm nhiệm vụ sự vụ/trường quay ngoài giờ sau 16:30 (x1.5)`,
    };
  }

  // Toàn bộ trong giờ hành chính T2-T7: Hệ số 1.0
  return {
    actualHours,
    normalHours: actualHours,
    overtimeHours: 0,
    sundayHours: 0,
    multiplier: 1.0,
    convertedHours: actualHours * 1.0,
    isHighlighted: false,
    isSunday: false,
    isOvertime: false,
    multiplierNote: '',
    fullNote: task.note || '',
    reason: 'Công việc kỹ thuật trong giờ hành chính (hệ số 1,0)',
  };
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
/**
 * Tính toán và tổng hợp dữ liệu tiền công tháng (FR-05, QUY_TAC.md Mục 7).
 * Đồng bộ 100% với Bảng chấm công (Timesheet) và Bảng thống kê công việc (Single Source of Truth).
 * Áp dụng đầy đủ 7 quy tắc bắt buộc và các testcase TC-03, TC-04, TC-05, TC-06, TC-07.
 */
async function calculateMonthlyPayroll(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  // Lấy dữ liệu Bảng chấm công thống nhất (Single Source of Truth)
  const timesheetData = await getTimesheetData(m, y);
  const payrollResults = [];

  for (const row of timesheetData.rows) {
    const ctv = row.ctv;
    const summary = row.summary || {};

    const totalShiftCount = summary.sumLV || 0;
    const shiftHours = summary.gioLV || 0;
    const taskHours = summary.gioSV || 0;
    const overtimeHours = summary.gioOt || 0;
    const sundayHours = summary.gioSunday || 0;
    const totalStandardHours = Math.round((shiftHours + taskHours) * 100) / 100;
    const totalCalculatedHours = summary.tongGio || 0;
    const hourlyRate = 20000.00;
    const totalAmount = summary.tien || 0;

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
      summary,
    });
  }

  return payrollResults;
}

/**
 * Lấy dữ liệu Bảng chấm công chi tiết ma trận (Sheet1)
 * Trả về danh sách CTV, mỗi CTV gồm 3 dòng S-C-T, các ngày 1..daysInMonth và các cột tổng hợp AI-AO.
 */
async function getTimesheetData(month, year) {
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
    let gioThuong = 0;
    let gioOt = 0;
    let gioSunday = 0;
    let calculatedTaskHours = 0;

    for (const task of monthTasks) {
      const calc = calculateTaskHoursAndMultiplier(task);
      gioSV += calc.actualHours;
      gioThuong += calc.normalHours;
      gioOt += calc.overtimeHours;
      gioSunday += calc.sundayHours;
      calculatedTaskHours += calc.convertedHours;
    }

    const tongGio = Math.round((gioLV + calculatedTaskHours) * 100) / 100; // Col AN: Tổng giờ quy đổi sau hệ số
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
        gioSV: Math.round(gioSV * 100) / 100,
        gioSv: Math.round(gioSV * 100) / 100,
        gioThuong: Math.round(gioThuong * 100) / 100,
        gioOt: Math.round(gioOt * 100) / 100,
        gioSunday: Math.round(gioSunday * 100) / 100,
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
const getTasksSummaryData = async (month, year, targetUserId = null) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysCount = getDaysInMonth(m, y);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  const whereCollaborator = { role: 'COLLABORATOR' };
  if (targetUserId) {
    whereCollaborator.id = targetUserId;
  }

  const collaborators = await User.findAll({
    where: whereCollaborator,
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
    let totalConvertedHours = 0;
    const taskItems = monthTasks.map((t) => {
      const calc = calculateTaskHoursAndMultiplier(t);
      totalHours += calc.actualHours;
      totalConvertedHours += calc.convertedHours;
      const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
      const dateStr = normalizeExecutionDate(rawDate);

      return {
        id: t.id,
        date: dateStr,
        content: t.description || t.title,
        title: t.title,
        taskType: t.taskType === 'Khác' && t.otherTaskType ? `Khác: ${t.otherTaskType}` : t.taskType || 'Sự vụ',
        status: t.status,
        hours: calc.actualHours,
        normalHours: calc.normalHours,
        overtimeHours: calc.overtimeHours,
        sundayHours: calc.sundayHours,
        multiplier: calc.multiplier,
        convertedHours: calc.convertedHours,
        isHighlighted: calc.isHighlighted,
        multiplierNote: calc.multiplierNote,
        reason: calc.reason,
        note: calc.multiplierNote
          ? (t.note ? `${t.note} | ${calc.multiplierNote}` : calc.multiplierNote)
          : (t.note || '—'),
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
      totalHours: Math.round(totalHours * 100) / 100,
      totalConvertedHours: Math.round(totalConvertedHours * 100) / 100,
      totalAmount: Math.round(totalConvertedHours * 20000),
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
 * Lấy dữ liệu Bảng Tổng công việc tháng dành riêng cho CTV (Read-only)
 * Bảo mật RBAC: CTV chỉ xem danh sách công việc của chính mình, không xem dữ liệu CTV khác.
 * Hiển thị đầy đủ: STT, ngày thực hiện, nội dung công việc, nhiệm vụ, số giờ thực hiện, trạng thái duyệt và ghi chú.
 * Bổ sung bộ lọc tháng/năm, mặc định là tháng hiện tại; cho phép xem lại dữ liệu các tháng trước.
 * Hiển thị tổng số công việc, tổng giờ đã thực hiện và tổng giờ được Nhân sự xác nhận.
 * Các công việc được nhân hệ số phải có ghi chú và highlight rõ số giờ ngoài giờ/Chủ nhật cùng hệ số áp dụng.
 */
const getCollaboratorMonthlySummary = async (month, year, ctvUserId) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysCount = getDaysInMonth(m, y);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;

  const ctv = await User.findOne({
    where: { id: ctvUserId },
    attributes: ['id', 'fullName', 'email', 'employeeCode', 'role'],
  });

  if (!ctv) {
    const error = new Error('Không tìm thấy thông tin cộng tác viên');
    error.statusCode = 404;
    throw error;
  }

  // Lấy toàn bộ các công việc được giao cho CTV này
  const tasks = await Task.findAll({
    where: {
      assignedToUserId: ctvUserId,
    },
    order: [['executionDate', 'ASC'], ['completedAt', 'ASC'], ['createdAt', 'ASC']],
  });

  // Lọc theo tháng thực hiện dựa trên executionDate, completedAt hoặc createdAt
  const monthTasks = tasks.filter((t) => {
    const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
    const taskDateStr = normalizeExecutionDate(rawDate);
    return taskDateStr >= startDate && taskDateStr <= endDate;
  });

  let totalTasks = monthTasks.length;
  let completedTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;
  let revisionRequestedTasks = 0;
  let notStartedTasks = 0;

  let totalHoursWorked = 0; // Tổng giờ đã thực hiện
  let confirmedHours = 0;   // Tổng giờ được Nhân sự xác nhận (COMPLETED)
  let confirmedConvertedHours = 0; // Tổng giờ quy đổi sau hệ số

  const taskItems = monthTasks.map((t, idx) => {
    const isCompleted = t.status === 'COMPLETED';
    const isPending = t.status === 'PENDING_APPROVAL';
    const rawHours = parseFloat(t.actualHours) || 0;

    // Tổng giờ đã thực hiện: Tính theo số giờ thực tế CTV đã làm/nộp
    totalHoursWorked += rawHours;

    let calc = {
      actualHours: rawHours,
      normalHours: rawHours,
      overtimeHours: 0,
      sundayHours: 0,
      multiplier: 1.0,
      convertedHours: rawHours,
      isHighlighted: false,
      multiplierNote: '',
      reason: '',
    };

    if (isCompleted) {
      completedTasks++;
      // Single Source of Truth cho hệ số nhân
      calc = calculateTaskHoursAndMultiplier(t);
      confirmedHours += calc.actualHours;
      confirmedConvertedHours += calc.convertedHours;
    } else if (isPending) {
      pendingTasks++;
    } else if (t.status === 'REVISION_REQUESTED') {
      revisionRequestedTasks++;
    } else if (t.status === 'IN_PROGRESS') {
      inProgressTasks++;
    } else {
      notStartedTasks++;
    }

    const rawDate = t.executionDate || (t.completedAt ? t.completedAt.toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10));
    const dateStr = normalizeExecutionDate(rawDate);

    // Ghi chú chuẩn hóa
    let noteText = t.note || '';
    if (isCompleted && calc.isHighlighted && calc.multiplierNote) {
      noteText = noteText ? `${noteText} | ${calc.multiplierNote}` : calc.multiplierNote;
    } else if (isPending) {
      noteText = noteText ? `${noteText} (Chờ duyệt tính hệ số)` : 'Chờ Nhân sự duyệt để tính hệ số';
    } else if (!noteText) {
      noteText = '—';
    }

    return {
      stt: idx + 1,
      id: t.id,
      date: dateStr,
      title: t.title,
      content: t.description || t.title,
      taskType: t.taskType === 'Khác' && t.otherTaskType ? `Khác: ${t.otherTaskType}` : t.taskType || 'Sự vụ',
      status: t.status,
      hours: calc.actualHours,
      normalHours: calc.normalHours,
      overtimeHours: calc.overtimeHours,
      sundayHours: calc.sundayHours,
      multiplier: isCompleted ? calc.multiplier : 1.0,
      convertedHours: isCompleted ? calc.convertedHours : calc.actualHours,
      isHighlighted: isCompleted && calc.isHighlighted,
      multiplierNote: isCompleted ? calc.multiplierNote : '',
      reason: isCompleted ? calc.reason : '',
      note: noteText,
      resultLink: t.resultLink || null,
      proofFile: t.proofFile || null,
      feedback: t.feedback || null,
      completedAt: t.completedAt || null,
    };
  });

  totalHoursWorked = Math.round(totalHoursWorked * 100) / 100;
  confirmedHours = Math.round(confirmedHours * 100) / 100;
  confirmedConvertedHours = Math.round(confirmedConvertedHours * 100) / 100;
  const estimatedSalary = Math.round(confirmedConvertedHours * 20000);

  return {
    month: m,
    year: y,
    ctv: {
      id: ctv.id,
      fullName: ctv.fullName,
      email: ctv.email,
      employeeCode: ctv.employeeCode,
    },
    summary: {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      revisionRequestedTasks,
      notStartedTasks,
      totalHoursWorked,
      confirmedHours,
      confirmedConvertedHours,
      estimatedSalary,
      hourlyRate: 20000,
    },
    tasks: taskItems,
  };
};

/**
 * Helper chuyển số thứ tự cột (1-based) sang ký tự cột Excel (1->A, 27->AA, 41->AO)
 */
const getExcelColLetter = (colNum) => {
  let letter = '';
  let n = colNum;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
};

/**
 * Helper định dạng dấu thời gian xuất file theo giờ Việt Nam: ddMMyyyy
 */
const getExportDateStampVN = () => {
  const now = new Date();
  const vn = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  const d = String(vn.getDate()).padStart(2, '0');
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const y = vn.getFullYear();
  return `${d}${m}${y}`;
};

/**
 * Helper định dạng ngày YYYY-MM-DD -> dd/MM/yyyy
 */
const formatDateStrVN = (dateStr) => {
  if (!dateStr) return '—';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

/**
 * Lọc danh sách theo ctvId và từ khóa tìm kiếm (đồng bộ với bộ lọc trên Frontend)
 */
const filterCtvCollection = (items, filters = {}) => {
  const ctvId = filters.ctvId && filters.ctvId !== 'ALL' ? String(filters.ctvId).trim() : null;
  const search = filters.search ? String(filters.search).trim().toLowerCase() : '';
  return items.filter((item) => {
    const ctv = item.ctv || item.user || {};
    if (ctvId && ctv.id !== ctvId) return false;
    if (search) {
      const hay = `${ctv.fullName || ''} ${ctv.email || ''} ${ctv.employeeCode || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
};

/**
 * Xuất file Excel Bảng chấm công tháng (chuẩn sheet Sheet1, đồng bộ bộ lọc & công thức Excel)
 */
const exportTimesheetExcel = async (month, year, res, filters = {}) => {
  const data = await getTimesheetData(month, year);
  const filteredRows = filterCtvCollection(data.rows || [], filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU Media Studio';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sheet1', {
    pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4 Landscape
  });

  // Các cột tổng hợp cuối bảng (tính động theo daysCount: 28/29/30/31)
  const colAI = 4 + data.daysCount;     // LV
  const colAJ = colAI + 1;              // SV
  const colAK = colAI + 2;              // Sum LV
  const colAL = colAI + 3;              // Giờ LV
  const colAM = colAI + 4;              // Giờ SV
  const colAN = colAI + 5;              // Tổng
  const colAO = colAI + 6;              // Tiền

  const lastColLetter = getExcelColLetter(colAO);
  const colAILetter = getExcelColLetter(colAI);
  const colAKLetter = getExcelColLetter(colAK);
  const colALLetter = getExcelColLetter(colAL);
  const colAMLetter = getExcelColLetter(colAM);
  const colANLetter = getExcelColLetter(colAN);
  const colAOLetter = getExcelColLetter(colAO);

  // 1. Header dòng 1: Tên đơn vị
  sheet.mergeCells('A1:L1');
  const cellA1 = sheet.getCell('A1');
  cellA1.value = 'BỘ PHẬN TRUYỀN THÔNG - TRUNG TÂM TUYỂN SINH & QUAN HỆ CÔNG CHÚNG';
  cellA1.font = { name: 'Arial', size: 10, bold: true };
  cellA1.alignment = { vertical: 'middle', horizontal: 'left' };

  // 2. Header dòng 2: Tiêu đề BẢNG CHẤM CÔNG THÁNG MM/YYYY
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const cellA2 = sheet.getCell('A2');
  cellA2.value = `BẢNG CHẤM CÔNG THÁNG ${String(data.month).padStart(2, '0')}/${data.year}`;
  cellA2.font = { name: 'Arial', size: 14, bold: true };
  cellA2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 26;

  // 3. Dòng 4: Thứ (T2..CN) | Dòng 5: Ngày (1..daysCount)
  sheet.mergeCells('A4:A5');
  sheet.getCell('A4').value = 'Stt';
  sheet.mergeCells('B4:B5');
  sheet.getCell('B4').value = 'Họ tên';
  sheet.mergeCells('C4:C5');
  sheet.getCell('C4').value = 'Buổi';

  for (let i = 0; i < data.daysCount; i++) {
    const colIdx = 4 + i;
    sheet.getCell(4, colIdx).value = data.daysHeader[i].dow;
    sheet.getCell(5, colIdx).value = data.daysHeader[i].day;
  }

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

  for (let r = 4; r <= 5; r++) {
    const row = sheet.getRow(r);
    row.height = 22;
    for (let c = 1; c <= colAO; c++) {
      const cell = row.getCell(c);
      const isSunCol = c >= 4 && c < colAI && data.daysHeader[c - 4]?.dow === 'CN';
      cell.font = { name: 'Arial', size: 9, bold: true, color: isSunCol ? { argb: 'FFCC0000' } : { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isSunCol ? 'FFFDE8E8' : 'FFF2F2F2' },
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
  let filteredGrandTotal = 0;
  const firstDataRow = 6;

  if (filteredRows.length === 0) {
    sheet.mergeCells(currentRow, 1, currentRow, colAO);
    const emptyCell = sheet.getCell(currentRow, 1);
    emptyCell.value = `Không có dữ liệu chấm công CTV phù hợp cho Tháng ${String(data.month).padStart(2, '0')}/${data.year}.`;
    emptyCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(currentRow).height = 24;
    for (let c = 1; c <= colAO; c++) {
      sheet.getCell(currentRow, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    currentRow += 1;
  } else {
    filteredRows.forEach((item, idx) => {
      const startR = currentRow;
      const endR = currentRow + 2;

      sheet.mergeCells(startR, 1, endR, 1);
      sheet.getCell(startR, 1).value = idx + 1;
      sheet.getCell(startR, 1).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells(startR, 2, endR, 2);
      sheet.getCell(startR, 2).value = item.ctv.fullName;
      sheet.getCell(startR, 2).alignment = { vertical: 'middle', horizontal: 'left' };

      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const rIdx = startR + sIdx;
        const sess = item.sessions[sIdx];
        const row = sheet.getRow(rIdx);
        row.height = 18;

        row.getCell(3).value = sess.session;
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

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

        row.getCell(colAI).value = sess.lv;
        row.getCell(colAI).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(colAJ).value = sess.sv;
        row.getCell(colAJ).alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Công thức Excel kèm giá trị result chính xác
      sheet.mergeCells(startR, colAK, endR, colAK);
      sheet.getCell(startR, colAK).value = {
        formula: `SUM(${colAILetter}${startR}:${colAILetter}${endR})`,
        result: item.summary.sumLV,
      };
      sheet.getCell(startR, colAK).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells(startR, colAL, endR, colAL);
      sheet.getCell(startR, colAL).value = {
        formula: `${colAKLetter}${startR}*4`,
        result: item.summary.gioLV,
      };
      sheet.getCell(startR, colAL).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells(startR, colAM, endR, colAM);
      sheet.getCell(startR, colAM).value = item.summary.gioSV;
      sheet.getCell(startR, colAM).numFmt = '#,##0.0';
      sheet.getCell(startR, colAM).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells(startR, colAN, endR, colAN);
      sheet.getCell(startR, colAN).value = {
        formula: `${colALLetter}${startR}+${colAMLetter}${startR}`,
        result: item.summary.tongGio,
      };
      sheet.getCell(startR, colAN).numFmt = '#,##0.0';
      sheet.getCell(startR, colAN).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells(startR, colAO, endR, colAO);
      sheet.getCell(startR, colAO).value = {
        formula: `ROUND(${colANLetter}${startR}*20000,0)`,
        result: item.summary.tien,
      };
      sheet.getCell(startR, colAO).numFmt = '#,##0';
      sheet.getCell(startR, colAO).alignment = { vertical: 'middle', horizontal: 'right' };
      sheet.getCell(startR, colAO).font = { name: 'Arial', size: 9, bold: true };

      filteredGrandTotal += item.summary.tien || 0;

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
    });
  }

  // 5. Dòng Tổng cộng tiền
  const totalRowIdx = currentRow;
  sheet.getRow(totalRowIdx).height = 24;
  sheet.mergeCells(totalRowIdx, 1, totalRowIdx, colAN);
  sheet.getCell(totalRowIdx, 1).value = 'TỔNG CỘNG THÙ LAO THÁNG (VNĐ):';
  sheet.getCell(totalRowIdx, 1).font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell(totalRowIdx, 1).alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.getCell(totalRowIdx, colAO).value =
    filteredRows.length > 0
      ? { formula: `SUM(${colAOLetter}${firstDataRow}:${colAOLetter}${totalRowIdx - 1})`, result: filteredGrandTotal }
      : 0;
  sheet.getCell(totalRowIdx, colAO).numFmt = '#,##0';
  sheet.getCell(totalRowIdx, colAO).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF990000' } };
  sheet.getCell(totalRowIdx, colAO).alignment = { vertical: 'middle', horizontal: 'right' };
  for (let c = 1; c <= colAO; c++) {
    sheet.getCell(totalRowIdx, c).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };
  }

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

  sheet.getCell(legendStartRow + 1, 2).value = 'LV';
  sheet.getCell(legendStartRow + 1, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0066CC' } };
  sheet.mergeCells(legendStartRow + 1, 3, legendStartRow + 1, 10);
  sheet.getCell(legendStartRow + 1, 3).value = 'Trực - làm việc tại STUDIO (4 giờ/ca = 80.000 đ)';
  sheet.getCell(legendStartRow + 1, 3).font = { name: 'Arial', size: 9 };

  sheet.getCell(legendStartRow + 2, 2).value = 'SV';
  sheet.getCell(legendStartRow + 2, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9900CC' } };
  sheet.mergeCells(legendStartRow + 2, 3, legendStartRow + 2, 10);
  sheet.getCell(legendStartRow + 2, 3).value = 'Làm sự vụ (sau 16:30 T2-T7 ×1,5; Chủ nhật ×2,0)';
  sheet.getCell(legendStartRow + 2, 3).font = { name: 'Arial', size: 9 };

  sheet.getCell(legendStartRow + 3, 2).value = 'NL';
  sheet.getCell(legendStartRow + 3, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFCC0000' } };
  sheet.mergeCells(legendStartRow + 3, 3, legendStartRow + 3, 10);
  sheet.getCell(legendStartRow + 3, 3).value = 'Nghỉ lễ';
  sheet.getCell(legendStartRow + 3, 3).font = { name: 'Arial', size: 9 };

  sheet.mergeCells(legendStartRow + 5, 19, legendStartRow + 5, 25);
  sheet.getCell(legendStartRow + 5, 19).value = 'Huỳnh Thúc Hiếu';
  sheet.getCell(legendStartRow + 5, 19).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow + 5, 19).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(legendStartRow + 5, 27, legendStartRow + 5, 34);
  sheet.getCell(legendStartRow + 5, 27).value = 'Khuất Kiều Diễm Nhi';
  sheet.getCell(legendStartRow + 5, 27).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(legendStartRow + 5, 27).alignment = { vertical: 'middle', horizontal: 'center' };

  // Đặt độ rộng cột
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 6;
  for (let c = 4; c < colAI; c++) {
    sheet.getColumn(c).width = 4.2;
  }
  sheet.getColumn(colAI).width = 6;
  sheet.getColumn(colAJ).width = 6;
  sheet.getColumn(colAK).width = 8;
  sheet.getColumn(colAL).width = 8;
  sheet.getColumn(colAM).width = 8;
  sheet.getColumn(colAN).width = 8;
  sheet.getColumn(colAO).width = 15;

  if (res) {
    const filename = `LHU_Media_Bang_Cham_Cong_T${String(data.month).padStart(2, '0')}_${data.year}_${getExportDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await workbook.xlsx.write(res);
    res.end();
  }

  return workbook;
};

/**
 * Xuất file Excel Bảng thống kê công việc tháng (chuẩn sheet T{m}.{y} + Sheet 2 Chi tiết giờ & hệ số)
 */
const exportTasksSummaryExcel = async (month, year, res, filters = {}) => {
  const data = await getTasksSummaryData(month, year, filters.ctvId && filters.ctvId !== 'ALL' ? filters.ctvId : null);
  const filteredGroups = filterCtvCollection(data.ctvGroups || [], filters).filter((g) => g.tasks.length > 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU Media Studio';
  workbook.created = new Date();

  // =========================================================================
  // SHEET 1: BIỂU MẪU CHUẨN BPTT (T{m}.{y}) - GIỮ NGUYÊN 8 CỘT ĐÃ THỐNG NHẤT
  // =========================================================================
  const sheet = workbook.addWorksheet(`T${data.month}.${data.year}`, {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'TRƯỜNG ĐẠI HỌC LẠC HỒNG';
  sheet.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('E1:H1');
  sheet.getCell('E1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  sheet.getCell('E1').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('E1').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = 'TT. TUYỂN SINH & QUAN HỆ CÔNG CHÚNG';
  sheet.getCell('A2').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('E2:H2');
  sheet.getCell('E2').value = 'Độc lập - Tự do - Hạnh phúc';
  sheet.getCell('E2').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('E2').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('E3:H3');
  sheet.getCell('E3').value = `Đồng Nai, ngày        tháng     năm ${data.year}`;
  sheet.getCell('E3').font = { name: 'Arial', size: 10, italic: true };
  sheet.getCell('E3').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('A4:H4');
  sheet.getCell('A4').value = `THỐNG KÊ \nCộng tác viên thực hiện công việc sự vụ (Tháng ${data.month}/${data.year})`;
  sheet.getCell('A4').font = { name: 'Arial', size: 13, bold: true };
  sheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.getRow(4).height = 36;

  const headers = ['Stt', 'Họ và tên', 'Ngày', 'Nội dung sự vụ', 'Nhiệm vụ', 'Thực hiện (giờ)', 'Tổng \n(giờ quy đổi)', 'Ghi chú'];
  const headerRow = sheet.getRow(5);
  headerRow.height = 28;

  for (let c = 1; c <= 8; c++) {
    const cell = headerRow.getCell(c);
    cell.value = headers[c - 1];
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  }

  let currentRow = 6;
  let grandTotalActualHours = 0;
  let grandTotalConvertedHours = 0;

  if (filteredGroups.length === 0) {
    sheet.mergeCells('A6:H6');
    const emptyCell = sheet.getCell('A6');
    emptyCell.value = `Không có công việc sự vụ đã nghiệm thu nào trong Tháng ${String(data.month).padStart(2, '0')}/${data.year}.`;
    emptyCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(6).height = 24;
    for (let c = 1; c <= 8; c++) {
      sheet.getCell(6, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    currentRow = 7;
  } else {
    filteredGroups.forEach((group, gIdx) => {
      const startR = currentRow;
      const endR = currentRow + group.tasks.length - 1;

      if (endR > startR) {
        sheet.mergeCells(startR, 1, endR, 1);
        sheet.mergeCells(startR, 2, endR, 2);
        sheet.mergeCells(startR, 7, endR, 7);
      }

      sheet.getCell(startR, 1).value = gIdx + 1;
      sheet.getCell(startR, 1).alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.getCell(startR, 2).value = group.ctv.fullName;
      sheet.getCell(startR, 2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      const groupConverted = group.totalConvertedHours !== undefined ? group.totalConvertedHours : group.totalHours;
      sheet.getCell(startR, 7).value = groupConverted;
      sheet.getCell(startR, 7).numFmt = '#,##0.0';
      sheet.getCell(startR, 7).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getCell(startR, 7).font = { name: 'Arial', size: 9, bold: true };

      grandTotalActualHours += group.totalHours || 0;
      grandTotalConvertedHours += groupConverted || 0;

      for (let tIdx = 0; tIdx < group.tasks.length; tIdx++) {
        const task = group.tasks[tIdx];
        const rIdx = startR + tIdx;
        const row = sheet.getRow(rIdx);

        row.getCell(3).value = formatDateStrVN(task.date);
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

        if (task.isHighlighted) {
          for (let c = 3; c <= 8; c++) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
          }
          row.getCell(8).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
        }

        for (let c = 1; c <= 8; c++) {
          row.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
      }

      currentRow = endR + 1;
    });

    // Dòng tổng cộng
    const sumRow = sheet.getRow(currentRow);
    sumRow.height = 24;
    sheet.mergeCells(currentRow, 1, currentRow, 5);
    sumRow.getCell(1).value = `TỔNG CỘNG THÁNG ${String(data.month).padStart(2, '0')}/${data.year}:`;
    sumRow.getCell(1).font = { name: 'Arial', size: 9, bold: true };
    sumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };

    sumRow.getCell(6).value = {
      formula: `SUM(F6:F${currentRow - 1})`,
      result: Math.round(grandTotalActualHours * 100) / 100,
    };
    sumRow.getCell(6).numFmt = '#,##0.0';
    sumRow.getCell(6).font = { name: 'Arial', size: 9, bold: true };
    sumRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

    sumRow.getCell(7).value = Math.round(grandTotalConvertedHours * 100) / 100;
    sumRow.getCell(7).numFmt = '#,##0.0';
    sumRow.getCell(7).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF990000' } };
    sumRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    sumRow.getCell(8).value = `Thù lao ước tính: ${Math.round(grandTotalConvertedHours * 20000).toLocaleString('vi-VN')} VNĐ`;
    sumRow.getCell(8).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
    sumRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= 8; c++) {
      sumRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      sumRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    }
    currentRow += 1;
  }

  // Khối chữ ký cuối bảng
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

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 13;
  sheet.getColumn(4).width = 46;
  sheet.getColumn(5).width = 26;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 34;

  // =========================================================================
  // SHEET 2: CHI TIẾT GIỜ THƯỜNG / NGOÀI GIỜ / CHỦ NHẬT / HỆ SỐ & TIỀN CÔNG
  // =========================================================================
  const detailSheet = workbook.addWorksheet('Chi tiết giờ & hệ số', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  detailSheet.mergeCells('A1:M1');
  detailSheet.getCell('A1').value = `CHI TIẾT GIỜ LÀM THƯỜNG, NGOÀI GIỜ, CHỦ NHẬT, HỆ SỐ VÀ THÙ LAO - THÁNG ${String(data.month).padStart(2, '0')}/${data.year}`;
  detailSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F3864' } };
  detailSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  detailSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  detailSheet.getRow(1).height = 30;

  const detailHeaders = [
    'STT',
    'Họ và tên CTV',
    'Ngày',
    'Nội dung sự vụ',
    'Nhiệm vụ',
    'Giờ thường (×1,0)',
    'Ngoài giờ sau 16:30 (×1,5)',
    'Giờ Chủ nhật (×2,0)',
    'Tổng giờ thực tế',
    'Hệ số',
    'Giờ quy đổi',
    'Tiền công (VNĐ)',
    'Ghi chú & Hệ số',
  ];
  const dHeaderRow = detailSheet.getRow(3);
  dHeaderRow.height = 28;
  detailHeaders.forEach((h, idx) => {
    const cell = dHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  let dRowIdx = 4;
  let seq = 1;
  let sumNormal = 0;
  let sumOT = 0;
  let sumSun = 0;
  let sumActual = 0;
  let sumConverted = 0;
  let sumPay = 0;

  for (const group of filteredGroups) {
    for (const task of group.tasks) {
      const r = detailSheet.getRow(dRowIdx);
      r.height = 22;
      const normalH = Number(task.normalHours || 0);
      const otH = Number(task.overtimeHours || 0);
      const sunH = Number(task.sundayHours || 0);
      const actualH = Number(task.hours || 0);
      const mult = Number(task.multiplier || 1);
      const convH = Number(task.convertedHours !== undefined ? task.convertedHours : actualH);
      const payAmt = Math.round(convH * 20000);

      r.getCell(1).value = seq++;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).value = group.ctv.fullName;
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(3).value = formatDateStrVN(task.date);
      r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(4).value = task.content;
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(5).value = task.taskType;
      r.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };

      r.getCell(6).value = normalH;
      r.getCell(6).numFmt = '#,##0.0';
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(7).value = otH;
      r.getCell(7).numFmt = '#,##0.0';
      r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(8).value = sunH;
      r.getCell(8).numFmt = '#,##0.0';
      r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(9).value = { formula: `F${dRowIdx}+G${dRowIdx}+H${dRowIdx}`, result: actualH };
      r.getCell(9).numFmt = '#,##0.0';
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(10).value = mult;
      r.getCell(10).numFmt = '0.0#';
      r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(11).value = { formula: `ROUND(F${dRowIdx}*1+G${dRowIdx}*1.5+H${dRowIdx}*2,2)`, result: convH };
      r.getCell(11).numFmt = '#,##0.0';
      r.getCell(11).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(12).value = { formula: `ROUND(K${dRowIdx}*20000,0)`, result: payAmt };
      r.getCell(12).numFmt = '#,##0';
      r.getCell(12).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
      r.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      r.getCell(13).value = task.note;
      r.getCell(13).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      if (task.isHighlighted) {
        for (let c = 1; c <= 13; c++) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        }
        r.getCell(13).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
      }

      for (let c = 1; c <= 13; c++) {
        r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      sumNormal += normalH;
      sumOT += otH;
      sumSun += sunH;
      sumActual += actualH;
      sumConverted += convH;
      sumPay += payAmt;
      dRowIdx++;
    }
  }

  if (dRowIdx === 4) {
    detailSheet.mergeCells('A4:M4');
    detailSheet.getCell('A4').value = `Không có công việc nào trong Tháng ${String(data.month).padStart(2, '0')}/${data.year}.`;
    detailSheet.getCell('A4').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    detailSheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    const tRow = detailSheet.getRow(dRowIdx);
    tRow.height = 24;
    detailSheet.mergeCells(dRowIdx, 1, dRowIdx, 5);
    tRow.getCell(1).value = 'TỔNG CỘNG:';
    tRow.getCell(1).font = { name: 'Arial', size: 9, bold: true };
    tRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    const colSums = [
      [6, 'F', sumNormal, '#,##0.0', 'center'],
      [7, 'G', sumOT, '#,##0.0', 'center'],
      [8, 'H', sumSun, '#,##0.0', 'center'],
      [9, 'I', sumActual, '#,##0.0', 'center'],
      [11, 'K', sumConverted, '#,##0.0', 'center'],
      [12, 'L', sumPay, '#,##0', 'right'],
    ];
    for (const [colIdx, letter, val, fmt, align] of colSums) {
      tRow.getCell(colIdx).value = { formula: `SUM(${letter}4:${letter}${dRowIdx - 1})`, result: Math.round(val * 100) / 100 };
      tRow.getCell(colIdx).numFmt = fmt;
      tRow.getCell(colIdx).font = { name: 'Arial', size: 9, bold: true, color: colIdx === 12 ? { argb: 'FF990000' } : { argb: 'FF000000' } };
      tRow.getCell(colIdx).alignment = { horizontal: align, vertical: 'middle' };
    }
    for (let c = 1; c <= 13; c++) {
      tRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      tRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    }
  }

  const detailWidths = [6, 22, 12, 38, 22, 14, 16, 14, 14, 9, 14, 16, 30];
  detailWidths.forEach((w, i) => {
    detailSheet.getColumn(i + 1).width = w;
  });

  if (res) {
    const filename = `LHU_Media_Thong_Ke_Cong_Viec_T${String(data.month).padStart(2, '0')}_${data.year}_${getExportDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await workbook.xlsx.write(res);
    res.end();
  }

  return workbook;
};

/**
 * [ADMIN] Xuất file Excel Bảng lương tháng CTV (đầy đủ giờ trực, giờ thường, ngoài giờ ×1.5, Chủ nhật ×2.0, hệ số, công thức tiền công)
 */
const exportMonthlyPayrollExcel = async (month, year, res, filters = {}) => {
  const m = parseInt(month, 10) || new Date().getMonth() + 1;
  const y = parseInt(year, 10) || new Date().getFullYear();

  const payrollResults = await calculateMonthlyPayroll(m, y);
  const filteredResults = filterCtvCollection(payrollResults || [], filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU Media Studio';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Bang_Luong_T${String(m).padStart(2, '0')}.${y}`, {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  // Header đơn vị & tiêu đề
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'TRƯỜNG ĐẠI HỌC LẠC HỒNG - BỘ PHẬN TRUYỀN THÔNG';
  sheet.getCell('A1').font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells('H1:N1');
  sheet.getCell('H1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM - Độc lập - Tự do - Hạnh phúc';
  sheet.getCell('H1').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('H1').alignment = { horizontal: 'right' };

  sheet.mergeCells('A2:N2');
  sheet.getCell('A2').value = `BẢNG TỔNG HỢP THÙ LAO CỘNG TÁC VIÊN THÁNG ${String(m).padStart(2, '0')}/${y}`;
  sheet.getCell('A2').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F3864' } };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  sheet.getRow(2).height = 32;

  sheet.mergeCells('A3:N3');
  sheet.getCell('A3').value = 'Quy chuẩn: Đơn giá 20.000 VNĐ/giờ quy đổi • Ca trực LV = 4 giờ (×1,0) • Sự vụ sau 16:30 T2–T7 (×1,5) • Sự vụ Chủ nhật (×2,0)';
  sheet.getCell('A3').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
  sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(3).height = 20;

  const headers = [
    'STT',
    'Họ và tên CTV',
    'Mã NV / Email',
    'Số ca trực (LV)',
    'Giờ trực Studio (×1,0)',
    'Giờ sự vụ thường (×1,0)',
    'Ngoài giờ sau 16:30 (×1,5)',
    'Giờ Chủ nhật (×2,0)',
    'Tổng giờ thực tế',
    'Tổng giờ quy đổi',
    'Đơn giá (VNĐ/h)',
    'Thành tiền (VNĐ)',
    'Trạng thái',
    'Ghi chú',
  ];

  const headerRow = sheet.getRow(5);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  let rowIdx = 6;
  let totShifts = 0;
  let totShiftH = 0;
  let totNormalH = 0;
  let totOtH = 0;
  let totSunH = 0;
  let totActualH = 0;
  let totConvH = 0;
  let totMoney = 0;

  const statusLabelMap = {
    DRAFT: 'Tạm tính',
    CONFIRMED: 'Đã chốt',
    PAID: 'Đã chi trả',
  };

  if (filteredResults.length === 0) {
    sheet.mergeCells('A6:N6');
    sheet.getCell('A6').value = `Không có dữ liệu bảng lương CTV cho Tháng ${String(m).padStart(2, '0')}/${y}.`;
    sheet.getCell('A6').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    sheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(6).height = 24;
    for (let c = 1; c <= 14; c++) {
      sheet.getCell(6, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
    rowIdx = 7;
  } else {
    filteredResults.forEach((item, idx) => {
      const r = sheet.getRow(rowIdx);
      r.height = 24;
      const sum = item.summary || {};
      const pr = item.payroll || {};

      const shifts = Number(sum.sumLV ?? pr.totalShiftCount ?? 0);
      const shiftH = Number(sum.gioLV ?? pr.shiftHours ?? 0);
      const normalH = Number(sum.gioThuong ?? 0);
      const otH = Number(sum.gioOt ?? pr.overtimeHours ?? 0);
      const sunH = Number(sum.gioSunday ?? pr.sundayHours ?? 0);
      const actualH = Math.round((shiftH + normalH + otH + sunH) * 100) / 100;
      const convH = Number(sum.tongGio ?? pr.totalCalculatedHours ?? 0);
      const rate = Number(pr.hourlyRate ?? 20000);
      const amount = Number(sum.tien ?? pr.totalAmount ?? Math.round(convH * rate));
      const hasBonus = otH > 0 || sunH > 0;

      const noteParts = [];
      if (otH > 0) noteParts.push(`Ngoài giờ: ${formatHoursVi(otH)}h ×1,5`);
      if (sunH > 0) noteParts.push(`Chủ nhật: ${formatHoursVi(sunH)}h ×2,0`);

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).value = item.ctv.fullName;
      r.getCell(2).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(3).value = item.ctv.employeeCode || item.ctv.email || '';
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

      r.getCell(4).value = shifts;
      r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(5).value = { formula: `D${rowIdx}*4`, result: shiftH };
      r.getCell(5).numFmt = '#,##0.0';
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(6).value = normalH;
      r.getCell(6).numFmt = '#,##0.0';
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(7).value = otH;
      r.getCell(7).numFmt = '#,##0.0';
      r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(8).value = sunH;
      r.getCell(8).numFmt = '#,##0.0';
      r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(9).value = { formula: `E${rowIdx}+F${rowIdx}+G${rowIdx}+H${rowIdx}`, result: actualH };
      r.getCell(9).numFmt = '#,##0.0';
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(10).value = { formula: `ROUND(E${rowIdx}+F${rowIdx}+G${rowIdx}*1.5+H${rowIdx}*2,2)`, result: convH };
      r.getCell(10).numFmt = '#,##0.0';
      r.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(11).value = rate;
      r.getCell(11).numFmt = '#,##0';
      r.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

      r.getCell(12).value = { formula: `ROUND(J${rowIdx}*K${rowIdx},0)`, result: amount };
      r.getCell(12).numFmt = '#,##0';
      r.getCell(12).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
      r.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      r.getCell(13).value = statusLabelMap[pr.status] || pr.status || 'Tạm tính';
      r.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(14).value = noteParts.length > 0 ? noteParts.join(' | ') : (pr.note || '—');
      r.getCell(14).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      if (hasBonus) {
        for (let c = 1; c <= 14; c++) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        }
        r.getCell(14).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
      }

      for (let c = 1; c <= 14; c++) {
        r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      totShifts += shifts;
      totShiftH += shiftH;
      totNormalH += normalH;
      totOtH += otH;
      totSunH += sunH;
      totActualH += actualH;
      totConvH += convH;
      totMoney += amount;
      rowIdx++;
    });

    // Dòng tổng cộng
    const tRow = sheet.getRow(rowIdx);
    tRow.height = 26;
    sheet.mergeCells(rowIdx, 1, rowIdx, 3);
    tRow.getCell(1).value = `TỔNG CỘNG (${filteredResults.length} CTV):`;
    tRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    tRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    const sums = [
      [4, 'D', totShifts, '#,##0', 'center'],
      [5, 'E', totShiftH, '#,##0.0', 'center'],
      [6, 'F', totNormalH, '#,##0.0', 'center'],
      [7, 'G', totOtH, '#,##0.0', 'center'],
      [8, 'H', totSunH, '#,##0.0', 'center'],
      [9, 'I', totActualH, '#,##0.0', 'center'],
      [10, 'J', totConvH, '#,##0.0', 'center'],
      [12, 'L', totMoney, '#,##0', 'right'],
    ];
    for (const [colIdx, letter, val, fmt, align] of sums) {
      tRow.getCell(colIdx).value = { formula: `SUM(${letter}6:${letter}${rowIdx - 1})`, result: Math.round(val * 100) / 100 };
      tRow.getCell(colIdx).numFmt = fmt;
      tRow.getCell(colIdx).font = { name: 'Arial', size: 10, bold: true, color: colIdx === 12 ? { argb: 'FF990000' } : { argb: 'FF000000' } };
      tRow.getCell(colIdx).alignment = { horizontal: align, vertical: 'middle' };
    }
    for (let c = 1; c <= 14; c++) {
      tRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      tRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    }
    rowIdx += 1;
  }

  // Chữ ký
  rowIdx += 2;
  sheet.mergeCells(rowIdx, 1, rowIdx, 4);
  sheet.getCell(rowIdx, 1).value = 'LÃNH ĐẠO ĐƠN VỊ';
  sheet.getCell(rowIdx, 1).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(rowIdx, 1).alignment = { horizontal: 'center' };

  sheet.mergeCells(rowIdx, 6, rowIdx, 9);
  sheet.getCell(rowIdx, 6).value = 'TRƯỞNG BỘ PHẬN';
  sheet.getCell(rowIdx, 6).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(rowIdx, 6).alignment = { horizontal: 'center' };

  sheet.mergeCells(rowIdx, 11, rowIdx, 14);
  sheet.getCell(rowIdx, 11).value = 'NGƯỜI LẬP BẢNG';
  sheet.getCell(rowIdx, 11).font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell(rowIdx, 11).alignment = { horizontal: 'center' };

  const widths = [6, 24, 24, 12, 14, 14, 16, 14, 14, 14, 14, 17, 13, 30];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  if (res) {
    const filename = `LHU_Media_Bang_Luong_CTV_T${String(m).padStart(2, '0')}_${y}_${getExportDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await workbook.xlsx.write(res);
    res.end();
  }

  return workbook;
};

/**
 * [CTV / ADMIN] Xuất file Excel Tổng công việc tháng cá nhân của CTV (RBAC chặt chẽ: CTV chỉ xuất dữ liệu của chính mình)
 */
const exportCollaboratorSummaryExcel = async (month, year, ctvUserId, res, filters = {}) => {
  const data = await getCollaboratorMonthlySummary(month, year, ctvUserId);
  const statusFilter = filters.status && filters.status !== 'ALL' ? String(filters.status).trim() : null;
  const filteredTasks = statusFilter
    ? (data.tasks || []).filter((t) => t.status === statusFilter)
    : (data.tasks || []);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU Media Studio';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Cong_Viec_T${String(data.month).padStart(2, '0')}.${data.year}`, {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  sheet.mergeCells('A1:M1');
  sheet.getCell('A1').value = `BẢNG TỔNG CÔNG VIỆC CÁ NHÂN CTV - THÁNG ${String(data.month).padStart(2, '0')}/${data.year}`;
  sheet.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1F3864' } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells('A2:M2');
  sheet.getCell('A2').value = `Họ và tên CTV: ${data.ctv.fullName} (${data.ctv.employeeCode || data.ctv.email}) | Tổng việc: ${data.summary.totalTasks} | Tổng giờ thực hiện: ${data.summary.totalHoursWorked}h | Giờ Nhân sự xác nhận: ${data.summary.confirmedHours}h (${data.summary.confirmedConvertedHours} giờ quy đổi) | Thù lao xác nhận: ${data.summary.estimatedSalary.toLocaleString('vi-VN')} VNĐ`;
  sheet.getCell('A2').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1F3864' } };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.getRow(2).height = 24;

  const headers = [
    'STT',
    'Ngày thực hiện',
    'Nội dung công việc',
    'Nhiệm vụ',
    'Giờ thường (×1,0)',
    'Ngoài giờ sau 16:30 (×1,5)',
    'Giờ Chủ nhật (×2,0)',
    'Tổng giờ thực tế',
    'Hệ số',
    'Giờ quy đổi',
    'Trạng thái duyệt',
    'Thù lao xác nhận (VNĐ)',
    'Ghi chú & Hệ số',
  ];

  const headerRow = sheet.getRow(4);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const statusTextMap = {
    COMPLETED: 'Đã nghiệm thu',
    PENDING_APPROVAL: 'Chờ duyệt',
    REVISION_REQUESTED: 'Cần sửa đổi',
    IN_PROGRESS: 'Đang thực hiện',
    NOT_STARTED: 'Chưa bắt đầu',
  };

  let rowIdx = 5;
  let totNormal = 0;
  let totOt = 0;
  let totSun = 0;
  let totActual = 0;
  let totConv = 0;
  let totSalary = 0;

  if (filteredTasks.length === 0) {
    sheet.mergeCells('A5:M5');
    sheet.getCell('A5').value = `Không có công việc nào trong Tháng ${String(data.month).padStart(2, '0')}/${data.year}.`;
    sheet.getCell('A5').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
    sheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(5).height = 24;
    for (let c = 1; c <= 13; c++) {
      sheet.getCell(5, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
  } else {
    filteredTasks.forEach((t, idx) => {
      const r = sheet.getRow(rowIdx);
      r.height = 22;
      const isCompleted = t.status === 'COMPLETED';
      const normalH = Number(t.normalHours || 0);
      const otH = Number(t.overtimeHours || 0);
      const sunH = Number(t.sundayHours || 0);
      const actualH = Number(t.hours || 0);
      const convH = isCompleted ? Number(t.convertedHours || 0) : 0;
      const payAmt = isCompleted ? Math.round(convH * 20000) : 0;

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).value = formatDateStrVN(t.date);
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).value = t.content && t.content !== t.title ? `${t.title} - ${t.content}` : t.title;
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(4).value = t.taskType;
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

      r.getCell(5).value = normalH;
      r.getCell(5).numFmt = '#,##0.0';
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(6).value = otH;
      r.getCell(6).numFmt = '#,##0.0';
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(7).value = sunH;
      r.getCell(7).numFmt = '#,##0.0';
      r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(8).value = actualH;
      r.getCell(8).numFmt = '#,##0.0';
      r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(9).value = isCompleted ? Number(t.multiplier || 1) : 1;
      r.getCell(9).numFmt = '0.0#';
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(10).value = convH;
      r.getCell(10).numFmt = '#,##0.0';
      r.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(11).value = statusTextMap[t.status] || t.status;
      r.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(12).value = { formula: `ROUND(J${rowIdx}*20000,0)`, result: payAmt };
      r.getCell(12).numFmt = '#,##0';
      r.getCell(12).font = { name: 'Arial', size: 9, bold: true, color: { argb: isCompleted ? 'FF047857' : 'FF666666' } };
      r.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      r.getCell(13).value = t.multiplierNote
        ? (t.note && t.note !== t.multiplierNote ? `${t.multiplierNote} | ${t.note}` : t.multiplierNote)
        : (t.note || '—');
      r.getCell(13).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      if (t.isHighlighted) {
        for (let c = 1; c <= 13; c++) {
          r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        }
        r.getCell(13).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } };
      }

      for (let c = 1; c <= 13; c++) {
        r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      totNormal += normalH;
      totOt += otH;
      totSun += sunH;
      totActual += actualH;
      totConv += convH;
      totSalary += payAmt;
      rowIdx++;
    });

    const tRow = sheet.getRow(rowIdx);
    tRow.height = 24;
    sheet.mergeCells(rowIdx, 1, rowIdx, 4);
    tRow.getCell(1).value = 'TỔNG CỘNG:';
    tRow.getCell(1).font = { name: 'Arial', size: 9, bold: true };
    tRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    const sums = [
      [5, 'E', totNormal, '#,##0.0', 'center'],
      [6, 'F', totOt, '#,##0.0', 'center'],
      [7, 'G', totSun, '#,##0.0', 'center'],
      [8, 'H', totActual, '#,##0.0', 'center'],
      [10, 'J', totConv, '#,##0.0', 'center'],
      [12, 'L', totSalary, '#,##0', 'right'],
    ];
    for (const [colIdx, letter, val, fmt, align] of sums) {
      tRow.getCell(colIdx).value = { formula: `SUM(${letter}5:${letter}${rowIdx - 1})`, result: Math.round(val * 100) / 100 };
      tRow.getCell(colIdx).numFmt = fmt;
      tRow.getCell(colIdx).font = { name: 'Arial', size: 9, bold: true, color: colIdx === 12 ? { argb: 'FF990000' } : { argb: 'FF000000' } };
      tRow.getCell(colIdx).alignment = { horizontal: align, vertical: 'middle' };
    }
    for (let c = 1; c <= 13; c++) {
      tRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      tRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    }
  }

  const widths = [6, 13, 42, 22, 14, 16, 14, 14, 9, 13, 16, 18, 32];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  if (res) {
    const filename = `LHU_Media_Tong_Cong_Viec_Ca_Nhan_T${String(data.month).padStart(2, '0')}_${data.year}_${getExportDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
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
  formatHoursVi,
  isTechnicalTask,
  isMultiplierEligibleTask,
  calculateTaskHoursAndMultiplier,
  syncTaskAttendanceToDatabase,
  syncAllCompletedTasksToAttendance,
  calculateMonthlyPayroll,
  getTimesheetData,
  getTasksSummaryData,
  getCollaboratorMonthlySummary,
  exportTimesheetExcel,
  exportTasksSummaryExcel,
  exportMonthlyPayrollExcel,
  exportCollaboratorSummaryExcel,
  getExportDateStampVN,
  formatDateStrVN,
  updateAttendanceCell,
};

