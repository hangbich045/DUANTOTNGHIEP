'use strict';

/**
 * @file services/task.service.js
 * @description Service xử lý logic nghiệp vụ Quản lý công việc (FR-04).
 *
 * Căn cứ theo QUY_TAC.md Mục 5 & Mục 7:
 * - Nhân sự giao việc cho CTV, thiết lập hạn hoàn thành (deadline).
 * - CTV cập nhật tiến độ, nộp link sản phẩm và upload file minh chứng.
 * - Nhân sự nghiệm thu hoàn thành (COMPLETED) hoặc yêu cầu chỉnh sửa (REVISION_REQUESTED).
 * - CTV tự khai báo công việc phát sinh ngoài hệ thống (isExternal = true).
 * - Chỉ công việc hoàn thành được Nhân sự xác nhận mới đủ điều kiện tính thù lao.
 */

const { Op } = require('sequelize');
const { Task, User } = require('../models');

// Thông tin người dùng cơ bản khi join
const USER_ATTRIBUTES = ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'phone', 'role'];

/**
 * Tạo công việc mới do Nhân sự giao cho CTV
 *
 * @param {object} data - { title, description, assignedToUserId, deadline, taskType, otherTaskType }
 * @param {object} currentUser - Người thực hiện (phải là ADMIN)
 * @returns {Promise<Task>}
 */
const createTask = async (data, currentUser) => {
  const { title, description, assignedToUserId, deadline, taskType, otherTaskType } = data;

  if (!title || !title.trim()) {
    throw new Error('Tiêu đề công việc không được để trống');
  }

  if (!assignedToUserId) {
    throw new Error('Vui lòng chọn Cộng tác viên (CTV) được phân công');
  }

  // Xác minh người nhận việc có tồn tại trong hệ thống không
  const assignee = await User.findByPk(assignedToUserId);
  if (!assignee) {
    throw new Error('Không tìm thấy thông tin CTV được phân công');
  }

  // CTV phải có vai trò COLLABORATOR (hoặc ADMIN)
  if (assignee.role !== 'COLLABORATOR' && assignee.role !== 'ADMIN') {
    throw new Error('Chỉ có thể phân công công việc cho Cộng tác viên (COLLABORATOR)');
  }

  let formattedDeadline = null;
  if (deadline) {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) {
      throw new Error('Hạn chót hoàn thành không hợp lệ');
    }
    formattedDeadline = d;
  }

  let finalOtherTaskType = null;
  if (taskType === 'Khác') {
    if (!otherTaskType || !otherTaskType.trim()) {
      throw new Error('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác');
    }
    finalOtherTaskType = otherTaskType.trim();
  }

  const task = await Task.create({
    title: title.trim(),
    description: description ? description.trim() : null,
    assignedToUserId,
    createdByUserId: currentUser.id,
    deadline: formattedDeadline,
    status: 'NOT_STARTED',
    isExternal: false,
    taskType: taskType ? taskType.trim() : null,
    otherTaskType: finalOtherTaskType,
  });

  return findById(task.id, currentUser);
};

/**
 * CTV tự khai báo công việc phát sinh ngoài hệ thống
 *
 * @param {object} data - { title, description, resultLink, proofFile, deadline, taskType, otherTaskType }
 * @param {object} currentUser - CTV đang đăng nhập
 * @returns {Promise<Task>}
 */
const createExternalTask = async (data, currentUser) => {
  const { title, description, resultLink, proofFile, deadline, taskType, otherTaskType } = data;

  if (!title || !title.trim()) {
    throw new Error('Tiêu đề công việc phát sinh không được để trống');
  }

  if (!resultLink && !proofFile) {
    throw new Error('Vui lòng cung cấp link sản phẩm hoặc file minh chứng cho công việc ngoài hệ thống');
  }

  let formattedDeadline = null;
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) {
      formattedDeadline = d;
    }
  }

  let finalOtherTaskType = null;
  if (taskType === 'Khác') {
    if (otherTaskType && otherTaskType.trim()) {
      finalOtherTaskType = otherTaskType.trim();
    }
  }

  const task = await Task.create({
    title: title.trim(),
    description: description ? description.trim() : null,
    assignedToUserId: currentUser.id,
    createdByUserId: currentUser.id,
    deadline: formattedDeadline || new Date(),
    status: 'PENDING_APPROVAL', // Mặc định chờ Nhân sự xác minh theo Quy tắc 5.10
    resultLink: resultLink ? resultLink.trim() : null,
    proofFile: proofFile ? proofFile.trim() : null,
    isExternal: true,
    taskType: taskType ? taskType.trim() : null,
    otherTaskType: finalOtherTaskType,
  });

  return findById(task.id, currentUser);
};

