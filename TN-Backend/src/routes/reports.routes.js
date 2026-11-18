'use strict';

/**
 * @file routes/reports.routes.js
 * @description Báo cáo & xuất Excel cho Admin.
 */

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Xuất báo cáo Excel (chỉ ADMIN)
 */

/**
 * @swagger
 * /api/reports/export-excel:
 *   get:
 *     summary: "[ADMIN] Xuất báo cáo thống kê tổng quan ra file Excel (.xlsx)"
 *     description: |
 *       Tải về file Excel đầy đủ 6 sheet đồng bộ hoàn toàn với trang Thống kê tổng quan:
 *       - **Tổng quan**: KPIs toàn hệ thống (Công việc & Hiệu suất CTV, Thù lao & Ca trực, Mượn/trả, Đặt phòng Studio 4 cấp độ, Thiết bị & Tỷ lệ sử dụng, Nhân sự)
 *       - **Công việc & Thù lao CTV**: Công việc cần chú ý/trễ hạn, Xu hướng thù lao theo tháng và Chi tiết thù lao CTV theo kỳ
 *       - **Hoạt động & Top thiết bị**: Biểu đồ lượt hoạt động theo thời gian (Mượn máy / Đặt phòng / Công việc) và Top thiết bị mượn nhiều nhất
 *       - **Đơn mượn thiết bị**: Chi tiết từng đơn mượn
 *       - **Đặt phòng Studio**: Chi tiết từng booking kèm trạng thái xác nhận sử dụng 4 cấp độ
 *       - **Thiết bị**: Danh sách toàn bộ thiết bị kèm công thức tổng số lượng
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [month, week, year, custom, month-year]
 *           default: month
 *         description: Khoảng thời gian báo cáo
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Ngày bắt đầu (khi range=custom)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Ngày kết thúc (khi range=custom)
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *         description: Tháng (khi range=month-year)
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Năm (khi range=year hoặc month-year)
 *     responses:
 *       200:
 *         description: File Excel tải về thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền (cần ADMIN)
 *       500:
 *         description: Lỗi xuất Excel
 */

const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const {
  User,
  Equipment,
  BorrowRequest,
  StudioBooking,
  EquipmentCategory,
  Task,
  MonthlyPayroll,
  StudioShift,
  sequelize,
} = require('../models');
const studioBookingService = require('../services/studioBooking.service');
const payrollService = require('../services/payroll.service');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// ============================================================
// Helpers
// ============================================================
function getDateStampVN() {
  const now = new Date();
  const vn = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  const d = String(vn.getDate()).padStart(2, '0');
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const y = vn.getFullYear();
  return `${d}${m}${y}`;
}

function getDateRange(query) {
  const now = new Date();
  const { range = 'month', startDate, endDate, month, year } = query;

  switch (range) {
    case 'week': {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Tuần này', slug: 'Tuan_Nay' };
    }
    case 'year': {
      const y = parseInt(year, 10) || now.getFullYear();
      return {
        start: new Date(y, 0, 1),
        end: new Date(y, 11, 31, 23, 59, 59),
        label: `Năm ${y}`,
        slug: `Nam_${y}`,
      };
    }
    case 'month-year': {
      const parsedMonth = parseInt(month, 10);
      const m = !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth - 1 : now.getMonth();
      const y = parseInt(year, 10) || now.getFullYear();
      return {
        start: new Date(y, m, 1),
        end: new Date(y, m + 1, 0, 23, 59, 59),
        label: `Tháng ${m + 1}/${y}`,
        slug: `T${String(m + 1).padStart(2, '0')}_${y}`,
      };
    }
    case 'custom': {
      if (startDate && endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const sClean = String(startDate).replace(/-/g, '');
        const eClean = String(endDate).replace(/-/g, '');
        return { start: new Date(startDate), end, label: `${startDate} → ${endDate}`, slug: `${sClean}_${eClean}` };
      }
      // fallthrough to month default
    }
    // eslint-disable-next-line no-fallthrough
    case 'month':
    default: {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
        slug: `T${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`,
      };
    }
  }
}

// Style helpers
function applyHeaderStyle(row, bgColor = '1F3864') {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  row.height = 28;
}

function applyDataStyle(row, isEven = false) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: isEven ? 'FFF2F2F2' : 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'hair' }, left: { style: 'hair' },
      bottom: { style: 'hair' }, right: { style: 'hair' },
    };
  });
  row.height = 22;
}

function statusVN(status) {
  const map = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    CONFIRMED: 'Đã duyệt',
    HANDED_OVER: 'Đang mượn',
    OVERDUE: 'Quá hạn',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Đã trả',
    COMPLETED: 'Hoàn thành',
    AVAILABLE: 'Sẵn sàng',
    BORROWED: 'Đang cho mượn',
    MAINTENANCE: 'Bảo trì',
    DAMAGED: 'Hư hỏng',
    REPAIRING: 'Đang sửa chữa',
    SUSPENDED: 'Tạm ngưng sử dụng',
    DISPOSED: 'Thanh lý / Hủy bỏ',
    LOST: 'Mất thiết bị',
    NOT_STARTED: 'Chưa bắt đầu',
    IN_PROGRESS: 'Đang thực hiện',
    PENDING_APPROVAL: 'Chờ nghiệm thu',
    REVISION_REQUESTED: 'Cần chỉnh sửa',
  };
  return map[status] || status;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const vn = new Date(dt.getTime() + (7 * 60 + dt.getTimezoneOffset()) * 60 * 1000);
  return `${String(vn.getDate()).padStart(2, '0')}/${String(vn.getMonth() + 1).padStart(2, '0')}/${vn.getFullYear()} ${String(vn.getHours()).padStart(2, '0')}:${String(vn.getMinutes()).padStart(2, '0')}`;
}

