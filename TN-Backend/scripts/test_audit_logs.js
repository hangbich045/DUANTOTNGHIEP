'use strict';

/**
 * @file scripts/test_audit_logs.js
 * @description Script kiểm thử toàn diện chức năng AuditLogs (FR-09 - Task 4.2).
 */

const { sequelize, User, AuditLog } = require('../src/models');
const auditLogService = require('../src/services/auditLog.service');
const jwt = require('jsonwebtoken');
const http = require('http');

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TASK 4.2 (FR-09): AUDIT LOGS ===');
  await sequelize.authenticate();
  console.log('✅ Đã kết nối thành công tới Database MSSQL');

  // Đảm bảo bảng AuditLogs được đồng bộ
  await sequelize.sync({ force: false });
  console.log('✅ Bảng AuditLogs đã sẵn sàng trong CSDL');

  const admin = await User.findOne({ where: { role: 'ADMIN' } });
  const ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });

  if (!admin || !ctv) {
    throw new Error('Cần có ít nhất 1 tài khoản ADMIN và 1 COLLABORATOR trong CSDL');
  }

  console.log(`👤 Admin kiểm thử: ${admin.fullName} (${admin.id})`);
  console.log(`👤 CTV kiểm thử: ${ctv.fullName} (${ctv.id})`);

  // --- Test 1: Ghi vết thủ công và khử khuẩn dữ liệu nhạy cảm (Sanitization) ---
  console.log('\n--- Test 1: Kiểm tra hàm sanitizeDetails và recordAudit ---');
  const rawDetails = {
    userName: 'Test User',
    email: 'test@lhu.edu.vn',
    password: 'SuperSecretPassword123!',
    otp: '123456',
    token: 'jwt-token-sample',
    role: 'COLLABORATOR',
    metadata: {
      nestedOtp: '999999',
      oldPassword: 'OldSecretPassword!',
      actionReason: 'Cấp quyền thử nghiệm',
    },
  };

  const clean = auditLogService.sanitizeDetails(rawDetails);
  console.log('Chi tiết sau khi lọc thông tin nhạy cảm:', clean);

  if (clean.password !== '[PROTECTED]' || clean.otp !== '[PROTECTED]' || clean.token !== '[PROTECTED]') {
    throw new Error('LỖI: Mật khẩu, OTP hoặc token không được che mờ bảo mật!');
  }
  if (clean.metadata.nestedOtp !== '[PROTECTED]' || clean.metadata.oldPassword !== '[PROTECTED]') {
    throw new Error('LỖI: Thông tin nhạy cảm lồng nhau không được che mờ!');
  }
  if (clean.userName !== 'Test User' || clean.metadata.actionReason !== 'Cấp quyền thử nghiệm') {
    throw new Error('LỖI: Dữ liệu an toàn bị làm sai lệch!');
  }
  console.log('PASS: Khử khuẩn dữ liệu nhạy cảm hoàn hảo 100%!');

  // Ghi log qua service
  const recorded = await auditLogService.recordAudit({
    userId: admin.id,
    action: 'ASSIGN_ROLE',
    resource: 'USER',
    resourceId: ctv.id,
    details: rawDetails,
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0',
    status: 'SUCCESS',
  });

  if (!recorded || !recorded.id) {
    throw new Error('LỖI: Không thể tạo bản ghi AuditLog!');
  }

  console.log('Bản ghi đã lưu:', {
    id: recorded.id,
    userId: recorded.userId,
    action: recorded.action,
    resource: recorded.resource,
    details: recorded.details,
    ip: recorded.ip,
    status: recorded.status,
    timestamp: recorded.timestamp,
  });

  if (typeof recorded.details !== 'string') {
    throw new Error('LỖI: Chi tiết lưu trong database phải là chuỗi văn bản cho người dùng đọc!');
  }
  if (recorded.details.startsWith('{') || recorded.details.endsWith('}')) {
    throw new Error('LỖI: Chi tiết không được lưu dưới dạng mã JSON!');
  }
  if (!recorded.details.includes('Cấp quyền / Thay đổi vai trò') || !recorded.details.includes('Cộng tác viên')) {
    throw new Error('LỖI: Chi tiết không chứa nội dung tiếng Việt diễn giải hành động!');
  }
  if (
    recorded.details.includes('SuperSecretPassword123!') ||
    recorded.details.includes('123456') ||
    recorded.details.includes('jwt-token-sample')
  ) {
    throw new Error('LỖI: Chi tiết làm lộ thông tin nhạy cảm!');
  }
  console.log('PASS: Lưu vết dưới dạng văn bản tiếng Việt dễ đọc, 0% mã JSON, bảo mật 100%!');

  // --- Test 2: Tra cứu, Lọc và Tìm kiếm Audit Logs ---
  console.log('\n--- Test 2: Kiểm tra truy vấn getAuditLogs ---');
  const logsResult = await auditLogService.getAuditLogs({
    page: 1,
    limit: 10,
    action: 'ASSIGN_ROLE',
    resource: 'USER',
  });

  console.log(`Tìm thấy ${logsResult.pagination.total} bản ghi phù hợp. Phân trang:`, logsResult.pagination);
  if (logsResult.logs.length === 0) {
    throw new Error('LỖI: Không tìm thấy bản ghi vừa tạo!');
  }
  const foundLog = logsResult.logs.find((l) => l.id === recorded.id);
  if (!foundLog) {
    throw new Error('LỖI: Bản ghi vừa tạo không có trong kết quả truy vấn!');
  }
  console.log(`PASS: Tìm thấy bản ghi với người thực hiện: ${foundLog.user?.fullName} (${foundLog.user?.email})`);

  // --- Test 3: Thống kê AuditLogStats ---
  console.log('\n--- Test 3: Kiểm tra thống kê getAuditLogStats ---');
  const stats = await auditLogService.getAuditLogStats();
  console.log('Thống kê Audit Logs:', stats);

  if (typeof stats.total !== 'number' || stats.total < 1) {
    throw new Error('LỖI: Thống kê total không hợp lệ!');
  }
  if (typeof stats.todayCount !== 'number' || stats.todayCount < 1) {
    throw new Error('LỖI: Thống kê todayCount không hợp lệ!');
  }
  console.log('PASS: Thống kê hoạt động chính xác!');

  // --- Test 4: Chi tiết AuditLog theo ID ---
  console.log('\n--- Test 4: Kiểm tra getAuditLogById ---');
  const detail = await auditLogService.getAuditLogById(recorded.id);
  if (!detail || detail.id !== recorded.id) {
    throw new Error('LỖI: Không thể lấy chi tiết AuditLog!');
  }
  console.log('Chi tiết log lấy ra thành công:', {
    id: detail.id,
    action: detail.action,
    resource: detail.resource,
    user: detail.user ? detail.user.fullName : null,
  });
  console.log('PASS: Lấy chi tiết log thành công!');

  console.log('\n=== TẤT CẢ CÁC BÀI TEST AUDIT LOGS ĐỀU PASS 100%! ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