/**
 * Lấy danh sách công việc có phân quyền và bộ lọc
 * - ADMIN: Xem tất cả công việc
 * - COLLABORATOR: Chỉ xem công việc được phân công hoặc do mình khai báo
 * - USER: Không có quyền truy cập
 *
 * @param {object} query - { page, limit, status, assignedToUserId, isExternal, search }
 * @param {object} currentUser - Người dùng thực hiện request
 * @returns {Promise<{ items: Task[], total: number, page: number, totalPages: number }>}
 */
const findAll = async (query = {}, currentUser) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = {};

  // Phân quyền dữ liệu
  if (currentUser.role === 'COLLABORATOR') {
    // CTV chỉ xem công việc giao cho mình hoặc do mình tạo
    where[Op.or] = [
      { assignedToUserId: currentUser.id },
      { createdByUserId: currentUser.id },
    ];
  } else if (currentUser.role !== 'ADMIN') {
    // Người dùng bình thường không tham gia phân hệ Task
    return { items: [], total: 0, page, totalPages: 0 };
  }

  // Bộ lọc theo trạng thái
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  // Bộ lọc theo Loại công việc (taskType)
  if (query.taskType && query.taskType !== 'ALL') {
    where.taskType = query.taskType;
  }

  // [ADMIN] Lọc theo CTV cụ thể
  if (currentUser.role === 'ADMIN' && query.assignedToUserId) {
    where.assignedToUserId = query.assignedToUserId;
  }

  // Lọc theo loại công việc (nội bộ vs ngoài hệ thống)
  if (query.isExternal !== undefined && query.isExternal !== '') {
    where.isExternal = query.isExternal === 'true' || query.isExternal === true;
  }

  // Tìm kiếm theo từ khóa
  if (query.search && query.search.trim()) {
    const keyword = `%${query.search.trim()}%`;
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push({
      [Op.or]: [
        { title: { [Op.like]: keyword } },
        { description: { [Op.like]: keyword } },
      ],
    });
  }

  const { count, rows } = await Task.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ['createdAt', 'DESC'],
    ],
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: USER_ATTRIBUTES,
      },
      {
        model: User,
        as: 'creator',
        attributes: USER_ATTRIBUTES,
      },
    ],
    distinct: true,
  });

  return {
    items: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit) || 1,
  };
};

/**
 * Lấy chi tiết một công việc theo ID
 *
 * @param {string} id - UUID của Task
 * @param {object} currentUser - Người dùng đang request
 * @returns {Promise<Task>}
 */
const findById = async (id, currentUser) => {
  const task = await Task.findByPk(id, {
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: USER_ATTRIBUTES,
      },
      {
        model: User,
        as: 'creator',
        attributes: USER_ATTRIBUTES,
      },
    ],
  });

  if (!task) {
    throw new Error('Không tìm thấy công việc yêu cầu');
  }

  // Kiểm tra phân quyền truy cập
  if (currentUser.role === 'COLLABORATOR') {
    if (task.assignedToUserId !== currentUser.id && task.createdByUserId !== currentUser.id) {
      throw new Error('Bạn không có quyền xem thông tin công việc này');
    }
  }

  return task;
};

/**
 * CTV cập nhật tiến độ công việc hoặc nộp bài duyệt
 *
 * @param {string} id - UUID của Task
 * @param {object} data - { status, resultLink, proofFile }
 * @param {object} currentUser - CTV được phân công
 * @returns {Promise<Task>}
 */