function fmtDateISO(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// ============================================================
// GET /api/reports/export-excel
// Xuất Báo cáo Thống kê tổng quan đầy đủ 6 sheet đồng bộ 100% với /admin/dashboard
// ============================================================
router.get('/export-excel', async (req, res) => {
  try {
    const now = new Date();
    const { start, end, label, slug } = getDateRange(req.query);
    const rangeType = req.query.range || 'month';
    const dateWhere = { created_at: { [Op.between]: [start, end] } };
    const startISO = fmtDateISO(start);
    const endISO = fmtDateISO(end);

    // Xác định tháng/năm mục tiêu cho bảng thù lao chi tiết
    let targetPayrollMonth = now.getMonth() + 1;
    let targetPayrollYear = now.getFullYear();
    const isSingleMonthRange = rangeType === 'month' || rangeType === 'month-year';
    if (rangeType === 'month-year') {
      const pm = parseInt(req.query.month, 10);
      if (!isNaN(pm) && pm >= 1 && pm <= 12) targetPayrollMonth = pm;
      const py = parseInt(req.query.year, 10);
      if (!isNaN(py) && py >= 2020) targetPayrollYear = py;
    } else if (rangeType === 'year') {
      const py = parseInt(req.query.year, 10);
      if (!isNaN(py) && py >= 2020) targetPayrollYear = py;
    }

    // Fetch dữ liệu song song (đồng bộ cùng nguồn với dashboard.routes.js)
    const [
      borrows,
      bookings,
      users,
      equipments,
      periodTasks,
      allTasks,
      urgentTasksList,
      periodShifts,
      topRaw,
      payrollTrendRows,
    ] = await Promise.all([
      BorrowRequest.findAll({
        where: dateWhere,
        include: [
          { model: User, as: 'requester', attributes: ['fullName', 'email', 'employeeCode'] },
          {
            model: Equipment,
            as: 'equipment',
            attributes: ['name', 'code', 'imageUrl'],
            include: [{ model: EquipmentCategory, as: 'category', attributes: ['name'] }],
          },
        ],
        order: [['created_at', 'DESC']],
      }),
      StudioBooking.findAll({
        where: dateWhere,
        include: [
          { model: User, as: 'booker', attributes: ['fullName', 'email', 'employeeCode'] },
        ],
        order: [['created_at', 'DESC']],
      }),
      User.findAll({ order: [['created_at', 'DESC']] }),
      Equipment.findAll({
        include: [{ model: EquipmentCategory, as: 'category', attributes: ['name'] }],
        order: [['created_at', 'DESC']],
      }),
      Task.findAll({
        where: dateWhere,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'fullName', 'email', 'employeeCode'] },
        ],
        order: [['created_at', 'DESC']],
      }),
      Task.findAll({
        attributes: ['id', 'status', 'deadline'],
      }),
      Task.findAll({
        where: {
          status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
          deadline: { [Op.ne]: null },
        },
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'fullName', 'email', 'employeeCode'] },
        ],
        order: [['deadline', 'ASC']],
        limit: 15,
      }),
      StudioShift.findAll({
        where: {
          date: { [Op.between]: [startISO, endISO] },
          status: { [Op.ne]: 'CANCELLED' },
        },
        attributes: ['id', 'userId', 'date', 'shiftType', 'status', 'hours'],
      }).catch(() => []),
      sequelize.query(
        `
        SELECT TOP 10
          br.equipment_id,
          COUNT(br.equipment_id) AS borrowCount,
          SUM(ISNULL(br.quantity, 1)) AS totalQtyBorrowed,
          e.id AS eq_id, e.name AS eq_name, e.code AS eq_code,
          ec.name AS cat_name
        FROM BorrowRequests br
        INNER JOIN Equipments e ON e.id = br.equipment_id
        LEFT JOIN EquipmentCategories ec ON ec.id = e.category_id
        WHERE br.created_at BETWEEN :start AND :end
        GROUP BY br.equipment_id, e.id, e.name, e.code, ec.name
        ORDER BY COUNT(br.equipment_id) DESC
        `,
        { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        `
        SELECT
          [year],
          [month],
          SUM(total_amount) AS totalAmount,
          SUM(total_calculated_hours) AS totalHours,
          COUNT(DISTINCT user_id) AS collaboratorCount
        FROM MonthlyPayrolls
        GROUP BY [year], [month]
        ORDER BY [year] ASC, [month] ASC
        `,
        { type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
    ]);

    // Lấy chi tiết thù lao CTV cho kỳ báo cáo (dùng Single Source of Truth payrollService)
    let payrollDetailRows = [];
    let payrollPeriodLabel = `Tháng ${String(targetPayrollMonth).padStart(2, '0')}/${targetPayrollYear}`;
    try {
      if (isSingleMonthRange) {
        const calcRes = await payrollService.calculateMonthlyPayroll(targetPayrollMonth, targetPayrollYear);
        payrollDetailRows = (calcRes || []).map((item) => {
          const sum = item.summary || {};
          const pr = item.payroll || {};
          return {
            fullName: item.ctv?.fullName || '',
            code: item.ctv?.employeeCode || item.ctv?.email || '',
            shifts: Number(sum.sumLV ?? pr.totalShiftCount ?? 0),
            shiftHours: Number(sum.gioLV ?? pr.shiftHours ?? 0),
            normalHours: Number(sum.gioThuong ?? 0),
            overtimeHours: Number(sum.gioOt ?? pr.overtimeHours ?? 0),
            sundayHours: Number(sum.gioSunday ?? pr.sundayHours ?? 0),
            convertedHours: Number(sum.tongGio ?? pr.totalCalculatedHours ?? 0),
            totalAmount: Number(sum.tien ?? pr.totalAmount ?? 0),
            status: pr.status || 'DRAFT',
          };
        });
      } else {
        payrollPeriodLabel = label;
        const startYear = start.getFullYear();
        const startMonth = start.getMonth() + 1;
        const endYear = end.getFullYear();
        const endMonth = end.getMonth() + 1;
        const rawPayrolls = await MonthlyPayroll.findAll({
          include: [{ model: User, as: 'collaborator', attributes: ['id', 'fullName', 'email', 'employeeCode'] }],
        }).catch(() => []);

        const byUser = new Map();
        for (const p of rawPayrolls) {
          const ym = p.year * 100 + p.month;
          if (ym < startYear * 100 + startMonth || ym > endYear * 100 + endMonth) continue;
          const uid = p.userId;
          if (!byUser.has(uid)) {
            byUser.set(uid, {
              fullName: p.collaborator?.fullName || '',
              code: p.collaborator?.employeeCode || p.collaborator?.email || '',
              shifts: 0,
              shiftHours: 0,
              normalHours: 0,
              overtimeHours: 0,
              sundayHours: 0,
              convertedHours: 0,
              totalAmount: 0,
              status: p.status || 'DRAFT',
            });
          }
          const acc = byUser.get(uid);
          const sh = Number(p.shiftHours || 0);
          const ot = Number(p.overtimeHours || 0);
          const sun = Number(p.sundayHours || 0);
          const taskH = Number(p.taskHours || 0);
          const normH = Math.max(0, Math.round((taskH - ot - sun) * 100) / 100);
          acc.shifts += Number(p.totalShiftCount || 0);
          acc.shiftHours += sh;
          acc.normalHours += normH;
          acc.overtimeHours += ot;
          acc.sundayHours += sun;
          acc.convertedHours += Number(p.totalCalculatedHours || 0);
          acc.totalAmount += Number(p.totalAmount || 0);
        }
        payrollDetailRows = Array.from(byUser.values()).sort((a, b) => b.totalAmount - a.totalAmount);
      }
    } catch (prErr) {
      console.warn('Export overview payroll fallback:', prErr.message);
    }

    // Tổng hợp KPI Công việc (Toàn hệ thống & Trong kỳ)
    const allTasksTotal = allTasks.length;
    const allTasksCompleted = allTasks.filter((t) => t.status === 'COMPLETED').length;
    const allTasksInProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const allTasksPending = allTasks.filter((t) => t.status === 'PENDING_APPROVAL').length;
    const allTasksRevision = allTasks.filter((t) => t.status === 'REVISION_REQUESTED').length;
    const allTasksNotStarted = allTasks.filter((t) => t.status === 'NOT_STARTED').length;
    const allTasksOverdue = allTasks.filter(
      (t) => t.deadline && new Date(t.deadline) < now && !['COMPLETED', 'CANCELLED'].includes(t.status)
    ).length;
    const completionRate = allTasksTotal > 0 ? Math.round((allTasksCompleted / allTasksTotal) * 1000) / 10 : 0;

    // Tổng hợp KPI Thù lao kỳ
    const payrollSummary = payrollDetailRows.reduce(
      (acc, r) => {
        acc.shifts += r.shifts;
        acc.shiftHours += r.shiftHours;
        acc.normalHours += r.normalHours;
        acc.overtimeHours += r.overtimeHours;
        acc.sundayHours += r.sundayHours;
        acc.convertedHours += r.convertedHours;
        acc.totalAmount += r.totalAmount;
        if (r.totalAmount > 0 || r.convertedHours > 0) acc.activeCtvs++;
        return acc;
      },
      { shifts: 0, shiftHours: 0, normalHours: 0, overtimeHours: 0, sundayHours: 0, convertedHours: 0, totalAmount: 0, activeCtvs: 0 }
    );

    // Tổng hợp Studio 4 cấp độ xác nhận sử dụng
    const studioAttendanceCounts = {
      FUTURE_BOOKING: 0,
      WAITING_USER_CHECKIN: 0,
      WAITING_ADMIN_CONFIRM: 0,
      USAGE_CONFIRMED: 0,
      ABSENT: 0,
    };
    for (const b of bookings) {
      const info = studioBookingService.computeAttendanceInfo(b.toJSON ? b.toJSON() : b);
      if (info && studioAttendanceCounts[info.code] !== undefined) {
        studioAttendanceCounts[info.code]++;
      }
    }

    // Tỷ lệ sử dụng thiết bị (%)
    const eqBorrowedCount = equipments.filter((e) => e.status === 'BORROWED').length;
    const eqUtilizationRate = equipments.length > 0 ? Math.round((eqBorrowedCount / equipments.length) * 1000) / 10 : 0;

    // Chuỗi thời gian hoạt động (chartData đồng bộ với dashboard.routes.js)
    const chartMap = {};
    const addChartPoint = (rawDate, field) => {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const vn = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60 * 1000);
      const key = rangeType === 'year'
        ? `${String(vn.getMonth() + 1).padStart(2, '0')}/${vn.getFullYear()}`
        : `${String(vn.getDate()).padStart(2, '0')}/${String(vn.getMonth() + 1).padStart(2, '0')}/${vn.getFullYear()}`;
      const sortKey = rangeType === 'year'
        ? vn.getFullYear() * 100 + (vn.getMonth() + 1)
        : vn.getFullYear() * 10000 + (vn.getMonth() + 1) * 100 + vn.getDate();
      if (!chartMap[key]) chartMap[key] = { label: key, sortKey, borrows: 0, bookings: 0, tasks: 0 };
      chartMap[key][field]++;
    };
    borrows.forEach((b) => addChartPoint(b.created_at || b.createdAt, 'borrows'));
    bookings.forEach((b) => addChartPoint(b.created_at || b.createdAt, 'bookings'));
    periodTasks.forEach((t) => addChartPoint(t.created_at || t.createdAt, 'tasks'));
    const chartSeries = Object.values(chartMap).sort((a, b) => a.sortKey - b.sortKey);

    // Tạo Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'LHU Media Studio';
    wb.created = new Date();
    wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    const TITLE_FONT = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF1F3864' } };
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // =====================================================================
    // SHEET 1: TỔNG QUAN (Đầy đủ 6 nhóm KPI trên trang Thống kê tổng quan)
    // =====================================================================
    const sheetOverview = wb.addWorksheet('Tổng quan', {
      properties: { tabColor: { argb: 'FF1F3864' } },
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheetOverview.columns = [
      { key: 'metric', width: 44 },
      { key: 'value', width: 22 },
      { key: 'note', width: 34 },
    ];

    sheetOverview.mergeCells('A1:C1');
    const titleCell = sheetOverview.getCell('A1');
    titleCell.value = `BÁO CÁO THỐNG KÊ TỔNG QUAN LHU MEDIA STUDIO - ${label.toUpperCase()}`;
    titleCell.font = TITLE_FONT;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    sheetOverview.getRow(1).height = 36;

    sheetOverview.mergeCells('A2:C2');
    sheetOverview.getCell('A2').value = `Xuất ngày: ${fmtDate(new Date())} | Khoảng thời gian: ${label}`;
    sheetOverview.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheetOverview.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF475569' } };
    sheetOverview.getRow(2).height = 20;

    sheetOverview.addRow([]);
    const ovHeader = sheetOverview.addRow(['Hạng mục / Chỉ số thống kê', 'Giá trị', 'Ghi chú / Phạm vi']);
    applyHeaderStyle(ovHeader, '1F3864');

    const addSectionBanner = (text, bgArgb = 'FFE2E8F0') => {
      const r = sheetOverview.addRow([text, '', '']);
      sheetOverview.mergeCells(`A${r.number}:C${r.number}`);
      r.height = 24;
      r.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF1E3A8A' } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      for (let c = 1; c <= 3; c++) r.getCell(c).border = thinBorder;
    };

    const addKpiRow = (metric, value, note = '', opts = {}) => {
      const r = sheetOverview.addRow([metric, value, note]);
      r.height = 21;
      r.getCell(1).font = { name: 'Arial', size: 10, bold: Boolean(opts.boldMetric), color: { argb: 'FF0F172A' } };
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: opts.valueColor || 'FF1F3864' } };
      r.getCell(2).alignment = { horizontal: opts.align || 'right', vertical: 'middle' };
      if (opts.numFmt) r.getCell(2).numFmt = opts.numFmt;
      r.getCell(3).font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      const fillArgb = opts.highlightBg || (r.number % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF');
      for (let c = 1; c <= 3; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        r.getCell(c).border = thinBorder;
      }
      return r;
    };

    // I. Công việc & Hiệu suất CTV
    addSectionBanner('I. THỐNG KÊ CÔNG VIỆC & HIỆU SUẤT CTV (FR-08 / FR-04)');
    addKpiRow('Tổng số nhiệm vụ phát sinh trong kỳ', periodTasks.length, `Trong khoảng ${label}`, { boldMetric: true, numFmt: '#,##0' });
    addKpiRow('Tổng số nhiệm vụ toàn hệ thống', allTasksTotal, 'Tất cả trạng thái', { numFmt: '#,##0' });
    addKpiRow('  • Chưa bắt đầu', allTasksNotStarted, '', { numFmt: '#,##0' });
    addKpiRow('  • Đang thực hiện', allTasksInProgress, '', { numFmt: '#,##0', valueColor: 'FF1D4ED8' });
    addKpiRow('  • Chờ nghiệm thu (CTV đã nộp)', allTasksPending, '', { numFmt: '#,##0', valueColor: 'FFB45309' });
    addKpiRow('  • Cần chỉnh sửa', allTasksRevision, '', { numFmt: '#,##0', valueColor: 'FF7E22CE' });
    addKpiRow('  • Đã nghiệm thu hoàn thành', allTasksCompleted, '', { numFmt: '#,##0', valueColor: 'FF047857' });
    addKpiRow(
      'Cảnh báo công việc quá hạn (Trễ hạn)',
      allTasksOverdue,
      allTasksOverdue > 0 ? 'Cần đôn đốc và kiểm tra ngay' : 'Tất cả công việc đúng hạn chót',
      {
        boldMetric: true,
        numFmt: '#,##0',
        valueColor: allTasksOverdue > 0 ? 'FFBE123C' : 'FF047857',
        highlightBg: allTasksOverdue > 0 ? 'FFFFE4E6' : 'FFECFDF5',
      }
    );
    addKpiRow('Tỷ lệ hoàn thành nghiệm thu (%)', completionRate / 100, `${allTasksCompleted}/${allTasksTotal} nhiệm vụ đã xong`, {
      boldMetric: true,
      numFmt: '0.0%',
      valueColor: 'FF047857',
    });

    // II. Thù lao & Ca trực CTV
    addSectionBanner(`II. THỐNG KÊ THÙ LAO & CA TRỰC CTV (${payrollPeriodLabel.toUpperCase()})`);
    addKpiRow('Tổng số ca trực Studio trong kỳ', periodShifts.length, `Từ ${startISO} đến ${endISO}`, { numFmt: '#,##0' });
    addKpiRow('Số CTV có phát sinh công / thù lao', payrollSummary.activeCtvs, `Tổng ${payrollDetailRows.length} CTV trong bảng lương`, { numFmt: '#,##0' });
    addKpiRow('Tổng giờ trực Studio (LV ×1,0)', Math.round(payrollSummary.shiftHours * 100) / 100, `${payrollSummary.shifts} ca trực (4h/ca)`, { numFmt: '#,##0.0" giờ"' });
    addKpiRow('Tổng giờ sự vụ thường (×1,0)', Math.round(payrollSummary.normalHours * 100) / 100, 'Nhiệm vụ đã nghiệm thu trong giờ', { numFmt: '#,##0.0" giờ"' });
    addKpiRow('Tổng giờ ngoài giờ sau 16:30 (×1,5)', Math.round(payrollSummary.overtimeHours * 100) / 100, 'Áp dụng hệ số 1,5', { numFmt: '#,##0.0" giờ"', valueColor: 'FFB45309' });
    addKpiRow('Tổng giờ Chủ nhật (×2,0)', Math.round(payrollSummary.sundayHours * 100) / 100, 'Áp dụng hệ số 2,0', { numFmt: '#,##0.0" giờ"', valueColor: 'FFB45309' });
    addKpiRow('Tổng giờ quy đổi tính lương', Math.round(payrollSummary.convertedHours * 100) / 100, 'Đơn giá chuẩn 20.000 VNĐ/giờ', { boldMetric: true, numFmt: '#,##0.0" giờ"' });
    addKpiRow('TỔNG NGÂN SÁCH THÙ LAO CTV (VNĐ)', Math.round(payrollSummary.totalAmount), payrollPeriodLabel, {
      boldMetric: true,
      numFmt: '#,##0" VNĐ"',
      valueColor: 'FF991B1B',
      highlightBg: 'FFFEF3C7',
    });

    // III. Mượn / Trả thiết bị
    addSectionBanner(`III. THỐNG KÊ MƯỢN / TRẢ THIẾT BỊ (${label.toUpperCase()})`);
    addKpiRow('Tổng số đơn mượn thiết bị', borrows.length, '', { boldMetric: true, numFmt: '#,##0' });
    addKpiRow('  • Chờ duyệt', borrows.filter((b) => b.status === 'PENDING').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Đã duyệt (chờ bàn giao)', borrows.filter((b) => b.status === 'APPROVED').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Đang mượn', borrows.filter((b) => b.status === 'HANDED_OVER').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Quá hạn trả', borrows.filter((b) => b.status === 'OVERDUE').length, '', { numFmt: '#,##0', valueColor: 'FFBE123C' });
    addKpiRow('  • Đã trả', borrows.filter((b) => b.status === 'RETURNED').length, '', { numFmt: '#,##0', valueColor: 'FF047857' });
    addKpiRow('  • Từ chối', borrows.filter((b) => b.status === 'REJECTED').length, '', { numFmt: '#,##0' });

    // IV. Đặt phòng Studio
    addSectionBanner(`IV. THỐNG KÊ ĐẶT PHÒNG STUDIO & XÁC NHẬN SỬ DỤNG (${label.toUpperCase()})`);
    addKpiRow('Tổng số yêu cầu đặt phòng Studio', bookings.length, '', { boldMetric: true, numFmt: '#,##0' });
    addKpiRow('  • Chờ duyệt', bookings.filter((b) => b.status === 'PENDING').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Đã duyệt', bookings.filter((b) => ['CONFIRMED', 'APPROVED'].includes(b.status)).length, '', { numFmt: '#,##0' });
    addKpiRow('  • Chờ người dùng xác nhận có mặt', studioAttendanceCounts.WAITING_USER_CHECKIN, 'Trong ngày đặt phòng', { numFmt: '#,##0' });
    addKpiRow('  • Chờ ADMIN xác nhận sử dụng', studioAttendanceCounts.WAITING_ADMIN_CONFIRM, 'Người dùng đã check-in', { numFmt: '#,##0', valueColor: 'FFB45309' });
    addKpiRow('  • Đã xác nhận sử dụng (Hoàn tất)', studioAttendanceCounts.USAGE_CONFIRMED, '', { numFmt: '#,##0', valueColor: 'FF047857' });
    addKpiRow('  • Không đến sử dụng / Vắng mặt', studioAttendanceCounts.ABSENT, '', { numFmt: '#,##0', valueColor: 'FFBE123C' });
    addKpiRow('  • Đã hủy', bookings.filter((b) => b.status === 'CANCELLED').length, '', { numFmt: '#,##0' });

    // V. Thiết bị & Tỷ lệ sử dụng
    addSectionBanner('V. THỐNG KÊ TÀI SẢN THIẾT BỊ & TỶ LỆ SỬ DỤNG');
    addKpiRow('Tổng số mã thiết bị', equipments.length, '', { boldMetric: true, numFmt: '#,##0' });
    addKpiRow('  • Thiết bị sẵn sàng', equipments.filter((e) => e.status === 'AVAILABLE').length, '', { numFmt: '#,##0', valueColor: 'FF047857' });
    addKpiRow('  • Đang cho mượn', eqBorrowedCount, '', { numFmt: '#,##0', valueColor: 'FF1D4ED8' });
    addKpiRow('  • Bảo trì / Sửa chữa / Hư hỏng', equipments.filter((e) => ['MAINTENANCE', 'REPAIRING', 'DAMAGED'].includes(e.status)).length, '', { numFmt: '#,##0', valueColor: 'FFB45309' });
    addKpiRow('  • Thanh lý / Báo mất', equipments.filter((e) => ['DISPOSED', 'LOST'].includes(e.status)).length, '', { numFmt: '#,##0' });
    addKpiRow('Tỷ lệ thiết bị đang sử dụng (%)', eqUtilizationRate / 100, `${eqBorrowedCount}/${equipments.length} thiết bị đang cho mượn`, { boldMetric: true, numFmt: '0.0%' });

    // VI. Nhân sự & Người dùng
    addSectionBanner('VI. THỐNG KÊ NHÂN SỰ & NGƯỜI DÙNG HỆ THỐNG');
    addKpiRow('Tổng số tài khoản người dùng', users.length, '', { boldMetric: true, numFmt: '#,##0' });
    addKpiRow('  • Quản trị viên (ADMIN)', users.filter((u) => u.role === 'ADMIN').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Cộng tác viên (CTV)', users.filter((u) => u.role === 'COLLABORATOR').length, '', { numFmt: '#,##0' });
    addKpiRow('  • Người dùng thường (USER)', users.filter((u) => u.role === 'USER').length, '', { numFmt: '#,##0' });

    // =====================================================================
    // SHEET 2: CÔNG VIỆC & THÙ LAO CTV (FR-08 & FR-05)
    // =====================================================================
    const sheetCtv = wb.addWorksheet('Công việc & Thù lao CTV', {
      properties: { tabColor: { argb: 'FFF59E0B' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    sheetCtv.mergeCells('A1:J1');
    sheetCtv.getCell('A1').value = `THỐNG KÊ CÔNG VIỆC CẦN CHÚ Ý & THÙ LAO CTV - ${label.toUpperCase()}`;
    sheetCtv.getCell('A1').font = TITLE_FONT;
    sheetCtv.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheetCtv.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    sheetCtv.getRow(1).height = 32;

    // Bảng A: Công việc cần chú ý & Trễ hạn
    let ctvRow = 3;
    sheetCtv.mergeCells(`A${ctvRow}:G${ctvRow}`);
    sheetCtv.getCell(`A${ctvRow}`).value = 'A. DANH SÁCH CÔNG VIỆC CẦN CHÚ Ý & TRỄ HẠN (URGENT / OVERDUE)';
    sheetCtv.getCell(`A${ctvRow}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF9F1239' } };
    sheetCtv.getRow(ctvRow).height = 24;
    ctvRow++;

    const urgentHeaders = ['STT', 'Tiêu đề công việc', 'Loại nhiệm vụ', 'CTV phụ trách', 'Hạn chót', 'Trạng thái', 'Cảnh báo'];
    const uhRow = sheetCtv.getRow(ctvRow);
    urgentHeaders.forEach((h, i) => { uhRow.getCell(i + 1).value = h; });
    applyHeaderStyle(uhRow, '9F1239');
    ctvRow++;

    if (urgentTasksList.length === 0) {
      sheetCtv.mergeCells(`A${ctvRow}:G${ctvRow}`);
      sheetCtv.getCell(`A${ctvRow}`).value = 'Không có công việc nào quá hạn hoặc sắp tới hạn. Tiến độ rất tốt!';
      sheetCtv.getCell(`A${ctvRow}`).font = { italic: true, size: 10, color: { argb: 'FF047857' } };
      sheetCtv.getCell(`A${ctvRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheetCtv.getRow(ctvRow).height = 24;
      for (let c = 1; c <= 7; c++) sheetCtv.getCell(ctvRow, c).border = thinBorder;
      ctvRow++;
    } else {
      urgentTasksList.forEach((t, idx) => {
        const isOverdue = t.deadline && new Date(t.deadline) < now;
        const r = sheetCtv.getRow(ctvRow);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = t.title || '';
        r.getCell(3).value = t.taskType || 'Sự vụ';
        r.getCell(4).value = t.assignee?.fullName || 'Chưa gán';
        r.getCell(5).value = fmtDate(t.deadline) || '—';
        r.getCell(6).value = statusVN(t.status);
        r.getCell(7).value = isOverdue ? 'QUÁ HẠN' : 'Sắp tới hạn';
        applyDataStyle(r, idx % 2 !== 0);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        if (isOverdue) {
          for (let c = 1; c <= 7; c++) {
            r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          }
          r.getCell(7).font = { bold: true, color: { argb: 'FFBE123C' } };
        } else {
          r.getCell(7).font = { bold: true, color: { argb: 'FFB45309' } };
        }
        ctvRow++;
      });
    }

    // Bảng B: Xu hướng Thù lao CTV theo tháng
    ctvRow += 2;
    sheetCtv.mergeCells(`A${ctvRow}:E${ctvRow}`);
    sheetCtv.getCell(`A${ctvRow}`).value = 'B. XU HƯỚNG THÙ LAO CTV THEO THÁNG (LỊCH SỬ BẢNG LƯƠNG)';
    sheetCtv.getCell(`A${ctvRow}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFB45309' } };
    sheetCtv.getRow(ctvRow).height = 24;
    ctvRow++;

    const trendHeaders = ['STT', 'Kỳ lương', 'Số CTV', 'Tổng giờ quy đổi', 'Tổng thù lao (VNĐ)'];
    const thRow = sheetCtv.getRow(ctvRow);
    trendHeaders.forEach((h, i) => { thRow.getCell(i + 1).value = h; });
    applyHeaderStyle(thRow, 'B45309');
    ctvRow++;

    const trendStartRow = ctvRow;
    if (!payrollTrendRows || payrollTrendRows.length === 0) {
      sheetCtv.mergeCells(`A${ctvRow}:E${ctvRow}`);
      sheetCtv.getCell(`A${ctvRow}`).value = 'Chưa có dữ liệu lịch sử bảng lương các tháng.';
      sheetCtv.getCell(`A${ctvRow}`).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetCtv.getCell(`A${ctvRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheetCtv.getRow(ctvRow).height = 24;
      for (let c = 1; c <= 5; c++) sheetCtv.getCell(ctvRow, c).border = thinBorder;
      ctvRow++;
    } else {
      let totTrendH = 0;
      let totTrendAmt = 0;
      payrollTrendRows.forEach((row, idx) => {
        const hrs = Math.round(Number(row.totalHours || 0) * 10) / 10;
        const amt = Math.round(Number(row.totalAmount || 0));
        totTrendH += hrs;
        totTrendAmt += amt;
        const r = sheetCtv.getRow(ctvRow);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = `Tháng ${String(row.month).padStart(2, '0')}/${row.year}`;
        r.getCell(3).value = Number(row.collaboratorCount || 0);
        r.getCell(4).value = hrs;
        r.getCell(5).value = amt;
        applyDataStyle(r, idx % 2 !== 0);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(4).numFmt = '#,##0.0';
        r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        r.getCell(5).numFmt = '#,##0';
        r.getCell(5).font = { bold: true, color: { argb: 'FF047857' } };
        ctvRow++;
      });

      const tr = sheetCtv.getRow(ctvRow);
      tr.height = 24;
      sheetCtv.mergeCells(`A${ctvRow}:C${ctvRow}`);
      tr.getCell(1).value = 'TỔNG TÍCH LŨY CÁC THÁNG:';
      tr.getCell(1).font = { bold: true, size: 10 };
      tr.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      tr.getCell(4).value = { formula: `SUM(D${trendStartRow}:D${ctvRow - 1})`, result: Math.round(totTrendH * 10) / 10 };
      tr.getCell(4).numFmt = '#,##0.0';
      tr.getCell(4).font = { bold: true };
      tr.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      tr.getCell(5).value = { formula: `SUM(E${trendStartRow}:E${ctvRow - 1})`, result: totTrendAmt };
      tr.getCell(5).numFmt = '#,##0';
      tr.getCell(5).font = { bold: true, color: { argb: 'FF991B1B' } };
      tr.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      for (let c = 1; c <= 5; c++) {
        tr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        tr.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      }
      ctvRow++;
    }

    // Bảng C: Chi tiết thù lao CTV theo kỳ báo cáo
    ctvRow += 2;
    sheetCtv.mergeCells(`A${ctvRow}:J${ctvRow}`);
    sheetCtv.getCell(`A${ctvRow}`).value = `C. CHI TIẾT THÙ LAO CTV (${payrollPeriodLabel.toUpperCase()})`;
    sheetCtv.getCell(`A${ctvRow}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1F3864' } };
    sheetCtv.getRow(ctvRow).height = 24;
    ctvRow++;

    const prHeaders = [
      'STT', 'Họ và tên CTV', 'Mã NV / Email', 'Ca trực (LV)', 'Giờ trực (×1,0)',
      'Giờ thường (×1,0)', 'Ngoài giờ (×1,5)', 'Chủ nhật (×2,0)', 'Tổng giờ quy đổi', 'Thành tiền (VNĐ)',
    ];
    const prhRow = sheetCtv.getRow(ctvRow);
    prHeaders.forEach((h, i) => { prhRow.getCell(i + 1).value = h; });
    applyHeaderStyle(prhRow, '1F3864');
    ctvRow++;

    const prStartRow = ctvRow;
    if (payrollDetailRows.length === 0) {
      sheetCtv.mergeCells(`A${ctvRow}:J${ctvRow}`);
      sheetCtv.getCell(`A${ctvRow}`).value = `Không có dữ liệu thù lao CTV trong ${payrollPeriodLabel}.`;
      sheetCtv.getCell(`A${ctvRow}`).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetCtv.getCell(`A${ctvRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheetCtv.getRow(ctvRow).height = 24;
      for (let c = 1; c <= 10; c++) sheetCtv.getCell(ctvRow, c).border = thinBorder;
    } else {
      payrollDetailRows.forEach((p, idx) => {
        const r = sheetCtv.getRow(ctvRow);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = p.fullName;
        r.getCell(3).value = p.code;
        r.getCell(4).value = p.shifts;
        r.getCell(5).value = p.shiftHours;
        r.getCell(6).value = p.normalHours;
        r.getCell(7).value = p.overtimeHours;
        r.getCell(8).value = p.sundayHours;
        r.getCell(9).value = {
          formula: `ROUND(E${ctvRow}+F${ctvRow}+G${ctvRow}*1.5+H${ctvRow}*2,2)`,
          result: Math.round(p.convertedHours * 100) / 100,
        };
        r.getCell(10).value = {
          formula: `ROUND(I${ctvRow}*20000,0)`,
          result: Math.round(p.totalAmount),
        };
        applyDataStyle(r, idx % 2 !== 0);
        if (p.overtimeHours > 0 || p.sundayHours > 0) {
          for (let c = 1; c <= 10; c++) {
            r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
          }
        }
        [1, 4, 5, 6, 7, 8, 9].forEach((c) => { r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });
        [5, 6, 7, 8, 9].forEach((c) => { r.getCell(c).numFmt = '#,##0.0'; });
        r.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
        r.getCell(10).numFmt = '#,##0';
        r.getCell(10).font = { bold: true, color: { argb: 'FF047857' } };
        ctvRow++;
      });

      const prTot = sheetCtv.getRow(ctvRow);
      prTot.height = 24;
      sheetCtv.mergeCells(`A${ctvRow}:C${ctvRow}`);
      prTot.getCell(1).value = `TỔNG CỘNG (${payrollDetailRows.length} CTV):`;
      prTot.getCell(1).font = { bold: true };
      prTot.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      [
        [4, 'D', payrollSummary.shifts, '#,##0', 'center'],
        [5, 'E', payrollSummary.shiftHours, '#,##0.0', 'center'],
        [6, 'F', payrollSummary.normalHours, '#,##0.0', 'center'],
        [7, 'G', payrollSummary.overtimeHours, '#,##0.0', 'center'],
        [8, 'H', payrollSummary.sundayHours, '#,##0.0', 'center'],
        [9, 'I', payrollSummary.convertedHours, '#,##0.0', 'center'],
        [10, 'J', payrollSummary.totalAmount, '#,##0', 'right'],
      ].forEach(([colIdx, letCol, val, fmt, align]) => {
        prTot.getCell(colIdx).value = { formula: `SUM(${letCol}${prStartRow}:${letCol}${ctvRow - 1})`, result: Math.round(val * 100) / 100 };
        prTot.getCell(colIdx).numFmt = fmt;
        prTot.getCell(colIdx).font = { bold: true, color: colIdx === 10 ? { argb: 'FF991B1B' } : { argb: 'FF0F172A' } };
        prTot.getCell(colIdx).alignment = { horizontal: align, vertical: 'middle' };
      });
      for (let c = 1; c <= 10; c++) {
        prTot.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        prTot.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      }
    }

    [6, 30, 24, 15, 16, 16, 16, 16, 16, 18].forEach((w, i) => { sheetCtv.getColumn(i + 1).width = w; });

    // =====================================================================
    // SHEET 3: HOẠT ĐỘNG & TOP THIẾT BỊ (Biểu đồ thời gian + Top 10 thiết bị)
    // =====================================================================
    const sheetAct = wb.addWorksheet('Hoạt động & Top thiết bị', {
      properties: { tabColor: { argb: 'FF6366F1' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    sheetAct.mergeCells('A1:G1');
    sheetAct.getCell('A1').value = `PHÂN TÍCH LƯỢT HOẠT ĐỘNG & THIẾT BỊ MƯỢN NHIỀU NHẤT - ${label.toUpperCase()}`;
    sheetAct.getCell('A1').font = TITLE_FONT;
    sheetAct.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheetAct.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    sheetAct.getRow(1).height = 32;

    // Bảng A: Lượt hoạt động theo thời gian
    let actRow = 3;
    sheetAct.mergeCells(`A${actRow}:E${actRow}`);
    sheetAct.getCell(`A${actRow}`).value = 'A. LƯỢT HOẠT ĐỘNG THEO THỜI GIAN (MƯỢN THIẾT BỊ • ĐẶT STUDIO • NHIỆM VỤ CTV)';
    sheetAct.getCell(`A${actRow}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF3730A3' } };
    sheetAct.getRow(actRow).height = 24;
    actRow++;

    const actHeaders = ['Mốc thời gian', 'Mượn thiết bị (lượt)', 'Đặt phòng Studio (lượt)', 'Nhiệm vụ CTV (việc)', 'Tổng lượt hoạt động'];
    const ahRow = sheetAct.getRow(actRow);
    actHeaders.forEach((h, i) => { ahRow.getCell(i + 1).value = h; });
    applyHeaderStyle(ahRow, '3730A3');
    actRow++;

    const chartStartRow = actRow;
    if (chartSeries.length === 0) {
      sheetAct.mergeCells(`A${actRow}:E${actRow}`);
      sheetAct.getCell(`A${actRow}`).value = 'Không có số liệu hoạt động trong khoảng thời gian này.';
      sheetAct.getCell(`A${actRow}`).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetAct.getCell(`A${actRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheetAct.getRow(actRow).height = 24;
      for (let c = 1; c <= 5; c++) sheetAct.getCell(actRow, c).border = thinBorder;
      actRow++;
    } else {
      let sumB = 0; let sumS = 0; let sumT = 0;
      chartSeries.forEach((pt, idx) => {
        sumB += pt.borrows;
        sumS += pt.bookings;
        sumT += pt.tasks;
        const r = sheetAct.getRow(actRow);
        r.getCell(1).value = pt.label;
        r.getCell(2).value = pt.borrows;
        r.getCell(3).value = pt.bookings;
        r.getCell(4).value = pt.tasks;
        r.getCell(5).value = { formula: `SUM(B${actRow}:D${actRow})`, result: pt.borrows + pt.bookings + pt.tasks };
        applyDataStyle(r, idx % 2 !== 0);
        for (let c = 1; c <= 5; c++) r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(5).font = { bold: true, color: { argb: 'FF1E3A8A' } };
        actRow++;
      });

      const ctRow = sheetAct.getRow(actRow);
      ctRow.height = 24;
      ctRow.getCell(1).value = 'TỔNG CỘNG:';
      ctRow.getCell(1).font = { bold: true };
      ctRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      [[2, 'B', sumB], [3, 'C', sumS], [4, 'D', sumT], [5, 'E', sumB + sumS + sumT]].forEach(([cIdx, letCol, val]) => {
        ctRow.getCell(cIdx).value = { formula: `SUM(${letCol}${chartStartRow}:${letCol}${actRow - 1})`, result: val };
        ctRow.getCell(cIdx).font = { bold: true };
        ctRow.getCell(cIdx).alignment = { horizontal: 'center', vertical: 'middle' };
      });
      for (let c = 1; c <= 5; c++) {
        ctRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        ctRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      }
      actRow++;
    }

    // Bảng B: Top thiết bị mượn nhiều nhất
    actRow += 2;
    sheetAct.mergeCells(`A${actRow}:G${actRow}`);
    sheetAct.getCell(`A${actRow}`).value = 'B. TOP THIẾT BỊ ĐƯỢC MƯỢN NHIỀU NHẤT TRONG KỲ';
    sheetAct.getCell(`A${actRow}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF0F766E' } };
    sheetAct.getRow(actRow).height = 24;
    actRow++;

    const topHeaders = ['Hạng', 'Mã thiết bị', 'Tên thiết bị', 'Danh mục', 'Số lượt mượn', 'Tổng SL mượn', 'Tỷ trọng lượt mượn'];
    const topHRow = sheetAct.getRow(actRow);
    topHeaders.forEach((h, i) => { topHRow.getCell(i + 1).value = h; });
    applyHeaderStyle(topHRow, '0F766E');
    actRow++;

    const topStartRow = actRow;
    if (!topRaw || topRaw.length === 0) {
      sheetAct.mergeCells(`A${actRow}:G${actRow}`);
      sheetAct.getCell(`A${actRow}`).value = 'Chưa có số liệu mượn thiết bị trong khoảng thời gian này.';
      sheetAct.getCell(`A${actRow}`).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetAct.getCell(`A${actRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheetAct.getRow(actRow).height = 24;
      for (let c = 1; c <= 7; c++) sheetAct.getCell(actRow, c).border = thinBorder;
    } else {
      const totalTopBorrows = topRaw.reduce((s, it) => s + Number(it.borrowCount || 0), 0) || 1;
      const topEndRow = topStartRow + topRaw.length - 1;
      topRaw.forEach((eq, idx) => {
        const cnt = Number(eq.borrowCount || 0);
        const qtySum = Number(eq.totalQtyBorrowed || cnt);
        const r = sheetAct.getRow(actRow);
        r.getCell(1).value = `#${idx + 1}`;
        r.getCell(2).value = eq.eq_code || '';
        r.getCell(3).value = eq.eq_name || '';
        r.getCell(4).value = eq.cat_name || '—';
        r.getCell(5).value = cnt;
        r.getCell(6).value = qtySum;
        r.getCell(7).value = {
          formula: `E${actRow}/SUM($E$${topStartRow}:$E$${topEndRow})`,
          result: Math.round((cnt / totalTopBorrows) * 1000) / 1000,
        };
        applyDataStyle(r, idx % 2 !== 0);
        [1, 2, 5, 6, 7].forEach((c) => { r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });
        r.getCell(1).font = { bold: true, color: { argb: 'FF0F766E' } };
        r.getCell(7).numFmt = '0.0%';
        actRow++;
      });
    }

    [16, 20, 32, 22, 18, 16, 20].forEach((w, i) => { sheetAct.getColumn(i + 1).width = w; });

    // =====================================================================
    // SHEET 4: ĐƠN MƯỢN THIẾT BỊ
    // =====================================================================
    const sheetBorrows = wb.addWorksheet('Đơn mượn thiết bị', { properties: { tabColor: { argb: 'FF2E75B6' } } });
    sheetBorrows.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Người mượn', key: 'user', width: 22 },
      { header: 'Mã NV', key: 'code', width: 12 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Thiết bị', key: 'eq', width: 25 },
      { header: 'Mã TB', key: 'eqCode', width: 12 },
      { header: 'Danh mục', key: 'cat', width: 18 },
      { header: 'SL', key: 'qty', width: 6 },
      { header: 'Ngày mượn', key: 'bDate', width: 18 },
      { header: 'Ngày trả', key: 'rDate', width: 18 },
      { header: 'Mục đích', key: 'purpose', width: 30 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Ngày tạo', key: 'createdAt', width: 18 },
    ];

    applyHeaderStyle(sheetBorrows.getRow(1), '2E75B6');

    if (borrows.length === 0) {
      sheetBorrows.mergeCells('A2:M2');
      sheetBorrows.getCell('A2').value = `Không có đơn mượn thiết bị nào trong ${label}.`;
      sheetBorrows.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetBorrows.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      sheetBorrows.getRow(2).height = 24;
    } else {
      borrows.forEach((b, idx) => {
        const raw = b.toJSON();
        const r = sheetBorrows.addRow({
          stt: idx + 1,
          user: raw.requester?.fullName || '',
          code: raw.requester?.employeeCode || '',
          email: raw.requester?.email || '',
          eq: raw.equipment?.name || '',
          eqCode: raw.equipment?.code || '',
          cat: raw.equipment?.category?.name || '',
          qty: raw.quantity || 1,
          bDate: fmtDate(raw.borrowDate),
          rDate: fmtDate(raw.returnDate),
          purpose: raw.purpose || '',
          status: statusVN(raw.status),
          createdAt: fmtDate(raw.created_at || raw.createdAt),
        });
        applyDataStyle(r, idx % 2 !== 0);

        const statusCell = r.getCell('status');
        const colors = {
          'Chờ duyệt': 'FFFFC000',
          'Đã duyệt': 'FF92D050',
          'Đang mượn': 'FFC4B5FD',
          'Quá hạn': 'FFFCA5A5',
          'Đã trả': 'FF00B0F0',
          'Từ chối': 'FFFF0000',
          'Đã hủy': 'FFBFBFBF',
        };
        if (colors[statusVN(raw.status)]) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[statusVN(raw.status)] } };
          statusCell.font = { bold: true, color: { argb: 'FF000000' } };
        }
      });
    }

    sheetBorrows.autoFilter = { from: 'A1', to: 'M1' };

    // =====================================================================
    // SHEET 5: ĐẶT PHÒNG STUDIO
    // =====================================================================
    const sheetBookings = wb.addWorksheet('Đặt phòng Studio', { properties: { tabColor: { argb: 'FF70AD47' } } });
    sheetBookings.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Người đặt', key: 'user', width: 22 },
      { header: 'Mã NV', key: 'code', width: 12 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Tên phòng', key: 'studio', width: 16 },
      { header: 'Bắt đầu', key: 'start', width: 18 },
      { header: 'Kết thúc', key: 'end', width: 18 },
      { header: 'Mục đích', key: 'purpose', width: 30 },
      { header: 'Số người', key: 'att', width: 10 },
      { header: 'Trạng thái duyệt', key: 'status', width: 16 },
      { header: 'Xác nhận sử dụng', key: 'attendance', width: 22 },
      { header: 'User check-in', key: 'checkIn', width: 18 },
      { header: 'Admin xác nhận', key: 'adminConfirm', width: 18 },
      { header: 'Ngày tạo', key: 'createdAt', width: 18 },
    ];

    applyHeaderStyle(sheetBookings.getRow(1), '70AD47');

    if (bookings.length === 0) {
      sheetBookings.mergeCells('A2:N2');
      sheetBookings.getCell('A2').value = `Không có lịch đặt phòng Studio nào trong ${label}.`;
      sheetBookings.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetBookings.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      sheetBookings.getRow(2).height = 24;
    } else {
      bookings.forEach((b, idx) => {
        const raw = b.toJSON();
        const attInfo = studioBookingService.computeAttendanceInfo(raw);
        const r = sheetBookings.addRow({
          stt: idx + 1,
          user: raw.booker?.fullName || raw.fullName || '',
          code: raw.booker?.employeeCode || '',
          email: raw.booker?.email || '',
          studio: raw.studioName || 'Studio LHU',
          start: fmtDate(raw.startTime),
          end: fmtDate(raw.endTime),
          purpose: raw.purpose || '',
          att: raw.attendees || 1,
          status: statusVN(raw.status),
          attendance: attInfo?.label || '—',
          checkIn: fmtDate(raw.userCheckInAt || raw.user_check_in_at),
          adminConfirm: fmtDate(raw.adminConfirmedAt || raw.admin_confirmed_at),
          createdAt: fmtDate(raw.created_at || raw.createdAt),
        });
        applyDataStyle(r, idx % 2 !== 0);
      });
    }

    sheetBookings.autoFilter = { from: 'A1', to: 'N1' };

    // =====================================================================
    // SHEET 6: DANH SÁCH THIẾT BỊ
    // =====================================================================
    const sheetEquip = wb.addWorksheet('Thiết bị', { properties: { tabColor: { argb: 'FFED7D31' } } });
    sheetEquip.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Tên thiết bị', key: 'name', width: 28 },
      { header: 'Mã thiết bị', key: 'code', width: 15 },
      { header: 'Danh mục', key: 'cat', width: 18 },
      { header: 'Mô tả', key: 'desc', width: 35 },
      { header: 'Tổng SL', key: 'qty', width: 10 },
      { header: 'Khả dụng', key: 'avail', width: 10 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Ngày thêm', key: 'createdAt', width: 18 },
    ];

    applyHeaderStyle(sheetEquip.getRow(1), 'ED7D31');

    if (equipments.length === 0) {
      sheetEquip.mergeCells('A2:I2');
      sheetEquip.getCell('A2').value = 'Chưa có thiết bị nào trong hệ thống.';
      sheetEquip.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      sheetEquip.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      sheetEquip.getRow(2).height = 24;
    } else {
      let totEqQty = 0;
      let totEqAvail = 0;
      equipments.forEach((eq, idx) => {
        const raw = eq.toJSON();
        const q = Number(raw.quantity || 1);
        const av = Number(raw.availableQuantity ?? q);
        totEqQty += q;
        totEqAvail += av;
        const r = sheetEquip.addRow({
          stt: idx + 1,
          name: raw.name || '',
          code: raw.code || '',
          cat: raw.category?.name || '',
          desc: raw.description || '',
          qty: q,
          avail: av,
          status: statusVN(raw.status),
          createdAt: fmtDate(raw.created_at || raw.createdAt),
        });
        applyDataStyle(r, idx % 2 !== 0);
      });

      const lastEqRow = equipments.length + 1;
      const tEqRow = sheetEquip.addRow({
        stt: '',
        name: `TỔNG CỘNG (${equipments.length} thiết bị):`,
        code: '',
        cat: '',
        desc: '',
        qty: { formula: `SUM(F2:F${lastEqRow})`, result: totEqQty },
        avail: { formula: `SUM(G2:G${lastEqRow})`, result: totEqAvail },
        status: '',
        createdAt: '',
      });
      tEqRow.height = 24;
      tEqRow.getCell(2).font = { bold: true };
      tEqRow.getCell(6).font = { bold: true };
      tEqRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      tEqRow.getCell(7).font = { bold: true, color: { argb: 'FF047857' } };
      tEqRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 9; c++) {
        tEqRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        tEqRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      }
    }

    sheetEquip.autoFilter = { from: 'A1', to: 'I1' };

    // ===========================
    // Ghi file và trả về
    // ===========================
    const filename = `LHU_Media_Bao_Cao_Tong_Hop_${slug}_${getDateStampVN()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error.message);
    return res.status(500).json({ message: `Lỗi xuất Excel: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/reports/export-equipment:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) danh sách thiết bị & tồn kho theo bộ lọc"
 *     tags: [Reports]
 *     responses:
 *       200: { description: File Excel .xlsx }
 * /api/reports/export-borrows:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) danh sách đơn mượn / trả thiết bị theo bộ lọc"
 *     tags: [Reports]
 *     responses:
 *       200: { description: File Excel .xlsx }
 * /api/reports/export-studio-bookings:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) danh sách đặt phòng Studio (4 cấp độ sử dụng)"
 *     tags: [Reports]
 *     responses:
 *       200: { description: File Excel .xlsx }
 */
// ============================================================
// GET /api/reports/export-equipment  [ADMIN]
// Xuất danh sách thiết bị đồng bộ bộ lọc (search, categoryId, status)
// ============================================================
router.get('/export-equipment', async (req, res) => {
  try {
    const { search, categoryId, category, status } = req.query;
    const where = {};
    if (categoryId && categoryId !== 'ALL') where.categoryId = categoryId;
    if (status && status !== 'ALL') where.status = status;
    if (search && String(search).trim()) {
      const kw = `%${String(search).trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: kw } },
        { code: { [Op.like]: kw } },
        { description: { [Op.like]: kw } },
      ];
    }

    const categoryInclude = { model: EquipmentCategory, as: 'category', attributes: ['name'] };
    if (category && category !== 'ALL') {
      categoryInclude.where = { name: category };
      categoryInclude.required = true;
    }

    const equipments = await Equipment.findAll({
      where,
      include: [categoryInclude],
      order: [['created_at', 'DESC']],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LHU Media Studio';
    const sheet = wb.addWorksheet('Danh sách thiết bị', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'DANH SÁCH THIẾT BỊ STUDIO - LHU MEDIA STUDIO';
    sheet.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1F3864' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value = `Ngày xuất: ${fmtDate(new Date())} | Tổng số mã thiết bị: ${equipments.length}`;
    sheet.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    const headers = ['STT', 'Mã thiết bị', 'Tên thiết bị', 'Danh mục', 'Tổng SL', 'Khả dụng', 'Trạng thái', 'Mô tả', 'Ngày thêm'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    applyHeaderStyle(headerRow, 'ED7D31');

    let rowIdx = 5;
    let totalQty = 0;
    let totalAvail = 0;

    if (equipments.length === 0) {
      sheet.mergeCells('A5:I5');
      sheet.getCell('A5').value = 'Không có thiết bị nào khớp với bộ lọc hiện tại.';
      sheet.getCell('A5').font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(5).height = 24;
    } else {
      equipments.forEach((eq, idx) => {
        const raw = eq.toJSON();
        const qty = Number(raw.quantity || 1);
        const avail = Number(raw.availableQuantity ?? qty);
        totalQty += qty;
        totalAvail += avail;

        const r = sheet.getRow(rowIdx);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = raw.code || '';
        r.getCell(3).value = raw.name || '';
        r.getCell(4).value = raw.category?.name || '';
        r.getCell(5).value = qty;
        r.getCell(6).value = avail;
        r.getCell(7).value = statusVN(raw.status);
        r.getCell(8).value = raw.description || '';
        r.getCell(9).value = fmtDate(raw.created_at || raw.createdAt);
        applyDataStyle(r, idx % 2 !== 0);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        rowIdx++;
      });

      const tRow = sheet.getRow(rowIdx);
      tRow.height = 24;
      sheet.mergeCells(rowIdx, 1, rowIdx, 4);
      tRow.getCell(1).value = 'TỔNG CỘNG:';
      tRow.getCell(1).font = { bold: true, size: 10 };
      tRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      tRow.getCell(5).value = { formula: `SUM(E5:E${rowIdx - 1})`, result: totalQty };
      tRow.getCell(5).font = { bold: true, size: 10 };
      tRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      tRow.getCell(6).value = { formula: `SUM(F5:F${rowIdx - 1})`, result: totalAvail };
      tRow.getCell(6).font = { bold: true, size: 10, color: { argb: 'FF047857' } };
      tRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 9; c++) {
        tRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        tRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      }
    }

    [6, 16, 28, 20, 10, 11, 18, 36, 18].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
    sheet.autoFilter = { from: 'A4', to: 'I4' };

    const filename = `LHU_Media_Danh_Sach_Thiet_Bi_${getDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Equipment Excel error:', error.message);
    return res.status(500).json({ message: `Lỗi xuất Excel thiết bị: ${error.message}` });
  }
});

// ============================================================
// GET /api/reports/export-borrows  [ADMIN]
// Xuất danh sách yêu cầu mượn / trả thiết bị
// ============================================================
router.get('/export-borrows', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;

    let borrows = await BorrowRequest.findAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['fullName', 'email', 'employeeCode'] },
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['name', 'code'],
          include: [{ model: EquipmentCategory, as: 'category', attributes: ['name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    if (search && String(search).trim()) {
      const kw = String(search).trim().toLowerCase();
      borrows = borrows.filter((b) => {
        const raw = b.toJSON();
        const hay = `${raw.requester?.fullName || ''} ${raw.requester?.employeeCode || ''} ${raw.equipment?.name || ''} ${raw.purpose || ''}`.toLowerCase();
        return hay.includes(kw);
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LHU Media Studio';
    const sheet = wb.addWorksheet('Mượn trả thiết bị', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

    sheet.mergeCells('A1:O1');
    sheet.getCell('A1').value = 'DANH SÁCH YÊU CẦU MƯỢN / TRẢ THIẾT BỊ - LHU MEDIA STUDIO';
    sheet.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1F3864' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:O2');
    sheet.getCell('A2').value = `Ngày xuất: ${fmtDate(new Date())} | Tổng số yêu cầu: ${borrows.length}`;
    sheet.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    const headers = [
      'STT', 'Người mượn', 'Mã NV/SV', 'Email', 'Thiết bị', 'Mã TB', 'SL',
      'Ngày mượn', 'Hạn trả', 'Ngày trả thực tế', 'Mục đích', 'Trạng thái',
      'Biên bản bàn giao', 'Biên bản nhận trả', 'Ghi chú Admin',
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    applyHeaderStyle(headerRow, '2E75B6');

    if (borrows.length === 0) {
      sheet.mergeCells('A5:O5');
      sheet.getCell('A5').value = 'Không có yêu cầu mượn/trả thiết bị nào.';
      sheet.getCell('A5').font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(5).height = 24;
    } else {
      borrows.forEach((b, idx) => {
        const raw = b.toJSON();
        const r = sheet.getRow(5 + idx);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = raw.requester?.fullName || '';
        r.getCell(3).value = raw.requester?.employeeCode || '';
        r.getCell(4).value = raw.requester?.email || '';
        r.getCell(5).value = raw.equipment?.name || '';
        r.getCell(6).value = raw.equipment?.code || '';
        r.getCell(7).value = raw.quantity || 1;
        r.getCell(8).value = fmtDate(raw.borrowDate);
        r.getCell(9).value = fmtDate(raw.returnDate);
        r.getCell(10).value = fmtDate(raw.actualReturnDate);
        r.getCell(11).value = raw.purpose || '';
        r.getCell(12).value = statusVN(raw.status);
        r.getCell(13).value = raw.handoverCondition || '—';
        r.getCell(14).value = raw.returnCondition || '—';
        r.getCell(15).value = raw.adminNote || raw.rejectReason || '—';
        applyDataStyle(r, idx % 2 !== 0);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    [6, 22, 13, 26, 24, 13, 6, 17, 17, 17, 28, 16, 24, 24, 24].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
    sheet.autoFilter = { from: 'A4', to: 'O4' };

    const filename = `LHU_Media_Muon_Tra_Thiet_Bi_${getDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Borrows Excel error:', error.message);
    return res.status(500).json({ message: `Lỗi xuất Excel mượn/trả thiết bị: ${error.message}` });
  }
});

// ============================================================
// GET /api/reports/export-studio-bookings  [ADMIN]
// Xuất danh sách đặt phòng Studio kèm trạng thái duyệt & xác nhận sử dụng 4 cấp độ
// ============================================================
router.get('/export-studio-bookings', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status === 'APPROVED' ? 'CONFIRMED' : status;
    }

    let bookings = await StudioBooking.findAll({
      where,
      include: [{ model: User, as: 'booker', attributes: ['fullName', 'email', 'employeeCode'] }],
      order: [['start_time', 'DESC']],
    });

    if (search && String(search).trim()) {
      const kw = String(search).trim().toLowerCase();
      bookings = bookings.filter((b) => {
        const raw = b.toJSON();
        const hay = `${raw.booker?.fullName || raw.fullName || ''} ${raw.booker?.employeeCode || ''} ${raw.purpose || ''} ${raw.studioName || ''}`.toLowerCase();
        return hay.includes(kw);
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LHU Media Studio';
    const sheet = wb.addWorksheet('Đặt phòng Studio', { pageSetup: { orientation: 'landscape', paperSize: 9 } });

    sheet.mergeCells('A1:N1');
    sheet.getCell('A1').value = 'DANH SÁCH YÊU CẦU ĐẶT PHÒNG STUDIO - LHU MEDIA STUDIO';
    sheet.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1F3864' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:N2');
    sheet.getCell('A2').value = `Ngày xuất: ${fmtDate(new Date())} | Tổng số lịch đặt phòng: ${bookings.length}`;
    sheet.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    const headers = [
      'STT', 'Người đặt', 'Mã NV/SV', 'Email', 'Phòng Studio', 'Bắt đầu', 'Kết thúc',
      'Số người', 'Mục đích', 'Trạng thái duyệt', 'Xác nhận sử dụng',
      'Thời gian user check-in', 'Thời gian Admin xác nhận', 'Ghi chú',
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    applyHeaderStyle(headerRow, '70AD47');

    if (bookings.length === 0) {
      sheet.mergeCells('A5:N5');
      sheet.getCell('A5').value = 'Không có yêu cầu đặt phòng Studio nào.';
      sheet.getCell('A5').font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(5).height = 24;
    } else {
      bookings.forEach((b, idx) => {
        const raw = b.toJSON();
        const attInfo = studioBookingService.computeAttendanceInfo(raw);
        const r = sheet.getRow(5 + idx);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = raw.booker?.fullName || raw.fullName || '';
        r.getCell(3).value = raw.booker?.employeeCode || '';
        r.getCell(4).value = raw.booker?.email || '';
        r.getCell(5).value = raw.studioName || 'Studio LHU';
        r.getCell(6).value = fmtDate(raw.startTime);
        r.getCell(7).value = fmtDate(raw.endTime);
        r.getCell(8).value = raw.attendees || 1;
        r.getCell(9).value = raw.purpose || '';
        r.getCell(10).value = statusVN(raw.status);
        r.getCell(11).value = attInfo?.label || '—';
        r.getCell(12).value = fmtDate(raw.userCheckInAt || raw.user_check_in_at) || '—';
        r.getCell(13).value = fmtDate(raw.adminConfirmedAt || raw.admin_confirmed_at) || '—';
        r.getCell(14).value = raw.notes || raw.cancelReason || '—';
        applyDataStyle(r, idx % 2 !== 0);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    [6, 22, 13, 26, 16, 17, 17, 10, 30, 16, 22, 18, 18, 28].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
    sheet.autoFilter = { from: 'A4', to: 'N4' };

    const filename = `LHU_Media_Dat_Phong_Studio_${getDateStampVN()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Studio Bookings Excel error:', error.message);
    return res.status(500).json({ message: `Lỗi xuất Excel đặt phòng Studio: ${error.message}` });
  }
});

module.exports = router;
