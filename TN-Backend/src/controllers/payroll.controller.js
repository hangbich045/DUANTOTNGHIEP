'use strict';

/**
 * @file controllers/payroll.controller.js
 * @description Controller xử lý chấm công, thống kê công việc, tính lương và xuất Excel (FR-05).
 */

const payrollService = require('../services/payroll.service');

const getTimesheet = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    const data = await payrollService.getTimesheetData(m, y);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu bảng chấm công',
    });
  }
};

const getTasksSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    const data = await payrollService.getTasksSummaryData(m, y);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu thống kê công việc',
    });
  }
};

const calculatePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    const result = await payrollService.calculateMonthlyPayroll(m, y);
    return res.status(200).json({
      success: true,
      message: `Đã tính toán và tổng hợp dữ liệu tiền công Tháng ${m}/${y} thành công!`,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi tính toán tiền công',
    });
  }
};

const updateAttendanceCell = async (req, res) => {
  try {
    const rec = await payrollService.updateAttendanceCell(req.body);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật chấm công thành công!',
      data: rec,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật chấm công',
    });
  }
};

const exportTimesheet = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    await payrollService.exportTimesheetExcel(m, y, res);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xuất Excel Bảng chấm công',
      });
    }
  }
};

const exportTasksSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    await payrollService.exportTasksSummaryExcel(m, y, res);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xuất Excel Bảng thống kê công việc',
      });
    }
  }
};

module.exports = {
  getTimesheet,
  getTasksSummary,
  calculatePayroll,
  updateAttendanceCell,
  exportTimesheet,
  exportTasksSummary,
};

