'use strict';

/**
 * @file services/auditLog.service.js
 * @description Service xử lý nghiệp vụ Lịch sử thao tác (Audit Logs - FR-09).
 */

const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

// Danh sách các từ khóa dữ liệu nhạy cảm tuyệt đối không được ghi vào Log (QUY_TAC.md 11.4)
const SENSITIVE_PATTERNS = ['password', 'token', 'otp', 'secret', 'authorization', 'bearer', 'cookie'];

const isSensitiveKey = (key) => {
  const k = String(key).toLowerCase();
  return SENSITIVE_PATTERNS.some((pat) => k.includes(pat));
};

/**
 * Loại bỏ hoặc che mờ các trường nhạy cảm trong dữ liệu details
 *
 * @param {any} data
 * @returns {any}
 */
const sanitizeDetails = (data) => {
  if (!data) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeDetails);
  }
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      clean[key] = '[PROTECTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Trích xuất địa chỉ IP client sạch từ request
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  let ip =
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return ip;
};

/**
 * Chuyển đổi thông tin thao tác và payload thành mô tả văn bản tiếng Việt tự nhiên, dễ hiểu cho người dùng.
 * Tuyệt đối không lưu mã JSON hay chuỗi kỹ thuật thô vào CSDL.
 *
 * @param {object} params
 * @param {string} params.action
 * @param {string} params.resource
 * @param {string|null} params.resourceId
 * @param {any} params.details
 * @param {string} [params.status='SUCCESS']
 * @returns {string}
 */
