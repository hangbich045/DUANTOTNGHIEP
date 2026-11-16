'use strict';

/**
 * @file services/borrowRequest.service.js
 * @description Service xử lý Business Logic cho Đơn mượn thiết bị.
 *
 * Đây là service phức tạp nhất vì cần đảm bảo tính nhất quán dữ liệu:
 * Khi duyệt đơn -> cập nhật availableQuantity của Equipment
 * Khi trả thiết bị -> trả lại availableQuantity
 * Tất cả phải trong cùng 1 Transaction để tránh lỗi giữa chừng.
 *
 * ========================================
 * SEQUELIZE TRANSACTION:
 * ========================================
 * sequelize.transaction(async (t) => { ... })
 * - t là transaction object
 * - Mọi query dùng { transaction: t } sẽ nằm trong cùng transaction
 * - Nếu có lỗi throw -> Tự động ROLLBACK
 * - Nếu không có lỗi -> Tự động COMMIT
 * - Đảm bảo ACID: Không xảy ra tình huống đơn được duyệt nhưng equipment không cập nhật
 */

const { Op } = require('sequelize');
const { sequelize, BorrowRequest, Equipment, User, EquipmentCategory } = require('../models');
const notificationService = require('./notification.service');

/**
 * Lấy danh sách đơn mượn có Tìm kiếm, Lọc, Phân trang
 * Tự động cập nhật các đơn HANDED_OVER đã quá returnDate thành OVERDUE
 * @param {Object} query - { page, limit, status, userId, equipmentId, search }
 * @param {Object} currentUser - User đang đăng nhập { id, role }
 */
const findAll = async (query, currentUser) => {
  // Tự động quét và cập nhật trạng thái OVERDUE cho các đơn đã bàn giao nhưng quá hạn trả
  try {
    await BorrowRequest.update(
      { status: 'OVERDUE' },
      {
        where: {
          status: 'HANDED_OVER',
          returnDate: { [Op.lt]: new Date() },
        },
      }
    );
  } catch (err) {
    // Không block luồng đọc nếu lỗi quét background
    console.error('Error updating overdue borrow requests:', err);
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  const where = {};

  // RBAC: USER & COLLABORATOR chỉ xem được đơn của mình, ADMIN xem được tất cả
  if (currentUser.role !== 'ADMIN') {
    where.userId = currentUser.id;
  } else if (query.userId) {
    // Admin có thể lọc theo user cụ thể
    where.userId = query.userId;
  }

  // Lọc theo trạng thái
  if (query.status) {
    where.status = query.status;
  }

  // Lọc theo thiết bị
  if (query.equipmentId) {
    where.equipmentId = query.equipmentId;
  }

  const { count, rows } = await BorrowRequest.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'fullName', 'email', 'employeeCode'],
      },
      {
        model: Equipment,
        as: 'equipment',
        attributes: ['id', 'code', 'name', 'imageUrl'],
        include: [{ model: EquipmentCategory, as: 'category', attributes: ['name'] }],
      },
    ],
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Tạo đơn mượn mới
 * @param {Object} data - { equipmentId, quantity, purpose, borrowDate, returnDate, notes }
 * @param {string} userId - ID của người tạo đơn
 */
