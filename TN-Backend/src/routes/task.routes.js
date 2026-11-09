'use strict';

/**
 * @file routes/task.routes.js
 * @description Định nghĩa các endpoints cho phân hệ Quản lý công việc (FR-04).
 */

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /api/tasks/stats: Thống kê tổng quan trạng thái công việc
router.get('/stats', authenticate, taskController.getStats);

// GET /api/tasks: Lấy danh sách công việc (Admin xem tất cả, CTV xem việc được giao)
router.get('/', authenticate, taskController.getAll);

// GET /api/tasks/:id: Xem chi tiết một công việc
router.get('/:id', authenticate, taskController.getById);

// PUT/PATCH /api/tasks/:id: [ADMIN] Chỉnh sửa thông tin nhiệm vụ (loại việc, tiêu đề, mô tả, hạn chót, CTV)
router.put('/:id', authenticate, authorize('ADMIN'), taskController.update);
router.patch('/:id', authenticate, authorize('ADMIN'), taskController.update);

// POST /api/tasks: [ADMIN] Giao việc cho CTV kèm deadline
router.post('/', authenticate, authorize('ADMIN'), taskController.create);

// POST /api/tasks/external: [CTV/ADMIN] Khai báo công việc phát sinh ngoài hệ thống
router.post('/external', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.createExternal);

// PUT/PATCH /api/tasks/:id/progress: [CTV/ADMIN] Cập nhật tiến độ hoặc nộp kết quả
router.put('/:id/progress', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.updateProgress);
router.patch('/:id/progress', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.updateProgress);

// PUT/PATCH /api/tasks/:id/review: [ADMIN] Nghiệm thu hoặc yêu cầu chỉnh sửa
router.put('/:id/review', authenticate, authorize('ADMIN'), taskController.review);
router.patch('/:id/review', authenticate, authorize('ADMIN'), taskController.review);

// DELETE /api/tasks/:id: [ADMIN] Xóa công việc
router.delete('/:id', authenticate, authorize('ADMIN'), taskController.deleteTask);

module.exports = router;

