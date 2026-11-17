'use strict';

/**
 * @file services/maintenance.service.js
 * @description Service xử lý nghiệp vụ Quản lý bảo trì, sửa chữa theo hóa đơn chứng từ, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3).
 */

const { Op } = require('sequelize');
const { EquipmentMaintenance, Equipment, EquipmentCategory, User } = require('../models');

/**
 * Tạo mới phiếu bảo trì / sửa chữa / báo mất / thanh lý thiết bị
 *
 * @param {object} payload
 * @param {string} performedBy
 * @returns {Promise<EquipmentMaintenance>}
 */
const createMaintenance = async (payload, performedBy = null) => {
  const {
    equipmentId,
    type = 'MAINTENANCE',
    title,
    description = null,
    startDate = new Date().toISOString().split('T')[0],
    endDate = null,
    status = 'IN_PROGRESS',
    cost = 0,
    invoiceNumber = null,
    invoiceDate = null,
    invoiceUrl = null,
    serviceProvider = null,
    notes = null,
  } = payload;

  if (!equipmentId) {
    const error = new Error('Vui lòng chọn thiết bị');
    error.statusCode = 400;
    throw error;
  }

  if (!title || title.trim().length < 3) {
    const error = new Error('Tiêu đề phiếu phải có ít nhất 3 ký tự');
    error.statusCode = 400;
    throw error;
  }

  const validTypes = ['MAINTENANCE', 'REPAIR', 'LOST', 'DISPOSAL'];
  if (!validTypes.includes(type)) {
    const error = new Error('Loại ghi nhận không hợp lệ. Cho phép: MAINTENANCE, REPAIR, LOST, DISPOSAL');
    error.statusCode = 400;
    throw error;
  }

  const equipment = await Equipment.findByPk(equipmentId);
  if (!equipment) {
    const error = new Error('Không tìm thấy thiết bị');
    error.statusCode = 404;
    throw error;
  }

  // Tự động đồng bộ trạng thái thiết bị theo nghiệp vụ (QUY_TAC.md 2.1 - 2.4)
  if (type === 'MAINTENANCE' || type === 'REPAIR') {
    if (status === 'IN_PROGRESS') {
      equipment.status = 'MAINTENANCE';
      await equipment.save();
    }
  } else if (type === 'LOST') {
    equipment.status = 'LOST';
    await equipment.save();
  } else if (type === 'DISPOSAL') {
    equipment.status = 'DISPOSED';
    await equipment.save();
  }

  const maintenance = await EquipmentMaintenance.create({
    equipmentId,
    type,
    title: title.trim(),
    description: description ? description.trim() : null,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: status === 'COMPLETED' ? (endDate || new Date().toISOString().split('T')[0]) : endDate,
    status: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status) ? status : 'IN_PROGRESS',
    cost: parseFloat(cost) || 0,
    invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
    invoiceDate: invoiceDate || null,
    invoiceUrl: invoiceUrl || null,
    serviceProvider: serviceProvider ? serviceProvider.trim() : null,
    performedBy,
    notes: notes ? notes.trim() : null,
  });

  return getMaintenanceById(maintenance.id);
};

/**
 * Tra cứu danh sách lịch sử bảo trì, sửa chữa, báo mất, thanh lý
 *
 * @param {object} query
 * @returns {Promise<{ items: EquipmentMaintenance[], pagination: object }>}
 */
