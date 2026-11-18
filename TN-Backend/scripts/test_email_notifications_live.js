'use strict';

/**
 * @file scripts/test_email_notifications_live.js
 * @description Kiểm thử thực tế gửi thông báo qua email với SMTP thật trên 3 vai trò ADMIN, CTV, USER:
 *  - Kiểm tra kết nối SMTP & phân quyền RBAC API quản trị email
 *  - Kiểm thử giao việc -> cập nhật tiến độ -> nộp kết quả -> yêu cầu sửa -> nghiệm thu (CTV & ADMIN)
 *  - Kiểm thử đặt phòng Studio & mượn/trả thiết bị (USER & ADMIN)
 *  - Kiểm thử chống gửi trùng email, trạng thái FAILED -> gửi lại (resend) thành công
 *  - Kiểm tra 100% liên kết trang đích trong email trả về HTTP 200 trên Frontend
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const {
  sequelize,
  User,
  Equipment,
  EquipmentCategory,
  BorrowRequest,
  StudioBooking,
  Task,
  Notification,
  AttendanceRecord,
  AuditLog,
} = require('../src/models');
const notificationService = require('../src/services/notification.service');

const API_BASE = 'http://127.0.0.1:5000/api';
const FRONTEND_BASE = 'http://127.0.0.1:3000';

const results = { pass: 0, fail: 0 };

function record(name, ok, detail = '') {
  if (ok) {
    results.pass++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    results.fail++;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function signToken(u) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

function buildPlusEmail(baseEmail, tag) {
  const [local, domain] = String(baseEmail).split('@');
  return `${local}+${tag}@${domain}`;
}

async function apiReq(method, ep, token = null, body = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== null) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${ep}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function waitForEmailStatus(where, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await Notification.findOne({ where, order: [['createdAt', 'DESC']] });
    if (row && row.emailStatus && row.emailStatus !== 'PENDING') {
      return row;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return Notification.findOne({ where, order: [['createdAt', 'DESC']] });
}

function getFutureTuesday() {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const ts = Date.now();
  const cleanup = { userIds: [], eqIds: [], borrowIds: [], bookingIds: [], taskIds: [], notifIds: [] };

  try {
    await sequelize.authenticate();
    const smtpBase = process.env.SMTP_USER;
    assert(smtpBase && smtpBase.includes('@'), 'SMTP_USER chưa được cấu hình trong .env');

    console.log('\n====================================================================');
    console.log('📧 KIỂM THỬ THỰC TẾ HỆ THỐNG GỬI THÔNG BÁO QUA EMAIL (ADMIN/CTV/USER)');
    console.log('====================================================================\n');

    const adminReal = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    assert(adminReal, 'Không tìm thấy tài khoản ADMIN hoạt động');
    const adminToken = signToken(adminReal);

    const pwHash = await bcrypt.hash('EmailTest@123', 10);
    const ctvEmail = buildPlusEmail(smtpBase, `ctv_${ts}`);
    const userEmail = buildPlusEmail(smtpBase, `user_${ts}`);

    const testCtv = await User.create({
      fullName: `CTV Email Test ${ts}`,
      email: ctvEmail,
      password: pwHash,
      role: 'COLLABORATOR',
      isVerified: true,
      isActive: true,
      status: 'Active',
    });
    const testUser = await User.create({
      fullName: `USER Email Test ${ts}`,
      email: userEmail,
      password: pwHash,
      role: 'USER',
      isVerified: true,
      isActive: true,
      status: 'Active',
    });
    cleanup.userIds.push(testCtv.id, testUser.id);

    const ctvToken = signToken(testCtv);
    const userToken = signToken(testUser);

    // 1. Kiểm tra SMTP Status & RBAC
    const rStatusAdmin = await apiReq('GET', '/notifications/email-status', adminToken);
    const rStatusCtv = await apiReq('GET', '/notifications/email-status', ctvToken);
    const rStatusUser = await apiReq('GET', '/notifications/email-status', userToken);
    const rLogsCtv = await apiReq('GET', '/notifications/email-logs', ctvToken);
    const rLogsUser = await apiReq('GET', '/notifications/email-logs', userToken);
    const rLogsAdmin = await apiReq('GET', '/notifications/email-logs?limit=5', adminToken);

    record(
      '1. Kết nối SMTP thật & RBAC quản trị lịch sử email',
      rStatusAdmin.status === 200 &&
        rStatusAdmin.data?.data?.smtp?.connected === true &&
        rStatusCtv.status === 403 &&
        rStatusUser.status === 403 &&
        rLogsCtv.status === 403 &&
        rLogsUser.status === 403 &&
        rLogsAdmin.status === 200,
      `connected=${rStatusAdmin.data?.data?.smtp?.connected}, sender=${rStatusAdmin.data?.data?.smtp?.sender}`
    );

    // 2. Luồng CTV (FR-04): Giao việc -> CTV nhận email thật -> CTV cập nhật tiến độ -> Nộp bài -> Yêu cầu sửa -> Nghiệm thu
    const rTask = await apiReq('POST', '/tasks', adminToken, {
      title: `Kiểm thử Email Nhiệm vụ ${ts}`,
      description: 'Xác minh gửi email giao việc, tiến độ, nộp bài, sửa đổi và nghiệm thu',
      assignedToUserId: testCtv.id,
      taskType: 'Thiết kế',
      deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    const taskId = rTask.data?.data?.id || rTask.data?.id;
    if (taskId) cleanup.taskIds.push(taskId);

    const nAssigned = await waitForEmailStatus({ userId: testCtv.id, type: 'TASK_ASSIGNED' });
    record(
      '2. Giao việc (TASK_ASSIGNED) -> CTV nhận in-app + email thật',
      Boolean(nAssigned && nAssigned.emailStatus === 'SENT' && nAssigned.emailMessageId && nAssigned.recipientEmail === ctvEmail && nAssigned.link === '/tasks'),
      `status=${nAssigned?.emailStatus}, to=${nAssigned?.recipientEmail}, msgId=${nAssigned?.emailMessageId}`
    );

    // CTV cập nhật tiến độ (IN_PROGRESS) -> ADMIN nhận thông báo + email
    const rProg = await apiReq('PUT', `/tasks/${taskId}/progress`, ctvToken, { status: 'IN_PROGRESS' });
    const nInProg = await waitForEmailStatus({ userId: adminReal.id, type: 'TASK_IN_PROGRESS' });
    record(
      '3. Cập nhật tiến độ (TASK_IN_PROGRESS) -> ADMIN nhận in-app + email',
      rProg.status === 200 && Boolean(nInProg && nInProg.emailStatus === 'SENT' && nInProg.link === '/admin/tasks'),
      `http=${rProg.status}, status=${nInProg?.emailStatus}, to=${nInProg?.recipientEmail}`
    );

    // CTV nộp kết quả -> ADMIN nhận thông báo + email
    const rSub = await apiReq('PUT', `/tasks/${taskId}/progress`, ctvToken, {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/file/d/email-test',
      actualHours: 2,
    });
    const nSub = await waitForEmailStatus({ userId: adminReal.id, type: 'TASK_SUBMITTED' });
    record(
      '4. Nộp kết quả (TASK_SUBMITTED) -> ADMIN nhận in-app + email',
      rSub.status === 200 && Boolean(nSub && nSub.emailStatus === 'SENT' && nSub.link === '/admin/tasks'),
      `http=${rSub.status}, status=${nSub?.emailStatus}`
    );

    // Admin yêu cầu sửa -> CTV nhận email
    const rRev = await apiReq('PUT', `/tasks/${taskId}/review`, adminToken, {
      decision: 'REVISION_REQUESTED',
      feedback: 'Cần chỉnh lại độ tương phản chữ tiêu đề',
    });
    const nRev = await waitForEmailStatus({ userId: testCtv.id, type: 'TASK_REVISION_REQUESTED' });
    record(
      '5. Yêu cầu chỉnh sửa (TASK_REVISION_REQUESTED) -> CTV nhận email thật',
      rRev.status === 200 && Boolean(nRev && nRev.emailStatus === 'SENT' && nRev.recipientEmail === ctvEmail),
      `status=${nRev?.emailStatus}, msgId=${nRev?.emailMessageId}`
    );

    // CTV nộp lại & Admin nghiệm thu hoàn thành -> CTV nhận email
    await apiReq('PUT', `/tasks/${taskId}/progress`, ctvToken, {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/file/d/email-test-v2',
      actualHours: 2.5,
    });
    const rComp = await apiReq('PUT', `/tasks/${taskId}/review`, adminToken, { decision: 'COMPLETED' });
    const nComp = await waitForEmailStatus({ userId: testCtv.id, type: 'TASK_COMPLETED' });
    record(
      '6. Xác nhận hoàn thành (TASK_COMPLETED) -> CTV nhận email thật',
      rComp.status === 200 && Boolean(nComp && nComp.emailStatus === 'SENT' && nComp.recipientEmail === ctvEmail),
      `status=${nComp?.emailStatus}, msgId=${nComp?.emailMessageId}`
    );

    // 3. Luồng USER: Mượn thiết bị -> Admin duyệt -> USER nhận email (/history)
    const cat = await EquipmentCategory.findOne();
    const testEq = await Equipment.create({
      code: `EM-EQ-${ts}`,
      name: `Sony FX3 Email Test ${ts}`,
      categoryId: cat.id,
      quantity: 2,
      availableQuantity: 2,
      status: 'AVAILABLE',
    });
    cleanup.eqIds.push(testEq.id);

    const rBor = await apiReq('POST', '/borrow-requests', userToken, {
      equipmentId: testEq.id,
      quantity: 1,
      purpose: `Test email mượn thiết bị ${ts}`,
      borrowDate: new Date(Date.now() + 86400000).toISOString(),
      returnDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    const borrowId = rBor.data?.id || rBor.data?.data?.id;
    if (borrowId) cleanup.borrowIds.push(borrowId);

    const rBorApp = await apiReq('PUT', `/borrow-requests/${borrowId}/approve`, adminToken);
    const nBorApp = await waitForEmailStatus({ userId: testUser.id, type: 'BORROW_REQUEST_APPROVED' });
    record(
      '7. Duyệt mượn thiết bị (BORROW_REQUEST_APPROVED) -> USER nhận email thật (/history)',
      rBorApp.status === 200 && Boolean(nBorApp && nBorApp.emailStatus === 'SENT' && nBorApp.recipientEmail === userEmail && nBorApp.link === '/history'),
      `status=${nBorApp?.emailStatus}, link=${nBorApp?.link}`
    );

    // 4. Luồng USER: Đặt phòng Studio -> Admin duyệt -> USER nhận email (/history)
    const tue = getFutureTuesday();
    const rBk = await apiReq('POST', '/studio-bookings', userToken, {
      studioName: `Studio Email ${ts}`,
      purpose: 'Quay phỏng vấn kiểm thử email',
      startTime: `${tue}T08:00:00+07:00`,
      endTime: `${tue}T09:30:00+07:00`,
      attendees: 3,
    });
    const bookingId = rBk.data?.id || rBk.data?.data?.id;
    if (bookingId) cleanup.bookingIds.push(bookingId);

    const rBkApp = await apiReq('PUT', `/studio-bookings/${bookingId}/approve`, adminToken, {});
    const nBkApp = await waitForEmailStatus({ userId: testUser.id, type: 'STUDIO_BOOKING_APPROVED' });
    record(
      '8. Duyệt đặt phòng Studio (STUDIO_BOOKING_APPROVED) -> USER nhận email thật (/history)',
      rBkApp.status === 200 && Boolean(nBkApp && nBkApp.emailStatus === 'SENT' && nBkApp.recipientEmail === userEmail && nBkApp.link === '/history'),
      `status=${nBkApp?.emailStatus}, link=${nBkApp?.link}`
    );

    // 5. Kiểm tra chống gửi trùng email + quy trình Gửi lại (Resend) khi FAILED
    const failedNotif = await Notification.create({
      userId: testUser.id,
      title: `Kiểm thử gửi lại email lỗi ${ts}`,
      message: 'Bản ghi giả lập lỗi SMTP trước đó để xác minh chức năng gửi lại (Resend).',
      type: 'SYSTEM',
      link: '/notifications',
      isRead: false,
      senderName: adminReal.fullName || 'Quản trị viên',
      recipientEmail: userEmail,
      emailStatus: 'FAILED',
      emailError: 'Simulated transient SMTP failure',
      emailRetryCount: 1,
      emailMetadata: JSON.stringify([{ label: 'Kiểm thử', value: 'Gửi lại sau lỗi SMTP' }]),
    });
    cleanup.notifIds.push(failedNotif.id);

    const rResend = await apiReq('POST', `/notifications/${failedNotif.id}/resend-email`, adminToken, {});
    await failedNotif.reload();
    record(
      '9. Hỗ trợ gửi lại email lỗi (POST /:id/resend-email) -> chuyển FAILED sang SENT',
      rResend.status === 200 && rResend.data?.success === true && failedNotif.emailStatus === 'SENT' && failedNotif.emailRetryCount === 2,
      `status=${failedNotif.emailStatus}, retries=${failedNotif.emailRetryCount}, msgId=${failedNotif.emailMessageId}`
    );

    // Chống gửi trùng qua service
    notificationService._clearDedupCacheForTest();
    const d1 = await notificationService.createNotification({
      userId: testUser.id,
      userEmail,
      recipientName: testUser.fullName,
      senderName: 'Hệ thống kiểm thử',
      title: `Dedup Test ${ts}`,
      message: 'Đảm bảo không gửi trùng email',
      type: 'SYSTEM',
      link: '/notifications',
      awaitEmail: true,
    });
    if (d1?.id) cleanup.notifIds.push(d1.id);
    const d2 = await notificationService.createNotification({
      userId: testUser.id,
      userEmail,
      recipientName: testUser.fullName,
      senderName: 'Hệ thống kiểm thử',
      title: `Dedup Test ${ts}`,
      message: 'Đảm bảo không gửi trùng email',
      type: 'SYSTEM',
      link: '/notifications',
      awaitEmail: true,
    });
    record(
      '10. Chống gửi trùng email (2 lần gọi giống nhau -> chỉ gửi đúng 1 email)',
      Boolean(d1 && d1.emailStatus === 'SENT') && d2 === null,
      `first=${d1?.emailStatus}, duplicate=${d2}`
    );

    // 6. Xác minh 100% liên kết trang đích trong email trả về HTTP 200 trên Frontend
    const targetLinks = ['/tasks', '/admin/tasks', '/history', '/admin/requests', '/admin/duty', '/notifications'];
    let linksOk = true;
    const linkFail = [];
    for (const lnk of targetLinks) {
      const r = await fetch(`${FRONTEND_BASE}${lnk}`);
      if (r.status !== 200) {
        linksOk = false;
        linkFail.push(`${lnk}=${r.status}`);
      }
    }
    record(
      `11. Tất cả ${targetLinks.length}/${targetLinks.length} liên kết trang đích trong email hoạt động (HTTP 200)`,
      linksOk,
      linksOk ? '100% 200 OK' : linkFail.join(', ')
    );
  } finally {
    console.log('\n🧹 Dọn dẹp dữ liệu kiểm thử tạm thời...');
    try {
      if (cleanup.taskIds.length) {
        await AttendanceRecord.destroy({ where: { sourceId: { [Op.in]: cleanup.taskIds } } });
        await Task.destroy({ where: { id: { [Op.in]: cleanup.taskIds } } });
      }
      if (cleanup.borrowIds.length) {
        await BorrowRequest.destroy({ where: { id: { [Op.in]: cleanup.borrowIds } } });
      }
      if (cleanup.bookingIds.length) {
        await StudioBooking.destroy({ where: { id: { [Op.in]: cleanup.bookingIds } } });
      }
      if (cleanup.eqIds.length) {
        await Equipment.destroy({ where: { id: { [Op.in]: cleanup.eqIds } } });
      }
      if (cleanup.notifIds.length) {
        await Notification.destroy({ where: { id: { [Op.in]: cleanup.notifIds } } });
      }
      if (cleanup.userIds.length) {
        await Notification.destroy({ where: { userId: { [Op.in]: cleanup.userIds } } });
        await Notification.destroy({ where: { senderName: { [Op.like]: `%Email Test ${ts}%` } } });
        await Notification.destroy({ where: { title: { [Op.like]: `%${ts}%` } } });
        await Notification.destroy({ where: { message: { [Op.like]: `%${ts}%` } } });
        await AuditLog.destroy({ where: { userId: { [Op.in]: cleanup.userIds } } });
        await User.destroy({ where: { id: { [Op.in]: cleanup.userIds } } });
      }
      console.log('✅ Đã dọn sạch 100% bản ghi kiểm thử khỏi SQL Server.');
    } catch (e) {
      console.error('⚠️ Lỗi dọn dẹp:', e.message);
    }
    await sequelize.close();
  }

  console.log('\n====================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ EMAIL THỰC TẾ: ${results.pass}/${results.pass + results.fail} PASS | ${results.fail} FAIL`);
  console.log('====================================================================\n');
  if (results.fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
