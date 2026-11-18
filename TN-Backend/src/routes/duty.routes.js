'use strict';

/**
 * @file routes/duty.routes.js
 * @description API Routes cho phân hệ Quản lý ca trực Studio CTV và Quy trình 3 giai đoạn (FR-05).
 */

const express = require('express');
const router = express.Router();
const dutyController = require('../controllers/duty.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Duty Schedule
 *   description: Quản lý đợt đăng ký & lịch trực Studio CTV 3 giai đoạn (FR-05)
 */

/**
 * @swagger
 * /api/duty/periods:
 *   post:
 *     summary: "[ADMIN] Tạo đợt đăng ký ca trực tháng mới"
 *     tags: [Duty Schedule]
 *     responses:
 *       201: { description: Tạo đợt thành công }
 *   get:
 *     summary: "[CTV/ADMIN] Danh sách các đợt đăng ký ca trực"
 *     tags: [Duty Schedule]
 *     responses:
 *       200: { description: Danh sách đợt trực }
 * /api/duty/periods/{id}/status:
 *   put:
 *     summary: "[ADMIN] Cập nhật trạng thái đợt (OPEN, CLOSED, ARRANGING, CONFIRMED)"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Đã cập nhật trạng thái }
 * /api/duty/periods/{id}/deletion-check:
 *   get:
 *     summary: "[ADMIN] Kiểm tra dữ liệu liên quan trước khi xóa/lưu trữ đợt trực"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Kết quả kiểm tra an toàn }
 * /api/duty/periods/{id}:
 *   delete:
 *     summary: "[ADMIN] Xóa sạch hoặc lưu trữ bảo toàn lịch sử đợt đăng ký ca trực"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Xóa hoặc lưu trữ thành công }
 * /api/duty/availability:
 *   post:
 *     summary: "[CTV/ADMIN] Đăng ký thời gian có thể trực (Availability)"
 *     tags: [Duty Schedule]
 *     responses:
 *       200: { description: Đã lưu lịch đăng ký }
 *   get:
 *     summary: "[CTV/ADMIN] Xem lịch đăng ký rảnh cá nhân"
 *     tags: [Duty Schedule]
 *     responses:
 *       200: { description: Danh sách slot rảnh }
 * /api/duty/periods/{id}/summary:
 *   get:
 *     summary: "[CTV/ADMIN] Xem ma trận tổng hợp đăng ký & lịch trực trong đợt"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ma trận lịch trực tháng }
 * /api/duty/periods/{id}/assign:
 *   post:
 *     summary: "[ADMIN] Sắp xếp / điều chỉnh phân công ca trực"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Phân công thành công }
 * /api/duty/periods/{id}/confirm-schedule:
 *   post:
 *     summary: "[ADMIN] Xác nhận chốt lịch trực chính thức của tháng"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Đã chốt lịch trực và gửi thông báo cho CTV }
 * /api/duty/weekly-schedule:
 *   get:
 *     summary: "[CTV/ADMIN] Xem bảng lịch trực tuần thống nhất (LV/SV/ĐK)"
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-11-16" }
 *     responses:
 *       200: { description: Dữ liệu ma trận tuần }
 * /api/duty/export-weekly:
 *   get:
 *     summary: "[CTV/ADMIN] Xuất file Excel (.xlsx) lịch trực tuần (CTV chỉ xuất dữ liệu cá nhân)"
 *     tags: [Duty Schedule]
 *     responses:
 *       200: { description: File Excel .xlsx }
 */

// =========================================================================
// GIAI ĐOẠN 1: TẠO VÀ QUẢN LÝ ĐỢT ĐĂNG KÝ CA TRỰC THÁNG
// =========================================================================
// Nhân sự tạo đợt đăng ký ca trực tháng mới
router.post('/periods', authenticate, authorize('ADMIN'), dutyController.createDutyPeriod);

// Xem danh sách các đợt đăng ký
router.get('/periods', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getDutyPeriods);

// Cập nhật trạng thái đợt đăng ký (OPEN, CLOSED, ARRANGING, CONFIRMED)
router.put('/periods/:id/status', authenticate, authorize('ADMIN'), dutyController.updateDutyPeriodStatus);

// Kiểm tra dữ liệu liên quan và tính an toàn trước khi xóa đợt đăng ký ca trực (chỉ ADMIN)
router.get('/periods/:id/deletion-check', authenticate, authorize('ADMIN'), dutyController.checkPeriodDeletionSafety);

// Xóa hoặc Lưu trữ đợt đăng ký ca trực theo tháng (chỉ ADMIN)
router.delete('/periods/:id', authenticate, authorize('ADMIN'), dutyController.deleteDutyPeriod);

// =========================================================================
// GIAI ĐOẠN 2: CTV ĐĂNG KÝ THỜI GIAN CÓ THỂ TRỰC (AVAILABILITY)
// =========================================================================
// CTV đăng ký các ngày/buổi có thể tham gia trực
router.post('/availability', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.registerAvailability);

// Lấy lịch đăng ký rảnh của CTV
router.get('/availability', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getCTVRegistrations);

// =========================================================================
// GIAI ĐOẠN 3: NHÂN SỰ SẮP XẾP, XÁC NHẬN VÀ CHỈNH SỬA LỊCH TRỰC THÁNG
// =========================================================================
// Xem bảng tổng hợp đăng ký và toàn bộ lịch trực của tất cả CTV trong đợt (Cả CTV và Admin đều có quyền xem)
router.get('/periods/:id/summary', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getPeriodRegistrationsSummary);

// Lịch sử chỉnh sửa lịch trực của đợt (Dành cho Admin)
router.get('/periods/:id/history', authenticate, authorize('ADMIN'), dutyController.getScheduleHistories);

// Nhân sự sắp xếp / phân công ca trực (hoặc điều chỉnh lịch trực đã xác nhận)
router.post('/periods/:id/assign', authenticate, authorize('ADMIN'), dutyController.assignShifts);

// Nhân sự xác nhận lịch trực tháng chính thức
router.post('/periods/:id/confirm-schedule', authenticate, authorize('ADMIN'), dutyController.confirmPeriodSchedule);

// =========================================================================
// CÁC ENDPOINT QUẢN LÝ CA TRỰC ĐƠN LẺ HIỆN CÓ (TƯƠNG THÍCH NGƯỢC)
// =========================================================================
// Xem bảng phân công lịch làm việc tuần BPTT (Toàn bộ CTV & Admin đều có quyền xem)
router.get('/weekly-schedule', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getWeeklySchedule);

// Xuất Excel bảng lịch trực tuần (ADMIN: toàn bộ BPTT theo bộ lọc, CTV: chỉ dữ liệu cá nhân)
router.get('/export-weekly', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.exportWeeklySchedule);

// CTV đăng ký ca trực Studio
router.post('/register', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.registerShift);

// Xem danh sách ca trực (theo tháng/năm/CTV)
router.get('/shifts', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getShifts);

// Admin duyệt xác nhận ca trực đơn lẻ
router.put('/shifts/:id/confirm', authenticate, authorize('ADMIN'), dutyController.confirmShift);

// Xác nhận hoàn thành ca trực thủ công (Chỉ dành cho Admin khi cần can thiệp; hệ thống tự động hoàn thành khi hết giờ trực)
router.put('/shifts/:id/complete', authenticate, authorize('ADMIN'), dutyController.completeShift);

// Hủy ca trực
router.delete('/shifts/:id', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.cancelShift);

module.exports = router;
