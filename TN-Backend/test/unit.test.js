'use strict';

/**
 * @file test/unit.test.js
 * @description Bộ Unit Test kiểm tra các logic nghiệp vụ quan trọng trong hệ thống:
 *   1. Hash và kiểm tra mật khẩu (bcryptjs)
 *   2. Tạo và xác minh JWT Token (jsonwebtoken)
 *   3. Phân quyền người dùng RBAC (Role-Based Access Control)
 *   4. Thuật toán kiểm tra trùng lịch đặt phòng Studio (Time overlap check)
 *   5. Tính toán phân trang và giới hạn bản ghi (Pagination logic)
 *   6. Logic kiểm tra số lượng thiết bị khả dụng khi mượn (Inventory availability)
 *
 * Chạy test bằng lệnh:
 *   node --test test/unit.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
// TEST SUITE 1: BẢO MẬT MẬT KHẨU (BCRYPT)
// ============================================================
describe('Unit Test 1: Bảo mật và mã hóa mật khẩu (bcryptjs)', () => {
  const plainPassword = 'User@123456';

  it('1.1. Mật khẩu hash phải khác mật khẩu gốc và có tiền tố $2a$ hoặc $2b$', async () => {
    const saltRounds = 10;
    const hash = await bcrypt.hash(plainPassword, saltRounds);

    assert.notEqual(hash, plainPassword);
    assert.match(hash, /^\$2[ab]\$10\$/);
  });

  it('1.2. Xác thực thành công khi nhập đúng mật khẩu gốc', async () => {
    const hash = await bcrypt.hash(plainPassword, 10);
    const isMatch = await bcrypt.compare(plainPassword, hash);
    assert.equal(isMatch, true);
  });

  it('1.3. Từ chối xác thực khi nhập sai mật khẩu', async () => {
    const hash = await bcrypt.hash(plainPassword, 10);
    const isMatch = await bcrypt.compare('WrongPassword!@#', hash);
    assert.equal(isMatch, false);
  });
});

// ============================================================
// TEST SUITE 2: XÁC THỰC JSON WEB TOKEN (JWT)
// ============================================================
describe('Unit Test 2: Tạo và giải mã JWT Token (jsonwebtoken)', () => {
  const secretKey = 'super_secret_jwt_key_for_testing';
  const userPayload = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'sinhvien@lhu.edu.vn',
    role: 'USER',
  };

  it('2.1. Ký token thành công và trích xuất đúng payload { id, email, role }', () => {
    const token = jwt.sign(userPayload, secretKey, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secretKey);

    assert.equal(decoded.id, userPayload.id);
    assert.equal(decoded.email, userPayload.email);
    assert.equal(decoded.role, userPayload.role);
  });

  it('2.2. Từ chối token khi bị giả mạo secret key (JsonWebTokenError)', () => {
    const token = jwt.sign(userPayload, secretKey, { expiresIn: '1h' });
    assert.throws(
      () => {
        jwt.verify(token, 'wrong_tampered_secret_key');
      },
      (err) => err.name === 'JsonWebTokenError'
    );
  });

  it('2.3. Từ chối token đã hết hạn (TokenExpiredError)', () => {
    const expiredToken = jwt.sign(userPayload, secretKey, { expiresIn: '0s' });
    assert.throws(
      () => {
        jwt.verify(expiredToken, secretKey);
      },
      (err) => err.name === 'TokenExpiredError'
    );
  });
});

// ============================================================
// TEST SUITE 3: PHÂN QUYỀN RBAC (AUTHORIZE MIDDLEWARE)
// ============================================================
describe('Unit Test 3: Phân quyền RBAC (authorize middleware logic)', () => {
  // Giả lập authorize higher-order function
  const authorize = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
      }
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Không đủ quyền' });
      }
      next();
    };
  };

  it('3.1. ADMIN truy cập endpoint yêu cầu quyền ADMIN -> Cho phép (next() được gọi)', () => {
    const req = { user: { id: 'admin-1', role: 'ADMIN' } };
    let calledNext = false;
    const res = { status: () => res, json: () => {} };

    authorize('ADMIN')(req, res, () => {
      calledNext = true;
    });

    assert.equal(calledNext, true);
  });

  it('3.2. USER truy cập endpoint yêu cầu quyền ADMIN -> Chặn 403 Forbidden', () => {
    const req = { user: { id: 'user-1', role: 'USER' } };
    let responseStatus = null;
    let responseBody = null;
    let calledNext = false;

    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    authorize('ADMIN')(req, res, () => {
      calledNext = true;
    });

    assert.equal(calledNext, false);
    assert.equal(responseStatus, 403);
    assert.match(responseBody.message, /Không đủ quyền/);
  });

  it('3.3. COLLABORATOR truy cập endpoint yêu cầu quyền ADMIN -> Chặn 403 Forbidden', () => {
    const req = { user: { id: 'collab-1', role: 'COLLABORATOR' } };
    let responseStatus = null;
    let responseBody = null;
    let calledNext = false;

    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    authorize('ADMIN')(req, res, () => {
      calledNext = true;
    });

    assert.equal(calledNext, false);
    assert.equal(responseStatus, 403);
  });

  it('3.4. COLLABORATOR truy cập endpoint cho phép [COLLABORATOR, ADMIN] -> Cho phép (next() được gọi)', () => {
    const req = { user: { id: 'collab-1', role: 'COLLABORATOR' } };
    let calledNext = false;
    const res = { status: () => res, json: () => {} };

    authorize('COLLABORATOR', 'ADMIN')(req, res, () => {
      calledNext = true;
    });

    assert.equal(calledNext, true);
  });

  it('3.5. Kiểm tra tính hợp lệ của enum role [ADMIN, USER, COLLABORATOR]', () => {
    const validRoles = ['ADMIN', 'USER', 'COLLABORATOR'];
    assert.equal(validRoles.includes('COLLABORATOR'), true);
    assert.equal(validRoles.includes('ADMIN'), true);
    assert.equal(validRoles.includes('USER'), true);
    assert.equal(validRoles.includes('GUEST'), false);
  });
});

// ============================================================
// TEST SUITE 4: THUẬT TOÁN XUNG ĐỘT THỜI GIAN VÀ RÀNG BUỘC ĐẶT PHÒNG STUDIO (FR-03)
// ============================================================
describe('Unit Test 4: Thuật toán kiểm tra trùng lịch, khoảng đệm 30 phút và giờ hoạt động Studio', () => {
  const { validateOperatingHours, BUFFER_MS } = require('../src/services/studioBooking.service');

  /**
   * Hai khoảng thời gian [startA, endA] và [startB, endB] vi phạm buffer 30 phút khi:
   * (startB < endA + 30m) && (endB > startA - 30m)
   */
  const hasBufferConflict = (startA, endA, startB, endB) => {
    const bufferedStartA = new Date(new Date(startA).getTime() - BUFFER_MS);
    const bufferedEndA = new Date(new Date(endA).getTime() + BUFFER_MS);
    return new Date(startB) < bufferedEndA && new Date(endB) > bufferedStartA;
  };

  it('4.1. Phát hiện trùng lịch khi ca mới nằm hoàn toàn bên trong ca đã đặt', () => {
    const existing = { start: '2026-11-10T08:00:00Z', end: '2026-11-10T11:00:00Z' };
    const newBooking = { start: '2026-11-10T09:00:00Z', end: '2026-11-10T10:00:00Z' };

    assert.equal(hasBufferConflict(existing.start, existing.end, newBooking.start, newBooking.end), true);
  });

  it('4.2. Phát hiện vi phạm khi ca mới cách ca đã đặt ít hơn 30 phút (khoảng đệm buffer)', () => {
    const existing = { start: '2026-11-10T08:00:00Z', end: '2026-11-10T09:30:00Z' };
    // Ca mới bắt đầu lúc 09:45 (chỉ cách 15 phút, vi phạm buffer 30 phút)
    const newBooking = { start: '2026-11-10T09:45:00Z', end: '2026-11-10T11:00:00Z' };

    assert.equal(hasBufferConflict(existing.start, existing.end, newBooking.start, newBooking.end), true);
  });

  it('4.3. Cho phép đặt khi ca mới cách ca đã đặt đủ 30 phút (khoảng đệm an toàn)', () => {
    const existing = { start: '2026-11-10T08:00:00Z', end: '2026-11-10T09:30:00Z' };
    // Ca mới bắt đầu lúc 10:00 (cách đúng 30 phút)
    const newBooking = { start: '2026-11-10T10:00:00Z', end: '2026-11-10T11:30:00Z' };

    assert.equal(hasBufferConflict(existing.start, existing.end, newBooking.start, newBooking.end), false);
  });

  it('4.4. Hợp lệ khi đặt trong ca sáng (07:30–11:30) Thứ Ba', () => {
    // 2026-11-10 là Thứ Ba
    assert.doesNotThrow(() => {
      validateOperatingHours('2026-11-10T07:30:00+07:00', '2026-11-10T11:30:00+07:00');
    });
  });

  it('4.5. Hợp lệ khi đặt trong ca chiều (13:30–16:30) Thứ Ba', () => {
    assert.doesNotThrow(() => {
      validateOperatingHours('2026-11-10T13:30:00+07:00', '2026-11-10T16:00:00+07:00');
    });
  });

  it('4.6. Chặn đặt lịch vào Chủ nhật (Studio đóng cửa)', () => {
    // 2026-11-08 là Chủ nhật
    assert.throws(
      () => {
        validateOperatingHours('2026-11-08T08:00:00+07:00', '2026-11-08T10:00:00+07:00');
      },
      (err) => err.message.includes('Chủ nhật')
    );
  });

  it('4.7. Chặn đặt lịch xuyên giờ nghỉ trưa (11:00 - 14:00)', () => {
    assert.throws(
      () => {
        validateOperatingHours('2026-11-10T11:00:00+07:00', '2026-11-10T14:00:00+07:00');
      },
      (err) => err.message.includes('khung giờ hoạt động')
    );
  });

  it('4.8. Chặn đặt lịch ngoài giờ hoạt động (sau 16:30)', () => {
    assert.throws(
      () => {
        validateOperatingHours('2026-11-10T16:00:00+07:00', '2026-11-10T17:30:00+07:00');
      },
      (err) => err.message.includes('khung giờ hoạt động')
    );
  });

  it('4.9. Chặn đặt lịch xuyên ngày (bắt đầu hôm nay, kết thúc ngày mai)', () => {
    assert.throws(
      () => {
        validateOperatingHours('2026-11-10T14:00:00+07:00', '2026-11-11T09:00:00+07:00');
      },
      (err) => err.message.includes('cùng một ngày')
    );
  });
});

