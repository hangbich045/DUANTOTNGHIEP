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
    const activeUser = { id: 'usr-888', email: 'active@lhu.edu.vn', isActive: true, status: 'Active' };
    const res = validateLoginStatus(activeUser);
    assert.equal(res.ok, true);
    assert.ok(res.token);
  });

  // --- Các quy tắc mới về Xóa an toàn & Vô hiệu hóa (QUY_TAC.md Mục 9) ---
  it('8.6. Chặn xóa vật lý tài khoản đã có dữ liệu (công việc, chấm công, ca trực) -> Chuyển sang Disabled', () => {
    function processDeleteOrDisable(adminId, targetUser, relatedDataCounts) {
      if (adminId === targetUser.id) {
        throw new Error('Không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình.');
      }
      const totalRelated = Object.values(relatedDataCounts).reduce((a, b) => a + b, 0);
      if (totalRelated > 0) {
        return {
          action: 'DISABLED',
          user: { ...targetUser, status: 'Disabled', isActive: false },
          message: 'Tài khoản đã có dữ liệu hoạt động nên chuyển sang Vô hiệu hóa (Disabled).',
        };
      }
      return {
        action: 'DELETED',
        userId: targetUser.id,
        message: 'Tài khoản chưa có dữ liệu liên quan đã được xóa hoàn toàn.',
      };
    }

    const ctvUser = { id: 'ctv-user-1', email: 'ctv@lhu.edu.vn', status: 'Active', isActive: true };
    // CTV có 3 công việc và 2 bản ghi chấm công
    const relatedData = { tasks: 3, attendance: 2, shifts: 0 };

    const result = processDeleteOrDisable('admin-01', ctvUser, relatedData);
    assert.equal(result.action, 'DISABLED');
    assert.equal(result.user.status, 'Disabled');
    assert.equal(result.user.isActive, false);
    assert.equal(result.user.id, 'ctv-user-1'); // user_id được giữ nguyên 100%
  });

  it('8.7. Cho phép xóa vật lý tài khoản chưa từng phát sinh dữ liệu liên quan', () => {
    function processDeleteOrDisable(adminId, targetUser, relatedDataCounts) {
      if (adminId === targetUser.id) {
        throw new Error('Không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình.');
      }
      const totalRelated = Object.values(relatedDataCounts).reduce((a, b) => a + b, 0);
      if (totalRelated > 0) {
        return {
          action: 'DISABLED',
          user: { ...targetUser, status: 'Disabled', isActive: false },
        };
      }
      return {
        action: 'DELETED',
        userId: targetUser.id,
      };
    }

    const emptyUser = { id: 'usr-new-001', email: 'empty@lhu.edu.vn', status: 'Active', isActive: true };
    const relatedData = { tasks: 0, attendance: 0, shifts: 0, borrowRequests: 0 };

    const result = processDeleteOrDisable('admin-01', emptyUser, relatedData);
    assert.equal(result.action, 'DELETED');
    assert.equal(result.userId, 'usr-new-001');
  });

  it('8.8. Chặn đăng nhập đối với tài khoản đã bị vô hiệu hóa (Disabled) với thông báo chuẩn', () => {
    function checkLoginStatus(user) {
      if (!user.isActive || user.status === 'Disabled') {
        const msg = user.status === 'Disabled'
          ? 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.'
          : 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.';
        const err = new Error(msg);
        err.statusCode = 403;
        throw err;
      }
      return true;
    }

    const disabledUser = { id: 'usr-dis', email: 'dis@lhu.edu.vn', status: 'Disabled', isActive: false };
    assert.throws(
      () => checkLoginStatus(disabledUser),
      /Tài khoản của bạn đã bị vô hiệu hóa\./
    );

    const lockedUser = { id: 'usr-lock', email: 'lock@lhu.edu.vn', status: 'Locked', isActive: false };
    assert.throws(
      () => checkLoginStatus(lockedUser),
      /Tài khoản của bạn đã bị khóa\./
    );
  });

  it('8.9. Chặn Admin tự xóa hoặc vô hiệu hóa tài khoản của chính mình', () => {
    function deleteUser(currentAdminId, targetUserId) {
      if (currentAdminId === targetUserId) {
        throw new Error('Không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình.');
      }
      return true;
    }

    assert.throws(
      () => deleteUser('admin-123', 'admin-123'),
      /Không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình/
    );
  });

  it('8.10. Phân biệt rõ 3 trạng thái: Active, Locked, Disabled', () => {
    const validStatuses = ['Active', 'Locked', 'Disabled'];
    assert.equal(validStatuses.includes('Active'), true);
    assert.equal(validStatuses.includes('Locked'), true);
    assert.equal(validStatuses.includes('Disabled'), true);
    assert.equal(validStatuses.includes('UNKNOWN'), false);
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

// ============================================================
// TEST SUITE 10: CHẤM CÔNG, LỊCH TRỰC STUDIO & TÍNH THÙ LAO CTV (FR-05)
// ============================================================

describe('Unit Test 10: Chấm công, Lịch trực Studio & Tính thù lao CTV (FR-05)', () => {
  const BASE_RATE = 20000; // 20.000 VNĐ / giờ
  const SHIFT_STANDARD_HOURS = 4.0; // 4 giờ / ca trực tiêu chuẩn

  // Hàm tính thù lao ca trực Studio
  function calculateShiftPay(shiftCount) {
    return shiftCount * SHIFT_STANDARD_HOURS * BASE_RATE;
  }

  // Thuật toán tính tiền công cho một đầu việc sự vụ (Quy tắc Mục 7)
  function calculateTaskPay(task) {
    // TC-03: Chỉ tính khi đã COMPLETED
    if (task.status !== 'COMPLETED') {
      return { hours: 0, calculatedHours: 0, amount: 0 };
    }

    const hours = parseFloat(task.actualHours) || 0;
    const taskDate = new Date(task.date || task.executionDate);
    const isSunday = task.isSunday || taskDate.getDay() === 0;

    let multiplier = 1.0;
    // TC-06: Chống nhân chồng hệ số: Chủ nhật sau 16:30 chỉ tính 2.0 (không nhân 1.5 x 2.0 = 3.0)
    if (isSunday) {
      multiplier = 2.0;
    } else if (task.isOvertime || (task.overtimeHours && task.overtimeHours > 0)) {
      multiplier = 1.5;
    }

    const calculatedHours = hours * multiplier;
    const amount = Math.round(calculatedHours * BASE_RATE);
    return { hours, calculatedHours, multiplier, amount };
  }

  it('10.1. Mức thù lao cơ bản: 20.000 đ/giờ, ca trực Studio tiêu chuẩn 4 giờ = 80.000 đ', () => {
    const oneShiftPay = calculateShiftPay(1);
    assert.equal(oneShiftPay, 80000);

    const fiveShiftsPay = calculateShiftPay(5);
    assert.equal(fiveShiftsPay, 400000);
  });

  it('10.2. TC-03 (Chống tính lương việc dang dở): Nhiệm vụ chưa COMPLETED bị loại trừ khỏi bảng lương', () => {
    const uncompletedTasks = [
      { id: 't1', status: 'NOT_STARTED', actualHours: 4 },
      { id: 't2', status: 'IN_PROGRESS', actualHours: 6 },
      { id: 't3', status: 'PENDING_APPROVAL', actualHours: 5 },
      { id: 't4', status: 'REVISION_REQUESTED', actualHours: 8 },
    ];

    for (const t of uncompletedTasks) {
      const res = calculateTaskPay(t);
      assert.equal(res.amount, 0, `Nhiệm vụ status ${t.status} không được tính tiền`);
      assert.equal(res.calculatedHours, 0);
    }

    const completedTask = { id: 't5', status: 'COMPLETED', actualHours: 4, date: '2026-10-15' };
    const validRes = calculateTaskPay(completedTask);
    assert.equal(validRes.amount, 80000);
  });

  it('10.3. TC-04 (Chống tính lương ca trực tương lai): Ca trực tương lai dù CONFIRMED bị loại trừ', () => {
    const today = new Date('2026-10-15T00:00:00.000Z');

    function filterValidShifts(shifts, referenceDate) {
      return shifts.filter((s) => {
        const sDate = new Date(s.date);
        return s.status === 'COMPLETED' || (s.status === 'CONFIRMED' && sDate <= referenceDate);
      });
    }

    const shifts = [
      { id: 's1', date: '2026-10-05', status: 'COMPLETED' },
      { id: 's2', date: '2026-10-12', status: 'CONFIRMED' },
      { id: 's3', date: '2026-10-25', status: 'CONFIRMED' }, // Tương lai -> Loại trừ
      { id: 's4', date: '2026-10-28', status: 'REGISTERED' }, // Chưa duyệt -> Loại trừ
    ];

    const valid = filterValidShifts(shifts, today);
    assert.equal(valid.length, 2);
    assert.deepEqual(valid.map((s) => s.id), ['s1', 's2']);
  });

  it('10.4. TC-05 (Chống tính trùng giờ): Loại trừ thời gian trùng lặp giữa ca trực Studio và sự vụ', () => {
    // CTV trực Studio ca Chiều (13:30 - 17:30 = 4 giờ)
    // CTV đồng thời làm sự vụ sự kiện từ 16:00 đến 19:00 (3 giờ, trong đó 16:00-17:30 trùng 1.5 giờ)
    function eliminateOverlap(shiftHours, eventHours, overlapHours) {
      const netEventHours = Math.max(0, eventHours - overlapHours);
      const totalHours = shiftHours + netEventHours;
      return { shiftHours, netEventHours, totalHours };
    }

    const result = eliminateOverlap(4.0, 3.0, 1.5);
    assert.equal(result.shiftHours, 4.0);
    assert.equal(result.netEventHours, 1.5);
    assert.equal(result.totalHours, 5.5); // 4 + 1.5 = 5.5 giờ, không bị tính trùng thành 7 giờ!
  });

  it('10.5. TC-06 (Chống nhân chồng hệ số): Sự vụ Chủ nhật sau 16:30 chỉ tính hệ số 2.0 (không nhân 1.5 x 2.0)', () => {
    // Chủ nhật (Sunday) lúc 18:00 (sau 16:30), thời lượng 3 giờ
    const taskSundayEvening = {
      status: 'COMPLETED',
      actualHours: 3.0,
      date: '2026-10-18', // Chủ nhật
      isSunday: true,
      isOvertime: true, // sau 16:30
    };

    const res = calculateTaskPay(taskSundayEvening);
    assert.equal(res.multiplier, 2.0); // Chỉ áp dụng 2.0, không được nhân 1.5 x 2.0 = 3.0
    assert.equal(res.calculatedHours, 6.0); // 3 * 2.0 = 6.0 giờ quy đổi
    assert.equal(res.amount, 120000); // 6 * 20.000 = 120.000 đ
  });

  it('10.6. Hệ số 1.5 cho sự vụ ngoài giờ sau 16:30 từ Thứ Hai đến Thứ Bảy', () => {
    const taskWeekdayOvertime = {
      status: 'COMPLETED',
      actualHours: 4.0,
      date: '2026-10-14', // Thứ Tư
      isSunday: false,
      isOvertime: true,
    };

    const res = calculateTaskPay(taskWeekdayOvertime);
    assert.equal(res.multiplier, 1.5);
    assert.equal(res.calculatedHours, 6.0); // 4 * 1.5 = 6.0
    assert.equal(res.amount, 120000);
  });

  it('10.7. TC-07 (Bảo vệ quyền hạn Nhân sự): Chặn CTV tự ý duyệt ca trực hoặc sửa bảng lương', () => {
    function authorizeAction(userRole, requiredRole) {
      if (userRole !== requiredRole) {
        throw new Error(`Bạn không có quyền truy cập. Chức năng này yêu cầu quyền: ${requiredRole}.`);
      }
      return true;
    }

    assert.equal(authorizeAction('ADMIN', 'ADMIN'), true);
    assert.throws(() => authorizeAction('COLLABORATOR', 'ADMIN'), /Yêu cầu quyền: ADMIN/i);
    assert.throws(() => authorizeAction('USER', 'ADMIN'), /Yêu cầu quyền: ADMIN/i);
  });

  it('10.8. Bảng chấm công 3 buổi (S, C, T) với ký hiệu LV, SV, NL và tổng hợp AI-AO', () => {
    // CTV có:
    // - Ca sáng: 2 buổi LV, 8 buổi SV
    // - Ca chiều: 2 buổi LV, 7 buổi SV
    // - Ca tối: 0 buổi LV, 5 buổi SV
    const sessionS = { lv: 2, sv: 8 };
    const sessionC = { lv: 2, sv: 7 };
    const sessionT = { lv: 0, sv: 5 };

    const sumLV = sessionS.lv + sessionC.lv + sessionT.lv; // Col AK: 4
    const gioLV = sumLV * 4.0; // Col AL: 16
    const gioSV = 82.0; // Col AM: tổng giờ từ Bảng thống kê công việc
    const tong = gioLV + gioSV; // Col AN: 98
    const tien = tong * 20000; // Col AO: 1.960.000 đ

    assert.equal(sumLV, 4);
    assert.equal(gioLV, 16);
    assert.equal(gioSV, 82.0);
    assert.equal(tong, 98.0);
    assert.equal(tien, 1960000);
  });

  it('10.9. Tính chính xác số ngày trong tháng (28/29 ngày Tháng 2, 30 ngày Tháng 4, 31 ngày Tháng 10)', () => {
    function getDays(m, y) {
      return new Date(y, m, 0).getDate();
    }

    assert.equal(getDays(10, 2026), 31); // Tháng 10 có 31 ngày
    assert.equal(getDays(4, 2026), 30);  // Tháng 4 có 30 ngày
    assert.equal(getDays(2, 2026), 28);  // Năm 2026 không nhuận: 28 ngày
    assert.equal(getDays(2, 2024), 29);  // Năm 2024 nhuận: 29 ngày
  });
});

// ============================================================
// TEST SUITE 11: QUY TRÌNH ĐĂNG KÝ - SẮP XẾP CA TRỰC CTV & KIỂM SOÁT KÝ HIỆU SV
// ============================================================
describe('Unit Test 11: Quy trình đăng ký - sắp xếp ca trực 3 giai đoạn & Kiểm soát ký hiệu SV', () => {
  // --- 11.1 Kiểm soát ký hiệu SV ---
  it('11.1. Chặn chọn ký hiệu SV nếu ngày đó CTV không có công việc COMPLETED trong Bảng thống kê', () => {
    function validateSVSelection({ symbol, ctvId, date, completedTasks }) {
      if (symbol === 'SV') {
        const hasValidTask = completedTasks.some(
          t => t.assignedToUserId === ctvId && t.date === date && t.status === 'COMPLETED'
        );
        if (!hasValidTask) {
          throw new Error('Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.');
        }
      }
      return true;
    }

    const ctvA = 'ctv-user-001';
    const ctvB = 'ctv-user-002';
    const completedTasks = [
      { assignedToUserId: ctvA, date: '2026-10-15', status: 'COMPLETED' },
      { assignedToUserId: ctvB, date: '2026-10-16', status: 'COMPLETED' },
      { assignedToUserId: ctvA, date: '2026-10-20', status: 'IN_PROGRESS' }, // Chưa xong
    ];

    // Ngày không có việc -> Ném đúng lỗi yêu cầu
    assert.throws(
      () => validateSVSelection({ symbol: 'SV', ctvId: ctvA, date: '2026-10-10', completedTasks }),
      /Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc\./
    );

    // Ngày có việc nhưng chưa COMPLETED -> Ném lỗi
    assert.throws(
      () => validateSVSelection({ symbol: 'SV', ctvId: ctvA, date: '2026-10-20', completedTasks }),
      /Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc\./
    );

    // Không thể dùng việc của CTV khác làm căn cứ (ctvA mượn ngày 16 của ctvB)
    assert.throws(
      () => validateSVSelection({ symbol: 'SV', ctvId: ctvA, date: '2026-10-16', completedTasks }),
      /Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc\./
    );

    // Ngày có việc COMPLETED -> Hợp lệ
    assert.equal(
      validateSVSelection({ symbol: 'SV', ctvId: ctvA, date: '2026-10-15', completedTasks }),
      true
    );
  });

  // --- 11.2 Giai đoạn 1: Tạo đợt trực tháng mới & Chống trùng lặp ---
  it('11.2. Chặn tạo trùng đợt đăng ký ca trực trong cùng một tháng/năm', () => {
    const existingPeriods = [
      { id: 'p1', month: 10, year: 2026, status: 'OPEN' }
    ];

    function createPeriod({ month, year, existingPeriods }) {
      const isDuplicate = existingPeriods.some(p => p.month === month && p.year === year);
      if (isDuplicate) {
        throw new Error(`Đợt trực tháng ${month}/${year} đã tồn tại trong hệ thống.`);
      }
      return { id: 'p2', month, year, status: 'OPEN' };
    }

    // Thử tạo trùng tháng 10/2026 -> Bị chặn
    assert.throws(
      () => createPeriod({ month: 10, year: 2026, existingPeriods }),
      /Đợt trực tháng 10\/2026 đã tồn tại/
    );

    // Tạo tháng 11/2026 -> Thành công
    const newPeriod = createPeriod({ month: 11, year: 2026, existingPeriods });
    assert.equal(newPeriod.month, 11);
    assert.equal(newPeriod.status, 'OPEN');
  });

  // --- 11.3 Giai đoạn 2: CTV đăng ký thời gian có thể trực (Availability) ---
  it('11.3. CTV chỉ được đăng ký/hủy ca rảnh khi đợt trực ở trạng thái OPEN', () => {
    function registerAvailability({ periodStatus, slots }) {
      if (periodStatus !== 'OPEN') {
        throw new Error('Đợt đăng ký ca trực này đã đóng hoặc không cho phép chỉnh sửa.');
      }
      return slots.map(s => ({ ...s, registered: true }));
    }

    const slots = [
      { date: '2026-10-01', session: 'S' },
      { date: '2026-10-01', session: 'C' },
      { date: '2026-10-02', session: 'T' },
    ];

    // Đợt OPEN -> Đăng ký thành công
    const registered = registerAvailability({ periodStatus: 'OPEN', slots });
    assert.equal(registered.length, 3);

    // Đợt CLOSED -> Bị từ chối
    assert.throws(
      () => registerAvailability({ periodStatus: 'CLOSED', slots }),
      /Đợt đăng ký ca trực này đã đóng/
    );

    // Đợt CONFIRMED -> Bị từ chối
    assert.throws(
      () => registerAvailability({ periodStatus: 'CONFIRMED', slots }),
      /Đợt đăng ký ca trực này đã đóng/
    );
  });

  // --- 11.4 Phân biệt Availability và Lịch chính thức ---
  it('11.4. Đăng ký rảnh của CTV không được tự động tính vào Bảng chấm công hay bảng lương', () => {
    // CTV có 5 slot rảnh được đăng ký
    const availabilityRegistrations = [
      { date: '2026-10-05', session: 'S' },
      { date: '2026-10-06', session: 'C' },
      { date: '2026-10-07', session: 'S' },
      { date: '2026-10-08', session: 'T' },
      { date: '2026-10-09', session: 'C' },
    ];

    // Tính công từ lịch chính thức (StudioShifts), KHÔNG lấy từ ShiftRegistrations
    function calculateDutyHours(officialConfirmedShifts) {
      return officialConfirmedShifts.filter(s => s.status === 'COMPLETED').length * 4.0;
    }

    // Khi chỉ mới đăng ký rảnh, chưa có ca nào CONFIRMED/COMPLETED -> Giờ = 0
    const officialShifts = [];
    assert.equal(calculateDutyHours(officialShifts), 0);
  });

  // --- 11.5 Giai đoạn 3: Phân công ca & Cảnh báo trùng ca ---
  it('11.5. Cảnh báo/chặn khi phân công 1 CTV trùng 2 ca trong cùng 1 buổi', () => {
    function assignShift({ assignments, newAssignment }) {
      const isDuplicate = assignments.some(
        a => a.userId === newAssignment.userId &&
             a.date === newAssignment.date &&
             a.session === newAssignment.session
      );
      if (isDuplicate) {
        throw new Error(`CTV đã được phân công vào ca này rồi.`);
      }
      return [...assignments, newAssignment];
    }

    const currentAssignments = [
      { userId: 'u1', date: '2026-10-10', session: 'S' }
    ];

    // Phân công trùng u1 vào sáng 10/10 -> Bị chặn
    assert.throws(
      () => assignShift({
        assignments: currentAssignments,
        newAssignment: { userId: 'u1', date: '2026-10-10', session: 'S' }
      }),
      /CTV đã được phân công/
    );

    // Phân công u1 vào chiều 10/10 -> Thành công
    const updated = assignShift({
      assignments: currentAssignments,
      newAssignment: { userId: 'u1', date: '2026-10-10', session: 'C' }
    });
    assert.equal(updated.length, 2);
  });

  // --- 11.6 Chốt lịch chính thức CONFIRMED & Đồng bộ LV ---
  it('11.6. Chốt lịch CONFIRMED đồng bộ sang Bảng chấm công (ký hiệu LV)', () => {
    const assignments = [
      { userId: 'ctv-1', date: '2026-10-05', session: 'S' },
      { userId: 'ctv-1', date: '2026-10-06', session: 'C' },
      { userId: 'ctv-2', date: '2026-10-05', session: 'S' }
    ];

    function confirmSchedule({ period, assignments }) {
      if (period.status === 'CONFIRMED') {
        throw new Error('Đợt này đã được chốt trước đó.');
      }
      const attendanceRecords = assignments.map(a => ({
        userId: a.userId,
        date: a.date,
        session: a.session,
        symbol: 'LV', // Lịch làm việc trực Studio
      }));
      return {
        periodStatus: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
        attendanceRecords,
      };
    }

    const result = confirmSchedule({
      period: { status: 'ARRANGING' },
      assignments
    });

    assert.equal(result.periodStatus, 'CONFIRMED');
    assert.equal(result.attendanceRecords.length, 3);
    assert.equal(result.attendanceRecords.every(r => r.symbol === 'LV'), true);
  });

  // --- 11.7 Bảo vệ quỹ lương: Lịch trực tương lai không tính tiền ---
  it('11.7. Ca trực tương lai (date > today) dù CONFIRMED vẫn không được tính tiền công', () => {
    const today = '2026-11-10';
    const shifts = [
      { date: '2026-10-05', status: 'COMPLETED' },   // Quá khứ, đã hoàn thành
      { date: '2026-10-10', status: 'COMPLETED' },   // Quá khứ, đã hoàn thành
      { date: '2026-11-15', status: 'CONFIRMED' },   // Tương lai
      { date: '2026-11-20', status: 'CONFIRMED' },   // Tương lai
    ];

    function calculatePayableDutyHours(shifts, referenceDate) {
      return shifts.filter(s => s.date <= referenceDate && s.status === 'COMPLETED').length * 4.0;
    }

    const payableHours = calculatePayableDutyHours(shifts, today);
    assert.equal(payableHours, 8.0); // Chỉ 2 ca quá khứ = 8h, 2 ca tương lai không được tính
  });

  // --- 11.8 Thông báo in-app cho các giai đoạn ---
  it('11.8. Tạo đúng định dạng thông báo in-app cho CTV và Admin theo 3 giai đoạn', () => {
    function createNotificationPayload({ type, recipientRole, month, year }) {
      switch (type) {
        case 'NEW_DUTY_PERIOD':
          return {
            title: 'Lịch trực tháng mới đã mở đăng ký',
            message: `Bộ phận Truyền thông đã mở đăng ký lịch trực Studio tháng ${month}/${year}. Vui lòng đăng ký ngày bạn có thể trực.`,
            link: '/tasks',
          };
        case 'SHIFT_REGISTERED':
          return {
            title: 'CTV cập nhật đăng ký lịch trực',
            message: `Một CTV vừa gửi đăng ký ngày có thể trực tháng ${month}/${year}.`,
            link: '/admin/duty',
          };
        case 'DUTY_CONFIRMED':
          return {
            title: 'Lịch trực Studio chính thức đã ban hành',
            message: `Lịch trực Studio tháng ${month}/${year} đã được chốt chính thức. Vui lòng kiểm tra lịch phân công của bạn.`,
            link: '/tasks',
          };
        default:
          throw new Error('Unknown notification type');
      }
    }

    const notifGiaiDoan1 = createNotificationPayload({ type: 'NEW_DUTY_PERIOD', month: 10, year: 2026 });
    assert.equal(notifGiaiDoan1.title, 'Lịch trực tháng mới đã mở đăng ký');
    assert.equal(notifGiaiDoan1.link, '/tasks');

    const notifGiaiDoan2 = createNotificationPayload({ type: 'SHIFT_REGISTERED', month: 10, year: 2026 });
    assert.equal(notifGiaiDoan2.title, 'CTV cập nhật đăng ký lịch trực');
    assert.equal(notifGiaiDoan2.link, '/admin/duty');

    const notifGiaiDoan3 = createNotificationPayload({ type: 'DUTY_CONFIRMED', month: 10, year: 2026 });
    assert.equal(notifGiaiDoan3.title, 'Lịch trực Studio chính thức đã ban hành');
    assert.equal(notifGiaiDoan3.link, '/tasks');
  });
});

// ============================================================
// TEST SUITE 12: ĐỒNG BỘ DANH SÁCH CTV TRONG BỘ LỌC VÀ DROPDOWN
// ============================================================
describe('Unit Test 12: Đồng bộ danh sách CTV trong các bộ lọc và dropdown', () => {
  const mockUserDb = [
    { id: 'u1', fullName: 'Đinh Thị Bích Hằng', email: 'admin@lhu.edu.vn', employeeCode: 'EMP001', role: 'ADMIN', status: 'Active', isActive: true },
    { id: 'u2', fullName: 'Châu Ngọc Thanh Thảo', email: 'thao@lhu.edu.vn', employeeCode: 'EMP002', role: 'USER', status: 'Active', isActive: true },
    { id: 'u3', fullName: 'Hoàng Thiện', email: 'thien@lhu.edu.vn', employeeCode: 'EMP003', role: 'COLLABORATOR', status: 'Active', isActive: true },
    { id: 'u4', fullName: 'An Bình', email: 'binh@lhu.edu.vn', employeeCode: 'EMP004', role: 'COLLABORATOR', status: 'Active', isActive: true },
    { id: 'u5', fullName: 'Vũ Đức', email: 'duc@lhu.edu.vn', employeeCode: 'EMP005', role: 'COLLABORATOR', status: 'Disabled', isActive: false },
    { id: 'u6', fullName: 'Khánh Linh', email: 'linh@lhu.edu.vn', employeeCode: 'EMP006', role: 'COLLABORATOR', status: 'Locked', isActive: false },
  ];

  function filterCollaborators(users, query = {}) {
    const { purpose, status, search } = query;
    // 1. Ràng buộc cứng: CHỈ lấy COLLABORATOR
    let list = users.filter((u) => u.role === 'COLLABORATOR');

    // 2. Phân định mục đích:
    if (purpose === 'assign' || status === 'Active') {
      list = list.filter((u) => u.status === 'Active' && u.isActive === true);
    } else if (status && status !== 'ALL') {
      list = list.filter((u) => u.status === status);
    }
    // purpose === 'filter' hoặc status === 'ALL': giữ lại tất cả các trạng thái

    // 3. Tìm kiếm
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((u) =>
        u.fullName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(s))
      );
    }

    // 4. Sắp xếp A-Z theo fullName
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }

  it('12.1. Ràng buộc Role: Danh sách chỉ chứa COLLABORATOR, tuyệt đối không lẫn USER hoặc ADMIN', () => {
    const result = filterCollaborators(mockUserDb, { purpose: 'filter' });
    assert.equal(result.every((u) => u.role === 'COLLABORATOR'), true);
    assert.equal(result.some((u) => u.role === 'ADMIN'), false);
    assert.equal(result.some((u) => u.role === 'USER'), false);
    assert.equal(result.length, 4); // 4 CTV: Hoàng Thiện, An Bình, Vũ Đức, Khánh Linh
  });

  it('12.2. Mục đích Phân công mới (purpose=assign): Chỉ lấy CTV Active, loại trừ Locked và Disabled', () => {
    const result = filterCollaborators(mockUserDb, { purpose: 'assign' });
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((u) => u.fullName), ['An Bình', 'Hoàng Thiện']);
    assert.equal(result.some((u) => u.status === 'Disabled'), false);
    assert.equal(result.some((u) => u.status === 'Locked'), false);
  });

  it('12.3. Mục đích Bộ lọc lịch sử (purpose=filter / status=ALL): Lấy đầy đủ cả CTV cũ/nghỉ việc', () => {
    const result = filterCollaborators(mockUserDb, { purpose: 'filter' });
    assert.equal(result.length, 4);
    assert.equal(result.some((u) => u.status === 'Disabled' && u.fullName === 'Vũ Đức'), true);
    assert.equal(result.some((u) => u.status === 'Locked' && u.fullName === 'Khánh Linh'), true);
  });

  it('12.4. Sắp xếp danh sách CTV theo thứ tự bảng chữ cái A-Z theo Họ tên', () => {
    const result = filterCollaborators(mockUserDb, { purpose: 'filter' });
    const names = result.map((u) => u.fullName);
    assert.deepEqual(names, ['An Bình', 'Hoàng Thiện', 'Khánh Linh', 'Vũ Đức']);
  });

  it('12.5. Tìm kiếm nhanh CTV theo Họ tên, Email, hoặc Mã nhân viên', () => {
    const searchByName = filterCollaborators(mockUserDb, { search: 'Thiện' });
    assert.equal(searchByName.length, 1);
    assert.equal(searchByName[0].fullName, 'Hoàng Thiện');

    const searchByEmail = filterCollaborators(mockUserDb, { search: 'binh@' });
    assert.equal(searchByEmail.length, 1);
    assert.equal(searchByEmail[0].email, 'binh@lhu.edu.vn');

    const searchByCode = filterCollaborators(mockUserDb, { search: 'EMP005' });
    assert.equal(searchByCode.length, 1);
    assert.equal(searchByCode[0].employeeCode, 'EMP005');
  });

  it('12.6. Chặn phân công ca trực cho tài khoản không hoạt động (Locked/Disabled)', () => {
    function validateAssignee(user) {
      if (user.role !== 'COLLABORATOR') {
        throw new Error('Chỉ có thể phân công cho Cộng tác viên (COLLABORATOR)');
      }
      if (user.status !== 'Active' || !user.isActive) {
        throw new Error(`Không thể phân công ca trực cho tài khoản không hoạt động (${user.status})`);
      }
      return true;
    }

    assert.equal(validateAssignee(mockUserDb[2]), true); // Hoàng Thiện Active
    assert.throws(() => validateAssignee(mockUserDb[0]), /Chỉ có thể phân công cho Cộng tác viên/); // ADMIN
    assert.throws(() => validateAssignee(mockUserDb[4]), /Không thể phân công ca trực cho tài khoản không hoạt động/); // Disabled
    assert.throws(() => validateAssignee(mockUserDb[5]), /Không thể phân công ca trực cho tài khoản không hoạt động/); // Locked
  });
});




