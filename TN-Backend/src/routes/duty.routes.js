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