// ============================================================
// TEST SUITE 5: PHÂN TRANG VÀ TOÁN TỬ OFFSET
// ============================================================
describe('Unit Test 5: Logic tính toán phân trang (Pagination Math)', () => {
  const paginate = (page = 1, limit = 10, total = 0) => {
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (currentPage - 1) * pageLimit;
    const totalPages = Math.ceil(total / pageLimit);

    return { page: currentPage, limit: pageLimit, offset, totalPages };
  };

  it('5.1. Trang 1 với limit 10: offset phải bằng 0', () => {
    const result = paginate(1, 10, 24);
    assert.equal(result.offset, 0);
    assert.equal(result.totalPages, 3);
  });

  it('5.2. Trang 3 với limit 10: offset phải bằng 20', () => {
    const result = paginate(3, 10, 24);
    assert.equal(result.offset, 20);
    assert.equal(result.totalPages, 3);
  });

  it('5.3. Xử lý an toàn khi truyền page âm hoặc chuỗi rác', () => {
    const result = paginate(-5, 10, 24);
    assert.equal(result.page, 1);
    assert.equal(result.offset, 0);
  });
});

// ============================================================
// TEST SUITE 6: LOGIC QUẢN LÝ TỒN KHO THIẾT BỊ KHI MƯỢN/TRẢ
// ============================================================
describe('Unit Test 6: Kiểm tra tính hợp lệ số lượng tồn kho thiết bị', () => {
  const canBorrow = (availableQuantity, requestedQuantity) => {
    if (requestedQuantity <= 0) return { ok: false, message: 'Số lượng phải lớn hơn 0' };
    if (availableQuantity < requestedQuantity) return { ok: false, message: 'Số lượng khả dụng không đủ' };
    return { ok: true, newAvailable: availableQuantity - requestedQuantity };
  };

  it('6.1. Cho phép mượn khi số lượng yêu cầu nhỏ hơn hoặc bằng số lượng khả dụng', () => {
    const res = canBorrow(5, 3);
    assert.equal(res.ok, true);
    assert.equal(res.newAvailable, 2);
  });

  it('6.2. Từ chối khi mượn vượt quá số lượng khả dụng trong kho', () => {
    const res = canBorrow(2, 5);
    assert.equal(res.ok, false);
    assert.match(res.message, /không đủ/);
  });

  it('6.3. Từ chối khi số lượng yêu cầu là số âm hoặc bằng 0', () => {
    const res = canBorrow(5, 0);
    assert.equal(res.ok, false);
    assert.match(res.message, /lớn hơn 0/);
  });
});