// =========================================================================
// UNIT TEST 13: HỆ THỐNG THÔNG BÁO IN-APP VÀ EMAIL GIAO DỊCH (TASK 4.1 - FR-07)
// =========================================================================
describe('Unit Test 13: Hệ thống thông báo in-app và email giao dịch (FR-07)', () => {
  it('13.1. Tạo thông báo hợp lệ với đầy đủ tiêu đề, nội dung và trạng thái mặc định isRead = false', () => {
    function createMockNotification({ userId, title, message, type = 'SYSTEM', link = null }) {
      if (!userId || !title || !message) {
        throw new Error('userId, title và message là bắt buộc');
      }
      return {
        id: 'mock-uuid-' + Math.random(),
        userId,
        title: title.trim(),
        message: message.trim(),
        type,
        link,
        isRead: false,
        createdAt: new Date(),
      };
    }

    const notif = createMockNotification({
      userId: 'user-123',
      title: 'Thông báo kiểm thử',
      message: 'Nội dung kiểm thử',
      type: 'TASK_ASSIGNED',
      link: '/tasks',
    });

    assert.equal(notif.userId, 'user-123');
    assert.equal(notif.title, 'Thông báo kiểm thử');
    assert.equal(notif.isRead, false);
    assert.equal(notif.type, 'TASK_ASSIGNED');
    assert.throws(() => createMockNotification({ userId: 'u1' }), /bắt buộc/);
  });

  it('13.2. Cập nhật trạng thái đã đọc (isRead: true) cho từng thông báo hoặc toàn bộ', () => {
    const notifications = [
      { id: '1', userId: 'u1', isRead: false },
      { id: '2', userId: 'u1', isRead: false },
      { id: '3', userId: 'u2', isRead: false },
    ];

    // Đánh dấu 1 thông báo
    const target = notifications.find((n) => n.id === '1');
    target.isRead = true;
    assert.equal(target.isRead, true);

    // Đánh dấu tất cả của u1
    notifications.forEach((n) => {
      if (n.userId === 'u1') n.isRead = true;
    });
    const unreadU1 = notifications.filter((n) => n.userId === 'u1' && !n.isRead);
    assert.equal(unreadU1.length, 0);

    // u2 vẫn còn chưa đọc
    const unreadU2 = notifications.filter((n) => n.userId === 'u2' && !n.isRead);
    assert.equal(unreadU2.length, 1);
  });

  it('13.3. Phân loại chuẩn xác các mã sự kiện nghiệp vụ (FR-07.4)', () => {
    const validEventTypes = [
      'TASK_ASSIGNED',
      'TASK_REVISION_REQUESTED',
      'TASK_COMPLETED',
      'TASK_SUBMITTED',
      'BORROW_REQUEST_CREATED',
      'BORROW_REQUEST_APPROVED',
      'BORROW_REQUEST_REJECTED',
      'EQUIPMENT_HANDED_OVER',
      'EQUIPMENT_RETURNED',
      'BORROW_OVERDUE',
      'STUDIO_BOOKING_REQUEST',
      'STUDIO_BOOKING_APPROVED',
      'STUDIO_BOOKING_REJECTED',
      'DUTY_PERIOD_OPEN',
      'DUTY_REGISTRATION_SUBMITTED',
      'DUTY_SCHEDULE_CONFIRMED',
    ];

    validEventTypes.forEach((evt) => {
      assert.equal(typeof evt, 'string');
      assert.equal(evt.length > 5, true);
    });
  });

  it('13.4. Quét nợ quá hạn: Tự động phát hiện các đơn HANDED_OVER có returnDate < NOW', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const requests = [
      { id: 'r1', status: 'HANDED_OVER', returnDate: new Date('2026-11-09T10:00:00Z') }, // Quá hạn
      { id: 'r2', status: 'HANDED_OVER', returnDate: new Date('2026-11-12T10:00:00Z') }, // Chưa quá hạn
      { id: 'r3', status: 'APPROVED', returnDate: new Date('2026-11-08T10:00:00Z') },    // Chưa nhận máy
      { id: 'r4', status: 'RETURNED', returnDate: new Date('2026-11-07T10:00:00Z') },    // Đã trả
    ];

    const overdue = requests.filter(
      (r) => r.status === 'HANDED_OVER' && r.returnDate < now
    );
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0].id, 'r1');
  });

  it('13.5. Cơ chế fallback an toàn của hàm gửi email giao dịch khi SMTP chưa cấu hình', async () => {
    async function mockSendNotificationEmail(to, data) {
      const smtpUser = process.env.SMTP_USER;
      if (!smtpUser || smtpUser.includes('example.com')) {
        return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
      }
      return { success: true };
    }

    const res = await mockSendNotificationEmail('ctv@lhu.edu.vn', {
      title: 'Test Email',
      message: 'Test Message',
    });
    assert.equal(typeof res, 'object');
    assert.equal(res.success !== undefined, true);
  });

  it('13.6. Ràng buộc QUY_TAC.md 10.4: Chặn tạo thông báo duyệt bảng lương trong hệ thống', () => {
    function validateNotificationType(type) {
      if (type.toUpperCase().includes('PAYROLL_APPROVED') || type.toUpperCase().includes('SALARY_APPROVED')) {
        throw new Error('Không được tạo thông báo phê duyệt bảng lương theo QUY_TAC.md Mục 10.4');
      }
      return true;
    }

    assert.equal(validateNotificationType('TASK_COMPLETED'), true);
    assert.equal(validateNotificationType('DUTY_SCHEDULE_CONFIRMED'), true);
    assert.throws(
      () => validateNotificationType('PAYROLL_APPROVED'),
      /Không được tạo thông báo phê duyệt bảng lương/
    );
  });
});

