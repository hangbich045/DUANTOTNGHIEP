'use strict';

/**
 * @file middlewares/auditLog.middleware.js
 * @description Middleware tự động ghi vết các thao tác quan trọng (thêm/sửa/xóa, duyệt/từ chối, cấp quyền) (FR-09).
 */

const auditLogService = require('../services/auditLog.service');

/**
 * Phân tích URL và HTTP Method để tự động xác định Action và Resource
 *
 * @param {import('express').Request} req
 * @returns {{ action: string, resource: string, resourceId: string|null }}
 */
const detectActionAndResource = (req) => {
  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.url;
  const cleanPath = path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);

  let action = 'UNKNOWN';
  let resource = 'SYSTEM';
  let resourceId = null;

  // Trích xuất ID nếu có trong params hoặc segments
  if (req.params && req.params.id) {
    resourceId = req.params.id;
  } else {
    // Tìm segment có dạng UUID hoặc số nguyên ở cuối/gần cuối
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || /^\d+$/.test(seg)) {
        resourceId = seg;
        break;
      }
    }
  }

  // 1. Phân hệ Xác thực & Người dùng (Auth / Users / Dashboard)
  if (cleanPath.includes('/api/auth/login')) {
    action = 'LOGIN';
    resource = 'USER';
  } else if (cleanPath.includes('/api/auth/register')) {
    action = 'REGISTER';
    resource = 'USER';
  } else if (cleanPath.includes('/api/auth/reset-password')) {
    action = 'RESET_PASSWORD';
    resource = 'USER';
  } else if (cleanPath.includes('/api/auth/verify')) {
    action = 'VERIFY_ACCOUNT';
    resource = 'USER';
  } else if (cleanPath.includes('/users/') && cleanPath.includes('/role')) {
    action = 'ASSIGN_ROLE';
    resource = 'USER';
  } else if (cleanPath.includes('/users/') && cleanPath.includes('/toggle-active')) {
    action = 'TOGGLE_STATUS';
    resource = 'USER';
  } else if (cleanPath.includes('/users/') && method === 'DELETE') {
    action = 'DELETE';
    resource = 'USER';
  }

  // 2. Phân hệ Thiết bị & Danh mục (Equipments / Categories)
  else if (cleanPath.includes('/api/equipments') || cleanPath.includes('/api/equipment')) {
    if (cleanPath.includes('/categories') || cleanPath.includes('equipment-categories')) {
      resource = 'CATEGORY';
    } else {
      resource = 'EQUIPMENT';
    }
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';
  } else if (cleanPath.includes('/api/categories')) {
    resource = 'CATEGORY';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';
  } else if (cleanPath.includes('/api/maintenances') || cleanPath.includes('/api/equipment-maintenances')) {
    resource = 'EQUIPMENT_MAINTENANCE';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';
  }

  // 3. Phân hệ Mượn - Trả thiết bị (Borrow Requests)
  else if (cleanPath.includes('/api/borrow-requests') || cleanPath.includes('/api/equipment-requests')) {
    resource = 'BORROW_REQUEST';
    if (cleanPath.includes('/handover')) {
      action = 'HANDOVER';
    } else if (cleanPath.includes('/return')) {
      action = 'RETURN';
    } else if (cleanPath.includes('/approve')) {
      action = 'APPROVE';
    } else if (cleanPath.includes('/reject')) {
      action = 'REJECT';
    } else if (cleanPath.includes('/process')) {
      const statusParam = (req.body?.status || req.body?.action || '').toLowerCase();
      if (statusParam === 'approved' || statusParam === 'confirm') action = 'APPROVE';
      else if (statusParam === 'rejected') action = 'REJECT';
      else action = 'UPDATE';
    } else if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    }
  }

  // 4. Phân hệ Đặt phòng Studio (Studio Bookings)
  else if (cleanPath.includes('/api/studio-bookings')) {
    resource = 'STUDIO_BOOKING';
    if (cleanPath.includes('/process')) {
      const act = (req.body?.action || req.body?.status || '').toLowerCase();
      if (act === 'confirm' || act === 'approve') action = 'APPROVE';
      else if (act === 'reject') action = 'REJECT';
      else action = 'UPDATE';
    } else if (cleanPath.includes('/cancel')) {
      action = 'CANCEL';
    } else if (cleanPath.includes('/reschedule')) {
      action = 'RESCHEDULE';
    } else if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    }
  }

  // 5. Phân hệ Quản lý Công việc CTV (Tasks)
  else if (cleanPath.includes('/api/tasks')) {
    resource = 'TASK';
    if (cleanPath.includes('/submit')) {
      action = 'SUBMIT';
    } else if (cleanPath.includes('/review') || cleanPath.includes('/approve')) {
      const st = (req.body?.status || '').toUpperCase();
      if (st === 'COMPLETED') action = 'APPROVE';
      else if (st === 'REVISION_REQUESTED') action = 'REVISION_REQUESTED';
      else action = 'UPDATE';
    } else if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    }
  }

  // 6. Phân hệ Ca trực & Lịch Studio (Duty / StudioShifts)
  else if (cleanPath.includes('/api/duty')) {
    if (cleanPath.includes('/periods')) {
      resource = 'DUTY_PERIOD';
      if (cleanPath.includes('/confirm')) {
        action = 'CONFIRM_SCHEDULE';
      } else if (cleanPath.includes('/assign')) {
        action = 'ASSIGN_SHIFTS';
      } else if (cleanPath.includes('/status')) {
        action = 'UPDATE_STATUS';
      } else if (method === 'POST') {
        action = 'CREATE';
      } else if (method === 'DELETE') {
        action = 'DELETE';
      }
    } else if (cleanPath.includes('/shifts')) {
      resource = 'STUDIO_SHIFT';
      if (method === 'DELETE') action = 'DELETE';
      else if (method === 'POST') action = 'CREATE';
      else if (method === 'PUT') action = 'UPDATE';
    } else {
      resource = 'DUTY_PERIOD';
    }
  }

  // 7. Phân hệ Thù lao / Bảng lương (Payroll)
  else if (cleanPath.includes('/api/payroll')) {
    resource = 'PAYROLL';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';
  }

  // 8. Fallback cho các routes mutation khác
  else {
    const mainSegment = segments.find((s) => s !== 'api' && s !== 'v1') || 'SYSTEM';
    resource = mainSegment.toUpperCase().replace(/-/g, '_');
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';
  }

  return { action, resource, resourceId };
};

