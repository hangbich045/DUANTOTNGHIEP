'use strict';

/**
 * @file controllers/maintenance.controller.js
 * @description Controller xử lý các yêu cầu Quản lý bảo trì, sửa chữa, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3).
 */

const maintenanceService = require('../services/maintenance.service');

/**
 * Tạo mới phiếu bảo trì / sửa chữa / báo mất / thanh lý
 * POST /api/maintenances
 */
const createMaintenance = async (req, res) => {
  try {
    const performedBy = req.user?.id || null;
    const maintenance = await maintenanceService.createMaintenance(req.body, performedBy);

    const typeLabel = {
      MAINTENANCE: 'bảo trì định kỳ',
      REPAIR: 'sửa chữa sự cố',
      LOST: 'báo mất',
      DISPOSAL: 'thanh lý thiết bị',
    }[maintenance.type] || maintenance.type;

    if (req.setAuditDetails) {
      req.setAuditDetails(
        `Khởi tạo phiếu ${typeLabel}: "${maintenance.title}" cho thiết bị [${maintenance.equipment?.code || 'N/A'}] ${maintenance.equipment?.name || ''}${maintenance.cost ? ` (Chi phí: ${Number(maintenance.cost).toLocaleString('vi-VN')} đ)` : ''}${maintenance.invoiceNumber ? ` - HĐ: ${maintenance.invoiceNumber}` : ''}`,
        'CREATE',
        'EQUIPMENT_MAINTENANCE',
        maintenance.id
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo phiếu bảo trì / sửa chữa thành công',
      data: maintenance,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi tạo phiếu bảo trì / sửa chữa',
    });
  }
};

/**
 * Lấy danh sách lịch sử bảo trì, sửa chữa, báo mất, thanh lý có lọc và phân trang
 * GET /api/maintenances
 */
const getMaintenances = async (req, res) => {
  try {
    const result = await maintenanceService.getMaintenances(req.query);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiếu bảo trì / sửa chữa thành công',
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách phiếu bảo trì',
    });
  }
};

/**
 * Lấy chi tiết một phiếu bảo trì theo ID
 * GET /api/maintenances/:id
 */
const getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await maintenanceService.getMaintenanceById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết phiếu bảo trì thành công',
      data: maintenance,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy chi tiết phiếu bảo trì',
    });
  }
};

/**
 * Lấy toàn bộ lịch sử bảo trì của một thiết bị cụ thể
 * GET /api/equipments/:equipmentId/maintenances
 */
const getMaintenancesByEquipment = async (req, res) => {
  try {
    const records = await maintenanceService.getMaintenancesByEquipment(req.params.equipmentId);
    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử bảo trì thiết bị thành công',
      data: records,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử bảo trì thiết bị',
    });
  }
};

/**
 * Cập nhật thông tin phiếu bảo trì / sửa chữa hoặc nghiệm thu hoàn tất
 * PUT /api/maintenances/:id
 */
const updateMaintenance = async (req, res) => {
  try {
    const updated = await maintenanceService.updateMaintenance(req.params.id, req.body);

    if (req.setAuditDetails) {
      const isCompleted = req.body.status === 'COMPLETED';
      req.setAuditDetails(
        `${isCompleted ? 'Nghiệm thu hoàn tất' : 'Cập nhật thông tin'} phiếu bảo trì/sửa chữa "${updated.title}" cho thiết bị [${updated.equipment?.code || 'N/A'}]${isCompleted ? ' (Thiết bị đã chuyển về trạng thái Sẵn sàng)' : ''}`,
        'UPDATE',
        'EQUIPMENT_MAINTENANCE',
        updated.id
      );
    }

    return res.status(200).json({
      success: true,
      message: req.body.status === 'COMPLETED' ? 'Nghiệm thu hoàn tất bảo trì / sửa chữa thành công' : 'Cập nhật phiếu bảo trì thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật phiếu bảo trì',
    });
  }
};

/**
 * Xóa một phiếu bảo trì / sửa chữa
 * DELETE /api/maintenances/:id
 */
const deleteMaintenance = async (req, res) => {
  try {
    await maintenanceService.deleteMaintenance(req.params.id);

    if (req.setAuditDetails) {
      req.setAuditDetails(
        `Xóa phiếu bảo trì / sửa chữa khỏi hệ thống (ID: #${req.params.id})`,
        'DELETE',
        'EQUIPMENT_MAINTENANCE',
        req.params.id
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa phiếu bảo trì / sửa chữa thành công',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa phiếu bảo trì',
    });
  }
};

/**
 * Thống kê tổng quan hoạt động bảo trì, sửa chữa, báo mất và thanh lý
 * GET /api/maintenances/stats
 */
const getMaintenanceStats = async (req, res) => {
  try {
    const stats = await maintenanceService.getMaintenanceStats();
    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê bảo trì thiết bị thành công',
      data: stats,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy thống kê bảo trì',
    });
  }
};

module.exports = {
  createMaintenance,
  getMaintenances,
  getMaintenanceById,
  getMaintenancesByEquipment,
  updateMaintenance,
  deleteMaintenance,
  getMaintenanceStats,
};