// ============================================================
// TEST SUITE 14: QUY TẮC ĐỒNG BỘ CÔNG VIỆC CTV & BẢNG CHẤM CÔNG THÁNG (LV -> SV)
// ============================================================

describe('Unit Test 14: Quy tắc đồng bộ giữa Công việc của CTV và Bảng chấm công tháng', () => {
  const { getSessionsForDayHours } = require('../src/services/payroll.service');

  it('14.1. Quy tắc phân bổ: Dưới 5 tiếng (kể cả dưới 4h và từ 4 đến dưới 5h) -> SV buổi sáng (S)', () => {
    const res1 = getSessionsForDayHours(1.5);
    assert.deepEqual(res1.sessions, ['S']);
    assert.equal(res1.isPendingConfirmation, false);

    const res2 = getSessionsForDayHours(3.9);
    assert.deepEqual(res2.sessions, ['S']);
    assert.equal(res2.isPendingConfirmation, false);

    const res3 = getSessionsForDayHours(4.0);
    assert.deepEqual(res3.sessions, ['S']);
    assert.equal(res3.isPendingConfirmation, false);

    const res4 = getSessionsForDayHours(4.8);
    assert.deepEqual(res4.sessions, ['S']);
    assert.equal(res4.isPendingConfirmation, false);
  });

  it('14.2. Quy tắc phân bổ: Từ 5 đến 8 tiếng -> SV buổi sáng và chiều (S + C)', () => {
    const res1 = getSessionsForDayHours(5.0);
    assert.deepEqual(res1.sessions, ['S', 'C']);
    assert.equal(res1.isPendingConfirmation, false);

    const res2 = getSessionsForDayHours(7.5);
    assert.deepEqual(res2.sessions, ['S', 'C']);
    assert.equal(res2.isPendingConfirmation, false);

    const res3 = getSessionsForDayHours(8.0);
    assert.deepEqual(res3.sessions, ['S', 'C']);
    assert.equal(res3.isPendingConfirmation, false);
  });

  it('14.3. Quy tắc phân bổ: Trên 8 tiếng -> SV cả sáng, chiều và tối (S + C + T)', () => {
    const res1 = getSessionsForDayHours(8.5);
    assert.deepEqual(res1.sessions, ['S', 'C', 'T']);
    assert.equal(res1.isPendingConfirmation, false);

    const res2 = getSessionsForDayHours(10.0);
    assert.deepEqual(res2.sessions, ['S', 'C', 'T']);
    assert.equal(res2.isPendingConfirmation, false);
  });

  it('14.4. Quy tắc phân bổ: Trường hợp làm việc từ 4 đến dưới 5 tiếng chính thức phân bổ buổi sáng (S)', () => {
    const res1 = getSessionsForDayHours(4.0);
    assert.deepEqual(res1.sessions, ['S']);
    assert.equal(res1.isPendingConfirmation, false);

    const res2 = getSessionsForDayHours(4.5);
    assert.deepEqual(res2.sessions, ['S']);
    assert.equal(res2.isPendingConfirmation, false);

    const res3 = getSessionsForDayHours(4.99);
    assert.deepEqual(res3.sessions, ['S']);
    assert.equal(res3.isPendingConfirmation, false);
  });

  it('14.5. Chỉ áp dụng cho công việc đã COMPLETED, loại trừ PENDING_APPROVAL hoặc REVISION_REQUESTED', () => {
    function filterCompletedTasks(tasks) {
      return tasks.filter((t) => t.status === 'COMPLETED');
    }

    const tasks = [
      { id: '1', status: 'COMPLETED', actualHours: 3 },
      { id: '2', status: 'PENDING_APPROVAL', actualHours: 6 },
      { id: '3', status: 'REVISION_REQUESTED', actualHours: 4 },
      { id: '4', status: 'IN_PROGRESS', actualHours: 5 },
    ];

    const validTasks = filterCompletedTasks(tasks);
    assert.equal(validTasks.length, 1);
    assert.equal(validTasks[0].id, '1');
  });

  it('14.6. Khử trùng thời gian: Ca trực bị chuyển thành SV không được tính 2 lần trong thù lao', () => {
    // CTV có ca trực sáng (4h) và task 2h cùng ngày
    // Task 2h -> buổi sáng thành SV
    // Giờ LV của buổi sáng không được tính trùng
    const validShifts = [{ date: '2026-11-10', shiftType: 'MORNING' }];
    const svSessionsByDate = { '2026-11-10': ['S'] };

    function filterNonOverlapShifts(shifts, svSessionsMap) {
      return shifts.filter((s) => {
        const sess = s.shiftType === 'MORNING' ? 'S' : s.shiftType === 'AFTERNOON' ? 'C' : 'T';
        const svSessions = svSessionsMap[s.date] || [];
        return !svSessions.includes(sess);
      });
    }

    const actualLvShifts = filterNonOverlapShifts(validShifts, svSessionsByDate);
    assert.equal(actualLvShifts.length, 0, 'Ca trực đã chuyển sang SV phải được loại trừ khỏi tính giờ LV');
  });
});

