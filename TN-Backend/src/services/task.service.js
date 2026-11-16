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
const notificationService = require('./notification.service');

// Thông tin người dùng cơ bản khi join
const USER_ATTRIBUTES = ['id', 'fullName', 'email', 'employeeCode', 'avatarUrl', 'phone', 'role'];

/**
 * Kiểm tra xem loại công việc có thuộc các nhóm yêu cầu / hiển thị Địa điểm thực hiện:
 * 1. Chụp ảnh (Chụp & xử lý hình sự kiện, ...)
 * 2. Quay phim, quay video (Quay phim, Quay highlight, Quay clip TikTok, ...)
 * 3. Diễn viên
 * 4. Khác
 *
 * @param {string} taskType
 * @returns {boolean}
 */
const requiresLocation = (taskType) => {
  if (!taskType) return false;
  const t = String(taskType).trim().toLowerCase();
  if (t.startsWith('chụp') || t.includes('chụp ảnh')) return true;
  if (t.startsWith('quay') || t.includes('quay phim') || t.includes('quay video')) return true;
  if (t === 'diễn viên' || t.includes('diễn viên')) return true;
  if (t === 'khác' || t.includes('khác')) return true;
  return false;
};

/**
 * Tự động xác định hệ số thù lao cho công việc sự vụ theo quy định BPTT LHU Media:
 * - Công việc kỹ thuật chụp ảnh/quay phim sự kiện sau 16:30 từ thứ Hai đến thứ Bảy: hệ số 1.5x.
 * - Công việc kỹ thuật sự kiện vào Chủ nhật: hệ số 2.0x.
 * - Nếu vừa là Chủ nhật vừa thuộc khung giờ ngoài giờ: chỉ áp dụng 2.0x, không cộng dồn hệ số.
 * - Các trường hợp còn lại áp dụng hệ số thông thường 1.0x.
 *
 * @param {object} taskInfo - { taskType, otherTaskType, title, executionDate, shiftSession, actualHours, note }
 * @returns {{ isSunday: boolean, isOvertime: boolean, overtimeHours: number, multiplier: number }}
 */
const evaluateTaskRateMultiplier = (taskInfo = {}) => {
  const { taskType, otherTaskType, title, executionDate, shiftSession, actualHours, note } = taskInfo;
  const hours = parseFloat(actualHours) || 0;

  // 1. Kiểm tra loại công việc có phải kỹ thuật chụp ảnh / quay phim sự kiện không
  const text = `${taskType || ''} ${otherTaskType || ''} ${title || ''}`.toLowerCase();
  const techKeywords = [
    'chụp', 'quay', 'ảnh', 'hình', 'phim', 'clip', 'video', 'highlight', 'tiktok', 'dựng', 'livestream', 'kỹ thuật', 'camera'
  ];
  const isTechnicalEvent = techKeywords.some((kw) => text.includes(kw));

  // 2. Xác định ngày thực hiện có phải Chủ nhật không
  let isSunday = false;
  if (executionDate) {
    const dateStr = String(executionDate).trim().slice(0, 10);
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      isSunday = dt.getDay() === 0;
    }
  }

  // 3. Xác định khung giờ sau 16:30 từ Thứ Hai đến Thứ Bảy:
  // Buổi Tối ('T') là ca tối sau 16:30 (17:30 - 21:30), hoặc ghi chú nêu rõ sau 16:30/ngoài giờ/làm tối
  const isAfter1630 =
    shiftSession === 'T' ||
    Boolean(note && /(sau 16:30|16h30|ngoài giờ|buổi tối|làm tối)/i.test(note));

  // 4. Áp dụng quy tắc hệ số:
  // - Nếu là Chủ nhật và là công việc kỹ thuật sự kiện: hệ số 2.0x (nếu vừa là Chủ nhật vừa ngoài giờ: chỉ 2.0x, không cộng dồn)
  if (isSunday && isTechnicalEvent) {
    return {
      isSunday: true,
      isOvertime: false,
      overtimeHours: 0,
      multiplier: 2.0,
    };
  }

  // - Nếu từ thứ Hai đến thứ Bảy và là công việc kỹ thuật sự kiện sau 16:30: hệ số 1.5x
  if (!isSunday && isTechnicalEvent && isAfter1630) {
    return {
      isSunday: false,
      isOvertime: true,
      overtimeHours: hours,
      multiplier: 1.5,
    };
  }

  // - Các trường hợp còn lại: hệ số thông thường 1.0x
  return {
    isSunday: false,
    isOvertime: false,
    overtimeHours: 0,
    multiplier: 1.0,
  };
};

