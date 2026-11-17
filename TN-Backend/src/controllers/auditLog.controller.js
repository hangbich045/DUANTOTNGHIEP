'use strict';

/**
 * @file controllers/auditLog.controller.js
 * @description Controller xử lý các endpoint tra cứu lịch sử thao tác hệ thống (FR-09).
 */

const auditLogService = require('../services/auditLog.service');

/**
 * Lấy danh sách lịch sử thao tác có phân trang, lọc và tìm kiếm (chỉ ADMIN)
 * GET /api/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách lịch sử thao tác thành công',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách lịch sử thao tác',
    });
  }
};

/**
 * Thống kê tổng quan hoạt động hệ thống
 * GET /api/audit-logs/stats
 */
const getAuditLogStats = async (req, res) => {
  try {
    const stats = await auditLogService.getAuditLogStats();
    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê lịch sử thao tác thành công',
      data: stats,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy thống kê lịch sử thao tác',
    });
  }
};

/**
 * Lấy chi tiết một bản ghi lịch sử thao tác theo ID
 * GET /api/audit-logs/:id
 */
const getAuditLogById = async (req, res) => {
  try {
    const log = await auditLogService.getAuditLogById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết lịch sử thao tác thành công',
      data: log,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết lịch sử thao tác',
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogById,
};