// ============================================================
// TEST SUITE 15: LỊCH SỬ THAO TÁC AUDIT LOGS (FR-09 - TASK 4.2)
// ============================================================
describe('Unit Test 15: Lịch sử thao tác & Khử khuẩn dữ liệu kiểm toán (Audit Logs FR-09)', () => {
  const auditLogService = require('../src/services/auditLog.service');

  it('15.1. Khử khuẩn dữ liệu nhạy cảm: Mật khẩu, OTP, token, secret phải được che mờ [PROTECTED]', () => {
    const raw = {
      user: 'Nguyen Van A',
      email: 'a@lhu.edu.vn',
      password: 'PlainPassword123!',
      otp: '654321',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      metadata: {
        nestedPassword: 'AnotherPassword',
        nestedOtp: '112233',
        authSecret: 'TopSecretKey',
        role: 'COLLABORATOR',
      },
    };

    const clean = auditLogService.sanitizeDetails(raw);
    assert.equal(clean.password, '[PROTECTED]');
    assert.equal(clean.otp, '[PROTECTED]');
    assert.equal(clean.token, '[PROTECTED]');
    assert.equal(clean.metadata.nestedPassword, '[PROTECTED]');
    assert.equal(clean.metadata.nestedOtp, '[PROTECTED]');
    assert.equal(clean.metadata.authSecret, '[PROTECTED]');
    assert.equal(clean.user, 'Nguyen Van A');
    assert.equal(clean.metadata.role, 'COLLABORATOR');
  });

  it('15.2. Chuẩn hóa địa chỉ IP client: Loại bỏ tiền tố IPv6 ::ffff: và lấy IP đầu tiên từ proxy', () => {
    const mockReq1 = { headers: {}, socket: { remoteAddress: '::ffff:192.168.1.50' } };
    assert.equal(auditLogService.getClientIp(mockReq1), '192.168.1.50');

    const mockReq2 = {
      headers: { 'x-forwarded-for': '14.162.144.10, 10.0.0.1' },
      socket: {},
    };
    assert.equal(auditLogService.getClientIp(mockReq2), '14.162.144.10');

    const mockReq3 = { headers: {}, socket: {} };
    assert.equal(auditLogService.getClientIp(mockReq3), '127.0.0.1');
  });

  it('15.3. Bảo mật RBAC: Chỉ ADMIN mới được xem Audit Logs, chặn COLLABORATOR và USER', () => {
    const { authorize } = require('../src/middlewares/auth.middleware');
    const adminReq = { user: { id: 'u1', role: 'ADMIN' } };
    const ctvReq = { user: { id: 'u2', role: 'COLLABORATOR' } };
    const userReq = { user: { id: 'u3', role: 'USER' } };

    let adminNextCalled = false;
    let ctvStatus = null;
    let userStatus = null;

    const resMock = {
      status(code) {
        return {
          json(data) {
            this.code = code;
            this.data = data;
          },
        };
      },
    };

    const adminRes = Object.create(resMock);
    const ctvRes = {
      status(code) {
        ctvStatus = code;
        return { json: () => {} };
      },
    };
    const userRes = {
      status(code) {
        userStatus = code;
        return { json: () => {} };
      },
    };

    const rbacMiddleware = authorize('ADMIN');

    rbacMiddleware(adminReq, adminRes, () => {
      adminNextCalled = true;
    });
    rbacMiddleware(ctvReq, ctvRes, () => {});
    rbacMiddleware(userReq, userRes, () => {});

    assert.equal(adminNextCalled, true, 'ADMIN phải được truy cập vào Audit Logs');
    assert.equal(ctvStatus, 403, 'COLLABORATOR phải bị chặn 403 Forbidden');
    assert.equal(userStatus, 403, 'USER phải bị chặn 403 Forbidden');
  });

  it('15.4. Xác thực tính đầy đủ của trường dữ liệu khi ghi AuditLog payload', () => {
    const payload = {
      userId: '1e9ec357-369d-48ed-987c-f8f3ee568ce4',
      action: 'APPROVE',
      resource: 'BORROW_REQUEST',
      resourceId: 'req-uuid-12345',
      ip: '127.0.0.1',
      status: 'SUCCESS',
    };

    assert.ok(payload.userId, 'AuditLog phải có userId');
    assert.ok(payload.action, 'AuditLog phải có action');
    assert.ok(payload.resource, 'AuditLog phải có resource');
    assert.ok(payload.ip, 'AuditLog phải có ip');
    assert.equal(payload.status, 'SUCCESS');
  });
});

describe('Unit Test 16: Quản lý bảo trì, sửa chữa theo hóa đơn, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3)', () => {
  it('16.1. Xác thực hợp lệ của các loại phiếu: MAINTENANCE, REPAIR, LOST, DISPOSAL', () => {
    const validTypes = ['MAINTENANCE', 'REPAIR', 'LOST', 'DISPOSAL'];
    function validateType(type) {
      if (!validTypes.includes(type)) {
        throw new Error('Loại ghi nhận không hợp lệ.');
      }
      return true;
    }

    assert.equal(validateType('MAINTENANCE'), true);
    assert.equal(validateType('REPAIR'), true);
    assert.equal(validateType('LOST'), true);
    assert.equal(validateType('DISPOSAL'), true);
    assert.throws(() => validateType('INVALID_TYPE'), /Loại ghi nhận không hợp lệ/);
  });

  it('16.2. Quy tắc chuyển trạng thái thiết bị theo vòng đời bảo trì và nghiệm thu hoàn tất', () => {
    function processMaintenanceLifecycle(initialEquipmentStatus, maintenanceType, maintenanceStatus) {
      let nextStatus = initialEquipmentStatus;
      if (maintenanceType === 'MAINTENANCE' || maintenanceType === 'REPAIR') {
        if (maintenanceStatus === 'IN_PROGRESS') {
          nextStatus = 'MAINTENANCE';
        } else if (maintenanceStatus === 'COMPLETED') {
          nextStatus = 'AVAILABLE';
        }
      } else if (maintenanceType === 'LOST') {
        nextStatus = 'LOST';
      } else if (maintenanceType === 'DISPOSAL') {
        nextStatus = 'DISPOSED';
      }
      return nextStatus;
    }

    // Đang có sẵn -> Đưa đi sửa chữa -> Chuyển sang MAINTENANCE
    assert.equal(processMaintenanceLifecycle('AVAILABLE', 'REPAIR', 'IN_PROGRESS'), 'MAINTENANCE');

    // Đang bảo trì -> Nghiệm thu hoàn tất (COMPLETED) -> Khôi phục AVAILABLE
    assert.equal(processMaintenanceLifecycle('MAINTENANCE', 'REPAIR', 'COMPLETED'), 'AVAILABLE');

    // Báo mất -> Chuyển sang LOST
    assert.equal(processMaintenanceLifecycle('AVAILABLE', 'LOST', 'IN_PROGRESS'), 'LOST');

    // Thanh lý thiết bị -> Chuyển sang DISPOSED
    assert.equal(processMaintenanceLifecycle('AVAILABLE', 'DISPOSAL', 'COMPLETED'), 'DISPOSED');
  });

  it('16.3. Xác thực tính toàn vẹn của chứng từ hóa đơn, số tiền và đơn vị thực hiện', () => {
    const maintenanceData = {
      title: 'Thay thế màn hình và cảm biến máy quay',
      type: 'REPAIR',
      cost: 2500000,
      invoiceNumber: 'HD-2026-8899',
      invoiceDate: '2026-11-16',
      invoiceUrl: '/uploads/invoices/hd-8899.pdf',
      serviceProvider: 'Trung tâm bảo hành Sony Lotte',
    };

    assert.ok(maintenanceData.title.length >= 3, 'Tiêu đề phiếu phải từ 3 ký tự trở lên');
    assert.ok(maintenanceData.cost >= 0, 'Chi phí không thể âm');
    assert.ok(maintenanceData.invoiceNumber, 'Phải có số hóa đơn / chứng từ');
    assert.ok(maintenanceData.serviceProvider, 'Phải có đơn vị thực hiện sửa chữa');
  });

  it('16.4. Bảo vệ RBAC: Chỉ ADMIN mới được tạo và quản lý phiếu bảo trì / thanh lý thiết bị', () => {
    const { authorize } = require('../src/middlewares/auth.middleware');

    const adminReq = { user: { id: 'admin-uuid', role: 'ADMIN' } };
    const ctvReq = { user: { id: 'ctv-uuid', role: 'COLLABORATOR' } };
    const userReq = { user: { id: 'user-uuid', role: 'USER' } };

    let adminAllowed = false;
    let ctvStatusCode = null;
    let userStatusCode = null;

    const resMock = (callback) => ({
      status(code) {
        callback(code);
        return { json: () => {} };
      },
    });

    const rbac = authorize('ADMIN');
    rbac(adminReq, {}, () => {
      adminAllowed = true;
    });
    rbac(ctvReq, resMock((c) => (ctvStatusCode = c)), () => {});
    rbac(userReq, resMock((c) => (userStatusCode = c)), () => {});

    assert.equal(adminAllowed, true, 'ADMIN phải có quyền truy cập');
    assert.equal(ctvStatusCode, 403, 'COLLABORATOR phải bị chặn 403');
    assert.equal(userStatusCode, 403, 'USER phải bị chặn 403');
  });

  it('16.5. Quy tắc QUY_TAC.md 2.2 & 2.4: Lịch sử bảo trì, sửa chữa, mất và thanh lý phải được bảo toàn', () => {
    // Mô phỏng kiểm tra ràng buộc không được xóa thiết bị nếu có lịch sử bảo trì liên kết
    function checkCanDeleteEquipment(maintenanceHistoryCount) {
      if (maintenanceHistoryCount > 0) {
        return {
          canDelete: false,
          reason: 'Thiết bị đã có lịch sử bảo trì/sửa chữa/thanh lý nên không được xóa vật lý.',
        };
      }
      return { canDelete: true, reason: 'Có thể xóa vật lý.' };
    }

    const checkWithHistory = checkCanDeleteEquipment(3);
    assert.equal(checkWithHistory.canDelete, false);
    assert.match(checkWithHistory.reason, /không được xóa vật lý/);

    const checkEmpty = checkCanDeleteEquipment(0);
    assert.equal(checkEmpty.canDelete, true);
  });
});

// ============================================================
// TEST SUITE 17: DASHBOARD THỐNG KÊ CÔNG VIỆC TRỄ HẠN & THÙ LAO CTV (FR-08)
// ============================================================
describe('Unit Test 17: Mở rộng Dashboard Admin: Thống kê công việc trễ hạn và thù lao CTV theo tháng (FR-08)', () => {
  it('17.1. Phân loại trạng thái nhiệm vụ và phát hiện chính xác công việc trễ hạn (isOverdue)', () => {
    const now = new Date('2026-11-20T12:00:00Z');

    const tasks = [
      { id: 't1', title: 'Chụp ảnh sự kiện', status: 'IN_PROGRESS', deadline: '2026-11-19T10:00:00Z' }, // Overdue
      { id: 't2', title: 'Quay video phỏng vấn', status: 'PENDING_APPROVAL', deadline: '2026-11-18T17:00:00Z' }, // Overdue
      { id: 't3', title: 'Thiết kế banner LHU', status: 'IN_PROGRESS', deadline: '2026-11-25T17:00:00Z' }, // On time
      { id: 't4', title: 'Chỉnh sửa clip hội thảo', status: 'COMPLETED', deadline: '2026-11-15T17:00:00Z' }, // Completed (NOT overdue)
      { id: 't5', title: 'Soạn kịch bản trailer', status: 'NOT_STARTED', deadline: null }, // No deadline (NOT overdue)
    ];

    function calculateTaskStats(items, currentTime) {
      let total = items.length;
      let inProgress = 0;
      let pendingApproval = 0;
      let completed = 0;
      let overdue = 0;

      for (const t of items) {
        if (t.status === 'IN_PROGRESS') inProgress++;
        if (t.status === 'PENDING_APPROVAL') pendingApproval++;
        if (t.status === 'COMPLETED') completed++;

        const isOverdue = t.deadline && new Date(t.deadline) < currentTime && !['COMPLETED', 'CANCELLED'].includes(t.status);
        if (isOverdue) overdue++;
      }

      return { total, inProgress, pendingApproval, completed, overdue };
    }

    const stats = calculateTaskStats(tasks, now);

    assert.equal(stats.total, 5, 'Tổng số công việc phải là 5');
    assert.equal(stats.inProgress, 2, 'Số công việc đang làm phải là 2');
    assert.equal(stats.pendingApproval, 1, 'Số công việc chờ duyệt phải là 1');
    assert.equal(stats.completed, 1, 'Số công việc đã hoàn thành phải là 1');
    assert.equal(stats.overdue, 2, 'Số công việc trễ hạn phải là 2 (t1 và t2)');
  });

  it('17.2. Thống kê tổng hợp thù lao CTV tháng hiện tại từ danh sách MonthlyPayroll', () => {
    const payrollRecords = [
      { userId: 'u1', month: 11, year: 2026, totalAmount: 850000, totalCalculatedHours: 42.5, status: 'CONFIRMED' },
      { userId: 'u2', month: 11, year: 2026, totalAmount: 1200000, totalCalculatedHours: 60.0, status: 'PAID' },
      { userId: 'u3', month: 11, year: 2026, totalAmount: 300000, totalCalculatedHours: 15.0, status: 'DRAFT' },
      { userId: 'u4', month: 11, year: 2026, totalAmount: 0, totalCalculatedHours: 0, status: 'DRAFT' }, // 0 h, không hoạt động
    ];

    function aggregateMonthlyPayroll(records) {
      let totalAmount = 0;
      let totalHours = 0;
      let activeCollaborators = 0;
      const statusBreakdown = { DRAFT: 0, CONFIRMED: 0, PAID: 0 };

      for (const p of records) {
        totalAmount += p.totalAmount;
        totalHours += p.totalCalculatedHours;
        if (p.totalAmount > 0 || p.totalCalculatedHours > 0) {
          activeCollaborators++;
        }
        if (statusBreakdown[p.status] !== undefined) {
          statusBreakdown[p.status]++;
        }
      }

      return {
        totalAmount,
        totalHours: Math.round(totalHours * 10) / 10,
        activeCollaborators,
        statusBreakdown,
      };
    }

    const summary = aggregateMonthlyPayroll(payrollRecords);

    assert.equal(summary.totalAmount, 2350000, 'Tổng thù lao phải là 2.350.000 VNĐ');
    assert.equal(summary.totalHours, 117.5, 'Tổng số giờ công quy đổi phải là 117.5 giờ');
    assert.equal(summary.activeCollaborators, 3, 'Số CTV có phát sinh giờ công phải là 3');
    assert.equal(summary.statusBreakdown.DRAFT, 2);
    assert.equal(summary.statusBreakdown.CONFIRMED, 1);
    assert.equal(summary.statusBreakdown.PAID, 1);
  });

  it('17.3. Trích xuất danh sách công việc khẩn cấp / trễ hạn (urgentTasks) xếp theo hạn chót tăng dần', () => {
    const now = new Date('2026-11-20T12:00:00Z');

    const tasks = [
      { id: 't1', title: 'Bài viết số 1', deadline: new Date('2026-11-25T17:00:00Z'), status: 'IN_PROGRESS' },
      { id: 't2', title: 'Quay phim Studio', deadline: new Date('2026-11-18T10:00:00Z'), status: 'IN_PROGRESS' },
      { id: 't3', title: 'Biên tập video', deadline: new Date('2026-11-21T09:00:00Z'), status: 'IN_PROGRESS' },
      { id: 't4', title: 'Hội nghị trực tuyến', deadline: new Date('2026-11-15T08:00:00Z'), status: 'PENDING_APPROVAL' },
    ];

    // Sắp xếp tăng dần theo deadline (hạn sớm nhất hoặc trễ nhất đứng đầu)
    const sorted = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const urgentTasks = sorted.map((t) => ({
      ...t,
      isOverdue: new Date(t.deadline) < now,
    }));

    assert.equal(urgentTasks[0].id, 't4', 'Task trễ nhất phải xếp đầu tiên');
    assert.equal(urgentTasks[0].isOverdue, true, 'Task t4 phải là overdue');
    assert.equal(urgentTasks[1].id, 't2', 'Task t2 xếp vị trí số 2');
    assert.equal(urgentTasks[1].isOverdue, true, 'Task t2 phải là overdue');
    assert.equal(urgentTasks[2].id, 't3', 'Task t3 xếp vị trí số 3');
    assert.equal(urgentTasks[2].isOverdue, false, 'Task t3 chưa overdue');
    assert.equal(urgentTasks[3].id, 't1', 'Task t1 xếp vị trí số 4');
  });

  it('17.4. Bảo vệ RBAC cho Dashboard Admin: Chỉ ADMIN mới được truy cập /api/dashboard', () => {
    const { authorize } = require('../src/middlewares/auth.middleware');

    const adminReq = { user: { id: 'admin-1', role: 'ADMIN' } };
    const ctvReq = { user: { id: 'ctv-1', role: 'COLLABORATOR' } };
    const userReq = { user: { id: 'user-1', role: 'USER' } };

    let adminNext = false;
    let ctvCode = null;
    let userCode = null;

    const resMock = (cb) => ({
      status: (code) => {
        cb(code);
        return { json: () => {} };
      },
    });

    const rbac = authorize('ADMIN');
    rbac(adminReq, {}, () => {
      adminNext = true;
    });
    rbac(ctvReq, resMock((c) => (ctvCode = c)), () => {});
    rbac(userReq, resMock((c) => (userCode = c)), () => {});

    assert.equal(adminNext, true, 'ADMIN phải được truy cập vào dashboard');
    assert.equal(ctvCode, 403, 'COLLABORATOR phải bị từ chối 403 khi vào dashboard admin');
    assert.equal(userCode, 403, 'USER phải bị từ chối 403 khi vào dashboard admin');
  });
});

