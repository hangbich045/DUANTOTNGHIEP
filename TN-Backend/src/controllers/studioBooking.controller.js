'use strict';

/**
 * @file controllers/studioBooking.controller.js
 * @description Controller cho API Đặt phòng Studio.
 */

const studioBookingService = require('../services/studioBooking.service');

/**
 * GET /api/studio-bookings
 * @swagger
 * /api/studio-bookings:
 *   get:
 *     summary: Lấy danh sách đặt phòng studio
 *     tags: [StudioBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED]
 *       - in: query
 *         name: studioName
 *         schema:
 *           type: string
 *         description: Lọc theo tên phòng
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Danh sách booking với phân trang
 */
const getAll = async (req, res) => {
  try {
    const result = await studioBookingService.findAll(req.query, req.user);

    // Transform sang shape FE expect:
    // - booker -> user
    // - CONFIRMED -> APPROVED (FE dùng status text đó)
    // - attendees -> participants
    // - thêm fullName (FE dùng booking.fullName)
    const items = result.items.map(item => {
      const raw = item.toJSON ? item.toJSON() : item;
      const attendanceInfo = studioBookingService.computeAttendanceInfo(raw);
      return {
        ...raw,
        user: raw.booker || raw.user,
        booker: undefined,
        fullName: raw.booker?.fullName || raw.user?.fullName || raw.fullName || '',
        participants: raw.attendees || 0,
        technicalSupport: raw.technicalSupport || false,
        status: raw.status === 'CONFIRMED' ? 'APPROVED' : raw.status,
        userCheckInAt: raw.userCheckInAt || raw.user_check_in_at || null,
        adminConfirmedAt: raw.adminConfirmedAt || raw.admin_confirmed_at || null,
        attendanceStatus: raw.attendanceStatus || raw.attendance_status || 'NOT_ARRIVED',
        attendanceInfo,
      };
    });

    // FE gọi setBookings(data) và dùng bookings.map() nên phải là mảng
    return res.status(200).json(items);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/studio-bookings
 * @swagger
 * /api/studio-bookings:
 *   post:
 *     summary: Đặt phòng studio
 *     tags: [StudioBooking]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studioName, purpose, startTime, endTime]
 *             properties:
 *               studioName:
 *                 type: string
 *                 example: Studio A
 *               purpose:
 *                 type: string
 *                 example: Chụp ảnh sản phẩm
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               attendees:
 *                 type: integer
 *                 example: 5
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đặt phòng thành công
 *       409:
 *         description: Phòng đã được đặt trong khung giờ này
 */
const create = async (req, res) => {
  try {
    const booking = await studioBookingService.create(req.body, req.user.id, req.user);
    return res.status(201).json({
      success: true,
      message: 'Đặt phòng thành công! Vui lòng chờ Admin xác nhận.',
      data: booking,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/studio-bookings/available-slots
 * @swagger
 * /api/studio-bookings/available-slots:
 *   get:
 *     summary: Lấy danh sách khung giờ trống gợi ý cho ngày được chọn
 *     tags: [StudioBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-11-20"
 *       - in: query
 *         name: studioName
 *         schema: { type: string, default: "Studio LHU" }
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { date, studioName } = req.query;
    const result = await studioBookingService.getAvailableSlots(
      date,
      studioName || 'Studio LHU',
      req.user?.role || 'USER'
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/studio-bookings/:id/process  [ADMIN ONLY]
 * @swagger
 * /api/studio-bookings/{id}/process:
 *   patch:
 *     summary: "[ADMIN] Xác nhận hoặc huỷ booking"
 *     tags: [StudioBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [confirm, cancel]
 *               cancelReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Xử lý thành công
 */
const processBooking = async (req, res) => {
  try {
    const { action, cancelReason, force, adminNote } = req.body;
    const result = await studioBookingService.processBooking(req.params.id, action, cancelReason, { force, adminNote });

    if (result && result.status === 'warning') {
      return res.status(200).json(result);
    }

    const messages = {
      confirm: 'Đã xác nhận đặt phòng!',
      cancel: 'Đã huỷ đặt phòng.',
    };
    return res.status(200).json({
      success: true,
      message: messages[action] || 'Xử lý thành công.',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/studio-bookings/:id/cancel
 * @swagger
 * /api/studio-bookings/{id}/cancel:
 *   patch:
 *     summary: Người dùng tự huỷ booking của mình
 *     tags: [StudioBooking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Huỷ thành công
 *       403:
 *         description: Không có quyền huỷ booking này
 */
const cancelByUser = async (req, res) => {
  try {
    const result = await studioBookingService.cancelByUser(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Huỷ đặt phòng thành công!',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PUT/PATCH /api/studio-bookings/:id/reschedule
 * [FR-03.6] Dời lịch / Chỉnh sửa lịch đặt phòng Studio (kèm kiểm tra xung đột)
 */
const reschedule = async (req, res) => {
  try {
    const result = await studioBookingService.reschedule(req.params.id, req.body, req.user);

    if (result && result.status === 'warning') {
      return res.status(200).json(result);
    }

    return res.status(200).json({
      success: true,
      message: 'Dời lịch đặt phòng Studio thành công!',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/studio-bookings/:id/check-in
 * [USER / CTV] Xác nhận đã đến Studio theo lịch đăng ký
 */
const checkIn = async (req, res) => {
  try {
    const reqInfo = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    const result = await studioBookingService.checkIn(req.params.id, req.user, reqInfo);
    return res.status(200).json({
      success: true,
      message: 'Xác nhận đã đến Studio thành công! Yêu cầu đã chuyển sang trạng thái "Chờ xác nhận có mặt".',
      data: result.booking,
      attendanceInfo: result.attendanceInfo,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/studio-bookings/:id/confirm-usage
 * [ADMIN] Xác nhận đã sử dụng phòng Studio hoàn tất
 */
const confirmUsage = async (req, res) => {
  try {
    const reqInfo = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    const result = await studioBookingService.confirmUsage(
      req.params.id,
      req.user,
      { adminNote: req.body.adminNote },
      reqInfo
    );
    return res.status(200).json({
      success: true,
      message: 'Xác nhận đã sử dụng phòng Studio thành công!',
      data: result.booking,
      attendanceInfo: result.attendanceInfo,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/studio-bookings/:id/mark-absent
 * [ADMIN] Đánh dấu người dùng không đến sử dụng Studio
 */
const markAbsent = async (req, res) => {
  try {
    const reqInfo = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    const result = await studioBookingService.markAbsent(
      req.params.id,
      req.user,
      { reason: req.body.reason },
      reqInfo
    );
    return res.status(200).json({
      success: true,
      message: 'Đã ghi nhận người dùng không đến sử dụng Studio.',
      data: result.booking,
      attendanceInfo: result.attendanceInfo,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAll,
  create,
  processBooking,
  cancelByUser,
  reschedule,
  getAvailableSlots,
  checkIn,
  confirmUsage,
  markAbsent,
};
