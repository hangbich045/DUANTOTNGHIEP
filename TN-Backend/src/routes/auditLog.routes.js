'use strict';

/**
 * @file routes/auditLog.routes.js
 * @description Định nghĩa các tuyến API tra cứu Lịch sử thao tác (Audit Logs - FR-09).
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Toàn bộ các route lịch sử thao tác chỉ dành riêng cho ADMIN
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Lấy danh sách lịch sử thao tác (Audit Logs) có phân trang và bộ lọc (Chỉ ADMIN)
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auditLogController.getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/stats:
 *   get:
 *     summary: Thống kê số lượng thao tác theo nhóm hành động và thời gian (Chỉ ADMIN)
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', auditLogController.getAuditLogStats);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     summary: Xem chi tiết một bản ghi Audit Log theo ID (Chỉ ADMIN)
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auditLogController.getAuditLogById);

module.exports = router;