const getMaintenances = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    equipmentId,
    type,
    status,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const where = {};

  if (equipmentId && equipmentId !== 'ALL') {
    where.equipmentId = equipmentId;
  }

  if (type && type !== 'ALL') {
    where.type = type;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (startDate || endDate) {
    where.startDate = {};
    if (startDate) where.startDate[Op.gte] = startDate;
    if (endDate) where.startDate[Op.lte] = endDate;
  }

  // Tìm kiếm theo tiêu đề, số hóa đơn, đơn vị sửa chữa hoặc tên/mã thiết bị
  if (search && search.trim() !== '') {
    const keyword = `%${search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: keyword } },
      { invoiceNumber: { [Op.like]: keyword } },
      { serviceProvider: { [Op.like]: keyword } },
      { description: { [Op.like]: keyword } },
      { '$equipment.name$': { [Op.like]: keyword } },
      { '$equipment.code$': { [Op.like]: keyword } },
    ];
  }

  const validSortColumns = ['createdAt', 'startDate', 'endDate', 'cost', 'status', 'type'];
  const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const actualSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await EquipmentMaintenance.findAndCountAll({
    where,
    include: [
      {
        model: Equipment,
        as: 'equipment',
        attributes: ['id', 'name', 'code', 'status', 'imageUrl', 'location', 'quantity', 'availableQuantity'],
        include: [
          {
            model: EquipmentCategory,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email', 'role', 'avatarUrl'],
      },
    ],
    order: [[actualSortBy, actualSortOrder]],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    items: rows,
    pagination: {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

/**
 * Lấy chi tiết phiếu bảo trì theo ID
 *
 * @param {string} id
 * @returns {Promise<EquipmentMaintenance>}
 */
const getMaintenanceById = async (id) => {
  const maintenance = await EquipmentMaintenance.findByPk(id, {
    include: [
      {
        model: Equipment,
        as: 'equipment',
        attributes: ['id', 'name', 'code', 'status', 'imageUrl', 'location', 'quantity', 'availableQuantity'],
        include: [
          {
            model: EquipmentCategory,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email', 'role', 'avatarUrl'],
      },
    ],
  });

  if (!maintenance) {
    const error = new Error('Không tìm thấy phiếu bảo trì / sửa chữa');
    error.statusCode = 404;
    throw error;
  }

  return maintenance;
};

/**
 * Lấy toàn bộ lịch sử bảo trì / sửa chữa của 1 thiết bị cụ thể
 *
 * @param {string} equipmentId
 * @returns {Promise<EquipmentMaintenance[]>}
 */
const getMaintenancesByEquipment = async (equipmentId) => {
  return EquipmentMaintenance.findAll({
    where: { equipmentId },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email', 'role'],
      },
    ],
    order: [['startDate', 'DESC'], ['createdAt', 'DESC']],
  });
};

/**
 * Cập nhật phiếu bảo trì / sửa chữa / báo mất / thanh lý
 *
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<EquipmentMaintenance>}
 */
const updateMaintenance = async (id, payload) => {
  const maintenance = await EquipmentMaintenance.findByPk(id);
  if (!maintenance) {
    const error = new Error('Không tìm thấy phiếu bảo trì / sửa chữa');
    error.statusCode = 404;
    throw error;
  }

  const {
    title,
    description,
    startDate,
    endDate,
    status,
    cost,
    invoiceNumber,
    invoiceDate,
    invoiceUrl,
    serviceProvider,
    notes,
  } = payload;

  const oldStatus = maintenance.status;
  const newStatus = status || oldStatus;

  if (title !== undefined) maintenance.title = title.trim();
  if (description !== undefined) maintenance.description = description;
  if (startDate !== undefined) maintenance.startDate = startDate;
  if (endDate !== undefined) maintenance.endDate = endDate;
  if (cost !== undefined) maintenance.cost = parseFloat(cost) || 0;
  if (invoiceNumber !== undefined) maintenance.invoiceNumber = invoiceNumber ? invoiceNumber.trim() : null;
  if (invoiceDate !== undefined) maintenance.invoiceDate = invoiceDate;
  if (invoiceUrl !== undefined) maintenance.invoiceUrl = invoiceUrl;
  if (serviceProvider !== undefined) maintenance.serviceProvider = serviceProvider ? serviceProvider.trim() : null;
  if (notes !== undefined) maintenance.notes = notes;
  if (status !== undefined) maintenance.status = status;

  // Xử lý khi nghiệm thu sửa chữa / bảo trì hoàn tất (status -> COMPLETED)
  if (oldStatus !== 'COMPLETED' && newStatus === 'COMPLETED') {
    if (!maintenance.endDate) {
      maintenance.endDate = new Date().toISOString().split('T')[0];
    }

    // Nếu là bảo trì hoặc sửa chữa: đưa thiết bị về trạng thái AVAILABLE
    if (maintenance.type === 'MAINTENANCE' || maintenance.type === 'REPAIR') {
      const equipment = await Equipment.findByPk(maintenance.equipmentId);
      if (equipment && equipment.status === 'MAINTENANCE') {
        equipment.status = 'AVAILABLE';
        await equipment.save();
      }
    }
  }

  await maintenance.save();
  return getMaintenanceById(id);
};

/**
 * Xóa một phiếu bảo trì / sửa chữa
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
const deleteMaintenance = async (id) => {
  const maintenance = await EquipmentMaintenance.findByPk(id);
  if (!maintenance) {
    const error = new Error('Không tìm thấy phiếu bảo trì / sửa chữa');
    error.statusCode = 404;
    throw error;
  }

  // Nếu phiếu đang xử lý bảo trì/sửa chữa và thiết bị đang ở MAINTENANCE, hoàn lại AVAILABLE khi hủy/xóa phiếu
  if (maintenance.status === 'IN_PROGRESS' && (maintenance.type === 'MAINTENANCE' || maintenance.type === 'REPAIR')) {
    const equipment = await Equipment.findByPk(maintenance.equipmentId);
    if (equipment && equipment.status === 'MAINTENANCE') {
      equipment.status = 'AVAILABLE';
      await equipment.save();
    }
  }

  await maintenance.destroy();
  return true;
};

/**
 * Thống kê tổng quan hoạt động bảo trì, sửa chữa, báo mất và thanh lý
 *
 * @returns {Promise<object>}
 */
const getMaintenanceStats = async () => {
  const total = await EquipmentMaintenance.count();
  const inProgressCount = await EquipmentMaintenance.count({ where: { status: 'IN_PROGRESS' } });
  const completedCount = await EquipmentMaintenance.count({ where: { status: 'COMPLETED' } });
  const cancelledCount = await EquipmentMaintenance.count({ where: { status: 'CANCELLED' } });

  const maintenanceCount = await EquipmentMaintenance.count({ where: { type: 'MAINTENANCE' } });
  const repairCount = await EquipmentMaintenance.count({ where: { type: 'REPAIR' } });
  const lostCount = await EquipmentMaintenance.count({ where: { type: 'LOST' } });
  const disposalCount = await EquipmentMaintenance.count({ where: { type: 'DISPOSAL' } });

  // Tính tổng chi phí (chỉ tính các phiếu hợp lệ, không tính phiếu đã hủy)
  const validRecords = await EquipmentMaintenance.findAll({
    where: {
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['cost'],
  });

  const totalCost = validRecords.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);

  // Số thiết bị hiện tại đang ở trạng thái MAINTENANCE trong CSDL
  const equipmentInMaintenance = await Equipment.count({ where: { status: 'MAINTENANCE' } });
  const equipmentLost = await Equipment.count({ where: { status: 'LOST' } });
  const equipmentDisposed = await Equipment.count({ where: { status: 'DISPOSED' } });

  return {
    total,
    inProgressCount,
    completedCount,
    cancelledCount,
    totalCost,
    byType: {
      maintenance: maintenanceCount,
      repair: repairCount,
      lost: lostCount,
      disposal: disposalCount,
    },
    equipmentStatusCounts: {
      inMaintenance: equipmentInMaintenance,
      lost: equipmentLost,
      disposed: equipmentDisposed,
    },
  };
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