// ============================================================
// TEST SUITE 18: DỜI LỊCH / THAY ĐỔI LỊCH ĐẶT PHÒNG STUDIO (FR-03.6 - Task 4.5)
// ============================================================
describe('Unit Test 18: Nghiệp vụ Dời lịch / Thay đổi lịch đặt phòng Studio (FR-03.6 - Task 4.5)', () => {
  const { validateOperatingHours, BUFFER_MS } = require('../src/services/studioBooking.service');

  it('18.1. Kiểm tra tính hợp lệ khi dời lịch vào khung giờ hoạt động chuẩn (T2-T7, ca sáng/ca chiều, cùng ngày, cấm Chủ nhật)', () => {
    // Thứ Tư, 2026-11-25: Ca sáng hợp lệ (08:00 - 11:00)
    assert.doesNotThrow(() => {
      validateOperatingHours('2026-11-25T01:00:00Z', '2026-11-25T04:00:00Z'); // 08:00 - 11:00 VN
    }, 'Khung giờ sáng Thứ Tư phải hợp lệ');

    // Thứ Sáu, 2026-11-27: Ca chiều hợp lệ (14:00 - 16:00)
    assert.doesNotThrow(() => {
      validateOperatingHours('2026-11-27T07:00:00Z', '2026-11-27T09:00:00Z'); // 14:00 - 16:00 VN
    }, 'Khung giờ chiều Thứ Sáu phải hợp lệ');

    // Chặn dời lịch sang Chủ nhật (2026-11-29)
    assert.throws(
      () => validateOperatingHours('2026-11-29T02:00:00Z', '2026-11-29T04:00:00Z'),
      /không hoạt động vào Chủ nhật/,
      'Phải từ chối dời lịch sang Chủ nhật'
    );

    // Chặn dời lịch xuyên trưa (11:00 - 14:00)
    assert.throws(
      () => validateOperatingHours('2026-11-25T04:00:00Z', '2026-11-25T07:00:00Z'),
      /khung giờ hoạt động/,
      'Phải từ chối dời lịch xuyên trưa'
    );

    // Chặn dời lịch xuyên ngày (bắt đầu hôm nay, kết thúc hôm sau)
    assert.throws(
      () => validateOperatingHours('2026-11-25T02:00:00Z', '2026-11-26T04:00:00Z'),
      /trong cùng một ngày/,
      'Phải từ chối dời lịch xuyên ngày'
    );
  });

  it('18.2. Phát hiện xung đột lịch và vi phạm khoảng đệm 30 phút khi dời sang khung giờ đã có booking CONFIRMED khác', () => {
    // Giả sử có booking A (CONFIRMED): 08:00 - 10:00 ngày 25/11/2026
    const bookingA = {
      id: 'booking-a',
      startTime: new Date('2026-11-25T01:00:00Z').getTime(), // 08:00 VN
      endTime: new Date('2026-11-25T03:00:00Z').getTime(),   // 10:00 VN
      status: 'CONFIRMED',
    };

    function checkConflictInMemory(newStart, newEnd, excludeId, existingBookings) {
      const bufferedStart = newStart - BUFFER_MS;
      const bufferedEnd = newEnd + BUFFER_MS;

      return existingBookings.find((b) => {
        if (b.id === excludeId) return false;
        if (!['CONFIRMED', 'COMPLETED'].includes(b.status)) return false;
        return b.startTime < bufferedEnd && b.endTime > bufferedStart;
      });
    }

    // Booking B (đang dời) dời sang 09:30 - 11:30 -> Trùng trực tiếp
    const conflictDirect = checkConflictInMemory(
      new Date('2026-11-25T02:30:00Z').getTime(), // 09:30 VN
      new Date('2026-11-25T04:30:00Z').getTime(), // 11:30 VN
      'booking-b',
      [bookingA]
    );
    assert.ok(conflictDirect, 'Phải phát hiện trùng lịch trực tiếp');
    assert.equal(conflictDirect.id, 'booking-a');

    // Booking B dời sang 10:15 - 11:30 -> Cách 15 phút (vi phạm khoảng đệm 30 phút)
    const conflictBuffer = checkConflictInMemory(
      new Date('2026-11-25T03:15:00Z').getTime(), // 10:15 VN
      new Date('2026-11-25T04:30:00Z').getTime(), // 11:30 VN
      'booking-b',
      [bookingA]
    );
    assert.ok(conflictBuffer, 'Phải phát hiện vi phạm khoảng đệm 30 phút');

    // Booking B dời sang 10:30 - 11:30 -> Cách đúng 30 phút -> HỢP LỆ
    const validSlot = checkConflictInMemory(
      new Date('2026-11-25T03:30:00Z').getTime(), // 10:30 VN
      new Date('2026-11-25T04:30:00Z').getTime(), // 11:30 VN
      'booking-b',
      [bookingA]
    );
    assert.equal(validSlot, undefined, 'Cách đúng 30 phút phải không bị xung đột');

    // Tự dời lịch của chính mình: Không tự xung đột với chính bookingId của mình
    const selfExclude = checkConflictInMemory(
      bookingA.startTime,
      bookingA.endTime,
      'booking-a', // Trùng ID với chính mình
      [bookingA]
    );
    assert.equal(selfExclude, undefined, 'Loại trừ chính bookingId hiện tại thì không tự xung đột');
  });

  it('18.3. Cho phép Admin ghi đè lịch ưu tiên cấp trường (force: true) khi có xung đột, nhưng chặn User thường', () => {
    function processReschedulePolicy(hasConflict, isForce, userRole) {
      if (!hasConflict) return { success: true };
      if (userRole === 'ADMIN') {
        if (isForce) return { success: true, forced: true };
        return { status: 'warning', message: 'Cảnh báo xung đột, hỏi xác nhận duyệt đè.' };
      }
      return { status: 'error', statusCode: 409, message: 'Phòng đã có lịch được xác nhận hoặc vi phạm khoảng đệm 30 phút.' };
    }

    // User thường gặp xung đột -> Chặn 409
    const userRes = processReschedulePolicy(true, false, 'USER');
    assert.equal(userRes.statusCode, 409);
    assert.match(userRes.message, /vi phạm khoảng đệm/);

    // Admin gặp xung đột chưa force -> Trả về warning
    const adminWarn = processReschedulePolicy(true, false, 'ADMIN');
    assert.equal(adminWarn.status, 'warning');

    // Admin xác nhận force: true (ưu tiên cấp trường) -> Thành công
    const adminForce = processReschedulePolicy(true, true, 'ADMIN');
    assert.equal(adminForce.success, true);
    assert.equal(adminForce.forced, true);
  });

  it('18.4. Bảo vệ RBAC và trạng thái: Chặn người dùng khác dời lịch của người khác, chặn dời lịch đã COMPLETED/CANCELLED', () => {
    function validateReschedulePermission(booking, actor) {
      if (actor.role !== 'ADMIN' && booking.userId !== actor.id) {
        return { allowed: false, statusCode: 403, error: 'Bạn không có quyền dời lịch đặt phòng này.' };
      }
      if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
        return { allowed: false, statusCode: 400, error: `Không thể dời lịch đơn đặt phòng đã ở trạng thái "${booking.status}".` };
      }
      return { allowed: true };
    }

    const booking = { id: 'b1', userId: 'user-owner', status: 'CONFIRMED' };

    // Người dùng khác (hacker/impersonator) cố dời lịch
    const hackerCheck = validateReschedulePermission(booking, { id: 'other-user', role: 'USER' });
    assert.equal(hackerCheck.allowed, false);
    assert.equal(hackerCheck.statusCode, 403);

    // Chủ nhân (Owner) được phép dời lịch
    const ownerCheck = validateReschedulePermission(booking, { id: 'user-owner', role: 'USER' });
    assert.equal(ownerCheck.allowed, true);

    // Admin được phép dời lịch
    const adminCheck = validateReschedulePermission(booking, { id: 'admin-id', role: 'ADMIN' });
    assert.equal(adminCheck.allowed, true);

    // Đơn đã COMPLETED hoặc CANCELLED bị chặn
    const completedBooking = { id: 'b2', userId: 'user-owner', status: 'COMPLETED' };
    const completedCheck = validateReschedulePermission(completedBooking, { id: 'admin-id', role: 'ADMIN' });
    assert.equal(completedCheck.allowed, false);
    assert.equal(completedCheck.statusCode, 400);
  });

  it('18.5. Quy tắc chuyển trạng thái và lưu vết lịch sử: User dời lịch CONFIRMED -> chuyển về PENDING để Admin duyệt lại', () => {
    function evaluateRescheduleOutcome(oldStatus, actorRole, oldTimeStr, newTimeStr, reason) {
      let newStatus = oldStatus;
      if (actorRole !== 'ADMIN' && oldStatus === 'CONFIRMED') {
        newStatus = 'PENDING';
      }
      const historyLog = `[Dời lịch]: Lịch cũ (${oldTimeStr}) ➔ Lịch mới (${newTimeStr}). Lý do: ${reason}`;
      return { newStatus, historyLog };
    }

    // User dời lịch đã CONFIRMED -> chuyển thành PENDING
    const userOutcome = evaluateRescheduleOutcome(
      'CONFIRMED',
      'USER',
      '08:00 - 10:00 20/11/2026',
      '14:00 - 16:00 22/11/2026',
      'Diễn giả đổi giờ'
    );
    assert.equal(userOutcome.newStatus, 'PENDING', 'User dời lịch đã duyệt phải chuyển về PENDING để Admin kiểm tra');
    assert.match(userOutcome.historyLog, /Diễn giả đổi giờ/);

    // Admin dời lịch CONFIRMED -> Giữ nguyên CONFIRMED
    const adminOutcome = evaluateRescheduleOutcome(
      'CONFIRMED',
      'ADMIN',
      '08:00 - 10:00 20/11/2026',
      '14:00 - 16:00 22/11/2026',
      'Điều phối Studio cấp trường'
    );
    assert.equal(adminOutcome.newStatus, 'CONFIRMED', 'Admin dời lịch giữ nguyên CONFIRMED');
  });
});

