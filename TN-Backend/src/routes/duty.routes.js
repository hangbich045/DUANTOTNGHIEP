'use strict';

/**
 * @file routes/duty.routes.js
 * @description API Routes cho phân hệ Quản lý ca trực Studio CTV và Quy trình 3 giai đoạn (FR-05).
 */

const express = require('express');
const router = express.Router();
const dutyController = require('../controllers/duty.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// =========================================================================
// GIAI ĐOẠN 1: TẠO VÀ QUẢN LÝ ĐỢT ĐĂNG KÝ CA TRỰC THÁNG
// =========================================================================
// Nhân sự tạo đợt đăng ký ca trực tháng mới
router.post('/periods', authenticate, authorize('ADMIN'), dutyController.createDutyPeriod);

// Xem danh sách các đợt đăng ký
router.get('/periods', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getDutyPeriods);

// Cập nhật trạng thái đợt đăng ký (OPEN, CLOSED, ARRANGING, CONFIRMED)
router.put('/periods/:id/status', authenticate, authorize('ADMIN'), dutyController.updateDutyPeriodStatus);

// =========================================================================
// GIAI ĐOẠN 2: CTV ĐĂNG KÝ THỜI GIAN CÓ THỂ TRỰC (AVAILABILITY)
// =========================================================================
// CTV đăng ký các ngày/buổi có thể tham gia trực
router.post('/availability', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.registerAvailability);

// Lấy lịch đăng ký rảnh của CTV
router.get('/availability', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getCTVRegistrations);

// =========================================================================
// GIAI ĐOẠN 3: NHÂN SỰ SẮP XẾP VÀ XÁC NHẬN LỊCH TRỰC THÁNG
// =========================================================================
// Xem bảng tổng hợp đăng ký của tất cả CTV trong đợt
router.get('/periods/:id/summary', authenticate, authorize('ADMIN'), dutyController.getPeriodRegistrationsSummary);

// Nhân sự sắp xếp / phân công ca trực
router.post('/periods/:id/assign', authenticate, authorize('ADMIN'), dutyController.assignShifts);

// Nhân sự xác nhận lịch trực tháng chính thức
router.post('/periods/:id/confirm-schedule', authenticate, authorize('ADMIN'), dutyController.confirmPeriodSchedule);

// =========================================================================
// CÁC ENDPOINT QUẢN LÝ CA TRỰC ĐƠN LẺ HIỆN CÓ (TƯƠNG THÍCH NGƯỢC)
// =========================================================================
// CTV đăng ký ca trực Studio
router.post('/register', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.registerShift);

// Xem danh sách ca trực (theo tháng/năm/CTV)
router.get('/shifts', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getShifts);

// Admin duyệt xác nhận ca trực đơn lẻ
router.put('/shifts/:id/confirm', authenticate, authorize('ADMIN'), dutyController.confirmShift);

// Xác nhận hoàn thành ca trực (Admin hoặc CTV sau khi trực)
router.put('/shifts/:id/complete', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.completeShift);

// Hủy ca trực
router.delete('/shifts/:id', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.cancelShift);

module.exports = router;
