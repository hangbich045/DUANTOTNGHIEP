'use strict';

/**
 * @file controllers/duty.controller.js
 * @description Controller xử lý các request liên quan đến Lịch trực Studio CTV và Quy trình 3 giai đoạn (FR-05).
 */

const dutyService = require('../services/duty.service');

// Giai đoạn 1: Quản lý đợt đăng ký ca trực tháng
const createDutyPeriod = async (req, res) => {
  try {
    const period = await dutyService.createDutyPeriod(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: `Tạo đợt đăng ký ca trực Tháng ${period.month}/${period.year} thành công!`,
      data: period,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo đợt đăng ký ca trực',
    });
  }
};

const getDutyPeriods = async (req, res) => {
  try {
    const periods = await dutyService.getDutyPeriods(req.query);
    return res.status(200).json({
      success: true,
      data: periods,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách đợt đăng ký',
    });
  }
};

const updateDutyPeriodStatus = async (req, res) => {
  try {
    const period = await dutyService.updateDutyPeriodStatus(req.params.id, req.body.status, req.user.id);
    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái đợt đăng ký sang ${req.body.status} thành công!`,
      data: period,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật trạng thái đợt đăng ký',
    });
  }
};

// Giai đoạn 2: CTV đăng ký thời gian có thể trực (Availability)
const registerAvailability = async (req, res) => {
  try {
    const result = await dutyService.registerAvailability(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi đăng ký lịch rảnh trực',
    });
  }
};

const getCTVRegistrations = async (req, res) => {
  try {
    const targetUserId = req.query.userId && req.user.role === 'ADMIN' ? req.query.userId : req.user.id;
    const registrations = await dutyService.getCTVRegistrations(req.query.periodId, targetUserId);
    return res.status(200).json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch rảnh đăng ký',
    });
  }
};

// Giai đoạn 3: Nhân sự xem tổng hợp, sắp xếp và chốt lịch trực tháng
const getPeriodRegistrationsSummary = async (req, res) => {
  try {
    const summary = await dutyService.getPeriodRegistrationsSummary(req.params.id);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy tổng hợp đăng ký',
    });
  }
};

const assignShifts = async (req, res) => {
  try {
    const result = await dutyService.assignShifts(req.user.id, req.params.id, req.body.assignments || []);
    return res.status(200).json({
      success: true,
      message: `Đã phân công ${result.count} ca trực thành công!`,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi phân công ca trực',
    });
  }
};

const confirmPeriodSchedule = async (req, res) => {
  try {
    const result = await dutyService.confirmPeriodSchedule(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi xác nhận lịch trực tháng',
    });
  }
};

// Các hàm đơn lẻ tương thích ngược
const registerShift = async (req, res) => {
  try {
    const shift = await dutyService.registerShift(req.user.id, req.body, req.user.role);
    return res.status(201).json({
      success: true,
      message: 'Đăng ký ca trực Studio thành công!',
      data: shift,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi đăng ký ca trực',
    });
  }
};

const confirmShift = async (req, res) => {
  try {
    const shift = await dutyService.confirmShift(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Xác nhận ca trực Studio thành công!',
      data: shift,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi xác nhận ca trực',
    });
  }
};

const completeShift = async (req, res) => {
  try {
    const shift = await dutyService.completeShift(req.params.id, req.user.id, req.user.role);
    return res.status(200).json({
      success: true,
      message: 'Xác nhận hoàn thành ca trực thành công!',
      data: shift,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi hoàn thành ca trực',
    });
  }
};

const cancelShift = async (req, res) => {
  try {
    const shift = await dutyService.cancelShift(req.params.id, req.user.id, req.user.role);
    return res.status(200).json({
      success: true,
      message: 'Hủy ca trực thành công!',
      data: shift,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi hủy ca trực',
    });
  }
};

const getShifts = async (req, res) => {
  try {
    const shifts = await dutyService.getShifts(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách ca trực',
    });
  }
};

module.exports = {
  createDutyPeriod,
  getDutyPeriods,
  updateDutyPeriodStatus,
  registerAvailability,
  getCTVRegistrations,
  getPeriodRegistrationsSummary,
  assignShifts,
  confirmPeriodSchedule,
  registerShift,
  confirmShift,
  completeShift,
  cancelShift,
  getShifts,
};