/**
 * Tạo công việc mới do Nhân sự giao cho CTV
 *
 * @param {object} data - { title, description, assignedToUserId, deadline, taskType, otherTaskType }
 * @param {object} currentUser - Người thực hiện (phải là ADMIN)
 * @returns {Promise<Task>}
 */
const createTask = async (data, currentUser) => {
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Chỉ Nhân sự (ADMIN) mới có quyền giao nhiệm vụ cho CTV');
  }

  const {
    title,
    description,
    assignedToUserId,
    deadline,
    startTime,
    taskType,
    otherTaskType,
    executionDate,
    actualHours,
    shiftSession,
    note,
    campus,
    room,
    location,
    isOvertime,
    overtimeHours,
    isSunday,
  } = data;

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

  // Phân định trường thời gian theo nhóm công việc:
  // - Nhóm Chụp ảnh, Quay phim/video, Diễn viên, Khác: Sử dụng Thời gian bắt đầu (startTime)
  // - Các nhóm khác: Sử dụng Thời hạn hoàn thành (deadline)
  let formattedStartTime = null;
  let formattedDeadline = null;

  if (requiresLocation(taskType)) {
    const rawTime = startTime || deadline;
    if (rawTime) {
      const d = new Date(rawTime);
      if (isNaN(d.getTime())) {
        throw new Error('Thời gian bắt đầu không hợp lệ');
      }
      formattedStartTime = d;
    }
  } else {
    const rawDeadline = deadline || startTime;
    if (rawDeadline) {
      const d = new Date(rawDeadline);
      if (isNaN(d.getTime())) {
        throw new Error('Hạn chót hoàn thành không hợp lệ');
      }
      formattedDeadline = d;
    }
  }

  // Tự động gán executionDate từ startTime theo múi giờ Việt Nam (UTC+7) nếu chưa có
  let finalExecutionDate = executionDate || null;
  if (!finalExecutionDate && formattedStartTime) {
    finalExecutionDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(formattedStartTime);
  }

  let finalOtherTaskType = null;
  if (taskType === 'Khác') {
    if (!otherTaskType || !otherTaskType.trim()) {
      throw new Error('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác');
    }
    finalOtherTaskType = otherTaskType.trim();
  }

  // Xử lý thông tin địa điểm theo quy tắc nhóm công việc:
  // Chỉ áp dụng khi thuộc các nhóm: Chụp ảnh; Quay phim, video; Diễn viên; Khác
  let finalCampus = null;
  let finalRoom = null;
  let finalLocation = null;

  if (requiresLocation(taskType)) {
    finalCampus = campus && typeof campus === 'string' && campus.trim() ? campus.trim() : null;
    finalRoom = room && typeof room === 'string' && room.trim() ? room.trim() : null;
    if (finalCampus && finalRoom) {
      finalLocation = `${finalCampus} - ${finalRoom}`;
    } else if (finalCampus) {
      finalLocation = finalCampus;
    } else if (finalRoom) {
      finalLocation = finalRoom;
    } else if (location && typeof location === 'string' && location.trim()) {
      finalLocation = location.trim();
    }
  }

  const task = await Task.create({
    title: title.trim(),
    description: description ? description.trim() : null,
    assignedToUserId,
    createdByUserId: currentUser.id,
    startTime: formattedStartTime,
    deadline: formattedDeadline,
    status: 'NOT_STARTED',
    isExternal: false,
    taskType: taskType ? taskType.trim() : null,
    otherTaskType: finalOtherTaskType,
    executionDate: finalExecutionDate,
    actualHours: actualHours ? parseFloat(actualHours) : 0,
    shiftSession: shiftSession || null,
    note: note ? note.trim() : (finalLocation || null),
    campus: finalCampus,
    room: finalRoom,
    location: finalLocation,
    isOvertime: false, // CTV tuyệt đối không được tự chọn hoặc can thiệp hệ số thù lao
    overtimeHours: 0,
    isSunday: false,
  });

  // Gửi thông báo in-app và email giao việc cho CTV (FR-07)
  notificationService
    .createNotification({
      userId: assignedToUserId,
      userEmail: assignee.email,
      title: '📋 Bạn được giao nhiệm vụ mới',
      message: `Nhân sự Studio vừa giao nhiệm vụ "${title.trim()}" cho bạn${
        formattedDeadline ? `. Hạn chót: ${new Date(formattedDeadline).toLocaleDateString('vi-VN')}` : ''
      }.`,
      type: 'TASK_ASSIGNED',
      link: '/tasks',
      sendEmail: true,
      detailRows: [
        { label: 'Tên nhiệm vụ', value: title.trim() },
        { label: 'Loại công việc', value: taskType === 'Khác' ? `Khác (${finalOtherTaskType})` : (taskType || 'Mặc định') },
        { label: 'Hạn hoàn thành', value: formattedDeadline ? new Date(formattedDeadline).toLocaleString('vi-VN') : 'Không giới hạn' },
        { label: 'Người giao', value: currentUser.fullName || 'Nhân sự Studio' },
      ],
    })
    .catch(() => {});

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
  const {
    title,
    description,
    resultLink,
    proofFile,
    deadline,
    taskType,
    otherTaskType,
    executionDate,
    actualHours,
    shiftSession,
    note,
    isOvertime,
    overtimeHours,
    isSunday,
  } = data;

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

  const payrollService = require('./payroll.service');
  const cleanExecutionDate = payrollService.normalizeExecutionDate(executionDate);

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
    executionDate: cleanExecutionDate,
    actualHours: actualHours ? parseFloat(actualHours) : 0,
    shiftSession: shiftSession || 'S',
    note: note ? note.trim() : null,
    isOvertime: false, // CTV tuyệt đối không được tự chọn hoặc can thiệp hệ số thù lao
    overtimeHours: 0,
    isSunday: false,
  });

  // Ghi chú nghiệp vụ: Khi CTV khai báo việc ngoài hệ thống, nhiệm vụ lưu ở trạng thái PENDING_APPROVAL.
  // Tuyệt đối KHÔNG ghi nhận chấm công hoặc tính giờ thù lao trước khi Nhân sự nghiệm thu chính thức!

  // Thông báo in-app cho Nhân sự (Admin) biết có CTV khai báo việc ngoài hệ thống (FR-07)
  notificationService
    .notifyAdmins({
      title: `📝 CTV ${currentUser.fullName} khai báo việc ngoài hệ thống`,
      message: `Cộng tác viên ${currentUser.fullName} vừa khai báo công việc ngoài hệ thống: "${title.trim()}". Vui lòng kiểm tra và nghiệm thu.`,
      type: 'TASK_SUBMITTED',
      link: '/admin/tasks',
      sendEmail: false,
      detailRows: [
        { label: 'Nhiệm vụ', value: title.trim() },
        { label: 'CTV thực hiện', value: currentUser.fullName },
        { label: 'Loại việc', value: taskType === 'Khác' ? `Khác (${finalOtherTaskType})` : (taskType || 'Ngoài hệ thống') },
        { label: 'Số giờ thực tế', value: `${actualHours || 0} giờ` },
      ],
    })
    .catch(() => {});

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
        { location: { [Op.like]: keyword } },
        { note: { [Op.like]: keyword } },
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

    // Gửi thông báo in-app cho Nhân sự (Admin) biết CTV đã nộp kết quả duyệt (FR-07)
    notificationService
      .notifyAdmins({
        title: `📬 CTV ${currentUser.fullName} nộp kết quả công việc`,
        message: `Cộng tác viên ${currentUser.fullName} đã hoàn thành và nộp kết quả cho nhiệm vụ "${task.title}". Vui lòng kiểm tra và nghiệm thu.`,
        type: 'TASK_SUBMITTED',
        link: '/admin/tasks',
        sendEmail: false,
        detailRows: [
          { label: 'Nhiệm vụ', value: task.title },
          { label: 'CTV nộp bài', value: currentUser.fullName },
          { label: 'Link kết quả', value: finalResultLink || 'Đính kèm file minh chứng' },
        ],
      })
      .catch(() => {});
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
    if (data.actualHours !== undefined) {
      task.actualHours = parseFloat(data.actualHours) || 0;
    }
    if (data.executionDate) {
      task.executionDate = data.executionDate;
    } else if (!task.executionDate) {
      task.executionDate = task.completedAt.toISOString().slice(0, 10);
    }
    if (data.shiftSession) {
      task.shiftSession = data.shiftSession;
    }
    if (data.note) {
      task.note = data.note.trim();
    }

    // Tự động kiểm tra thời gian và loại công việc để gán hệ số theo quy định BPTT LHU Media:
    // - Kỹ thuật sự kiện sau 16:30 T2-T7: hệ số 1.5x
    // - Kỹ thuật sự kiện Chủ nhật: hệ số 2.0x (không cộng dồn)
    // - Các trường hợp còn lại: hệ số 1.0x
    const rateInfo = evaluateTaskRateMultiplier({
      taskType: task.taskType,
      otherTaskType: task.otherTaskType,
      title: task.title,
      executionDate: task.executionDate,
      shiftSession: task.shiftSession,
      actualHours: task.actualHours,
      note: task.note,
    });
    task.isSunday = rateInfo.isSunday;
    task.isOvertime = rateInfo.isOvertime;
    task.overtimeHours = rateInfo.overtimeHours;

    // Gửi thông báo in-app và email nghiệm thu hoàn thành cho CTV (FR-07)
    notificationService
      .createNotification({
        userId: task.assignedToUserId,
        title: '🎉 Công việc đã được nghiệm thu hoàn thành',
        message: `Nhiệm vụ "${task.title}" của bạn đã được Nhân sự Studio nghiệm thu đạt yêu cầu và ghi nhận vào bảng thống kê công việc${
          data.actualHours ? ` (${data.actualHours} giờ)` : ''
        }.`,
        type: 'TASK_COMPLETED',
        link: '/tasks',
        sendEmail: true,
        detailRows: [
          { label: 'Nhiệm vụ', value: task.title },
          { label: 'Thời gian hoàn thành', value: new Date().toLocaleString('vi-VN') },
          { label: 'Số giờ công tính', value: `${data.actualHours !== undefined ? data.actualHours : task.actualHours || 0} giờ` },
          { label: 'Trạng thái', value: 'HOÀN THÀNH (COMPLETED)' },
        ],
      })
      .catch(() => {});
  } else if (decision === 'REVISION_REQUESTED') {
    if (!feedback || !feedback.trim()) {
      throw new Error('Vui lòng nhập nội dung phản hồi / yêu cầu cần chỉnh sửa cho CTV');
    }
    task.status = 'REVISION_REQUESTED';
    task.feedback = feedback.trim();
    task.isSunday = false;
    task.isOvertime = false;
    task.overtimeHours = 0;

    // Gửi thông báo in-app và email yêu cầu chỉnh sửa cho CTV (FR-07)
    notificationService
      .createNotification({
        userId: task.assignedToUserId,
        title: '⚠️ Yêu cầu chỉnh sửa sản phẩm nhiệm vụ',
        message: `Nhân sự Studio yêu cầu chỉnh sửa nhiệm vụ "${task.title}". Lý do: ${feedback.trim()}`,
        type: 'TASK_REVISION_REQUESTED',
        link: '/tasks',
        sendEmail: true,
        detailRows: [
          { label: 'Nhiệm vụ', value: task.title },
          { label: 'Yêu cầu sửa đổi', value: feedback.trim() },
          { label: 'Người đánh giá', value: currentUser.fullName || 'Nhân sự Studio' },
        ],
      })
      .catch(() => {});
  } else {
    throw new Error("Quyết định đánh giá không hợp lệ. Chỉ chấp nhận 'COMPLETED' hoặc 'REVISION_REQUESTED'");
  }

  await task.save();

  // Tự động đồng bộ sang Bảng chấm công và AttendanceRecords:
  // - Nếu COMPLETED: ghi nhận SV và giờ thực tế
  // - Nếu REVISION_REQUESTED: loại bỏ khỏi bảng chấm công (hoàn trả LV nếu có ca trực)
  try {
    const payrollService = require('./payroll.service');
    const taskDate = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
    await payrollService.syncTaskAttendanceToDatabase(task.assignedToUserId, taskDate);
  } catch (syncErr) {
    console.error('Lỗi tự động đồng bộ Task sang AttendanceRecord:', syncErr);
  }

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

  // Nếu công việc đã nghiệm thu hoàn thành: Không cho chuyển người phụ trách khác nhưng cho phép Nhân sự điều chỉnh ngày, giờ hoặc loại việc
  if (task.status === 'COMPLETED' && data.assignedToUserId && data.assignedToUserId !== task.assignedToUserId) {
    throw new Error('Không thể thay đổi người phụ trách của công việc đã nghiệm thu hoàn thành');
  }

  const { title, description, taskType, otherTaskType, assignedToUserId, deadline, startTime } = data;

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

  // Xử lý thời gian (startTime / deadline) theo nhóm công việc:
  // - Nhóm Chụp ảnh, Quay phim/video, Diễn viên, Khác: Sử dụng Thời gian bắt đầu (startTime)
  // - Các nhóm khác: Sử dụng Thời hạn hoàn thành (deadline)
  const isMediaTask = requiresLocation(task.taskType);
  if (isMediaTask) {
    if (startTime !== undefined || deadline !== undefined) {
      const raw = startTime !== undefined ? startTime : deadline;
      if (raw) {
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
          throw new Error('Thời gian bắt đầu không hợp lệ');
        }
        task.startTime = d;
        task.deadline = null;
        if (!task.executionDate) {
          task.executionDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
        }
      } else {
        task.startTime = null;
      }
    }
  } else {
    if (deadline !== undefined || startTime !== undefined) {
      const raw = deadline !== undefined ? deadline : startTime;
      if (raw) {
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
          throw new Error('Hạn chót hoàn thành không hợp lệ');
        }
        task.deadline = d;
        task.startTime = null;
      } else {
        task.deadline = null;
      }
    }
  }

  if (data.executionDate !== undefined) {
    task.executionDate = data.executionDate || null;
  }
  if (data.actualHours !== undefined) {
    task.actualHours = parseFloat(data.actualHours) || 0;
  }
  if (data.shiftSession !== undefined) {
    task.shiftSession = data.shiftSession || null;
  }
  if (data.note !== undefined) {
    task.note = data.note ? data.note.trim() : null;
  }

  // Xử lý cập nhật địa điểm thực hiện (campus, room, location) theo loại công việc:
  // - Nếu chuyển sang nhóm không yêu cầu địa điểm: tự động reset/xóa để không gắn nhầm dữ liệu cũ.
  // - Nếu thuộc nhóm yêu cầu địa điểm: cập nhật theo dữ liệu mới.
  const updatedTaskType = task.taskType;
  if (!requiresLocation(updatedTaskType)) {
    task.campus = null;
    task.room = null;
    task.location = null;
  } else {
    let hasLocationChange = false;
    if (data.campus !== undefined) {
      task.campus = data.campus && typeof data.campus === 'string' && data.campus.trim() ? data.campus.trim() : null;
      hasLocationChange = true;
    }
    if (data.room !== undefined) {
      task.room = data.room && typeof data.room === 'string' && data.room.trim() ? data.room.trim() : null;
      hasLocationChange = true;
    }
    if (hasLocationChange) {
      if (task.campus && task.room) {
        task.location = `${task.campus} - ${task.room}`;
      } else if (task.campus) {
        task.location = task.campus;
      } else if (task.room) {
        task.location = task.room;
      } else {
        task.location = null;
      }
    } else if (data.location !== undefined) {
      task.location = data.location && typeof data.location === 'string' && data.location.trim() ? data.location.trim() : null;
    }
  }

  // Nếu công việc đã COMPLETED: tự động tính lại hệ số nếu có thay đổi ngày, giờ hoặc loại việc
  if (task.status === 'COMPLETED') {
    const rateInfo = evaluateTaskRateMultiplier({
      taskType: task.taskType,
      otherTaskType: task.otherTaskType,
      title: task.title,
      executionDate: task.executionDate,
      shiftSession: task.shiftSession,
      actualHours: task.actualHours,
      note: task.note,
    });
    task.isSunday = rateInfo.isSunday;
    task.isOvertime = rateInfo.isOvertime;
    task.overtimeHours = rateInfo.overtimeHours;
  } else if (data.isOvertime !== undefined || data.isSunday !== undefined) {
    if (data.isOvertime !== undefined) {
      task.isOvertime = data.isOvertime === true || data.isOvertime === 'true';
    }
    if (data.overtimeHours !== undefined) {
      task.overtimeHours = parseFloat(data.overtimeHours) || 0;
    }
    if (data.isSunday !== undefined) {
      task.isSunday = data.isSunday === true || data.isSunday === 'true';
    }
  }

  await task.save();

  // Tự động đồng bộ sang Bảng chấm công và AttendanceRecords:
  // - Nếu COMPLETED: ghi nhận SV và giờ thực tế
  // - Nếu REVISION_REQUESTED: loại bỏ khỏi bảng chấm công (hoàn trả LV nếu có ca trực)
  try {
    const payrollService = require('./payroll.service');
    const taskDate = task.executionDate || (task.completedAt ? task.completedAt.toISOString().slice(0, 10) : task.createdAt.toISOString().slice(0, 10));
    await payrollService.syncTaskAttendanceToDatabase(task.assignedToUserId, taskDate);
  } catch (syncErr) {
    console.error('Lỗi tự động đồng bộ Task sang AttendanceRecord:', syncErr);
  }

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
  evaluateTaskRateMultiplier,
  requiresLocation,
  updateTask,
  findAll,
  findById,
  updateProgress,
  reviewTask,
  deleteTask,
  getStats,
};
