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

    // Bảo mật RBAC: CTV chỉ được xem dữ liệu của chính mình
    const targetUserId = req.user.role === 'COLLABORATOR' ? req.user.id : (req.query.userId || null);

    const data = await payrollService.getTasksSummaryData(m, y, targetUserId);
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

const getCollaboratorSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    // Bảo mật RBAC: CTV chỉ được xem danh sách của chính mình; Admin có thể chỉ định userId
    const ctvUserId = req.user.role === 'COLLABORATOR' ? req.user.id : (req.query.userId || req.user.id);

    const data = await payrollService.getCollaboratorMonthlySummary(m, y, ctvUserId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu tổng công việc tháng của CTV',
    });
  }
};

const getMonthlyPayroll = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    const data = await payrollService.calculateMonthlyPayroll(m, y);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy dữ liệu bảng lương tháng',
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
    const { month, year, ctvId, search } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    await payrollService.exportTimesheetExcel(m, y, res, { ctvId, search });
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
    const { month, year, ctvId, search } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    await payrollService.exportTasksSummaryExcel(m, y, res, { ctvId, search });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xuất Excel Bảng thống kê công việc',
      });
    }
  }
};

const exportPayroll = async (req, res) => {
  try {
    const { month, year, ctvId, search } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    await payrollService.exportMonthlyPayrollExcel(m, y, res, { ctvId, search });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xuất Excel Bảng lương tháng',
      });
    }
  }
};

const exportCollaboratorSummary = async (req, res) => {
  try {
    const { month, year, userId, status } = req.query;
    const now = new Date();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const y = parseInt(year, 10) || now.getFullYear();

    // RBAC nghiêm ngặt: CTV chỉ được xuất dữ liệu cá nhân của chính mình
    const targetUserId = req.user.role === 'COLLABORATOR' ? req.user.id : (userId || req.user.id);

    await payrollService.exportCollaboratorSummaryExcel(m, y, targetUserId, res, { status });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi xuất Excel Tổng công việc tháng cá nhân',
      });
    }
  }
};

module.exports = {
  getTimesheet,
  getTasksSummary,
  getCollaboratorSummary,
  getMonthlyPayroll,
  calculatePayroll,
  updateAttendanceCell,
  exportTimesheet,
  exportTasksSummary,
  exportPayroll,
  exportCollaboratorSummary,
};

