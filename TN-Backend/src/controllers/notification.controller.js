'use strict';

/**
 * @file controllers/notification.controller.js
 * @description Controller xử lý các thông báo in-app (FR-07).
 */

const { Notification } = require('../models');
const notificationService = require('../services/notification.service');

const getMyNotifications = async (req, res) => {
  try {
    const { limit = 20, unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.isRead = false;

    const notifs = await Notification.findAll({
      where,
      limit: parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifs,
        unreadCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải thông báo',
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (notif) {
      notif.isRead = true;
      await notif.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo đã đọc',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật thông báo',
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo đã đọc',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật thông báo',
    });
  }
};

const checkOverdueBorrowRequests = async (req, res) => {
  try {
    const result = await notificationService.checkAndNotifyOverdueBorrowRequests();
    return res.status(200).json({
      success: true,
      message: `Đã quét và xử lý ${result.updatedCount} đơn mượn quá hạn, gửi ${result.notifiedCount} thông báo cảnh báo.`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra nợ quá hạn',
    });
  }
};

const getEmailDeliveryLogs = async (req, res) => {
  try {
    const data = await notificationService.getEmailDeliveryLogs(req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải lịch sử gửi email thông báo',
    });
  }
};

const getEmailSystemStatus = async (req, res) => {
  try {
    const data = await notificationService.getEmailSystemStatus();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra trạng thái SMTP',
    });
  }
};

const resendNotificationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.resendNotificationEmail(id);
    const ok = result.delivery?.status === 'SENT';
    return res.status(200).json({
      success: ok,
      message: ok
        ? 'Đã gửi lại email thông báo thành công'
        : `Gửi lại email chưa thành công: ${result.delivery?.error || result.delivery?.status}`,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi gửi lại email thông báo',
    });
  }
};

const resendFailedEmails = async (req, res) => {
  try {
    const limit = req.body?.limit || req.query?.limit || 50;
    const result = await notificationService.resendFailedEmails(limit);
    return res.status(200).json({
      success: true,
      message: `Đã thử gửi lại ${result.attempted} email lỗi: ${result.sent} thành công, ${result.failed} thất bại.`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi gửi lại danh sách email thất bại',
    });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  checkOverdueBorrowRequests,
  getEmailDeliveryLogs,
  getEmailSystemStatus,
  resendNotificationEmail,
  resendFailedEmails,
};

