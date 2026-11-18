'use strict';

/**
 * @file routes/maintenance.routes.js
 * @description API Routes cho phân hệ Quản lý bảo trì, sửa chữa theo hóa đơn chứng từ, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3).
 */

const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Quản lý bảo trì, sửa chữa, hóa đơn chứng từ, báo mất & thanh lý thiết bị (FR-01.5)
 */

/**
 * @swagger
 * /api/maintenances:
 *   post:
 *     summary: "[ADMIN] Lập phiếu bảo trì / sửa chữa / báo mất / thanh lý thiết bị"
 *     tags: [Maintenance]
 *     responses:
 *       201: { description: Lập phiếu thành công }
 *   get:
 *     summary: "[ADMIN] Danh sách phiếu bảo trì có lọc và phân trang"
 *     tags: [Maintenance]
 *     responses:
 *       200: { description: Danh sách phiếu bảo trì }
 * /api/maintenances/stats:
 *   get:
 *     summary: "[ADMIN] Thống kê tổng chi phí sửa chữa, đang bảo trì, báo mất, thanh lý"
 *     tags: [Maintenance]
 *     responses:
 *       200: { description: Dữ liệu thống kê bảo trì }
 * /api/maintenances/{id}:
 *   get:
 *     summary: "[ADMIN] Xem chi tiết phiếu bảo trì"
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Chi tiết phiếu }
 *   put:
 *     summary: "[ADMIN] Cập nhật hoặc nghiệm thu hoàn tất bảo trì"
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cập nhật thành công }
 *   delete:
 *     summary: "[ADMIN] Xóa phiếu bảo trì"
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Đã xóa phiếu }
 */

// Toàn bộ chức năng quản lý bảo trì, chứng từ kế toán, báo mất và thanh lý yêu cầu quyền ADMIN (QUY_TAC.md 1.1, 1.3)
router.use(authenticate, authorize('ADMIN'));

/**
 * @route   POST /api/maintenances
 * @desc    Tạo mới phiếu bảo trì / sửa chữa / báo mất / thanh lý
 * @access  Private (ADMIN)
 */
router.post('/', maintenanceController.createMaintenance);

/**
 * @route   GET /api/maintenances
 * @desc    Lấy danh sách phiếu bảo trì có lọc, tìm kiếm và phân trang
 * @access  Private (ADMIN)
 */
router.get('/', maintenanceController.getMaintenances);

/**
 * @route   GET /api/maintenances/stats
 * @desc    Lấy thống kê tổng quan (chi phí, đang sửa, báo mất, thanh lý)
 * @access  Private (ADMIN)
 */
router.get('/stats', maintenanceController.getMaintenanceStats);

/**
 * @route   GET /api/maintenances/:id
 * @desc    Lấy chi tiết một phiếu bảo trì theo ID
 * @access  Private (ADMIN)
 */
router.get('/:id', maintenanceController.getMaintenanceById);

/**
 * @route   PUT /api/maintenances/:id
 * @desc    Cập nhật thông tin phiếu hoặc nghiệm thu hoàn tất
 * @access  Private (ADMIN)
 */
router.put('/:id', maintenanceController.updateMaintenance);

/**
 * @route   DELETE /api/maintenances/:id
 * @desc    Xóa phiếu bảo trì / sửa chữa
 * @access  Private (ADMIN)
 */
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