const updateProgress = async (id, data, currentUser) => {
  const task = await findById(id, currentUser);

  // Chỉ CTV được phân công (hoặc Admin) mới được cập nhật tiến độ
  if (currentUser.role === 'COLLABORATOR' && task.assignedToUserId !== currentUser.id) {
    throw new Error('Bạn chỉ có thể cập nhật tiến độ cho công việc được phân công cho mình');
  }

  // Không cho cập nhật nếu công việc đã hoàn thành
  if (task.status === 'COMPLETED') {
    throw new Error('Công việc đã được nghiệm thu hoàn thành, không thể chỉnh sửa thêm');
  }

  const { status, resultLink, proofFile } = data;

  // Luồng 1: CTV bắt đầu thực hiện (NOT_STARTED -> IN_PROGRESS hoặc REVISION_REQUESTED -> IN_PROGRESS)
  if (status === 'IN_PROGRESS') {
    if (!['NOT_STARTED', 'REVISION_REQUESTED', 'IN_PROGRESS'].includes(task.status)) {
      throw new Error(`Không thể chuyển sang Đang thực hiện từ trạng thái '${task.status}'`);
    }
    task.status = 'IN_PROGRESS';
  }

  // Luồng 2: CTV nộp duyệt kết quả (-> PENDING_APPROVAL)
  if (status === 'PENDING_APPROVAL') {
    if (task.status !== 'IN_PROGRESS' && task.status !== 'REVISION_REQUESTED') {
      throw new Error('Chỉ có thể nộp duyệt khi công việc đang ở trạng thái Đang thực hiện');
    }

    const finalResultLink = (resultLink !== undefined ? resultLink : task.resultLink)?.trim();
    const finalProofFile = (proofFile !== undefined ? proofFile : task.proofFile)?.trim();

    if (!finalResultLink && !finalProofFile) {
      throw new Error('Vui lòng cung cấp đường dẫn kết quả sản phẩm hoặc tải lên file minh chứng để nộp duyệt');
    }

    task.status = 'PENDING_APPROVAL';
    task.resultLink = finalResultLink || null;
    task.proofFile = finalProofFile || null;
  }

  // Cập nhật các trường kết quả nếu có gửi kèm khi đang làm
  if (resultLink !== undefined && status !== 'PENDING_APPROVAL') {
    task.resultLink = resultLink ? resultLink.trim() : null;
  }
  if (proofFile !== undefined && status !== 'PENDING_APPROVAL') {
    task.proofFile = proofFile ? proofFile.trim() : null;
  }

  await task.save();
  return findById(task.id, currentUser);
};

/**
 * Nhân sự kiểm tra kết quả: Nghiệm thu (COMPLETED) hoặc Yêu cầu sửa (REVISION_REQUESTED)
 *
 * @param {string} id - UUID của Task
 * @param {object} data - { decision: 'COMPLETED' | 'REVISION_REQUESTED', feedback }
 * @param {object} currentUser - Admin thực hiện
 * @returns {Promise<Task>}
 */
const reviewTask = async (id, data, currentUser) => {
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Chỉ Nhân sự (ADMIN) mới có quyền kiểm tra và nghiệm thu công việc');
  }

  const task = await findById(id, currentUser);

  // Chỉ xem xét duyệt khi task đang ở trạng thái PENDING_APPROVAL
  if (task.status !== 'PENDING_APPROVAL') {
    throw new Error(`Chỉ có thể đánh giá công việc khi đang ở trạng thái 'Chờ duyệt' (PENDING_APPROVAL). Trạng thái hiện tại: '${task.status}'`);
  }

  const { decision, feedback } = data;

  if (decision === 'COMPLETED') {
    task.status = 'COMPLETED';
    task.completedAt = new Date(); // Ghi nhận thời điểm hoàn thành để phục vụ tính lương FR-05
    if (feedback) {
      task.feedback = feedback.trim();
    }
  } else if (decision === 'REVISION_REQUESTED') {
    if (!feedback || !feedback.trim()) {
      throw new Error('Vui lòng nhập nội dung phản hồi / yêu cầu cần chỉnh sửa cho CTV');
    }
    task.status = 'REVISION_REQUESTED';
    task.feedback = feedback.trim();
  } else {
    throw new Error("Quyết định đánh giá không hợp lệ. Chỉ chấp nhận 'COMPLETED' hoặc 'REVISION_REQUESTED'");
  }

  await task.save();
  return findById(task.id, currentUser);
};

/**
 * [ADMIN] Chỉnh sửa thông tin nhiệm vụ (tiêu đề, mô tả, loại việc, CTV phụ trách, deadline)
 *
 * @param {string} id - UUID của Task
 * @param {object} data - { title, description, taskType, otherTaskType, assignedToUserId, deadline }
 * @param {object} currentUser - Admin thực hiện
 * @returns {Promise<Task>}
 */
