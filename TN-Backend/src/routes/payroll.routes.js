'use strict';

/**
 * @file routes/payroll.routes.js
 * @description API Routes cho phân hệ Chấm công, Thống kê công việc và Tính lương CTV (FR-05).
 */

const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Payroll & Timesheet
 *   description: Bảng chấm công, thống kê công việc, tính thù lao & xuất Excel CTV (FR-05)
 */

/**
 * @swagger
 * /api/payroll/timesheet:
 *   get:
 *     summary: "[CTV/ADMIN] Lấy dữ liệu Bảng chấm công ma trận tháng"
 *     tags: [Payroll & Timesheet]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Ma trận chấm công tháng }
 * /api/payroll/tasks-summary:
 *   get:
 *     summary: "[CTV/ADMIN] Lấy Bảng thống kê công việc tháng kèm hệ số nhân"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: Danh sách công việc nghiệm thu trong tháng }
 * /api/payroll/collaborator-summary:
 *   get:
 *     summary: "[CTV/ADMIN] Lấy Bảng tổng công việc tháng cá nhân (Read-only)"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: Tổng hợp giờ thực tế, giờ quy đổi và thù lao }
 * /api/payroll/monthly:
 *   get:
 *     summary: "[ADMIN] Lấy Bảng lương tháng tổng hợp CTV"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: Bảng lương tháng CTV }
 * /api/payroll/calculate:
 *   post:
 *     summary: "[ADMIN] Tính toán lại và lưu tổng hợp thù lao tháng"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: Kết quả tính lương tháng }
 * /api/payroll/timesheet/cell:
 *   put:
 *     summary: "[ADMIN] Cập nhật thủ công 1 ô chấm công (LV, SV, NL)"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: Đã cập nhật ô chấm công }
 * /api/payroll/export-timesheet:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) Bảng chấm công tháng có công thức"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: File Excel .xlsx }
 * /api/payroll/export-tasks-summary:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) Bảng thống kê công việc & chi tiết hệ số"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: File Excel .xlsx }
 * /api/payroll/export-payroll:
 *   get:
 *     summary: "[ADMIN] Xuất Excel (.xlsx) Bảng lương tháng CTV"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: File Excel .xlsx }
 * /api/payroll/export-collaborator-summary:
 *   get:
 *     summary: "[CTV/ADMIN] Xuất Excel (.xlsx) Tổng công việc tháng cá nhân CTV"
 *     tags: [Payroll & Timesheet]
 *     responses:
 *       200: { description: File Excel .xlsx }
 */

// Lấy dữ liệu Bảng chấm công ma trận (Sheet1)
router.get('/timesheet', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.getTimesheet);

// Lấy dữ liệu Bảng thống kê công việc tháng (T10.2026 format)
router.get('/tasks-summary', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.getTasksSummary);

// Lấy dữ liệu Bảng tổng công việc tháng dành riêng cho CTV (Read-only)
router.get('/collaborator-summary', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.getCollaboratorSummary);

// Lấy dữ liệu Bảng lương tháng tổng hợp (FR-05)
router.get('/monthly', authenticate, authorize('ADMIN'), payrollController.getMonthlyPayroll);

// Admin tính toán và tổng hợp thù lao tháng
router.post('/calculate', authenticate, authorize('ADMIN'), payrollController.calculatePayroll);

// Admin cập nhật ô chấm công thủ công (LV, SV, NL)
router.put('/timesheet/cell', authenticate, authorize('ADMIN'), payrollController.updateAttendanceCell);

// Xuất file Excel Bảng chấm công tháng (Sheet1)
router.get('/export-timesheet', authenticate, authorize('ADMIN'), payrollController.exportTimesheet);

// Xuất file Excel Bảng thống kê công việc tháng (T10.2026 + Chi tiết giờ & hệ số)
router.get('/export-tasks-summary', authenticate, authorize('ADMIN'), payrollController.exportTasksSummary);

// Xuất file Excel Bảng lương tháng CTV (ADMIN)
router.get('/export-payroll', authenticate, authorize('ADMIN'), payrollController.exportPayroll);

// Xuất file Excel Tổng công việc tháng cá nhân (CTV chỉ xuất dữ liệu của chính mình)
router.get('/export-collaborator-summary', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.exportCollaboratorSummary);

module.exports = router;

