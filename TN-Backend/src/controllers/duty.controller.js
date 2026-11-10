'use strict';

/**
 * @file controllers/duty.controller.js
 * @description Controller xử lý các request liên quan đến Lịch trực Studio CTV (FR-05).
 */

const dutyService = require('../services/duty.service');

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
  registerShift,
  confirmShift,
  completeShift,
  cancelShift,
  getShifts,
};

