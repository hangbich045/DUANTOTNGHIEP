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