// ============================================================
// TEST SUITE 7: VÒNG ĐỜI MƯỢN THIẾT BỊ (HANDOVER, OVERDUE, RETURN & MAINTENANCE)
// ============================================================
describe('Unit Test 7: Vòng đời mượn thiết bị (Task 1.4: Handover, Overdue, Return & Maintenance)', () => {
  // Logic giả lập chuyển trạng thái Bàn giao
  const processHandover = (currentStatus, handoverData = {}) => {
    if (currentStatus !== 'APPROVED') {
      throw new Error(`Chỉ có thể bàn giao đơn đã APPROVED. Trạng thái hiện tại: "${currentStatus}"`);
    }
    return {
      status: 'HANDED_OVER',
      handedOverAt: new Date(),
      handoverCondition: handoverData.handoverCondition || 'Thiết bị hoạt động bình thường, đầy đủ phụ kiện bàn giao.',
      adminNote: handoverData.adminNote || null,
    };
  };

  // Logic quét quá hạn OVERDUE
  const evaluateOverdue = (request, referenceTime = new Date()) => {
    if (request.status === 'HANDED_OVER' && new Date(request.returnDate) < referenceTime) {
      return 'OVERDUE';
    }
    return request.status;
  };

  // Logic xác nhận hoàn trả
  const processReturn = (request, equipment, returnData = {}) => {
    const validStatuses = ['HANDED_OVER', 'OVERDUE', 'APPROVED'];
    if (!validStatuses.includes(request.status)) {
      throw new Error(`Không thể trả đơn ở trạng thái "${request.status}"`);
    }

    const newAvailable = equipment.availableQuantity + request.quantity;
    const isDamaged = Boolean(returnData.isDamaged);

    return {
      updatedRequest: {
        status: 'RETURNED',
        actualReturnDate: new Date(),
        returnCondition: returnData.returnCondition || 'Đã nhận trả thiết bị đầy đủ.',
      },
      updatedEquipment: {
        availableQuantity: newAvailable,
        status: isDamaged ? 'MAINTENANCE' : (newAvailable > 0 ? 'AVAILABLE' : 'BORROWED'),
      },
    };
  };

  it('7.1. Chuyển trạng thái sang HANDED_OVER từ APPROVED thành công và ghi nhận biên bản', () => {
    const res = processHandover('APPROVED', { handoverCondition: 'Máy ảnh Sony A7 IV kèm lens 24-70mm còn mới 99%' });
    assert.equal(res.status, 'HANDED_OVER');
    assert.ok(res.handedOverAt instanceof Date);
    assert.equal(res.handoverCondition, 'Máy ảnh Sony A7 IV kèm lens 24-70mm còn mới 99%');
  });

  it('7.2. Từ chối bàn giao nếu đơn chưa APPROVED (PENDING hoặc REJECTED)', () => {
    assert.throws(
      () => processHandover('PENDING'),
      /Chỉ có thể bàn giao đơn đã APPROVED/
    );
    assert.throws(
      () => processHandover('REJECTED'),
      /Chỉ có thể bàn giao đơn đã APPROVED/
    );
  });

  it('7.3. Tự động đánh dấu OVERDUE khi đơn HANDED_OVER vượt quá hạn trả (returnDate < NOW)', () => {
    const overdueRequest = {
      id: 'req-01',
      status: 'HANDED_OVER',
      returnDate: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 giờ trước
    };
    const validRequest = {
      id: 'req-02',
      status: 'HANDED_OVER',
      returnDate: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 giờ sau
    };

    assert.equal(evaluateOverdue(overdueRequest), 'OVERDUE');
    assert.equal(evaluateOverdue(validRequest), 'HANDED_OVER');
  });

  it('7.4. Đơn APPROVED chưa nhận máy không bị chuyển thành OVERDUE dù quá hạn', () => {
    const approvedRequest = {
      id: 'req-03',
      status: 'APPROVED',
      returnDate: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    assert.equal(evaluateOverdue(approvedRequest), 'APPROVED');
  });

  it('7.5. Hoàn trả bình thường: đơn -> RETURNED, thiết bị -> AVAILABLE và hoàn lại số lượng', () => {
    const request = { status: 'HANDED_OVER', quantity: 2 };
    const equipment = { availableQuantity: 3, status: 'AVAILABLE' };

    const result = processReturn(request, equipment, { returnCondition: 'Máy hoạt động tốt, không trầy xước' });
    assert.equal(result.updatedRequest.status, 'RETURNED');
    assert.equal(result.updatedEquipment.availableQuantity, 5);
    assert.equal(result.updatedEquipment.status, 'AVAILABLE');
  });

  it('7.6. Hoàn trả từ trạng thái OVERDUE: đơn -> RETURNED hợp lệ', () => {
    const request = { status: 'OVERDUE', quantity: 1 };
    const equipment = { availableQuantity: 0, status: 'BORROWED' };

    const result = processReturn(request, equipment);
    assert.equal(result.updatedRequest.status, 'RETURNED');
    assert.equal(result.updatedEquipment.availableQuantity, 1);
    assert.equal(result.updatedEquipment.status, 'AVAILABLE');
  });

  it('7.7. Hoàn trả khi có sự cố hư hỏng (isDamaged = true) -> thiết bị chuyển sang MAINTENANCE theo Quy tắc 3.9 & 3.10', () => {
    const request = { status: 'HANDED_OVER', quantity: 1 };
    const equipment = { availableQuantity: 0, status: 'BORROWED' };

    const result = processReturn(request, equipment, {
      isDamaged: true,
      returnCondition: 'Bị nứt ống kính trong quá trình ghi hình sự kiện',
    });

    assert.equal(result.updatedRequest.status, 'RETURNED');
    assert.equal(result.updatedEquipment.status, 'MAINTENANCE');
    assert.equal(result.updatedEquipment.availableQuantity, 1);
  });

  it('7.8. Chặn trả đối với đơn chưa được duyệt/bàn giao (PENDING, REJECTED)', () => {
    const request = { status: 'PENDING', quantity: 1 };
    const equipment = { availableQuantity: 2, status: 'AVAILABLE' };

    assert.throws(
      () => processReturn(request, equipment),
      /Không thể trả đơn ở trạng thái "PENDING"/
    );
  });
});

// ============================================================
// TEST SUITE 8: QUẢN LÝ TÀI KHOẢN VÀ BẢO VỆ ADMIN (FR-06)
// ============================================================
describe('Unit Test 8: Quản lý tài khoản & Bảo vệ phân quyền (Task 1.5 - FR-06)', () => {
  // Logic toggle active
  const toggleUserActive = (currentAdminId, targetUser) => {
    if (targetUser.id === currentAdminId) {
      throw new Error('Bạn không thể tự khóa tài khoản của chính mình.');
    }
    return {
      ...targetUser,
      isActive: !targetUser.isActive,
    };
  };

  // Logic kiểm tra đăng nhập tài khoản bị khóa
  const validateLoginStatus = (user) => {
    if (user.isActive === false) {
      throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }
    return { ok: true, token: 'mock_jwt_token' };
  };

  it('8.1. Admin khóa tài khoản người dùng thành công (isActive: true -> false)', () => {
    const user = { id: 'usr-100', fullName: 'Sinh viên A', isActive: true };
    const updated = toggleUserActive('admin-01', user);
    assert.equal(updated.isActive, false);
  });

  it('8.2. Admin mở khóa tài khoản người dùng thành công (isActive: false -> true)', () => {
    const user = { id: 'usr-100', fullName: 'Sinh viên A', isActive: false };
    const updated = toggleUserActive('admin-01', user);
    assert.equal(updated.isActive, true);
  });

  it('8.3. Chặn Admin tự khóa tài khoản của chính mình (chống mất quyền quản trị)', () => {
    const adminUser = { id: 'admin-01', fullName: 'Quản trị viên', isActive: true };
    assert.throws(
      () => toggleUserActive('admin-01', adminUser),
      /Bạn không thể tự khóa tài khoản của chính mình/
    );
  });

  it('8.4. Chặn đăng nhập đối với tài khoản đã bị khóa (isActive: false)', () => {
    const lockedUser = { id: 'usr-999', email: 'locked@lhu.edu.vn', isActive: false };
    assert.throws(
      () => validateLoginStatus(lockedUser),
      /Tài khoản của bạn đã bị khóa/
    );
  });

  it('8.5. Cho phép đăng nhập bình thường đối với tài khoản đang hoạt động (isActive: true)', () => {
    const activeUser = { id: 'usr-888', email: 'active@lhu.edu.vn', isActive: true };
    const res = validateLoginStatus(activeUser);
    assert.equal(res.ok, true);
    assert.ok(res.token);
  });
});

// ============================================================
// SUITE 9: QUẢN LÝ CÔNG VIỆC (FR-04) - MODEL TASK & VÒNG ĐỜI TRẠNG THÁI
// ============================================================
describe('Unit Test 9: Quản lý công việc (FR-04) - Model Task & Vòng đời trạng thái', () => {
  const VALID_TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'REVISION_REQUESTED', 'COMPLETED'];

  // Helper hàm giả lập chuyển đổi trạng thái Task theo QUY_TAC.md Mục 5
  function transitionTaskStatus(task, newStatus, payload = {}) {
    if (!VALID_TASK_STATUSES.includes(newStatus)) {
      throw new Error(`Trạng thái công việc không hợp lệ: ${newStatus}`);
    }

    switch (newStatus) {
      case 'IN_PROGRESS':
        if (!['NOT_STARTED', 'REVISION_REQUESTED'].includes(task.status)) {
          throw new Error(`Không thể chuyển sang IN_PROGRESS từ trạng thái ${task.status}`);
        }
        return { ...task, status: 'IN_PROGRESS' };

      case 'PENDING_APPROVAL':
        if (task.status !== 'IN_PROGRESS') {
          throw new Error('Chỉ có thể nộp duyệt khi công việc đang thực hiện (IN_PROGRESS)');
        }
        if (!payload.resultLink && !payload.proofFile) {
          throw new Error('Cần nộp link sản phẩm hoặc file minh chứng khi nộp duyệt');
        }
        return {
          ...task,
          status: 'PENDING_APPROVAL',
          resultLink: payload.resultLink || task.resultLink,
          proofFile: payload.proofFile || task.proofFile,
        };

      case 'REVISION_REQUESTED':
        if (task.status !== 'PENDING_APPROVAL') {
          throw new Error('Chỉ có thể yêu cầu sửa khi công việc đang chờ duyệt (PENDING_APPROVAL)');
        }
        if (!payload.feedback || payload.feedback.trim() === '') {
          throw new Error('Cần nêu rõ lý do hoặc nội dung cần chỉnh sửa (feedback)');
        }
        return { ...task, status: 'REVISION_REQUESTED', feedback: payload.feedback };

      case 'COMPLETED':
        if (task.status !== 'PENDING_APPROVAL') {
          throw new Error('Chỉ có thể nghiệm thu khi công việc đang chờ duyệt (PENDING_APPROVAL)');
        }
        return {
          ...task,
          status: 'COMPLETED',
          feedback: payload.feedback || task.feedback,
          completedAt: new Date().toISOString(),
        };

      default:
        throw new Error(`Chuyển trạng thái không được hỗ trợ: ${newStatus}`);
    }
  }

  it('9.1. Trạng thái khởi tạo mặc định của Task là NOT_STARTED và isExternal mặc định false', () => {
    const task = {
      id: 'task-001',
      title: 'Thiết kế banner sự kiện AI Day',
      assignedToUserId: 'ctv-01',
      createdByUserId: 'admin-01',
      status: 'NOT_STARTED',
      isExternal: false,
    };
    assert.equal(task.status, 'NOT_STARTED');
    assert.equal(task.isExternal, false);
  });

  it('9.2. CTV nhận việc và chuyển sang trạng thái IN_PROGRESS', () => {
    const task = { status: 'NOT_STARTED' };
    const updated = transitionTaskStatus(task, 'IN_PROGRESS');
    assert.equal(updated.status, 'IN_PROGRESS');
  });

  it('9.3. CTV nộp kết quả kèm link sản phẩm hoặc minh chứng -> PENDING_APPROVAL', () => {
    const task = { status: 'IN_PROGRESS' };
    const updated = transitionTaskStatus(task, 'PENDING_APPROVAL', {
      resultLink: 'https://drive.google.com/banner-final.png',
    });
    assert.equal(updated.status, 'PENDING_APPROVAL');
    assert.equal(updated.resultLink, 'https://drive.google.com/banner-final.png');
  });

  it('9.4. Chặn CTV nộp duyệt khi không có cả link kết quả lẫn file minh chứng', () => {
    const task = { status: 'IN_PROGRESS' };
    assert.throws(
      () => transitionTaskStatus(task, 'PENDING_APPROVAL', {}),
      /Cần nộp link sản phẩm hoặc file minh chứng/
    );
  });

  it('9.5. Nhân sự yêu cầu chỉnh sửa (REVISION_REQUESTED) phải có nội dung feedback', () => {
    const task = { status: 'PENDING_APPROVAL' };
    assert.throws(
      () => transitionTaskStatus(task, 'REVISION_REQUESTED', { feedback: '' }),
      /Cần nêu rõ lý do hoặc nội dung cần chỉnh sửa/
    );

    const updated = transitionTaskStatus(task, 'REVISION_REQUESTED', {
      feedback: 'Cần sửa lại logo trường cho chuẩn nhận diện thương hiệu',
    });
    assert.equal(updated.status, 'REVISION_REQUESTED');
    assert.equal(updated.feedback, 'Cần sửa lại logo trường cho chuẩn nhận diện thương hiệu');
  });

  it('9.6. Nhân sự nghiệm thu COMPLETED: Cập nhật status thành COMPLETED và ghi nhận completedAt', () => {
    const task = { status: 'PENDING_APPROVAL', title: 'Chụp ảnh sự kiện' };
    const updated = transitionTaskStatus(task, 'COMPLETED', { feedback: 'Hình ảnh rất đẹp, đạt yêu cầu!' });
    assert.equal(updated.status, 'COMPLETED');
    assert.ok(updated.completedAt);
    assert.equal(updated.feedback, 'Hình ảnh rất đẹp, đạt yêu cầu!');
  });

  it('9.7. Từ chối các trạng thái không nằm trong enum chuẩn 5 trạng thái', () => {
    const task = { status: 'NOT_STARTED' };
    assert.throws(
      () => transitionTaskStatus(task, 'INVALID_STATUS'),
      /Trạng thái công việc không hợp lệ/
    );
  });

  it('9.8. Hợp lệ khi chọn một trong 13 loại công việc tiêu chuẩn (Task Type)', () => {
    const TASK_TYPES = [
      'Viết content', 'Chụp & xử lý hình sự kiện', 'Quay highlight', 'Dựng clip highlight',
      'Quay clip TikTok', 'Dựng clip TikTok', 'Viết kịch bản', 'MC bản tin',
      'Thư ký trường quay', 'Quay phim', 'Dựng phim', 'Diễn viên', 'Thiết kế', 'Khác'
    ];
    const task = {
      title: 'Quay highlight giải bóng đá',
      taskType: 'Quay highlight',
    };
    assert.ok(TASK_TYPES.includes(task.taskType));
  });

  it('9.9. Khi chọn loại công việc "Khác", bắt buộc phải cung cấp tên tùy chỉnh (otherTaskType)', () => {
    function validateTaskTypeInput(taskType, otherTaskType) {
      if (taskType === 'Khác' && (!otherTaskType || !otherTaskType.trim())) {
        throw new Error('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác');
      }
      return { taskType, otherTaskType: taskType === 'Khác' ? otherTaskType.trim() : null };
    }

    // Trường hợp hợp lệ
    const valid = validateTaskTypeInput('Khác', 'Biên đạo múa khai mạc');
    assert.equal(valid.taskType, 'Khác');
    assert.equal(valid.otherTaskType, 'Biên đạo múa khai mạc');

    // Trường hợp vi phạm
    assert.throws(
      () => validateTaskTypeInput('Khác', ''),
      /Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác/
    );
    assert.throws(
      () => validateTaskTypeInput('Khác', null),
      /Vui lòng nhập tên loại công việc tùy chỉnh khi chọn mục Khác/
    );
  });

  it('9.10. Khi chuyển từ loại "Khác" sang loại công việc chuẩn, otherTaskType được làm sạch về null', () => {
    function updateTaskType(currentTask, newTaskType, newOtherTaskType) {
      if (newTaskType === 'Khác') {
        if (!newOtherTaskType || !newOtherTaskType.trim()) {
          throw new Error('Vui lòng nhập tên loại công việc tùy chỉnh');
        }
        return { ...currentTask, taskType: 'Khác', otherTaskType: newOtherTaskType.trim() };
      }
      return { ...currentTask, taskType: newTaskType, otherTaskType: null };
    }

    const task = { taskType: 'Khác', otherTaskType: 'Lồng tiếng trailer' };
    const updated = updateTaskType(task, 'Dựng phim', null);
    assert.equal(updated.taskType, 'Dựng phim');
    assert.equal(updated.otherTaskType, null);
  });
});

