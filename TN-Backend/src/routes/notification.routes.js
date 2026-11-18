'use strict';

/**
 * @file routes/notification.routes.js
 * @description API Routes cho thông báo in-app (FR-07).
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Thông báo in-app & nhắc hạn quá hạn mượn thiết bị (FR-07)
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của người dùng đang đăng nhập
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Danh sách thông báo & số lượng chưa đọc }
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Đánh dấu đã đọc 1 thông báo
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Đã đánh dấu đã đọc }
 * /api/notifications/read-all:
 *   put:
 *     summary: Đánh dấu đã đọc tất cả thông báo
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Đã đánh dấu tất cả là đã đọc }
 * /api/notifications/check-overdue:
 *   post:
 *     summary: "[ADMIN] Quét đơn mượn quá hạn và gửi cảnh báo tự động"
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Kết quả quét đơn quá hạn }
 */
/**
 * @swagger
 * /api/notifications/email-logs:
 *   get:
 *     summary: "[ADMIN] Tra cứu lịch sử & trạng thái gửi email thông báo toàn hệ thống"
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: emailStatus
 *         schema: { type: string, enum: [ALL, SENT, FAILED, PENDING, SKIPPED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Danh sách lịch sử gửi email & thống kê }
 * /api/notifications/email-status:
 *   get:
 *     summary: "[ADMIN] Kiểm tra trạng thái kết nối SMTP & thống kê gửi email"
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Trạng thái SMTP & thống kê }
 * /api/notifications/{id}/resend-email:
 *   post:
 *     summary: "[ADMIN] Gửi lại email cho một thông báo cụ thể"
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Kết quả gửi lại email }
 * /api/notifications/resend-failed:
 *   post:
 *     summary: "[ADMIN] Gửi lại hàng loạt các email thông báo đang bị lỗi (FAILED)"
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Tổng hợp kết quả gửi lại }
 */
router.get('/', authenticate, notificationController.getMyNotifications);
router.get('/email-logs', authenticate, authorize('ADMIN'), notificationController.getEmailDeliveryLogs);
router.get('/email-status', authenticate, authorize('ADMIN'), notificationController.getEmailSystemStatus);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.post('/check-overdue', authenticate, authorize('ADMIN'), notificationController.checkOverdueBorrowRequests);
router.post('/resend-failed', authenticate, authorize('ADMIN'), notificationController.resendFailedEmails);
router.post('/:id/resend-email', authenticate, authorize('ADMIN'), notificationController.resendNotificationEmail);

module.exports = router;