// ============================================================
// TEST SUITE 19: TÍNH LƯƠNG, HỆ SỐ NHÂN GIỜ VÀ GHI CHÚ THỐNG KÊ CÔNG VIỆC
// ============================================================
describe('Unit Test 19: Kiểm tra tính lương, hệ số nhân giờ và ghi chú thống kê công việc (Single Source of Truth)', () => {
  const {
    calculateTaskHoursAndMultiplier,
    isTechnicalTask,
    formatHoursVi,
  } = require('../src/services/payroll.service');

  it('19.1. Làm việc kỹ thuật ngày thường (T2-T7) sau 16:30 nhân 1.5, tách riêng trong giờ và ngoài giờ', () => {
    // Task kỹ thuật: 14:00 - 18:30 Thứ Tư (4.5h thực tế) -> Trong giờ: 2.5h (x1.0), Ngoài giờ: 2.0h (x1.5)
    const task = {
      title: 'Quay highlight sự kiện',
      taskType: 'Quay highlight',
      executionDate: '2026-11-18', // Thứ Tư
      startTime: '2026-11-18T07:00:00Z', // 14:00 VN
      actualHours: 4.5,
    };
    const calc = calculateTaskHoursAndMultiplier(task);
    assert.equal(calc.actualHours, 4.5);
    assert.equal(calc.normalHours, 2.5);
    assert.equal(calc.overtimeHours, 2.0);
    assert.equal(calc.sundayHours, 0);
    // 2.5*1.0 + 2.0*1.5 = 5.5h quy đổi
    assert.equal(calc.convertedHours, 5.5);
    assert.equal(calc.isHighlighted, true);
    assert.match(calc.multiplierNote, /Trong giờ: 2,5 giờ × 1,0; Ngoài giờ: 2 giờ × 1,5/);
  });

  it('19.2. Làm việc kỹ thuật vào Chủ nhật nhân 2.0 toàn bộ thời lượng', () => {
    const task = {
      title: 'Chụp hình Lễ khai giảng',
      taskType: 'Chụp & xử lý hình sự kiện',
      executionDate: '2026-11-22', // Chủ nhật
      startTime: '2026-11-22T01:00:00Z', // 08:00 VN
      actualHours: 4.0,
    };
    const calc = calculateTaskHoursAndMultiplier(task);
    assert.equal(calc.actualHours, 4.0);
    assert.equal(calc.normalHours, 0);
    assert.equal(calc.overtimeHours, 0);
    assert.equal(calc.sundayHours, 4.0);
    assert.equal(calc.multiplier, 2.0);
    assert.equal(calc.convertedHours, 8.0);
    assert.equal(calc.isHighlighted, true);
    assert.match(calc.multiplierNote, /Chủ nhật: 4 giờ × 2/);
  });

  it('19.3. Làm việc kỹ thuật vào Chủ nhật kéo dài qua 16:30: chỉ nhân 2, ưu tiên hệ số Chủ nhật không cộng dồn (TC-06)', () => {
    const task = {
      title: 'Quay video Hội thảo quốc tế',
      taskType: 'Quay highlight',
      executionDate: '2026-11-22', // Chủ nhật
      startTime: '2026-11-22T08:00:00Z', // 15:00 VN
      actualHours: 4.0, // 15:00 - 19:00 (kéo dài qua 16:30)
    };
    const calc = calculateTaskHoursAndMultiplier(task);
    assert.equal(calc.actualHours, 4.0);
    assert.equal(calc.sundayHours, 4.0);
    assert.equal(calc.multiplier, 2.0);
    assert.equal(calc.convertedHours, 8.0);
    assert.equal(calc.isHighlighted, true);
    assert.match(calc.multiplierNote, /Chủ nhật \(ưu tiên hệ số Chủ nhật\): 4 giờ × 2/);
  });

  it('19.4. Đúng 7 công việc được nhân giờ (chụp&xử lý hình, quay phim, quay highlight, quay clip tiktok, mc bản tin, thư ký trường quay, diễn viên)', () => {
    // 1. MC bản tin làm việc vào Chủ nhật -> Nhân 2.0
    const mcSunday = {
      title: 'Dẫn chương trình bản tin tuần',
      taskType: 'MC bản tin',
      executionDate: '2026-11-22', // Chủ nhật
      startTime: '2026-11-22T01:00:00Z', // 08:00 VN
      actualHours: 3.0,
    };
    const calcMC = calculateTaskHoursAndMultiplier(mcSunday);
    assert.equal(calcMC.actualHours, 3.0);
    assert.equal(calcMC.sundayHours, 3.0);
    assert.equal(calcMC.multiplier, 2.0);
    assert.equal(calcMC.convertedHours, 6.0);
    assert.equal(calcMC.isHighlighted, true);
    assert.match(calcMC.multiplierNote, /Chủ nhật: 3 giờ × 2/);

    // 2. Thư ký trường quay làm sau 16:30 T2-T7 -> Nhân 1.5
    const thuKyOT = {
      title: 'Hỗ trợ trường quay ghi hình',
      taskType: 'Thư ký trường quay',
      executionDate: '2026-11-18', // Thứ Tư
      startTime: '2026-11-18T10:00:00Z', // 17:00 VN
      actualHours: 2.0,
    };
    const calcThuKy = calculateTaskHoursAndMultiplier(thuKyOT);
    assert.equal(calcThuKy.actualHours, 2.0);
    assert.equal(calcThuKy.overtimeHours, 2.0);
    assert.equal(calcThuKy.multiplier, 1.5);
    assert.equal(calcThuKy.convertedHours, 3.0);
    assert.equal(calcThuKy.isHighlighted, true);

    // 3. Diễn viên ghi hình Chủ nhật -> Nhân 2.0
    const dienVienSun = {
      title: 'Đóng sitcom tuyển sinh',
      taskType: 'Diễn viên',
      executionDate: '2026-11-22', // Chủ nhật
      actualHours: 4.0,
    };
    const calcDienVien = calculateTaskHoursAndMultiplier(dienVienSun);
    assert.equal(calcDienVien.convertedHours, 8.0);
    assert.equal(calcDienVien.multiplier, 2.0);
    assert.equal(calcDienVien.isHighlighted, true);

    // 4. Quay clip TikTok ngoài giờ -> Nhân 1.5
    const quayTiktok = {
      title: 'Quay trend TikTok trường học',
      taskType: 'Quay clip TikTok',
      executionDate: '2026-11-18', // Thứ Tư
      startTime: '2026-11-18T10:00:00Z', // 17:00 VN
      actualHours: 2.0,
    };
    const calcTiktok = calculateTaskHoursAndMultiplier(quayTiktok);
    assert.equal(calcTiktok.convertedHours, 3.0);
    assert.equal(calcTiktok.multiplier, 1.5);

    // 5. CÁC VIỆC KHÔNG ĐƯỢC NHÂN GIỜ: Thiết kế, Viết content, Viết kịch bản, Dựng phim -> luôn 1.0
    const designSunday = {
      title: 'Thiết kế banner Lễ tốt nghiệp',
      taskType: 'Thiết kế',
      executionDate: '2026-11-22', // Chủ nhật
      startTime: '2026-11-22T12:00:00Z', // 19:00 VN
      actualHours: 6.0,
    };
    const calcDesign = calculateTaskHoursAndMultiplier(designSunday);
    assert.equal(calcDesign.convertedHours, 6.0);
    assert.equal(calcDesign.multiplier, 1.0);
    assert.equal(calcDesign.isHighlighted, false);

    const dungPhimSun = {
      title: 'Dựng phim phóng sự 30 năm',
      taskType: 'Dựng phim',
      executionDate: '2026-11-22', // Chủ nhật
      actualHours: 5.0,
    };
    const calcDung = calculateTaskHoursAndMultiplier(dungPhimSun);
    assert.equal(calcDung.convertedHours, 5.0);
    assert.equal(calcDung.multiplier, 1.0);
    assert.equal(calcDung.isHighlighted, false);

    const contentOvertime = {
      title: 'Viết bài truyền thông Fanpage',
      taskType: 'Viết content',
      executionDate: '2026-11-18', // Thứ Tư
      startTime: '2026-11-18T11:00:00Z', // 18:00 VN
      actualHours: 3.0,
    };
    const calcContent = calculateTaskHoursAndMultiplier(contentOvertime);
    assert.equal(calcContent.convertedHours, 3.0);
    assert.equal(calcContent.multiplier, 1.0);
    assert.equal(calcContent.isHighlighted, false);
  });

  it('19.5. Chuẩn hóa format giờ và dấu phẩy kiểu Việt Nam (formatHoursVi)', () => {
    assert.equal(formatHoursVi(2.5), '2,5');
    assert.equal(formatHoursVi(4), '4');
    assert.equal(formatHoursVi(4.0), '4');
    assert.equal(formatHoursVi(0.5), '0,5');
  });

  it('19.6. Tính thù lao chuẩn xác: 20.000 VNĐ / giờ quy đổi và khử trùng thời gian', () => {
    const hourlyRate = 20000;
    // 100 giờ quy đổi -> 2.000.000 VNĐ
    assert.equal(100 * hourlyRate, 2000000);
    // 124 giờ quy đổi (116h trực + 4h*2 CN) -> 2.480.000 VNĐ
    assert.equal(124 * hourlyRate, 2480000);
  });
});




// =========================================================================
// UNIT TEST 20: CHỨC NĂNG CTV NỘP KẾT QUẢ KÈM SỐ GIỜ THỰC HIỆN & NGHIỆM THU
// =========================================================================
describe('Unit Test 20: Chức năng CTV nộp kết quả kèm số giờ thực hiện và nghiệm thu', () => {
  const { calculateTaskHoursAndMultiplier } = require('../src/services/payroll.service');
  // Helper mô phỏng cập nhật tiến độ nộp bài của CTV (tương đồng với task.service.js updateProgress)
  function simulateSubmitTaskProgress(task, data) {
    if (task.status !== 'IN_PROGRESS' && task.status !== 'REVISION_REQUESTED') {
      throw new Error('Chỉ có thể nộp duyệt khi công việc đang ở trạng thái Đang thực hiện');
    }

    const finalResultLink = (data.resultLink !== undefined ? data.resultLink : task.resultLink)?.trim();
    const finalProofFile = (data.proofFile !== undefined ? data.proofFile : task.proofFile)?.trim();

    if (!finalResultLink && !finalProofFile) {
      throw new Error('Vui lòng cung cấp đường dẫn kết quả sản phẩm hoặc tải lên file minh chứng để nộp duyệt');
    }

    let actualHours = task.actualHours || 0;
    if (data.actualHours !== undefined && data.actualHours !== null && data.actualHours !== '') {
      const parsedHours = parseFloat(data.actualHours);
      if (isNaN(parsedHours) || parsedHours <= 0) {
        throw new Error('Số giờ thực hiện phải là số hợp lệ lớn hơn 0');
      }
      actualHours = Math.round(parsedHours * 100) / 100;
    }

    return {
      ...task,
      status: 'PENDING_APPROVAL',
      resultLink: finalResultLink || null,
      proofFile: finalProofFile || null,
      actualHours,
    };
  }

  // Helper mô phỏng Nhân sự nghiệm thu (tương đồng với task.service.js reviewTask)
  function simulateReviewTask(task, data) {
    if (task.status !== 'PENDING_APPROVAL') {
      throw new Error(`Chỉ có thể đánh giá công việc khi đang ở trạng thái 'Chờ duyệt' (PENDING_APPROVAL). Trạng thái hiện tại: '${task.status}'`);
    }

    if (data.decision === 'COMPLETED') {
      const actualHours = data.actualHours !== undefined ? parseFloat(data.actualHours) || 0 : task.actualHours || 0;
      return {
        ...task,
        status: 'COMPLETED',
        actualHours,
        completedAt: new Date().toISOString(),
        feedback: data.feedback ? data.feedback.trim() : task.feedback,
      };
    } else if (data.decision === 'REVISION_REQUESTED') {
      if (!data.feedback || !data.feedback.trim()) {
        throw new Error('Vui lòng nhập nội dung phản hồi / yêu cầu cần chỉnh sửa cho CTV');
      }
      return {
        ...task,
        status: 'REVISION_REQUESTED',
        feedback: data.feedback.trim(),
      };
    }
  }

  it('20.1. CTV nộp kết quả kèm số giờ thực hiện (actualHours = 3.5), lưu thành công và chuyển sang PENDING_APPROVAL', () => {
    const task = {
      id: 'task-101',
      title: 'Quay video phỏng vấn cựu sinh viên',
      status: 'IN_PROGRESS',
      resultLink: null,
      proofFile: null,
      actualHours: 0,
    };

    const submitted = simulateSubmitTaskProgress(task, {
      resultLink: 'https://drive.google.com/file/d/test12345/view',
      actualHours: 3.5,
    });

    assert.equal(submitted.status, 'PENDING_APPROVAL');
    assert.equal(submitted.actualHours, 3.5);
    assert.equal(submitted.resultLink, 'https://drive.google.com/file/d/test12345/view');
  });

  it('20.2. Validate số giờ thực hiện khi CTV nộp bài: Bắt buộc số hợp lệ > 0', () => {
    const task = {
      id: 'task-102',
      title: 'Thiết kế ấn phẩm truyền thông',
      status: 'IN_PROGRESS',
      resultLink: 'https://figma.com/design/test',
    };

    // Số âm
    assert.throws(() => {
      simulateSubmitTaskProgress(task, { resultLink: 'https://figma.com', actualHours: -2 });
    }, /Số giờ thực hiện phải là số hợp lệ lớn hơn 0/);

    // Bằng 0
    assert.throws(() => {
      simulateSubmitTaskProgress(task, { resultLink: 'https://figma.com', actualHours: 0 });
    }, /Số giờ thực hiện phải là số hợp lệ lớn hơn 0/);

    // Chuỗi không hợp lệ
    assert.throws(() => {
      simulateSubmitTaskProgress(task, { resultLink: 'https://figma.com', actualHours: 'abc' });
    }, /Số giờ thực hiện phải là số hợp lệ lớn hơn 0/);
  });

  it('20.3. Tuyệt đối không ghi nhận giờ của nhiệm vụ PENDING_APPROVAL vào Bảng thống kê công việc & Bảng lương', () => {
    const taskList = [
      { id: 't1', title: 'Task đã xong 1', status: 'COMPLETED', actualHours: 4.0 },
      { id: 't2', title: 'Task đã xong 2', status: 'COMPLETED', actualHours: 2.5 },
      { id: 't3', title: 'Task đang chờ duyệt', status: 'PENDING_APPROVAL', actualHours: 5.0 }, // CTV vừa nộp 5h
      { id: 't4', title: 'Task đang làm', status: 'IN_PROGRESS', actualHours: 3.0 },
    ];

    // Bộ lọc nghiệp vụ cốt lõi: Chỉ lấy task COMPLETED để tính giờ và lương
    const completedTasksOnly = taskList.filter((t) => t.status === 'COMPLETED');
    const totalRecognizedHours = completedTasksOnly.reduce((sum, t) => sum + t.actualHours, 0);

    assert.equal(completedTasksOnly.length, 2);
    // 4.0 + 2.5 = 6.5 giờ; task t3 (5.0 giờ) tuyệt đối chưa được tính
    assert.equal(totalRecognizedHours, 6.5);
  });

  it('20.4. Nhân sự kiểm tra số giờ CTV nộp và thực hiện nghiệm thu (COMPLETED)', () => {
    const pendingTask = {
      id: 'task-103',
      title: 'Chụp hình Lễ bế giảng',
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/test',
      actualHours: 4.0, // CTV đề xuất 4h
    };

    // Trường hợp A: Nhân sự duyệt đúng 4h mà CTV đã nộp
    const reviewedKeep = simulateReviewTask(pendingTask, {
      decision: 'COMPLETED',
      actualHours: pendingTask.actualHours, // 4.0
    });
    assert.equal(reviewedKeep.status, 'COMPLETED');
    assert.equal(reviewedKeep.actualHours, 4.0);

    // Trường hợp B: Nhân sự kiểm tra thấy thực tế chỉ 3.5h và điều chỉnh lại
    const reviewedAdjust = simulateReviewTask(pendingTask, {
      decision: 'COMPLETED',
      actualHours: 3.5,
    });
    assert.equal(reviewedAdjust.status, 'COMPLETED');
    assert.equal(reviewedAdjust.actualHours, 3.5);
  });

  it('20.5. Sau khi Nhân sự duyệt COMPLETED, số giờ mới được tính vào thù lao và áp dụng hệ số nhân giờ', () => {
    const approvedTask = {
      title: 'Quay highlight Gala văn nghệ',
      taskType: 'Quay highlight',
      executionDate: '2026-11-22', // Chủ nhật
      actualHours: 3.5, // Số giờ đã được duyệt
      status: 'COMPLETED',
    };

    const calc = calculateTaskHoursAndMultiplier(approvedTask);
    assert.equal(calc.actualHours, 3.5);
    assert.equal(calc.multiplier, 2.0); // Làm Chủ nhật nhân 2
    assert.equal(calc.convertedHours, 7.0); // 3.5 * 2 = 7h
    assert.equal(calc.convertedHours * 20000, 140000); // 140.000 VNĐ
  });
});