/**
 * Middleware tự động ghi vết Audit Log
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const auditLogMiddleware = (req, res, next) => {
  // Bỏ qua các method đọc (GET, OPTIONS, HEAD) trừ khi được chỉ định thủ công
  const method = req.method.toUpperCase();
  if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
    return next();
  }

  // Bỏ qua các request tĩnh hoặc health check
  const path = req.originalUrl || req.url;
  if (path.startsWith('/uploads') || path.startsWith('/static') || path === '/health') {
    return next();
  }

  // Cho phép controller tùy biến ghi đè action, resource hoặc details
  req.auditContext = {
    customAction: null,
    customResource: null,
    customResourceId: null,
    customDetails: null,
  };

  req.setAuditDetails = (details, action = null, resource = null, resourceId = null) => {
    if (details) req.auditContext.customDetails = details;
    if (action) req.auditContext.customAction = action;
    if (resource) req.auditContext.customResource = resource;
    if (resourceId) req.auditContext.customResourceId = resourceId;
  };

  // Lắng nghe khi response hoàn tất gửi về cho client
  res.on('finish', async () => {
    try {
      const statusCode = res.statusCode;
      const status = statusCode < 400 ? 'SUCCESS' : 'FAILED';

      const detected = detectActionAndResource(req);
      const action = req.auditContext.customAction || detected.action;
      const resource = req.auditContext.customResource || detected.resource;
      const resourceId = req.auditContext.customResourceId || detected.resourceId;

      // Không ghi nếu action hoặc resource là UNKNOWN
      if (action === 'UNKNOWN') return;

      const userId = req.user?.id || res.locals?.userId || null;
      const ip = auditLogService.getClientIp(req);
      const userAgent = req.headers['user-agent'] || null;

      // Tổng hợp details: ưu tiên customDetails, fallback sang req.body + req.query + route info
      const rawDetails = req.auditContext.customDetails || {
        method,
        path: req.originalUrl || req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        statusCode,
      };

      await auditLogService.recordAudit({
        userId,
        action,
        resource,
        resourceId,
        details: rawDetails,
        ip,
        userAgent,
        status,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('AuditLog middleware logging error (safe ignored):', err.message);
    }
  });

  next();
};

module.exports = auditLogMiddleware;
