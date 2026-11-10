'use strict';

/**
 * @file controllers/notification.controller.js
 * @description Controller xử lý các thông báo in-app (FR-07).
 */

const { Notification } = require('../models');

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

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