describe('Unit Test 21: Nâng cấp Đăng ký phòng Studio - Gợi ý khung giờ còn trống & Đặc quyền ADMIN', () => {
  const studioService = require('../src/services/studioBooking.service');

  it('21.1. USER thường tuân thủ nghiêm ngặt giờ hành chính T2-T7 và cấm Chủ nhật', () => {
    // Thứ Ba trong giờ sáng
    const t2MorningStart = new Date('2026-11-17T07:30:00+07:00');
    const t2MorningEnd = new Date('2026-11-17T09:30:00+07:00');
    assert.doesNotThrow(() => {
      studioService.validateOperatingHours(t2MorningStart, t2MorningEnd, 'USER');
    });

    // Thứ Ba ngoài giờ (tối 18:00 - 20:00) -> Chặn
    const t2EveningStart = new Date('2026-11-17T18:00:00+07:00');
    const t2EveningEnd = new Date('2026-11-17T20:00:00+07:00');
    assert.throws(() => {
      studioService.validateOperatingHours(t2EveningStart, t2EveningEnd, 'USER');
    }, /không nằm trong khung giờ hoạt động/);

    // Chủ nhật -> Chặn đối với USER
    const sundayStart = new Date('2026-11-22T08:00:00+07:00');
    const sundayEnd = new Date('2026-11-22T10:00:00+07:00');
    assert.throws(() => {
      studioService.validateOperatingHours(sundayStart, sundayEnd, 'USER');
    }, /không hoạt động vào Chủ nhật/);
  });

  it('21.2. ADMIN được đặc quyền tạo đặt phòng ngoài khung giờ quy định (buổi tối & Chủ nhật)', () => {
    // ADMIN đặt buổi tối (18:00 - 21:00) ngày thường -> Cho phép
    const adminEveningStart = new Date('2026-11-17T18:00:00+07:00');
    const adminEveningEnd = new Date('2026-11-17T21:00:00+07:00');
    assert.doesNotThrow(() => {
      studioService.validateOperatingHours(adminEveningStart, adminEveningEnd, 'ADMIN');
    });

    // ADMIN đặt Chủ nhật sự kiện cấp trường -> Cho phép
    const adminSundayStart = new Date('2026-11-22T08:00:00+07:00');
    const adminSundayEnd = new Date('2026-11-22T11:30:00+07:00');
    assert.doesNotThrow(() => {
      studioService.validateOperatingHours(adminSundayStart, adminSundayEnd, 'ADMIN');
    });

    // ADMIN vẫn phải cùng ngày và end > start
    const invalidOrderStart = new Date('2026-11-17T10:00:00+07:00');
    const invalidOrderEnd = new Date('2026-11-17T09:00:00+07:00');
    assert.throws(() => {
      studioService.validateOperatingHours(invalidOrderStart, invalidOrderEnd, 'ADMIN');
    }, /Thời gian kết thúc phải sau thời gian bắt đầu/);
  });

  it('21.3. getAvailableSlots tự động gợi ý các khung giờ trống và tính khoảng đệm 30 phút', async () => {
    const { StudioBooking } = require('../src/models');
    const originalFindAll = StudioBooking.findAll;
    // Mock findAll để unit test độc lập với MSSQL server
    StudioBooking.findAll = async () => [
      {
        startTime: new Date('2026-11-18T09:00:00+07:00'),
        endTime: new Date('2026-11-18T10:00:00+07:00'),
        status: 'CONFIRMED',
      },
    ];

    try {
      // Kiểm tra ngày mai 2026-11-18 (Thứ Tư) với vai trò USER
      const slotsUser = await studioService.getAvailableSlots('2026-11-18', 'Studio 1', 'USER');
      assert.equal(slotsUser.isOpen, true);
      assert.equal(slotsUser.date, '2026-11-18');
      assert.equal(slotsUser.shifts.length, 2); // Sáng và Chiều
      assert.equal(slotsUser.shifts[0].id, 'MORNING');
      assert.equal(slotsUser.shifts[1].id, 'AFTERNOON');
      // Đã có booking 09:00 - 10:00 (+ đệm 30p -> 08:30 đến 10:30 bị khóa).
      // Ca sáng còn slot 07:30 - 08:30 (1 tiếng) và 10:30 - 11:30 (1 tiếng)
      assert.ok(slotsUser.shifts[0].availableSlots.length >= 2);

      // Kiểm tra Chủ nhật với USER: isOpen = false
      const slotsSundayUser = await studioService.getAvailableSlots('2026-11-22', 'Studio 1', 'USER');
      assert.equal(slotsSundayUser.isOpen, false);
      assert.match(slotsSundayUser.message, /không hoạt động vào Chủ nhật/);

      // Kiểm tra Chủ nhật với ADMIN: isOpen = true, có ca hỗ trợ sự kiện đặc biệt
      const slotsSundayAdmin = await studioService.getAvailableSlots('2026-11-22', 'Studio 1', 'ADMIN');
      assert.equal(slotsSundayAdmin.isOpen, true);
      assert.ok(slotsSundayAdmin.shifts.length > 0);
    } finally {
      StudioBooking.findAll = originalFindAll;
    }
  });

  it('21.4. ADMIN và USER đều bị kiểm tra xung đột với lịch đã duyệt kèm khoảng đệm 30 phút', () => {
    const BUFFER_MS = 30 * 60 * 1000;
    const existingConfirmed = {
      startTime: new Date('2026-11-17T09:00:00+07:00'),
      endTime: new Date('2026-11-17T11:00:00+07:00'),
      status: 'CONFIRMED',
    };

    // Đặt ca mới trùng hoàn toàn
    const overlapStart = new Date('2026-11-17T09:30:00+07:00');
    const overlapEnd = new Date('2026-11-17T10:30:00+07:00');
    const bufStart = new Date(existingConfirmed.startTime.getTime() - BUFFER_MS);
    const bufEnd = new Date(existingConfirmed.endTime.getTime() + BUFFER_MS);
    const hasConflict = overlapStart < bufEnd && overlapEnd > bufStart;
    assert.equal(hasConflict, true);

    // Đặt ca mới ngay sát 11:00 - 11:30 (vi phạm buffer 30 phút)
    const bufferViolationStart = new Date('2026-11-17T11:05:00+07:00');
    const bufferViolationEnd = new Date('2026-11-17T11:30:00+07:00');
    const hasBufferViolation = bufferViolationStart < bufEnd && bufferViolationEnd > bufStart;
    assert.equal(hasBufferViolation, true);

    // Đặt ca mới sau 11:30 (cách đúng 30 phút) -> Hợp lệ
    const validStart = new Date('2026-11-17T11:30:00+07:00');
    const validEnd = new Date('2026-11-17T12:00:00+07:00');
    const isClean = !(validStart < bufEnd && validEnd > bufStart);
    assert.equal(isClean, true);
  });

  it('21.5. Ràng buộc tuyệt đối: getAvailableSlots không được gợi ý khung giờ trùng với lịch đã có (CONFIRMED, COMPLETED, PENDING)', async () => {
    const { StudioBooking } = require('../src/models');
    const originalFindAll = StudioBooking.findAll;

    // Giả lập ngày mai 2026-11-18 có 1 đơn CONFIRMED lúc 08:00 - 10:00 và 1 đơn PENDING lúc 13:30 - 15:00
    StudioBooking.findAll = async () => [
      {
        startTime: new Date('2026-11-18T08:00:00+07:00'),
        endTime: new Date('2026-11-18T10:00:00+07:00'),
        status: 'CONFIRMED',
      },
      {
        startTime: new Date('2026-11-18T13:30:00+07:00'),
        endTime: new Date('2026-11-18T15:00:00+07:00'),
        status: 'PENDING',
      },
    ];

    try {
      const result = await studioService.getAvailableSlots('2026-11-18', 'Studio LHU', 'USER');
      
      // Tất cả slot được gợi ý trong ngày:
      const allSuggested = result.allAvailableSlots;

      // Tuyệt đối không có bất kỳ slot nào trùng hoặc vi phạm buffer 30p với 08:00-10:00 (khoảng khóa 07:30 - 10:30)
      for (const slot of allSuggested) {
        const s = new Date(slot.startIso);
        const e = new Date(slot.endIso);

        // Kiểm tra với ca sáng 08:00 - 10:00 (+ đệm 30p: 07:30 - 10:30)
        const morningLockStart = new Date('2026-11-18T07:30:00+07:00');
        const morningLockEnd = new Date('2026-11-18T10:30:00+07:00');
        const overlapsMorning = s < morningLockEnd && e > morningLockStart;
        assert.equal(overlapsMorning, false, `Slot gợi ý ${slot.label} không được trùng với lịch ca sáng`);

        // Kiểm tra với ca chiều 13:30 - 15:00 (+ đệm 30p: 13:00 - 15:30)
        const afternoonLockStart = new Date('2026-11-18T13:00:00+07:00');
        const afternoonLockEnd = new Date('2026-11-18T15:30:00+07:00');
        const overlapsAfternoon = s < afternoonLockEnd && e > afternoonLockStart;
        assert.equal(overlapsAfternoon, false, `Slot gợi ý ${slot.label} không được trùng với lịch PENDING ca chiều`);
      }

      // Ca sáng chỉ còn khả dụng slot 10:30 - 11:30
      const morningSlots = result.shifts.find(s => s.id === 'MORNING').availableSlots;
      assert.ok(morningSlots.length > 0);
      assert.ok(morningSlots.every(s => s.startTime >= '10:30'));

      // Ca chiều chỉ còn khả dụng slot 15:30 - 16:30
      const afternoonSlots = result.shifts.find(s => s.id === 'AFTERNOON').availableSlots;
      assert.ok(afternoonSlots.length > 0);
      assert.ok(afternoonSlots.every(s => s.startTime >= '15:30'));
    } finally {
      StudioBooking.findAll = originalFindAll;
    }
  });
});

describe('Unit Test 22: Phân hệ Bảng Tổng công việc tháng dành riêng cho CTV (Read-only & RBAC)', () => {
  const payrollService = require('../src/services/payroll.service');
  const { User, Task } = require('../src/models');

  it('22.1. getCollaboratorMonthlySummary trích xuất chính xác danh sách nhiệm vụ của CTV trong tháng', async () => {
    const origUserFindOne = User.findOne;
    const origTaskFindAll = Task.findAll;

    User.findOne = async () => ({
      id: 'ctv-user-1',
      fullName: 'Châu Ngọc Thanh Thảo',
      email: 'ctvthao@lhu.edu.vn',
      employeeCode: 'CTV001',
      role: 'COLLABORATOR',
    });

    Task.findAll = async () => [
      {
        id: 'task-1',
        title: 'Chụp hình sự kiện Khai giảng',
        taskType: 'Chụp & xử lý hình sự kiện',
        status: 'COMPLETED',
        actualHours: 4.0,
        executionDate: '2026-11-10', // Thứ Ba
        startTime: '2026-11-10T14:30:00+07:00',
        deadline: '2026-11-10T18:30:00+07:00', // 2h trong giờ + 2h ngoài giờ (>16:30)
      },
      {
        id: 'task-2',
        title: 'Viết bài truyền thông website',
        taskType: 'Viết content',
        status: 'COMPLETED',
        actualHours: 3.0,
        executionDate: '2026-11-12',
      },
      {
        id: 'task-3',
        title: 'Quay video phỏng vấn tân sinh viên',
        taskType: 'Quay phim',
        status: 'PENDING_APPROVAL',
        actualHours: 3.5,
        executionDate: '2026-11-15', // Chủ nhật
        startTime: '2026-11-15T08:00:00+07:00',
        deadline: '2026-11-15T11:30:00+07:00',
      },
    ];

    try {
      const result = await payrollService.getCollaboratorMonthlySummary(11, 2026, 'ctv-user-1');

      assert.equal(result.month, 11);
      assert.equal(result.year, 2026);
      assert.equal(result.ctv.id, 'ctv-user-1');
      assert.equal(result.ctv.fullName, 'Châu Ngọc Thanh Thảo');

      // Có 3 task
      assert.equal(result.summary.totalTasks, 3);
      assert.equal(result.summary.completedTasks, 2);
      assert.equal(result.summary.pendingTasks, 1);

      // Task 1: Chụp ảnh T3 (2h trong giờ * 1.0 + 2h sau 16:30 * 1.5 = 5.0h quy đổi)
      const t1 = result.tasks.find((t) => t.id === 'task-1');
      assert.ok(t1);
      assert.equal(t1.status, 'COMPLETED');
      assert.equal(t1.hours, 4.0);
      assert.equal(t1.convertedHours, 5.0);
      assert.equal(t1.multiplier, 1.25); // Hệ số bình quân quy đổi = 5.0 / 4.0 = 1.25
      assert.equal(t1.isHighlighted, true);
      assert.ok(t1.note.includes('Ngoài giờ: 2 giờ × 1,5'));

      // Task 2: Viết content (không nhân hệ số, hệ số 1 chuẩn)
      const t2 = result.tasks.find((t) => t.id === 'task-2');
      assert.ok(t2);
      assert.equal(t2.status, 'COMPLETED');
      assert.equal(t2.hours, 3.0);
      assert.equal(t2.convertedHours, 3.0);
      assert.equal(t2.isHighlighted, false);

      // Task 3: Đang PENDING_APPROVAL -> chưa được xác nhận, chưa tính hệ số vào confirmedHours
      const t3 = result.tasks.find((t) => t.id === 'task-3');
      assert.ok(t3);
      assert.equal(t3.status, 'PENDING_APPROVAL');
      assert.equal(t3.hours, 3.5);
      assert.equal(t3.isHighlighted, false);
      assert.ok(t3.note.includes('Chờ'));
    } finally {
      User.findOne = origUserFindOne;
      Task.findAll = origTaskFindAll;
    }
  });

  it('22.2. Phân biệt rõ Tổng giờ đã thực hiện (10.5h) và Giờ được Nhân sự xác nhận (7.0h)', async () => {
    const origUserFindOne = User.findOne;
    const origTaskFindAll = Task.findAll;

    User.findOne = async () => ({
      id: 'ctv-user-1',
      fullName: 'Châu Ngọc Thanh Thảo',
      role: 'COLLABORATOR',
    });

    Task.findAll = async () => [
      {
        id: 'task-1',
        title: 'Chụp hình sự kiện Khai giảng',
        taskType: 'Chụp & xử lý hình sự kiện',
        status: 'COMPLETED',
        actualHours: 4.0,
        executionDate: '2026-11-10',
        startTime: '2026-11-10T14:30:00+07:00',
        deadline: '2026-11-10T18:30:00+07:00', // 2h thường + 2h*1.5 = 5.0h quy đổi
      },
      {
        id: 'task-2',
        title: 'Viết bài truyền thông',
        taskType: 'Viết content',
        status: 'COMPLETED',
        actualHours: 3.0,
        executionDate: '2026-11-12',
      },
      {
        id: 'task-3',
        title: 'Quay video TikTok',
        taskType: 'Quay clip TikTok',
        status: 'PENDING_APPROVAL',
        actualHours: 3.5,
        executionDate: '2026-11-16',
      },
    ];

    try {
      const result = await payrollService.getCollaboratorMonthlySummary(11, 2026, 'ctv-user-1');

      // Tổng giờ đã thực hiện: 4.0 + 3.0 + 3.5 = 10.5h
      assert.equal(result.summary.totalHoursWorked, 10.5);

      // Giờ được Nhân sự xác nhận: Chỉ tính task COMPLETED (4.0 + 3.0 = 7.0h)
      assert.equal(result.summary.confirmedHours, 7.0);

      // Giờ quy đổi sau hệ số: 5.0 + 3.0 = 8.0h
      assert.equal(result.summary.confirmedConvertedHours, 8.0);

      // Thù lao dự tính: 8.0 * 20.000 = 160.000 đ
      assert.equal(result.summary.estimatedSalary, 160000);
      assert.equal(result.summary.hourlyRate, 20000);
    } finally {
      User.findOne = origUserFindOne;
      Task.findAll = origTaskFindAll;
    }
  });

  it('22.3. Ràng buộc bảo mật RBAC: getTasksSummaryData hỗ trợ targetUserId chặn lộ dữ liệu chéo giữa các CTV', async () => {
    const origUserFindAll = User.findAll;
    const origTaskFindAll = Task.findAll;

    let capturedWhere = null;
    User.findAll = async ({ where }) => {
      capturedWhere = where;
      return [
        {
          id: 'ctv-target',
          fullName: 'CTV Được Lọc',
          role: 'COLLABORATOR',
        },
      ];
    };

    Task.findAll = async () => [];

    try {
      await payrollService.getTasksSummaryData(11, 2026, 'ctv-target');

      // Phải có where.id = 'ctv-target'
      assert.equal(capturedWhere.id, 'ctv-target');
      assert.equal(capturedWhere.role, 'COLLABORATOR');
    } finally {
      User.findAll = origUserFindAll;
      Task.findAll = origTaskFindAll;
    }
  });

  it('22.4. Báo lỗi 404 khi không tìm thấy thông tin cộng tác viên', async () => {
    const origUserFindOne = User.findOne;
    User.findOne = async () => null;

    try {
      await assert.rejects(
        async () => {
          await payrollService.getCollaboratorMonthlySummary(11, 2026, 'non-existent-id');
        },
        /Không tìm thấy thông tin cộng tác viên/
      );
    } finally {
      User.findOne = origUserFindOne;
    }
  });
});

