'use strict';

/**
 * @file routes/notification.routes.js
 * @description API Routes cho thông báo in-app (FR-07).
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, notificationController.getMyNotifications);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.post('/check-overdue', authenticate, authorize('ADMIN'), notificationController.checkOverdueBorrowRequests);

module.exports = router;

