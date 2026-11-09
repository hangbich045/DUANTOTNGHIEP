'use strict';

/**
 * @file controllers/task.controller.js
 * @description Controller xử lý các HTTP requests cho phân hệ Quản lý công việc (FR-04).
 */

const taskService = require('../services/task.service');

/**
 * Lấy danh sách công việc (có phân quyền, tìm kiếm, lọc và phân trang)
 * GET /api/tasks
 */
const getAll = async (req, res) => {
  try {
    const result = await taskService.findAll(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tải danh sách công việc',
    });
  }
};

/**
 * Lấy thống kê tổng quan trạng thái công việc
 * GET /api/tasks/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await taskService.getStats(req.user);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lấy thống kê công việc',
    });
  }
};

/**
 * Lấy chi tiết một công việc theo ID
 * GET /api/tasks/:id
 */
const getById = async (req, res) => {
  try {
    const task = await taskService.findById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    const status = error.message.includes('không có quyền') ? 403 : 404;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * [ADMIN] Giao việc mới cho CTV
 * POST /api/tasks
 */
const create = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Giao nhiệm vụ cho CTV thành công',
      data: task,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi giao việc',
    });
  }
};

/**
 * [ADMIN] Cập nhật thông tin nhiệm vụ (loại việc, tiêu đề, mô tả, hạn chót, CTV)
 * PUT /api/tasks/:id
 */
const update = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin nhiệm vụ thành công',
      data: task,
    });
  } catch (error) {
    const status = error.message.includes('Chỉ Nhân sự') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật nhiệm vụ',
    });
  }
};

/**
 * [CTV / ADMIN] Khai báo công việc phát sinh ngoài hệ thống
 * POST /api/tasks/external
 */
const createExternal = async (req, res) => {
  try {
    const task = await taskService.createExternalTask(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Khai báo công việc ngoài hệ thống thành công (Đang chờ duyệt)',
      data: task,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi khai báo công việc ngoài hệ thống',
    });
  }
};

/**
 * [CTV / ADMIN] Cập nhật tiến độ hoặc nộp kết quả công việc
 * PUT /api/tasks/:id/progress
 */
const updateProgress = async (req, res) => {
  try {
    const task = await taskService.updateProgress(req.params.id, req.body, req.user);
    const msg = task.status === 'PENDING_APPROVAL'
      ? 'Đã nộp kết quả công việc thành công (Chờ Nhân sự duyệt)'
      : 'Cập nhật tiến độ công việc thành công';

    return res.status(200).json({
      success: true,
      message: msg,
      data: task,
    });
  } catch (error) {
    const status = error.message.includes('không có quyền') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật tiến độ công việc',
    });
  }
};

/**
 * [ADMIN] Đánh giá nghiệm thu hoặc yêu cầu chỉnh sửa công việc
 * PUT /api/tasks/:id/review
 */
const review = async (req, res) => {
  try {
    const task = await taskService.reviewTask(req.params.id, req.body, req.user);
    const msg = task.status === 'COMPLETED'
      ? 'Đã nghiệm thu hoàn thành công việc thành công'
      : 'Đã gửi yêu cầu chỉnh sửa công việc cho CTV';

    return res.status(200).json({
      success: true,
      message: msg,
      data: task,
    });
  } catch (error) {
    const status = error.message.includes('Chỉ Nhân sự') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Lỗi khi đánh giá công việc',
    });
  }
};

/**
 * [ADMIN] Xóa công việc
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Xóa công việc thành công',
    });
  } catch (error) {
    const status = error.message.includes('Chỉ Nhân sự') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Lỗi khi xóa công việc',
    });
  }
};

module.exports = {
  getAll,
  getStats,
  getById,
  create,
  update,
  createExternal,
  updateProgress,
  review,
  deleteTask,
};