const updateTask = async (id, data, currentUser) => {
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Chỉ Nhân sự (ADMIN) mới có quyền chỉnh sửa thông tin nhiệm vụ');
  }

  const task = await findById(id, currentUser);

  // Không cho chỉnh sửa thông tin nếu đã nghiệm thu hoàn thành
  if (task.status === 'COMPLETED') {
    throw new Error('Công việc đã được nghiệm thu hoàn thành, không thể thay đổi thông tin phân công');
  }

  const { title, description, taskType, otherTaskType, assignedToUserId, deadline } = data;

  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Tiêu đề công việc không được để trống');
    }
    task.title = title.trim();
  }

  if (description !== undefined) {
    task.description = description ? description.trim() : null;
  }

  if (assignedToUserId !== undefined) {
    const assignee = await User.findByPk(assignedToUserId);
    if (!assignee) {
      throw new Error('Không tìm thấy thông tin CTV được phân công');
    }
    if (assignee.role !== 'COLLABORATOR' && assignee.role !== 'ADMIN') {
      throw new Error('Chỉ có thể phân công công việc cho Cộng tác viên (COLLABORATOR)');
    }
    task.assignedToUserId = assignedToUserId;
  }

  if (deadline !== undefined) {
    if (deadline) {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) {
        throw new Error('Hạn chót hoàn thành không hợp lệ');
      }
      task.deadline = d;
    } else {
      task.deadline = null;
    }
  }

  if (taskType !== undefined) {
    task.taskType = taskType ? taskType.trim() : null;
    if (taskType === 'Khác') {
      if (!otherTaskType || !otherTaskType.trim()) {
        throw new Error('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác');
      }
      task.otherTaskType = otherTaskType.trim();
    } else {
      task.otherTaskType = null;
    }
  } else if (otherTaskType !== undefined && task.taskType === 'Khác') {
    task.otherTaskType = otherTaskType ? otherTaskType.trim() : null;
  }

  await task.save();
  return findById(task.id, currentUser);
};

/**
 * Xóa một công việc (Chỉ dành cho Admin và không xóa công việc đã hoàn thành)
 *
 * @param {string} id - UUID của Task
 * @param {object} currentUser - Admin thực hiện
 * @returns {Promise<boolean>}
 */
const deleteTask = async (id, currentUser) => {
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Chỉ Nhân sự (ADMIN) mới có quyền xóa công việc');
  }

  const task = await findById(id, currentUser);

  if (task.status === 'COMPLETED') {
    throw new Error('Không thể xóa công việc đã hoàn thành để bảo toàn lịch sử và dữ liệu tính lương');
  }

  await task.destroy();
  return true;
};

/**
 * Thống kê tổng quan công việc
 *
 * @param {object} currentUser - Người dùng hiện tại
 * @returns {Promise<object>}
 */
const getStats = async (currentUser) => {
  const where = {};
  if (currentUser.role === 'COLLABORATOR') {
    where[Op.or] = [
      { assignedToUserId: currentUser.id },
      { createdByUserId: currentUser.id },
    ];
  } else if (currentUser.role !== 'ADMIN') {
    return {
      total: 0,
      notStarted: 0,
      inProgress: 0,
      pendingApproval: 0,
      revisionRequested: 0,
      completed: 0,
      externalTasks: 0,
    };
  }

  const [
    total,
    notStarted,
    inProgress,
    pendingApproval,
    revisionRequested,
    completed,
    externalTasks,
  ] = await Promise.all([
    Task.count({ where }),
    Task.count({ where: { ...where, status: 'NOT_STARTED' } }),
    Task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    Task.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
    Task.count({ where: { ...where, status: 'REVISION_REQUESTED' } }),
    Task.count({ where: { ...where, status: 'COMPLETED' } }),
    Task.count({ where: { ...where, isExternal: true } }),
  ]);

  return {
    total,
    notStarted,
    inProgress,
    pendingApproval,
    revisionRequested,
    completed,
    externalTasks,
  };
};

module.exports = {
  createTask,
  createExternalTask,
  updateTask,
  findAll,
  findById,
  updateProgress,
  reviewTask,
  deleteTask,
  getStats,
};
