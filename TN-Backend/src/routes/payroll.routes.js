'use strict';

/**
 * @file routes/payroll.routes.js
 * @description API Routes cho phân hệ Chấm công, Thống kê công việc và Tính lương CTV (FR-05).
 */

const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Lấy dữ liệu Bảng chấm công ma trận (Sheet1)
router.get('/timesheet', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.getTimesheet);

// Lấy dữ liệu Bảng thống kê công việc tháng (T10.2026 format)
router.get('/tasks-summary', authenticate, authorize('COLLABORATOR', 'ADMIN'), payrollController.getTasksSummary);

// Admin tính toán và tổng hợp thù lao tháng
router.post('/calculate', authenticate, authorize('ADMIN'), payrollController.calculatePayroll);

// Admin cập nhật ô chấm công thủ công (LV, SV, NL)
router.put('/timesheet/cell', authenticate, authorize('ADMIN'), payrollController.updateAttendanceCell);

// Xuất file Excel Bảng chấm công tháng (Sheet1)
router.get('/export-timesheet', authenticate, authorize('ADMIN'), payrollController.exportTimesheet);

// Xuất file Excel Bảng thống kê công việc tháng (T10.2026)
router.get('/export-tasks-summary', authenticate, authorize('ADMIN'), payrollController.exportTasksSummary);

module.exports = router;

