'use strict';

/**
 * @file routes/duty.routes.js
 * @description API Routes cho phân hệ Lịch trực Studio CTV (FR-05).
 */

const express = require('express');
const router = express.Router();
const dutyController = require('../controllers/duty.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// CTV đăng ký ca trực Studio
router.post('/register', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.registerShift);

// Xem danh sách ca trực (theo tháng/năm/CTV)
router.get('/shifts', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.getShifts);

// Admin duyệt xác nhận ca trực
router.put('/shifts/:id/confirm', authenticate, authorize('ADMIN'), dutyController.confirmShift);

// Xác nhận hoàn thành ca trực (Admin hoặc CTV sau khi trực)
router.put('/shifts/:id/complete', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.completeShift);

// Hủy ca trực
router.delete('/shifts/:id', authenticate, authorize('COLLABORATOR', 'ADMIN'), dutyController.cancelShift);

module.exports = router;