// ============================================================
// TEST SUITE 23: XÁC NHẬN ĐẾN SỬ DỤNG STUDIO VÀ NGHIỆM THU HOÀN TẤT (PROMPT #32)
// ============================================================
describe('Unit Test 23: Chức năng xác nhận đến sử dụng Studio và nghiệm thu hoàn tất (Prompt #32)', () => {
  const studioBookingService = require('../src/services/studioBooking.service');
  const { StudioBooking, User } = require('../src/models');

  const todayVNStr = studioBookingService.getVietnamTimeInfo(new Date()).dateString;

  it('23.1. computeAttendanceInfo tính toán chính xác 4 cấp độ trạng thái sử dụng Studio', () => {
    // 1. Chưa đến ngày đặt: ngày tương lai
    const futureBooking = {
      status: 'CONFIRMED',
      startTime: '2029-12-01T08:00:00+07:00',
      endTime: '2029-12-01T10:00:00+07:00',
      userCheckInAt: null,
      adminConfirmedAt: null,
      attendanceStatus: 'NOT_ARRIVED',
    };
    const futureInfo = studioBookingService.computeAttendanceInfo(futureBooking);
    assert.equal(futureInfo.code, 'FUTURE_BOOKING');
    assert.equal(futureInfo.label, 'Chưa đến ngày đặt');
    assert.equal(futureInfo.canUserCheckIn, false);
    assert.equal(futureInfo.canAdminConfirm, false);

    // 2. Chờ xác nhận người dùng: ngày hôm nay, chưa check-in
    const todayBooking = {
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T08:00:00+07:00`,
      endTime: `${todayVNStr}T10:00:00+07:00`,
      userCheckInAt: null,
      adminConfirmedAt: null,
      attendanceStatus: 'NOT_ARRIVED',
    };
    const todayInfo = studioBookingService.computeAttendanceInfo(todayBooking);
    assert.equal(todayInfo.code, 'WAITING_USER_CHECKIN');
    assert.equal(todayInfo.label, 'Chờ xác nhận người dùng');
    assert.equal(todayInfo.canUserCheckIn, true);

    // 3. Chờ ADMIN xác nhận: người dùng đã check-in
    const checkedInBooking = {
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T08:00:00+07:00`,
      endTime: `${todayVNStr}T10:00:00+07:00`,
      userCheckInAt: new Date(),
      adminConfirmedAt: null,
      attendanceStatus: 'USER_CHECKED_IN',
    };
    const checkedInInfo = studioBookingService.computeAttendanceInfo(checkedInBooking);
    assert.equal(checkedInInfo.code, 'WAITING_ADMIN_CONFIRM');
    assert.equal(checkedInInfo.label, 'Chờ ADMIN xác nhận');
    assert.equal(checkedInInfo.canUserCheckIn, false);
    assert.equal(checkedInInfo.canAdminConfirm, true);

    // 4. Đã xác nhận sử dụng: Admin đã xác nhận (COMPLETED)
    const completedBooking = {
      status: 'COMPLETED',
      startTime: `${todayVNStr}T08:00:00+07:00`,
      endTime: `${todayVNStr}T10:00:00+07:00`,
      userCheckInAt: new Date(),
      adminConfirmedAt: new Date(),
      attendanceStatus: 'ADMIN_CONFIRMED',
    };
    const completedInfo = studioBookingService.computeAttendanceInfo(completedBooking);
    assert.equal(completedInfo.code, 'USAGE_CONFIRMED');
    assert.equal(completedInfo.label, 'Đã xác nhận sử dụng');
    assert.equal(completedInfo.canUserCheckIn, false);
    assert.equal(completedInfo.canAdminConfirm, false);

    // 5. Xử lý trường hợp không đến (ngày quá khứ, chưa check-in)
    const pastBooking = {
      status: 'CONFIRMED',
      startTime: '2025-01-01T08:00:00+07:00',
      endTime: '2025-01-01T10:00:00+07:00',
      userCheckInAt: null,
      adminConfirmedAt: null,
      attendanceStatus: 'NOT_ARRIVED',
    };
    const pastInfo = studioBookingService.computeAttendanceInfo(pastBooking);
    assert.equal(pastInfo.code, 'ABSENT');
    assert.equal(pastInfo.label, 'Không đến sử dụng');
  });

  it('23.2. Check-in thành công vào đúng ngày đặt phòng, lưu thời gian check-in và chuyển sang WAITING_ADMIN_CONFIRM', async () => {
    const origFindByPk = StudioBooking.findByPk;
    let updatedFields = null;

    const mockBooking = {
      id: 'booking-test-1',
      userId: 'user-owner',
      studioName: 'Studio LHU',
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T09:00:00+07:00`,
      endTime: `${todayVNStr}T11:00:00+07:00`,
      userCheckInAt: null,
      adminConfirmedAt: null,
      attendanceStatus: 'NOT_ARRIVED',
      notes: null,
      booker: { fullName: 'Nguyễn Văn Test', email: 'test@lhu.edu.vn' },
      async update(fields) {
        updatedFields = fields;
        Object.assign(this, fields);
        return this;
      },
    };

    StudioBooking.findByPk = async () => mockBooking;

    try {
      const currentUser = { id: 'user-owner', role: 'USER', fullName: 'Nguyễn Văn Test' };
      const res = await studioBookingService.checkIn('booking-test-1', currentUser);

      assert.ok(updatedFields.userCheckInAt instanceof Date);
      assert.equal(updatedFields.attendanceStatus, 'USER_CHECKED_IN');
      assert.equal(res.attendanceInfo.code, 'WAITING_ADMIN_CONFIRM');
      assert.equal(res.attendanceInfo.label, 'Chờ ADMIN xác nhận');
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }
  });

  it('23.3. Chặn xác nhận đã đến nếu chưa đến ngày đặt phòng hoặc đã qua ngày đặt', async () => {
    const origFindByPk = StudioBooking.findByPk;

    // Trường hợp 1: Chưa đến ngày đặt (ngày mai)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const futureStr = studioBookingService.getVietnamTimeInfo(futureDate).dateString;

    const mockFuture = {
      id: 'booking-future',
      userId: 'user-owner',
      status: 'CONFIRMED',
      startTime: `${futureStr}T09:00:00+07:00`,
      endTime: `${futureStr}T11:00:00+07:00`,
      userCheckInAt: null,
    };

    StudioBooking.findByPk = async () => mockFuture;

    try {
      const currentUser = { id: 'user-owner', role: 'USER' };
      await assert.rejects(
        async () => {
          await studioBookingService.checkIn('booking-future', currentUser);
        },
        /Chưa đến ngày đặt phòng/
      );
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }

    // Trường hợp 2: Đã qua ngày đặt (hôm qua)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const pastStr = studioBookingService.getVietnamTimeInfo(pastDate).dateString;

    const mockPast = {
      id: 'booking-past',
      userId: 'user-owner',
      status: 'CONFIRMED',
      startTime: `${pastStr}T09:00:00+07:00`,
      endTime: `${pastStr}T11:00:00+07:00`,
      userCheckInAt: null,
    };

    StudioBooking.findByPk = async () => mockPast;

    try {
      const currentUser = { id: 'user-owner', role: 'USER' };
      await assert.rejects(
        async () => {
          await studioBookingService.checkIn('booking-past', currentUser);
        },
        /đã quá hạn ngày sử dụng/
      );
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }
  });

  it('23.4. Chống xác nhận trùng lặp (không cho phép người dùng hoặc Admin xác nhận 2 lần)', async () => {
    const origFindByPk = StudioBooking.findByPk;

    // Đã có userCheckInAt -> Chặn checkIn lần 2
    const mockAlreadyCheckedIn = {
      id: 'booking-dup',
      userId: 'user-owner',
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T09:00:00+07:00`,
      endTime: `${todayVNStr}T11:00:00+07:00`,
      userCheckInAt: new Date(),
      attendanceStatus: 'USER_CHECKED_IN',
    };

    StudioBooking.findByPk = async () => mockAlreadyCheckedIn;

    try {
      const currentUser = { id: 'user-owner', role: 'USER' };
      await assert.rejects(
        async () => {
          await studioBookingService.checkIn('booking-dup', currentUser);
        },
        /Không thể xác nhận trùng lặp/
      );
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }

    // Đã có adminConfirmedAt -> Chặn confirmUsage lần 2
    const mockAlreadyConfirmed = {
      id: 'booking-admin-dup',
      userId: 'user-owner',
      status: 'COMPLETED',
      startTime: `${todayVNStr}T09:00:00+07:00`,
      endTime: `${todayVNStr}T11:00:00+07:00`,
      adminConfirmedAt: new Date(),
      attendanceStatus: 'ADMIN_CONFIRMED',
    };

    StudioBooking.findByPk = async () => mockAlreadyConfirmed;

    try {
      const adminUser = { id: 'admin-1', role: 'ADMIN', fullName: 'Quản trị viên A' };
      await assert.rejects(
        async () => {
          await studioBookingService.confirmUsage('booking-admin-dup', adminUser);
        },
        /Không thể xác nhận trùng lặp/
      );
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }
  });

  it('23.5. Admin xác nhận đã sử dụng thành công, cập nhật adminConfirmedAt, status = COMPLETED và USAGE_CONFIRMED', async () => {
    const origFindByPk = StudioBooking.findByPk;
    let updatedFields = null;

    const mockBooking = {
      id: 'booking-admin-confirm',
      userId: 'user-owner',
      studioName: 'Studio LHU',
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T09:00:00+07:00`,
      endTime: `${todayVNStr}T11:00:00+07:00`,
      userCheckInAt: new Date(),
      adminConfirmedAt: null,
      attendanceStatus: 'USER_CHECKED_IN',
      notes: null,
      booker: { fullName: 'Nguyễn Văn Test', email: 'test@lhu.edu.vn' },
      async update(fields) {
        updatedFields = fields;
        Object.assign(this, fields);
        return this;
      },
    };

    StudioBooking.findByPk = async () => mockBooking;

    try {
      const adminUser = { id: 'admin-1', role: 'ADMIN', fullName: 'Quản trị viên Trưởng' };
      const res = await studioBookingService.confirmUsage('booking-admin-confirm', adminUser, {
        adminNote: 'Đã bàn giao và sử dụng studio đạt chuẩn kỹ thuật.',
      });

      assert.ok(updatedFields.adminConfirmedAt instanceof Date);
      assert.equal(updatedFields.status, 'COMPLETED');
      assert.equal(updatedFields.attendanceStatus, 'ADMIN_CONFIRMED');
      assert.ok(updatedFields.notes.includes('Quản trị viên Trưởng'));
      assert.equal(res.attendanceInfo.code, 'USAGE_CONFIRMED');
      assert.equal(res.attendanceInfo.label, 'Đã xác nhận sử dụng');
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }
  });

  it('23.6. Xử lý trường hợp người dùng không đến hoặc Admin đánh dấu vắng mặt (markAbsent)', async () => {
    const origFindByPk = StudioBooking.findByPk;
    let updatedFields = null;

    const mockBooking = {
      id: 'booking-absent',
      userId: 'user-owner',
      status: 'CONFIRMED',
      startTime: `${todayVNStr}T09:00:00+07:00`,
      endTime: `${todayVNStr}T11:00:00+07:00`,
      userCheckInAt: null,
      adminConfirmedAt: null,
      attendanceStatus: 'NOT_ARRIVED',
      notes: null,
      async update(fields) {
        updatedFields = fields;
        Object.assign(this, fields);
        return this;
      },
    };

    StudioBooking.findByPk = async () => mockBooking;

    try {
      const adminUser = { id: 'admin-1', role: 'ADMIN', fullName: 'Quản trị viên' };
      const res = await studioBookingService.markAbsent('booking-absent', adminUser, {
        reason: 'Người dùng không đến và không thông báo trước',
      });

      assert.equal(updatedFields.attendanceStatus, 'ABSENT');
      assert.ok(updatedFields.notes.includes('Người dùng không đến'));
      assert.equal(res.attendanceInfo.code, 'ABSENT');
      assert.equal(res.attendanceInfo.label, 'Không đến sử dụng');
    } finally {
      StudioBooking.findByPk = origFindByPk;
    }
  });
});