const create = async (data, userId) => {
  const equipment = await Equipment.findByPk(data.equipmentId);

  if (!equipment) {
    const error = new Error('Thiết bị không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  if (equipment.status === 'MAINTENANCE') {
    const error = new Error('Thiết bị đang trong quá trình bảo trì, không thể mượn.');
    error.statusCode = 400;
    throw error;
  }

  if (equipment.availableQuantity < data.quantity) {
    const error = new Error(
      `Không đủ thiết bị. Hiện chỉ còn ${equipment.availableQuantity} thiết bị khả dụng.`
    );
    error.statusCode = 400;
    throw error;
  }

  const borrowRequest = await BorrowRequest.create({
    ...data,
    userId,
    status: 'PENDING',
  });

  // Thông báo in-app cho Admin biết có đơn mượn thiết bị mới (FR-07)
  notificationService
    .notifyAdmins({
      title: '📦 Yêu cầu mượn thiết bị mới',
      message: `Có yêu cầu mượn ${data.quantity} thiết bị "${equipment.name}" (${equipment.code}). Vui lòng xem xét duyệt đơn.`,
      type: 'BORROW_REQUEST_CREATED',
      link: '/admin/requests',
      sendEmail: false,
      detailRows: [
        { label: 'Thiết bị', value: `${equipment.name} (${equipment.code})` },
        { label: 'Số lượng', value: `${data.quantity} cái` },
        { label: 'Mục đích mượn', value: data.purpose || 'Không ghi chú' },
        { label: 'Hạn mượn', value: `Từ ${new Date(data.borrowDate).toLocaleDateString('vi-VN')} đến ${new Date(data.returnDate).toLocaleDateString('vi-VN')}` },
      ],
    })
    .catch(() => {});

  return BorrowRequest.findByPk(borrowRequest.id, {
    include: [
      { model: Equipment, as: 'equipment', attributes: ['id', 'code', 'name'] },
    ],
  });
};

/**
 * [ADMIN] Duyệt/Từ chối đơn mượn
 * Sử dụng Transaction để đảm bảo tính nhất quán dữ liệu.
 *
 * @param {string} requestId - ID của đơn mượn
 * @param {string} action - 'approve' hoặc 'reject'
 * @param {string} [rejectionReason] - Lý do từ chối (nếu action = reject)
 */
const processRequest = async (requestId, action, rejectionReason = null) => {
  // Bắt đầu Transaction - toàn bộ thao tác phải thành công hoặc cùng fail
  const result = await sequelize.transaction(async (t) => {
    // Lấy đơn mượn kèm lock (LOCK IN SHARE MODE) để tránh race condition
    const request = await BorrowRequest.findByPk(requestId, {
      include: [{ model: Equipment, as: 'equipment' }],
      transaction: t,
      lock: t.LOCK.UPDATE, // Lock row để tránh 2 admin cùng duyệt 1 lúc
    });

    if (!request) {
      const error = new Error('Đơn mượn không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    if (request.status !== 'PENDING') {
      const error = new Error(`Đơn mượn đã ở trạng thái "${request.status}", không thể xử lý lại.`);
      error.statusCode = 400;
      throw error;
    }

    if (action === 'approve') {
      // Kiểm tra lại số lượng khả dụng (có thể đã thay đổi từ lúc tạo đơn)
      if (request.equipment.availableQuantity < request.quantity) {
        const error = new Error('Không còn đủ thiết bị để duyệt đơn này.');
        error.statusCode = 400;
        throw error;
      }

      // Cập nhật đơn mượn -> APPROVED
      await request.update({ status: 'APPROVED' }, { transaction: t });

      // Cập nhật số lượng khả dụng của thiết bị (giữ chỗ)
      // Theo TC-02: Duyệt đơn chỉ trừ số lượng khả dụng, CHƯA chuyển trạng thái thiết bị sang BORROWED
      const newAvailable = request.equipment.availableQuantity - request.quantity;
      await Equipment.update(
        {
          availableQuantity: newAvailable,
        },
        { where: { id: request.equipmentId }, transaction: t }
      );
    } else if (action === 'reject') {
      // Cập nhật đơn mượn -> REJECTED với lý do
      await request.update(
        { status: 'REJECTED', rejectionReason },
        { transaction: t }
      );
    } else {
      const error = new Error('Action không hợp lệ. Chỉ chấp nhận "approve" hoặc "reject".');
      error.statusCode = 400;
      throw error;
    }

    return request; // Transaction tự COMMIT nếu không có lỗi
  });

  // Gửi thông báo in-app và email kết quả duyệt đơn mượn cho người dùng (FR-07)
  if (action === 'approve') {
    notificationService
      .createNotification({
        userId: result.userId,
        title: '✅ Đơn mượn thiết bị đã được phê duyệt',
        message: `Đơn mượn thiết bị "${result.equipment?.name || 'thiết bị'}" (${result.quantity} cái) của bạn đã được phê duyệt. Vui lòng đến Studio để nhận bàn giao.`,
        type: 'BORROW_REQUEST_APPROVED',
        link: '/profile',
        sendEmail: true,
        detailRows: [
          { label: 'Thiết bị', value: `${result.equipment?.name || ''} (${result.equipment?.code || ''})` },
          { label: 'Số lượng duyệt', value: `${result.quantity} cái` },
          { label: 'Thời gian mượn', value: `Từ ${new Date(result.borrowDate).toLocaleDateString('vi-VN')} đến ${new Date(result.returnDate).toLocaleDateString('vi-VN')}` },
          { label: 'Trạng thái', value: 'ĐÃ DUYỆT (Chờ nhận thiết bị)' },
        ],
      })
      .catch(() => {});
  } else if (action === 'reject') {
    notificationService
      .createNotification({
        userId: result.userId,
        title: '❌ Đơn mượn thiết bị không được duyệt',
        message: `Đơn mượn thiết bị "${result.equipment?.name || 'thiết bị'}" của bạn đã bị từ chối.${rejectionReason ? ` Lý do: ${rejectionReason}` : ''}`,
        type: 'BORROW_REQUEST_REJECTED',
        link: '/profile',
        sendEmail: true,
        detailRows: [
          { label: 'Thiết bị', value: `${result.equipment?.name || ''} (${result.equipment?.code || ''})` },
          { label: 'Lý do từ chối', value: rejectionReason || 'Không có lý do chi tiết' },
          { label: 'Trạng thái', value: 'BỊ TỪ CHỐI' },
        ],
      })
      .catch(() => {});
  }

  return result;
};

/**
 * [ADMIN] Bàn giao thiết bị cho người mượn
 * Chuyển trạng thái đơn từ APPROVED -> HANDED_OVER, ghi nhận thời điểm và tình trạng thiết bị lúc bàn giao.
 *
 * @param {string} requestId - ID của đơn mượn
 * @param {string} currentUserId - ID người thực hiện
 * @param {string} currentUserRole - Vai trò (phải là ADMIN)
 * @param {Object} [handoverData] - { handoverCondition, adminNote }
 */
const handoverEquipment = async (requestId, currentUserId, currentUserRole, handoverData = {}) => {
  return await sequelize.transaction(async (t) => {
    const request = await BorrowRequest.findByPk(requestId, {
      include: [{ model: Equipment, as: 'equipment' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      const error = new Error('Đơn mượn không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    if (currentUserRole !== 'ADMIN') {
      const error = new Error('Chỉ Quản trị viên (ADMIN) mới có quyền bàn giao thiết bị.');
      error.statusCode = 403;
      throw error;
    }

    if (request.status !== 'APPROVED') {
      const error = new Error(
        `Chỉ có thể bàn giao thiết bị cho đơn đã được duyệt (APPROVED). Trạng thái hiện tại: "${request.status}".`
      );
      error.statusCode = 400;
      throw error;
    }

    // Cập nhật trạng thái đơn sang HANDED_OVER
    await request.update(
      {
        status: 'HANDED_OVER',
        handedOverAt: new Date(),
        handoverCondition: handoverData.handoverCondition || 'Thiết bị hoạt động bình thường, đầy đủ phụ kiện bàn giao.',
        adminNote: handoverData.adminNote !== undefined ? handoverData.adminNote : request.adminNote,
      },
      { transaction: t }
    );

    // Cập nhật trạng thái thiết bị nếu số lượng khả dụng còn lại = 0
    if (request.equipment && request.equipment.availableQuantity === 0) {
      await Equipment.update(
        { status: 'BORROWED' },
        { where: { id: request.equipmentId }, transaction: t }
      );
    }

    return request;
  });

  // Gửi thông báo in-app và email bàn giao thiết bị cho người mượn (FR-07)
  notificationService
    .createNotification({
      userId: result.userId,
      title: '🤝 Thiết bị đã được bàn giao thành công',
      message: `Bạn đã nhận bàn giao ${result.quantity} thiết bị "${result.equipment?.name || 'thiết bị'}". Vui lòng bảo quản cẩn thận và hoàn trả trước hạn: ${new Date(result.returnDate).toLocaleDateString('vi-VN')}.`,
      type: 'EQUIPMENT_HANDED_OVER',
      link: '/profile',
      sendEmail: true,
      detailRows: [
        { label: 'Thiết bị', value: `${result.equipment?.name || ''} (${result.equipment?.code || ''})` },
        { label: 'Số lượng nhận', value: `${result.quantity} cái` },
        { label: 'Tình trạng bàn giao', value: result.handoverCondition || 'Bình thường' },
        { label: 'Hạn hoàn trả', value: new Date(result.returnDate).toLocaleDateString('vi-VN') },
      ],
    })
    .catch(() => {});

  return result;
};

/**
 * Xác nhận trả thiết bị
 * Chấp nhận hoàn trả từ các trạng thái: HANDED_OVER, OVERDUE, hoặc APPROVED (đơn cũ).
 * Nếu thiết bị hư hỏng (isDamaged = true) -> cập nhật trạng thái thiết bị thành MAINTENANCE theo Quy tắc nghiệp vụ Mục 3.9 & 3.10.
 *
 * @param {string} requestId
 * @param {string} currentUserId - Dùng để kiểm tra quyền (user chỉ trả đơn của mình)
 * @param {string} currentUserRole
 * @param {Object} [returnData] - { returnCondition, adminNote, isDamaged }
 */
const returnEquipment = async (requestId, currentUserId, currentUserRole, returnData = {}) => {
  const result = await sequelize.transaction(async (t) => {
    const request = await BorrowRequest.findByPk(requestId, {
      include: [{ model: Equipment, as: 'equipment' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      const error = new Error('Đơn mượn không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền: Chỉ ADMIN hoặc chính chủ mới được trả đơn
    if (currentUserRole !== 'ADMIN' && request.userId !== currentUserId) {
      const error = new Error('Bạn không có quyền trả đơn này.');
      error.statusCode = 403;
      throw error;
    }

    const validStatuses = ['HANDED_OVER', 'OVERDUE', 'APPROVED'];
    if (!validStatuses.includes(request.status)) {
      const error = new Error(
        `Chỉ có thể trả thiết bị cho đơn đang mượn (HANDED_OVER, OVERDUE hoặc APPROVED). Trạng thái hiện tại: "${request.status}".`
      );
      error.statusCode = 400;
      throw error;
    }

    // Cập nhật đơn -> RETURNED, ghi nhận ngày trả thực tế và tình trạng thu hồi
    await request.update(
      {
        status: 'RETURNED',
        actualReturnDate: new Date(),
        returnCondition: returnData.returnCondition || 'Đã nhận trả thiết bị đầy đủ.',
        adminNote: returnData.adminNote !== undefined ? returnData.adminNote : request.adminNote,
      },
      { transaction: t }
    );

    // Trả lại số lượng khả dụng cho thiết bị
    const newAvailable = request.equipment.availableQuantity + request.quantity;
    const isDamaged = Boolean(returnData.isDamaged);

    await Equipment.update(
      {
        availableQuantity: newAvailable,
        // Nếu có hư hại khi trả, chuyển trạng thái thiết bị sang MAINTENANCE
        status: isDamaged ? 'MAINTENANCE' : (newAvailable > 0 ? 'AVAILABLE' : 'BORROWED'),
      },
      { where: { id: request.equipmentId }, transaction: t }
    );

    return request;
  });

  // Gửi thông báo in-app và email xác nhận trả máy cho người mượn (FR-07)
  notificationService
    .createNotification({
      userId: result.userId,
      title: '📦 Xác nhận hoàn trả thiết bị thành công',
      message: `Đơn mượn thiết bị "${result.equipment?.name || 'thiết bị'}" của bạn đã hoàn tất thủ tục trả máy và kiểm tra thiết bị.`,
      type: 'EQUIPMENT_RETURNED',
      link: '/profile',
      sendEmail: true,
      detailRows: [
        { label: 'Thiết bị', value: `${result.equipment?.name || ''} (${result.equipment?.code || ''})` },
        { label: 'Tình trạng khi trả', value: result.returnCondition || 'Đã kiểm tra đầy đủ' },
        { label: 'Ngày hoàn trả', value: new Date().toLocaleDateString('vi-VN') },
        { label: 'Trạng thái', value: 'ĐÃ HOÀN TRẢ (RETURNED)' },
      ],
    })
    .catch(() => {});

  return result;
};

module.exports = { findAll, create, processRequest, handoverEquipment, returnEquipment };
