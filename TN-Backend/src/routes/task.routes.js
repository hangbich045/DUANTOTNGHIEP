'use strict';

/**
 * @file routes/task.routes.js
 * @description Định nghĩa các endpoints cho phân hệ Quản lý công việc (FR-04).
 */

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Quản lý công việc & phân công CTV (FR-04)
 */

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: "[CTV/ADMIN] Thống kê tổng quan trạng thái công việc"
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Số lượng công việc theo từng trạng thái
 *       403:
 *         description: Từ chối quyền USER thường
 */
router.get('/stats', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.getStats);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: "[CTV/ADMIN] Lấy danh sách công việc (Admin xem tất cả, CTV chỉ xem việc của mình)"
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: taskType
 *         schema: { type: string }
 *       - in: query
 *         name: assignedToUserId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách công việc phân trang
 *   post:
 *     summary: "[ADMIN] Giao công việc mới cho CTV"
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, assignedToUserId]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               assignedToUserId: { type: string, format: uuid }
 *               taskType: { type: string }
 *               deadline: { type: string, format: date-time }
 *               startTime: { type: string, format: date-time }
 *               campus: { type: string }
 *               room: { type: string }
 *     responses:
 *       201:
 *         description: Giao việc thành công
 */
router.get('/', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.getAll);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: "[CTV/ADMIN] Xem chi tiết một công việc"
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chi tiết công việc
 *   put:
 *     summary: "[ADMIN] Cập nhật thông tin công việc"
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: "[ADMIN] Xóa công việc chưa hoàn thành"
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Đã xóa công việc
 */
router.get('/:id', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.getById);

// PUT/PATCH /api/tasks/:id: [ADMIN] Chỉnh sửa thông tin nhiệm vụ (loại việc, tiêu đề, mô tả, hạn chót, CTV)
router.put('/:id', authenticate, authorize('ADMIN'), taskController.update);
router.patch('/:id', authenticate, authorize('ADMIN'), taskController.update);

// POST /api/tasks: [ADMIN] Giao việc cho CTV kèm deadline
router.post('/', authenticate, authorize('ADMIN'), taskController.create);

/**
 * @swagger
 * /api/tasks/external:
 *   post:
 *     summary: "[CTV/ADMIN] Khai báo công việc phát sinh ngoài hệ thống"
 *     tags: [Tasks]
 *     responses:
 *       201:
 *         description: Khai báo công việc thành công (chờ Admin nghiệm thu)
 */
router.post('/external', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.createExternal);

/**
 * @swagger
 * /api/tasks/{id}/progress:
 *   put:
 *     summary: "[CTV/ADMIN] Cập nhật tiến độ hoặc nộp sản phẩm/minh chứng"
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cập nhật tiến độ thành công
 */
router.put('/:id/progress', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.updateProgress);
router.patch('/:id/progress', authenticate, authorize('COLLABORATOR', 'ADMIN'), taskController.updateProgress);

/**
 * @swagger
 * /api/tasks/{id}/review:
 *   put:
 *     summary: "[ADMIN] Nghiệm thu hoàn thành (COMPLETED) hoặc yêu cầu chỉnh sửa (REVISION_REQUESTED)"
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Đã lưu kết quả nghiệm thu
 */
router.put('/:id/review', authenticate, authorize('ADMIN'), taskController.review);
router.patch('/:id/review', authenticate, authorize('ADMIN'), taskController.review);

// DELETE /api/tasks/:id: [ADMIN] Xóa công việc
router.delete('/:id', authenticate, authorize('ADMIN'), taskController.deleteTask);

module.exports = router;