const formatAuditDescription = ({ action, resource, resourceId, details, status = 'SUCCESS' }) => {
  // 1. Nếu details đã là một chuỗi văn bản thuần (không phải JSON string)
  if (typeof details === 'string' && details.trim()) {
    const trimmed = details.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return trimmed;
    }
    // Nếu là JSON string, parse để trích xuất thông tin
    try {
      details = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  // 2. Chuẩn hóa payload từ object (hỗ trợ cả cấu trúc từ middleware hoặc gọi trực tiếp)
  let body = {};
  let query = {};
  let params = {};
  let statusCode = null;

  if (details && typeof details === 'object') {
    if (details.body && typeof details.body === 'object') {
      body = details.body;
      query = details.query || {};
      params = details.params || {};
      statusCode = details.statusCode || null;
    } else {
      body = details;
    }
  }

  const act = String(action || 'UNKNOWN').toUpperCase();
  const res = String(resource || 'SYSTEM').toUpperCase();
  const isFailed = status === 'FAILED' || (statusCode && statusCode >= 400);

  const ROLE_MAP = {
    ADMIN: 'Quản trị viên (ADMIN)',
    COLLABORATOR: 'Cộng tác viên (COLLABORATOR)',
    USER: 'Người dùng (USER)',
  };

  let desc = '';

  // --- Phân hệ 1: Người dùng & Xác thực (USER) ---
  if (res === 'USER') {
    const email = body.email || body.username || query.email || '';
    const fullName = body.fullName || body.name || body.userName || '';
    const role = body.role || query.role || '';
    const reason = body.actionReason || body.reason || details.metadata?.actionReason || '';

    switch (act) {
      case 'LOGIN':
        desc = isFailed
          ? `Đăng nhập hệ thống thất bại${email ? ` (Tài khoản: ${email})` : ''}`
          : `Đăng nhập hệ thống thành công${email ? ` (Tài khoản: ${email})` : ''}`;
        break;
      case 'REGISTER':
        desc = `Đăng ký tài khoản người dùng mới${fullName ? `: "${fullName}"` : ''}${email ? ` (${email})` : ''}`;
        break;
      case 'RESET_PASSWORD':
        desc = `Đặt lại mật khẩu cho tài khoản người dùng${email ? ` (${email})` : ''}`;
        break;
      case 'VERIFY_ACCOUNT':
        desc = `Xác thực email và kích hoạt tài khoản người dùng thành công`;
        break;
      case 'ASSIGN_ROLE': {
        const roleLabel = ROLE_MAP[role] || (role ? `vai trò ${role}` : 'vai trò mới');
        const target = fullName || email ? ` cho ${fullName || email}` : (resourceId ? ` (ID: #${resourceId})` : '');
        desc = `Cấp quyền / Thay đổi vai trò tài khoản${target}: Chuyển sang ${roleLabel}${reason ? `. Lý do: ${reason}` : ''}`;
        break;
      }
      case 'TOGGLE_STATUS': {
        const isActive = body.isActive !== undefined ? body.isActive : true;
        const target = fullName || email ? ` ${fullName || email}` : (resourceId ? ` (ID: #${resourceId})` : '');
        desc = `${isActive ? 'Mở khóa / Kích hoạt' : 'Khóa'} tài khoản người dùng${target}`;
        break;
      }
      case 'DELETE':
        desc = `Xóa tài khoản người dùng khỏi hệ thống${fullName ? `: "${fullName}"` : ''} (ID: #${resourceId || 'N/A'})`;
        break;
      case 'UPDATE':
        desc = `Cập nhật thông tin tài khoản người dùng${fullName ? `: "${fullName}"` : ''} (ID: #${resourceId || 'N/A'})`;
        break;
      case 'CREATE':
        desc = `Thêm mới tài khoản người dùng${fullName ? `: "${fullName}"` : ''}${email ? ` (${email})` : ''}`;
        break;
      default:
        desc = `Thao tác ${act} trên tài khoản người dùng (ID: #${resourceId || 'N/A'})`;
    }
  }

  // --- Phân hệ 2: Thiết bị Studio (EQUIPMENT) ---
  else if (res === 'EQUIPMENT') {
    const name = body.name || body.equipmentName || '';
    const code = body.code || '';
    const quantity = body.quantity;
    const location = body.location || '';
    const condition = body.condition || body.status || '';

    switch (act) {
      case 'CREATE': {
        const parts = [];
        if (code) parts.push(`Mã: ${code}`);
        if (quantity !== undefined && quantity !== null) parts.push(`Số lượng: ${quantity}`);
        if (location) parts.push(`Vị trí: ${location}`);
        if (condition) parts.push(`Tình trạng: ${condition}`);
        desc = `Thêm mới thiết bị: "${name || 'Thiết bị mới'}"${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`;
        break;
      }
      case 'UPDATE': {
        const parts = [];
        if (code) parts.push(`Mã: ${code}`);
        if (quantity !== undefined && quantity !== null) parts.push(`Số lượng: ${quantity}`);
        if (location) parts.push(`Vị trí: ${location}`);
        if (condition) parts.push(`Tình trạng: ${condition}`);
        desc = `Cập nhật thông tin thiết bị${name ? `: "${name}"` : ''}${parts.length > 0 ? ` (${parts.join(', ')})` : ''} (ID: #${resourceId || 'N/A'})`;
        break;
      }
      case 'DELETE':
        desc = `Xóa thiết bị khỏi hệ thống (ID: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên thiết bị Studio (ID: #${resourceId || 'N/A'})`;
    }
  }

  // --- Phân hệ 3: Danh mục thiết bị (CATEGORY) ---
  else if (res === 'CATEGORY') {
    const name = body.name || body.categoryName || '';
    switch (act) {
      case 'CREATE':
        desc = `Thêm mới danh mục thiết bị: "${name || 'Danh mục mới'}"`;
        break;
      case 'UPDATE':
        desc = `Cập nhật danh mục thiết bị${name ? `: "${name}"` : ''} (ID: #${resourceId || 'N/A'})`;
        break;
      case 'DELETE':
        desc = `Xóa danh mục thiết bị (ID: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên danh mục thiết bị (ID: #${resourceId || 'N/A'})`;
    }
  }

  // --- Phân hệ 4: Yêu cầu mượn thiết bị (BORROW_REQUEST) ---
  else if (res === 'BORROW_REQUEST') {
    const purpose = body.purpose || body.reason || '';
    const borrowDate = body.borrowDate || '';
    const returnDate = body.expectedReturnDate || body.returnDate || '';
    const note = body.approvalNotes || body.rejectionReason || body.note || body.handoverNotes || body.returnNotes || '';

    switch (act) {
      case 'CREATE':
        desc = `Tạo yêu cầu mượn thiết bị${purpose ? `: "${purpose}"` : ''}${borrowDate ? ` (Ngày mượn: ${borrowDate}${returnDate ? ` - Hạn trả: ${returnDate}` : ''})` : ''}`;
        break;
      case 'APPROVE':
        desc = `Phê duyệt yêu cầu mượn thiết bị #${resourceId || 'N/A'}${note ? ` (Ghi chú duyệt: ${note})` : ''}`;
        break;
      case 'REJECT':
        desc = `Từ chối yêu cầu mượn thiết bị #${resourceId || 'N/A'}${note ? ` (Lý do từ chối: ${note})` : ''}`;
        break;
      case 'HANDOVER':
        desc = `Bàn giao thiết bị cho người mượn (Mã đơn: #${resourceId || 'N/A'})${note ? ` (Tình trạng thiết bị: ${note})` : ''}`;
        break;
      case 'RETURN':
        desc = `Xác nhận hoàn trả thiết bị vào kho (Mã đơn: #${resourceId || 'N/A'})${note ? ` (Tình trạng khi trả: ${note})` : ''}`;
        break;
      case 'DELETE':
        desc = `Hủy / Xóa yêu cầu mượn thiết bị #${resourceId || 'N/A'}`;
        break;
      case 'UPDATE':
        desc = `Cập nhật thông tin yêu cầu mượn thiết bị #${resourceId || 'N/A'}`;
        break;
      default:
        desc = `Thao tác ${act} trên yêu cầu mượn thiết bị #${resourceId || 'N/A'}`;
    }
  }

  // --- Phân hệ 5: Đặt phòng Studio (STUDIO_BOOKING) ---
  else if (res === 'STUDIO_BOOKING') {
    const purpose = body.purpose || '';
    const date = body.bookingDate || body.date || '';
    const shift = body.shift || '';
    const room = body.studioRoom || body.room || '';
    const note = body.note || body.reason || body.rejectionReason || '';

    switch (act) {
      case 'CREATE': {
        const parts = [];
        if (date) parts.push(`Ngày: ${date}`);
        if (shift) parts.push(`Buổi: ${shift}`);
        if (room) parts.push(`Phòng: ${room}`);
        desc = `Tạo đơn đặt phòng Studio${purpose ? `: "${purpose}"` : ''}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`;
        break;
      }
      case 'APPROVE':
        desc = `Phê duyệt đơn đặt phòng Studio #${resourceId || 'N/A'}${note ? ` (Ghi chú: ${note})` : ''}`;
        break;
      case 'REJECT':
        desc = `Từ chối đơn đặt phòng Studio #${resourceId || 'N/A'}${note ? ` (Lý do: ${note})` : ''}`;
        break;
      case 'CANCEL':
        desc = `Hủy đơn đặt phòng Studio #${resourceId || 'N/A'}${note ? ` (Lý do: ${note})` : ''}`;
        break;
      case 'RESCHEDULE': {
        const reason = body.rescheduleReason || body.reason || '';
        desc = `Dời lịch đơn đặt phòng Studio #${resourceId || 'N/A'}${reason ? ` (Lý do: ${reason})` : ''}`;
        break;
      }
      case 'CHECK_IN':
        desc = `Người dùng xác nhận đã đến Studio theo lịch (Mã đơn: #${resourceId || 'N/A'})`;
        break;
      case 'CONFIRM_USAGE':
        desc = `Quản trị viên xác nhận đã sử dụng phòng Studio (Mã đơn: #${resourceId || 'N/A'})${note ? ` (Ghi chú: ${note})` : ''}`;
        break;
      case 'MARK_ABSENT':
        desc = `Quản trị viên đánh dấu người dùng không đến sử dụng Studio (Mã đơn: #${resourceId || 'N/A'})${note ? ` (Lý do: ${note})` : ''}`;
        break;
      case 'UPDATE':
        desc = `Cập nhật đơn đặt phòng Studio #${resourceId || 'N/A'}`;
        break;
      case 'DELETE':
        desc = `Xóa đơn đặt phòng Studio #${resourceId || 'N/A'}`;
        break;
      default:
        desc = `Thao tác ${act} trên đơn đặt phòng Studio #${resourceId || 'N/A'}`;
    }
  }

  // --- Phân hệ 6: Công việc sự vụ CTV (TASK) ---
  else if (res === 'TASK') {
    const title = body.title || '';
    const type = body.type || '';
    const assignee = body.assigneeName || body.collaboratorName || '';
    const facility = body.facility || '';
    const room = body.room || '';
    const locationStr = facility ? `${facility}${room ? ` - Phòng ${room}` : ''}` : (body.location || '');
    const timeStr = body.startTime ? `Bắt đầu: ${body.startTime}` : (body.deadline ? `Hạn chót: ${body.deadline}` : '');
    const multiplier = body.multiplier || body.payMultiplier;
    const feedback = body.feedback || body.note || body.revisionReason || body.reportContent || '';

    switch (act) {
      case 'CREATE': {
        const meta = [];
        if (type) meta.push(`Loại: ${type}`);
        if (assignee) meta.push(`Giao cho CTV: ${assignee}`);
        if (locationStr) meta.push(`Địa điểm: ${locationStr}`);
        if (timeStr) meta.push(timeStr);
        desc = `Phân công nhiệm vụ mới: "${title || 'Nhiệm vụ mới'}"${meta.length > 0 ? ` (${meta.join(', ')})` : ''}`;
        break;
      }
      case 'SUBMIT':
        desc = `CTV báo cáo hoàn thành nhiệm vụ #${resourceId || 'N/A'}${feedback ? ` (Nội dung: ${feedback})` : ''}`;
        break;
      case 'APPROVE':
        desc = `Nghiệm thu hoàn thành nhiệm vụ #${resourceId || 'N/A'}${multiplier ? ` (Hệ số thù lao: ${multiplier})` : ''}${feedback ? ` - Nhận xét: ${feedback}` : ''}`;
        break;
      case 'REVISION_REQUESTED':
        desc = `Yêu cầu CTV chỉnh sửa lại nhiệm vụ #${resourceId || 'N/A'}${feedback ? ` (Yêu cầu: ${feedback})` : ''}`;
        break;
      case 'UPDATE': {
        const progress = body.progress;
        desc = `Cập nhật tiến độ nhiệm vụ #${resourceId || 'N/A'}${progress !== undefined ? `: Đạt ${progress}%` : ''}${feedback ? ` - ${feedback}` : ''}`;
        break;
      }
      case 'DELETE':
        desc = `Xóa nhiệm vụ sự vụ CTV (Mã: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên nhiệm vụ sự vụ CTV #${resourceId || 'N/A'}`;
    }
  }

  // --- Phân hệ 7: Đợt đăng ký ca trực Studio (DUTY_PERIOD) ---
  else if (res === 'DUTY_PERIOD') {
    const month = body.month;
    const year = body.year;
    const deadline = body.registrationDeadline || body.deadline || '';
    const st = body.status || '';

    switch (act) {
      case 'CREATE':
        desc = `Khởi tạo đợt đăng ký ca trực Studio: Tháng ${month || '?'}/${year || '?'}${deadline ? ` (Hạn đăng ký: ${deadline})` : ''}`;
        break;
      case 'CONFIRM_SCHEDULE':
        desc = `Chốt và công bố chính thức lịch trực Studio (Đợt ID: #${resourceId || 'N/A'})`;
        break;
      case 'ASSIGN_SHIFTS':
        desc = `Phân công ca trực Studio cho các CTV (Đợt ID: #${resourceId || 'N/A'})`;
        break;
      case 'UPDATE_STATUS':
        desc = `Thay đổi trạng thái đợt đăng ký ca trực (Đợt ID: #${resourceId || 'N/A'})${st ? ` sang: ${st}` : ''}`;
        break;
      case 'DELETE':
        desc = `Xóa đợt đăng ký ca trực Studio (Đợt ID: #${resourceId || 'N/A'}) và làm mới toàn bộ dữ liệu liên quan`;
        break;
      default:
        desc = `Thao tác ${act} trên đợt đăng ký ca trực Studio (ID: #${resourceId || 'N/A'})`;
    }
  }

  // --- Phân hệ 8: Ca trực Studio (STUDIO_SHIFT) ---
  else if (res === 'STUDIO_SHIFT') {
    const date = body.date || '';
    const shift = body.shift || '';
    switch (act) {
      case 'CREATE':
        desc = `Thêm ca trực Studio mới${date ? ` (Ngày: ${date}` : ''}${shift ? `, Ca: ${shift}` : ''}${date || shift ? ')' : ''}`;
        break;
      case 'UPDATE':
        desc = `Cập nhật ca trực Studio (ID: #${resourceId || 'N/A'})`;
        break;
      case 'DELETE':
        desc = `Xóa ca trực Studio (ID: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên ca trực Studio (ID: #${resourceId || 'N/A'})`;
    }
  }

  // --- Phân hệ 9: Bảng thù lao / Chấm công (PAYROLL) ---
  else if (res === 'PAYROLL') {
    switch (act) {
      case 'CREATE':
        desc = `Khởi tạo và tính toán bảng thù lao CTV`;
        break;
      case 'UPDATE':
        desc = `Cập nhật dữ liệu bảng thù lao CTV (ID: #${resourceId || 'N/A'})`;
        break;
      case 'DELETE':
        desc = `Xóa bảng thù lao CTV (ID: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên bảng thù lao CTV`;
    }
  }

  // --- Phân hệ 10: Bảo trì & Sửa chữa thiết bị (EQUIPMENT_MAINTENANCE) ---
  else if (res === 'EQUIPMENT_MAINTENANCE') {
    const title = body.title || '';
    const type = body.type || '';
    const cost = body.cost;
    const invoiceNumber = body.invoiceNumber;
    const typeLabel =
      {
        MAINTENANCE: 'Bảo trì định kỳ',
        REPAIR: 'Sửa chữa sự cố',
        LOST: 'Báo mất',
        DISPOSAL: 'Thanh lý',
      }[type] || type || 'Bảo trì/sửa chữa';

    switch (act) {
      case 'CREATE':
        desc = `Khởi tạo phiếu ${typeLabel}: "${title || 'Phiếu mới'}"${cost ? ` (Chi phí: ${Number(cost).toLocaleString('vi-VN')} đ)` : ''}${invoiceNumber ? ` - HĐ: ${invoiceNumber}` : ''}`;
        break;
      case 'UPDATE':
        desc = `Cập nhật phiếu ${typeLabel} "${title || ''}" (ID: #${resourceId || 'N/A'})${body.status === 'COMPLETED' ? ' [Nghiệm thu hoàn tất]' : ''}`;
        break;
      case 'DELETE':
        desc = `Xóa phiếu bảo trì / sửa chữa (ID: #${resourceId || 'N/A'})`;
        break;
      default:
        desc = `Thao tác ${act} trên phiếu bảo trì / sửa chữa #${resourceId || 'N/A'}`;
    }
  }

  // --- Phân hệ 11: Fallback chung ---
  else {
    const ACTION_MAP = {
      CREATE: 'Thêm mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa bỏ',
      APPROVE: 'Phê duyệt',
      REJECT: 'Từ chối',
    };
    const actLabel = ACTION_MAP[act] || act;
    const resLabel = res.replace(/_/g, ' ').toLowerCase();
    desc = `${actLabel} dữ liệu ${resLabel}${resourceId ? ` (ID: #${resourceId})` : ''}`;
    const extra = body.name || body.title || body.note || body.reason || '';
    if (extra) {
      desc += `: "${extra}"`;
    }
  }

  if (isFailed && !desc.includes('thất bại')) {
    desc += ' [Thao tác không thành công]';
  }

  return desc;
};

/**
 * Ghi vết một thao tác vào bảng AuditLogs
 *
 * @param {object} payload
 * @returns {Promise<AuditLog|null>}
 */
const recordAudit = async (payload) => {
  try {
    const {
      userId = null,
      action,
      resource,
      resourceId = null,
      details = null,
      ip = null,
      userAgent = null,
      status = 'SUCCESS',
      timestamp = new Date(),
    } = payload;

    if (!action || !resource) {
      console.warn('Thiếu action hoặc resource khi ghi AuditLog:', payload);
      return null;
    }

    // Chuyển đổi nội dung thành văn bản tiếng Việt dễ đọc cho người dùng (KHÔNG lưu JSON)
    const readableDetails = formatAuditDescription({
      action,
      resource,
      resourceId,
      details,
      status,
    });

    const log = await AuditLog.create({
      userId,
      action: String(action).toUpperCase(),
      resource: String(resource).toUpperCase(),
      resourceId: resourceId ? String(resourceId) : null,
      details: readableDetails,
      ip: ip || '127.0.0.1',
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      status: ['SUCCESS', 'FAILED'].includes(status) ? status : 'SUCCESS',
      timestamp: timestamp || new Date(),
    });

    return log;
  } catch (error) {
    console.error('Lỗi khi ghi AuditLog:', error.message);
    return null;
  }
};

/**
 * Tra cứu danh sách Audit Logs theo bộ lọc và phân trang
 *
 * @param {object} query
 * @returns {Promise<{ logs: AuditLog[], pagination: object }>}
 */
const getAuditLogs = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    action,
    resource,
    userId,
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

  if (action && action !== 'ALL') {
    where.action = action;
  }

  if (resource && resource !== 'ALL') {
    where.resource = resource;
  }

  if (userId && userId !== 'ALL') {
    where.userId = userId;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Lọc theo khoảng ngày
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  // Tìm kiếm từ khóa tổng hợp
  if (search && search.trim() !== '') {
    const keyword = `%${search.trim()}%`;
    where[Op.or] = [
      { action: { [Op.like]: keyword } },
      { resource: { [Op.like]: keyword } },
      { resourceId: { [Op.like]: keyword } },
      { ip: { [Op.like]: keyword } },
      { details: { [Op.like]: keyword } },
      { '$user.full_name$': { [Op.like]: keyword } },
      { '$user.email$': { [Op.like]: keyword } },
    ];
  }

  const validSortColumns = ['createdAt', 'timestamp', 'action', 'resource', 'status'];
  const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const actualSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'role', 'employeeCode', 'avatarUrl'],
        required: false,
      },
    ],
    order: [[actualSortBy, actualSortOrder]],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    logs: rows,
    pagination: {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

/**
 * Thống kê tổng quan hoạt động Audit Logs
 *
 * @returns {Promise<object>}
 */
const getAuditLogStats = async () => {
  const total = await AuditLog.count();

  // Đếm số lượng hôm nay
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await AuditLog.count({
    where: {
      createdAt: { [Op.gte]: todayStart },
    },
  });

  const successCount = await AuditLog.count({ where: { status: 'SUCCESS' } });
  const failedCount = await AuditLog.count({ where: { status: 'FAILED' } });

  // Đếm theo các nhóm hành động chính
  const approveCount = await AuditLog.count({
    where: { action: { [Op.in]: ['APPROVE', 'CONFIRM_SCHEDULE', 'COMPLETED'] } },
  });
  const rejectCount = await AuditLog.count({
    where: { action: { [Op.in]: ['REJECT', 'CANCEL'] } },
  });
  const createCount = await AuditLog.count({ where: { action: 'CREATE' } });
  const updateCount = await AuditLog.count({
    where: { action: { [Op.in]: ['UPDATE', 'ASSIGN_ROLE', 'TOGGLE_STATUS', 'UPDATE_STATUS'] } },
  });
  const deleteCount = await AuditLog.count({ where: { action: 'DELETE' } });

  return {
    total,
    todayCount,
    successCount,
    failedCount,
    byActionGroup: {
      create: createCount,
      update: updateCount,
      delete: deleteCount,
      approve: approveCount,
      reject: rejectCount,
    },
  };
};

/**
 * Lấy chi tiết một bản ghi Audit Log theo ID
 *
 * @param {string} id
 * @returns {Promise<AuditLog>}
 */
const getAuditLogById = async (id) => {
  const log = await AuditLog.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'role', 'employeeCode', 'avatarUrl'],
      },
    ],
  });

  if (!log) {
    const error = new Error('Không tìm thấy bản ghi lịch sử thao tác');
    error.statusCode = 404;
    throw error;
  }

  return log;
};

module.exports = {
  sanitizeDetails,
  getClientIp,
  formatAuditDescription,
  recordAudit,
  recordLog: recordAudit,
  getAuditLogs,
  getAuditLogStats,
  getAuditLogById,
};
