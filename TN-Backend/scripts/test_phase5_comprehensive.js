'use strict';

/**
 * @file scripts/test_phase5_comprehensive.js
 * @description Giai đoạn 5 (Task 5.1, 5.2, 5.3, 5.4) — Bộ kiểm thử tích hợp toàn diện:
 *   1. Ma trận phân quyền RBAC trên 4 đối tượng (Anonymous, USER, COLLABORATOR, ADMIN)
 *   2. Hồi quy 100% chức năng FR-01 -> FR-09 & Swagger OpenAPI + Frontend SSR
 *   3. Kiểm thử Concurrency Locks (chống race condition duyệt đơn mượn & đặt phòng) + Toàn vẹn CSDL SQL Server
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');

const {
  sequelize,
  User,
  Equipment,
  EquipmentCategory,
  BorrowRequest,
  StudioBooking,
  Task,
  StudioShift,
  AttendanceRecord,
  MonthlyPayroll,
  EquipmentMaintenance,
  Notification,
  AuditLog,
} = require('../src/models');

const API_BASE = 'http://127.0.0.1:5000/api';
const BACKEND_ROOT = 'http://127.0.0.1:5000';
const FRONTEND_ROOT = 'http://127.0.0.1:3000';

const results = { pass: 0, fail: 0, details: [] };

function record(group, name, passed, info = '') {
  if (passed) {
    results.pass++;
    console.log(`  ✅ [${group}] ${name}${info ? ` — ${info}` : ''}`);
  } else {
    results.fail++;
    console.error(`  ❌ [${group}] ${name}${info ? ` — ${info}` : ''}`);
  }
  results.details.push({ group, name, passed, info });
}

async function req(method, endpoint, token = null, body = null, isBinary = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== null) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  if (isBinary) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, buffer: buf };
  }

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, data: json };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

/** Tìm ngày thứ Ba hợp lệ trong tương lai (cách hôm nay ~14 ngày) để tránh mọi lịch thật */
function getFutureWeekdayDate(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Đảm bảo rơi vào Thứ Ba (day === 2)
  while (d.getDay() !== 2) {
    d.setDate(d.getDate() + 1);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const ts = Date.now();
  const createdIds = {
    userIds: [],
    equipmentIds: [],
    borrowIds: [],
    bookingIds: [],
    taskIds: [],
    maintenanceIds: [],
  };

  try {
    await sequelize.authenticate();
    console.log('\n====================================================================');
    console.log('🚀 GIAI ĐOẠN 5 — KIỂM THỬ TÍCH HỢP TOÀN DIỆN, RBAC & CONCURRENCY');
    console.log('====================================================================\n');

    // Lấy tài khoản Admin hiện có (hoặc tạo tạm)
    const adminUser = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    assert(adminUser, 'Không tìm thấy tài khoản ADMIN hoạt động trong CSDL');

    const pwHash = await bcrypt.hash('Phase5Test@123', 10);

    // Tạo 3 tài khoản test cô lập (1 USER, 2 COLLABORATOR)
    const testUser = await User.create({
      fullName: `Phase5 User ${ts}`,
      email: `phase5_user_${ts}@lhu.edu.vn`,
      password: pwHash,
      role: 'USER',
      isVerified: true,
      isActive: true,
      status: 'Active',
    });
    createdIds.userIds.push(testUser.id);

    const testCtvA = await User.create({
      fullName: `Phase5 CTV A ${ts}`,
      email: `phase5_ctva_${ts}@lhu.edu.vn`,
      password: pwHash,
      role: 'COLLABORATOR',
      isVerified: true,
      isActive: true,
      status: 'Active',
    });
    createdIds.userIds.push(testCtvA.id);

    const testCtvB = await User.create({
      fullName: `Phase5 CTV B ${ts}`,
      email: `phase5_ctvb_${ts}@lhu.edu.vn`,
      password: pwHash,
      role: 'COLLABORATOR',
      isVerified: true,
      isActive: true,
      status: 'Active',
    });
    createdIds.userIds.push(testCtvB.id);

    const adminToken = signToken(adminUser);
    const userToken = signToken(testUser);
    const ctvAToken = signToken(testCtvA);
    const ctvBToken = signToken(testCtvB);

    // Lấy 1 category & 1 equipment để test
    const firstCat = await EquipmentCategory.findOne();
    assert(firstCat, 'Không tìm thấy EquipmentCategory trong CSDL');

    // =========================================================================
    // PHẦN 1 (TASK 5.1): MA TRẬN PHÂN QUYỀN RBAC (ANONYMOUS / USER / CTV / ADMIN)
    // =========================================================================
    console.log('▶ PHẦN 1 (TASK 5.1): KIỂM THỬ PHÂN QUYỀN RBAC TRÊN TOÀN BỘ API');

    // 1.1 Public endpoints
    const rPubHome = await req('GET', '/homepage');
    record('5.1-RBAC', 'Public GET /api/homepage -> 200', rPubHome.status === 200, `status=${rPubHome.status}`);

    // 1.2 Anonymous bị chặn 401 trên các endpoint bảo vệ
    const anonEndpoints = [
      ['GET', '/auth/profile'],
      ['GET', '/equipments'],
      ['GET', '/borrow-requests'],
      ['GET', '/studio-bookings'],
      ['GET', '/tasks'],
      ['GET', '/duty/weekly-schedule'],
      ['GET', '/payroll/monthly'],
      ['GET', '/dashboard/stats'],
      ['GET', '/admin/users'],
      ['GET', '/audit-logs'],
      ['GET', '/maintenances'],
      ['GET', '/notifications'],
      ['GET', '/reports/export-excel'],
    ];
    let anonAll401 = true;
    const anonFailures = [];
    for (const [m, ep] of anonEndpoints) {
      const r = await req(m, ep);
      if (r.status !== 401) {
        anonAll401 = false;
        anonFailures.push(`${m} ${ep}=${r.status}`);
      }
    }
    record(
      '5.1-RBAC',
      `Anonymous bị chặn 401 trên ${anonEndpoints.length}/${anonEndpoints.length} endpoint bảo vệ`,
      anonAll401,
      anonAll401 ? '100% 401' : anonFailures.join(', ')
    );

    // 1.3 USER bị chặn 403 trên toàn bộ endpoint CTV & ADMIN
    const userForbiddenEndpoints = [
      ['GET', '/tasks'],
      ['GET', '/tasks/stats'],
      ['POST', '/tasks', { title: 'Hack' }],
      ['POST', '/tasks/external', { title: 'Hack' }],
      ['GET', '/duty/periods'],
      ['GET', '/duty/weekly-schedule'],
      ['GET', '/duty/export-weekly'],
      ['GET', '/payroll/timesheet'],
      ['GET', '/payroll/collaborator-summary'],
      ['GET', '/payroll/monthly'],
      ['GET', '/payroll/export-payroll'],
      ['GET', '/dashboard/stats'],
      ['GET', '/dashboard/reports'],
      ['GET', '/admin/users'],
      ['GET', '/admin/collaborators'],
      ['GET', '/audit-logs'],
      ['GET', '/maintenances'],
      ['GET', '/equipments/00000000-0000-0000-0000-000000000001/maintenances'],
      ['GET', '/reports/export-excel'],
      ['GET', '/reports/export-equipment'],
      ['GET', '/homepage-content'],
    ];
    let userAll403 = true;
    const userFailures = [];
    for (const [m, ep, b] of userForbiddenEndpoints) {
      const r = await req(m, ep, userToken, b || null);
      if (r.status !== 403) {
        userAll403 = false;
        userFailures.push(`${m} ${ep}=${r.status}`);
      }
    }
    record(
      '5.1-RBAC',
      `USER bị chặn 403 trên ${userForbiddenEndpoints.length}/${userForbiddenEndpoints.length} endpoint CTV/ADMIN`,
      userAll403,
      userAll403 ? '100% 403' : userFailures.join(', ')
    );

    // 1.4 USER được phép các endpoint cá nhân
    const userAllowed = [
      ['GET', '/auth/profile'],
      ['GET', '/equipment'],
      ['GET', '/equipment-categories'],
      ['GET', '/borrow-requests'],
      ['GET', '/studio-bookings'],
      ['GET', '/notifications'],
    ];
    let userAllowedOk = true;
    for (const [m, ep] of userAllowed) {
      const r = await req(m, ep, userToken);
      if (r.status !== 200) userAllowedOk = false;
    }
    record('5.1-RBAC', `USER truy cập hợp lệ ${userAllowed.length}/${userAllowed.length} endpoint cá nhân`, userAllowedOk);

    // 1.5 COLLABORATOR (CTV) bị chặn 403 trên toàn bộ endpoint ADMIN-only
    const ctvForbiddenEndpoints = [
      ['POST', '/tasks', { title: 'CTV Hack Assign' }],
      ['PUT', '/tasks/00000000-0000-0000-0000-000000000001/review', { status: 'COMPLETED' }],
      ['DELETE', '/tasks/00000000-0000-0000-0000-000000000001'],
      ['POST', '/duty/periods', { month: 12, year: 2027 }],
      ['DELETE', '/duty/periods/00000000-0000-0000-0000-000000000001'],
      ['PUT', '/duty/shifts/00000000-0000-0000-0000-000000000001/complete'],
      ['GET', '/payroll/monthly'],
      ['POST', '/payroll/calculate', { month: 11, year: 2026 }],
      ['PUT', '/payroll/timesheet/cell', {}],
      ['GET', '/payroll/export-timesheet'],
      ['GET', '/payroll/export-tasks-summary'],
      ['GET', '/payroll/export-payroll'],
      ['GET', '/dashboard/stats'],
      ['GET', '/admin/users'],
      ['GET', '/audit-logs'],
      ['GET', '/maintenances'],
      ['GET', '/equipments/00000000-0000-0000-0000-000000000001/maintenances'],
      ['GET', '/reports/export-excel'],
      ['GET', '/reports/export-equipment'],
      ['GET', '/reports/export-borrows'],
      ['GET', '/reports/export-studio-bookings'],
      ['POST', '/equipment', { name: 'Hack' }],
      ['GET', '/homepage-content'],
    ];
    let ctvAll403 = true;
    const ctvFailures = [];
    for (const [m, ep, b] of ctvForbiddenEndpoints) {
      const r = await req(m, ep, ctvAToken, b || null);
      if (r.status !== 403) {
        ctvAll403 = false;
        ctvFailures.push(`${m} ${ep}=${r.status}`);
      }
    }
    record(
      '5.1-RBAC',
      `COLLABORATOR bị chặn 403 trên ${ctvForbiddenEndpoints.length}/${ctvForbiddenEndpoints.length} endpoint ADMIN-only`,
      ctvAll403,
      ctvAll403 ? '100% 403' : ctvFailures.join(', ')
    );

    // 1.6 COLLABORATOR truy cập hợp lệ endpoint CTV
    const ctvAllowed = [
      ['GET', '/tasks'],
      ['GET', '/tasks/stats'],
      ['GET', '/duty/periods'],
      ['GET', '/duty/weekly-schedule'],
      ['GET', '/payroll/collaborator-summary?month=11&year=2026'],
      ['GET', '/notifications'],
    ];
    let ctvAllowedOk = true;
    const ctvAllowFail = [];
    for (const [m, ep] of ctvAllowed) {
      const r = await req(m, ep, ctvAToken);
      if (r.status !== 200) {
        ctvAllowedOk = false;
        ctvAllowFail.push(`${ep}=${r.status}`);
      }
    }
    record(
      '5.1-RBAC',
      `COLLABORATOR truy cập hợp lệ ${ctvAllowed.length}/${ctvAllowed.length} endpoint CTV`,
      ctvAllowedOk,
      ctvAllowFail.join(', ')
    );

    // 1.7 Bảo vệ Admin không tự khóa / tự xóa chính mình
    const rSelfLock = await req('PATCH', `/admin/users/${adminUser.id}/toggle-active`, adminToken);
    const rSelfDel = await req('DELETE', `/admin/users/${adminUser.id}`, adminToken);
    record(
      '5.1-RBAC',
      'ADMIN bị chặn tự khóa và tự xóa tài khoản chính mình',
      rSelfLock.status === 400 && rSelfDel.status === 400,
      `selfLock=${rSelfLock.status}, selfDel=${rSelfDel.status}`
    );

    // =========================================================================
    // PHẦN 2 (TASK 5.2): KIỂM THỬ HỒI QUY 100% CHỨC NĂNG (FR-01 -> FR-09)
    // =========================================================================
    console.log('\n▶ PHẦN 2 (TASK 5.2): KIỂM THỬ HỒI QUY TOÀN HỆ THỐNG (FR-01 -> FR-09)');

    // 2.1 FR-01 + FR-01.5: Tạo thiết bị test -> Bảo trì -> Nghiệm thu khôi phục AVAILABLE
    const testEq = await Equipment.create({
      code: `P5-EQ-${ts}`,
      name: `Phase5 Test Camera ${ts}`,
      categoryId: firstCat.id,
      quantity: 2,
      availableQuantity: 2,
      status: 'AVAILABLE',
      description: 'Thiết bị phục vụ kiểm thử Giai đoạn 5',
    });
    createdIds.equipmentIds.push(testEq.id);

    const rMaintCreate = await req('POST', '/maintenances', adminToken, {
      equipmentId: testEq.id,
      type: 'REPAIR',
      title: `Sửa cảm biến Phase5 ${ts}`,
      description: 'Kiểm thử hồi quy FR-01.5',
      cost: 500000,
      invoiceNumber: `HD-P5-${ts}`,
      serviceProvider: 'Trung tâm kỹ thuật LHU',
      status: 'IN_PROGRESS',
    });
    const maintId = rMaintCreate.data?.data?.id || rMaintCreate.data?.id;
    if (maintId) createdIds.maintenanceIds.push(maintId);
    await testEq.reload();
    const maintStatusChanged = rMaintCreate.status === 201 && testEq.status === 'MAINTENANCE';

    const rMaintDone = await req('PUT', `/maintenances/${maintId}`, adminToken, { status: 'COMPLETED' });
    await testEq.reload();
    const maintRestored = rMaintDone.status === 200 && testEq.status === 'AVAILABLE';
    record(
      '5.2-REG',
      'FR-01 & FR-01.5: Bảo trì chuyển MAINTENANCE và nghiệm thu tự khôi phục AVAILABLE',
      maintStatusChanged && maintRestored,
      `create=${rMaintCreate.status}, complete=${rMaintDone.status}, finalEq=${testEq.status}`
    );

    // 2.2 FR-02 & TC-02: Mượn -> Duyệt (giữ AVAILABLE) -> Bàn giao (HANDED_OVER) -> Trả (RETURNED)
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const nextWeek = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    const rBorrowCreate = await req('POST', '/borrow-requests', userToken, {
      equipmentId: testEq.id,
      quantity: 2,
      purpose: `Kiểm thử hồi quy mượn máy ${ts}`,
      borrowDate: tomorrow,
      returnDate: nextWeek,
    });
    const borrowId = rBorrowCreate.data?.id || rBorrowCreate.data?.data?.id;
    if (borrowId) createdIds.borrowIds.push(borrowId);

    const rBorrowApprove = await req('PUT', `/borrow-requests/${borrowId}/approve`, adminToken);
    await testEq.reload();
    const tc02Ok = rBorrowApprove.status === 200 && testEq.availableQuantity === 0 && testEq.status === 'AVAILABLE';

    const rBorrowHandover = await req('PUT', `/borrow-requests/${borrowId}/handover`, adminToken, {
      handoverCondition: 'Nguyên vẹn, đủ phụ kiện',
    });
    await testEq.reload();
    const handoverOk = rBorrowHandover.status === 200 && testEq.status === 'BORROWED';

    const rBorrowReturn = await req('PUT', `/borrow-requests/${borrowId}/return`, adminToken, {
      returnCondition: 'Hoàn trả nguyên vẹn',
      isDamaged: false,
    });
    await testEq.reload();
    const returnOk = rBorrowReturn.status === 200 && testEq.availableQuantity === 2 && testEq.status === 'AVAILABLE';

    record(
      '5.2-REG',
      'FR-02 & TC-02: Mượn -> Duyệt (giữ AVAILABLE) -> Bàn giao (BORROWED) -> Trả (khôi phục tồn kho)',
      tc02Ok && handoverOk && returnOk,
      `tc02=${tc02Ok}, handover=${handoverOk}, return=${returnOk}`
    );

    // 2.3 FR-03 & FR-03.6 & TC-01: Đặt phòng Studio, chặn Chủ nhật, buffer 30p, dời lịch
    const futureTue = getFutureWeekdayDate(18);
    // Tìm Chủ nhật kế tiếp (dùng UTC noon để tránh lệch ngày khi chuyển ISO string)
    const sunDateObj = new Date(`${futureTue}T12:00:00Z`);
    sunDateObj.setUTCDate(sunDateObj.getUTCDate() + 5); // Thứ Ba + 5 ngày = Chủ Nhật
    const futureSun = sunDateObj.toISOString().slice(0, 10);

    const rSunReject = await req('POST', '/studio-bookings', userToken, {
      studioName: `Studio P5 ${ts}`,
      purpose: 'Test Chủ nhật bị chặn',
      startTime: `${futureSun}T08:00:00+07:00`,
      endTime: `${futureSun}T10:00:00+07:00`,
      attendees: 3,
    });
    if (rSunReject.data?.id || rSunReject.data?.data?.id) {
      createdIds.bookingIds.push(rSunReject.data?.id || rSunReject.data?.data?.id);
    }

    const rBookOk = await req('POST', '/studio-bookings', userToken, {
      studioName: `Studio P5 ${ts}`,
      purpose: 'Quay video kiểm thử hồi quy',
      startTime: `${futureTue}T08:00:00+07:00`,
      endTime: `${futureTue}T10:00:00+07:00`,
      attendees: 4,
    });
    const book1Id = rBookOk.data?.id || rBookOk.data?.data?.id;
    if (book1Id) createdIds.bookingIds.push(book1Id);

    const rBookApprove = await req('PUT', `/studio-bookings/${book1Id}/approve`, adminToken);

    // Test buffer 30m: 10:15 - 11:15 vi phạm buffer với 08:00 - 10:00
    const rBufferBlock = await req('POST', '/studio-bookings', userToken, {
      studioName: `Studio P5 ${ts}`,
      purpose: 'Vi phạm buffer 30p',
      startTime: `${futureTue}T10:15:00+07:00`,
      endTime: `${futureTue}T11:15:00+07:00`,
      attendees: 2,
    });

    // Test Reschedule (FR-03.6) sang ca chiều 13:30 - 15:30
    const rResched = await req('PUT', `/studio-bookings/${book1Id}/reschedule`, adminToken, {
      startTime: `${futureTue}T13:30:00+07:00`,
      endTime: `${futureTue}T15:30:00+07:00`,
      rescheduleReason: 'Đổi sang ca chiều kiểm thử Phase 5',
    });

    record(
      '5.2-REG',
      'FR-03 & TC-01: Chặn Chủ nhật (400), duyệt lịch, chặn buffer 30p (409), dời lịch (200)',
      rSunReject.status === 400 && rBookOk.status === 201 && rBookApprove.status === 200 && rBufferBlock.status === 409 && rResched.status === 200,
      `sun=${rSunReject.status}, create=${rBookOk.status}, approve=${rBookApprove.status}, buf=${rBufferBlock.status}, resched=${rResched.status}`
    );

    // 2.4 FR-04 + Cross-CTV Isolation: Giao việc -> CTV B bị chặn xem -> CTV A làm -> Nộp -> Sửa -> Nghiệm thu
    const rTaskCreate = await req('POST', '/tasks', adminToken, {
      title: `Quay sự kiện Phase5 ${ts}`,
      description: 'Kiểm thử luồng FR-04 đầy đủ',
      assignedToUserId: testCtvA.id,
      taskType: 'Quay phim',
      startTime: `${futureTue}T14:00:00+07:00`,
      campus: 'Cơ sở 1',
      room: 'Hội trường A301',
    });
    const taskId = rTaskCreate.data?.data?.id || rTaskCreate.data?.id;
    if (taskId) createdIds.taskIds.push(taskId);

    // Cross-CTV check: CTV B không được xem chi tiết task của CTV A
    const rCrossCtv = await req('GET', `/tasks/${taskId}`, ctvBToken);
    const rStart = await req('PUT', `/tasks/${taskId}/progress`, ctvAToken, { status: 'IN_PROGRESS' });
    const rSubmit = await req('PUT', `/tasks/${taskId}/progress`, ctvAToken, {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/phase5-test',
      actualHours: 3,
    });
    const rRevise = await req('PUT', `/tasks/${taskId}/review`, adminToken, {
      decision: 'REVISION_REQUESTED',
      feedback: 'Cần bổ sung âm thanh nền',
    });
    const rResubmit = await req('PUT', `/tasks/${taskId}/progress`, ctvAToken, {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/phase5-test-v2',
      actualHours: 3.5,
    });
    const rApproveTask = await req('PUT', `/tasks/${taskId}/review`, adminToken, {
      decision: 'COMPLETED',
    });

    record(
      '5.2-REG',
      'FR-04 & Cô lập CTV: Giao việc -> CTV khác bị chặn (403) -> Làm -> Nộp -> Yêu cầu sửa -> Nghiệm thu COMPLETED',
      rTaskCreate.status === 201 &&
        rCrossCtv.status === 403 &&
        rStart.status === 200 &&
        rSubmit.status === 200 &&
        rRevise.status === 200 &&
        rResubmit.status === 200 &&
        rApproveTask.status === 200,
      `create=${rTaskCreate.status}, crossCtv=${rCrossCtv.status}, approve=${rApproveTask.status}`
    );

    // 2.5 FR-05 & FR-08: Dashboard Stats/Reports + 6-sheet Excel Export + Payroll/Weekly Schedule
    const rDashStats = await req('GET', '/dashboard/stats', adminToken);
    const rDashReports = await req('GET', '/dashboard/reports?range=month', adminToken);
    const rWeekly = await req('GET', '/duty/weekly-schedule', ctvAToken);
    const rExcelDash = await req('GET', '/reports/export-excel?range=month', adminToken, null, true);

    let excelSheetCount = 0;
    if (rExcelDash.status === 200 && rExcelDash.buffer.slice(0, 2).toString() === 'PK') {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(rExcelDash.buffer);
      excelSheetCount = wb.worksheets.length;
    }

    record(
      '5.2-REG',
      'FR-05 & FR-08: Dashboard Stats, Reports, Weekly Schedule & Excel 6 sheet hợp lệ',
      rDashStats.status === 200 && rDashReports.status === 200 && rWeekly.status === 200 && excelSheetCount === 6,
      `stats=${rDashStats.status}, reports=${rDashReports.status}, weekly=${rWeekly.status}, sheets=${excelSheetCount}`
    );

    // 2.6 FR-06: Theme Preference lưu DB theo từng tài khoản
    const rThemeLight = await req('PATCH', '/auth/theme', testUser ? userToken : adminToken, { theme: 'light' });
    const rProfileAfter = await req('GET', '/auth/profile', userToken);
    const savedTheme = rProfileAfter.data?.data?.themePreference || rProfileAfter.data?.themePreference;
    record(
      '5.2-REG',
      'FR-06 & TC-27: Lưu & khôi phục themePreference (light) theo tài khoản từ SQL Server',
      rThemeLight.status === 200 && savedTheme === 'light',
      `patch=${rThemeLight.status}, profileTheme=${savedTheme}`
    );

    // 2.7 FR-09: Audit Logs hoạt động & không rò rỉ dữ liệu nhạy cảm
    const rAudit = await req('GET', '/audit-logs?limit=20', adminToken);
    record(
      '5.2-REG',
      'FR-09: Tra cứu Audit Logs thành công với tài khoản ADMIN',
      rAudit.status === 200 && Array.isArray(rAudit.data?.data),
      `status=${rAudit.status}, rows=${rAudit.data?.data?.length || 0}`
    );

    // =========================================================================
    // PHẦN 3 (TASK 5.3): CONCURRENCY LOCKS & TOÀN VẸN DỮ LIỆU SQL SERVER
    // =========================================================================
    console.log('\n▶ PHẦN 3 (TASK 5.3): CONCURRENCY LOCKS (CHỐNG RACE CONDITION) & TOÀN VẸN CSDL');

    // 3.1 Race Condition Test A: 2 đơn mượn cùng lúc tranh 1 thiết bị duy nhất (availableQuantity = 1)
    const raceEq = await Equipment.create({
      code: `P5-RACE-${ts}`,
      name: `Phase5 Concurrency Equipment ${ts}`,
      categoryId: firstCat.id,
      quantity: 1,
      availableQuantity: 1,
      status: 'AVAILABLE',
    });
    createdIds.equipmentIds.push(raceEq.id);

    const rRace1 = await BorrowRequest.create({
      userId: testUser.id,
      equipmentId: raceEq.id,
      quantity: 1,
      purpose: 'Race condition borrow 1',
      borrowDate: new Date(Date.now() + 2 * 86400000),
      returnDate: new Date(Date.now() + 4 * 86400000),
      status: 'PENDING',
    });
    const rRace2 = await BorrowRequest.create({
      userId: testCtvA.id,
      equipmentId: raceEq.id,
      quantity: 1,
      purpose: 'Race condition borrow 2',
      borrowDate: new Date(Date.now() + 2 * 86400000),
      returnDate: new Date(Date.now() + 4 * 86400000),
      status: 'PENDING',
    });
    createdIds.borrowIds.push(rRace1.id, rRace2.id);

    // Bắn 2 request duyệt ĐỒNG THỜI
    const [resApprove1, resApprove2] = await Promise.all([
      req('PUT', `/borrow-requests/${rRace1.id}/approve`, adminToken),
      req('PUT', `/borrow-requests/${rRace2.id}/approve`, adminToken),
    ]);
    await raceEq.reload();
    await rRace1.reload();
    await rRace2.reload();

    const approvedBorrowCount = [rRace1.status, rRace2.status].filter((s) => s === 'APPROVED').length;
    const statusesBorrowRace = [resApprove1.status, resApprove2.status].sort();
    const borrowRacePass =
      approvedBorrowCount === 1 &&
      raceEq.availableQuantity === 0 &&
      statusesBorrowRace[0] === 200 &&
      statusesBorrowRace[1] === 400;

    record(
      '5.3-LOCK',
      'Chống Race Condition duyệt đơn mượn thiết bị (2 duyệt song song cho 1 máy -> đúng 1 thành công, tồn kho = 0)',
      borrowRacePass,
      `http=[${resApprove1.status},${resApprove2.status}], approvedCount=${approvedBorrowCount}, availQty=${raceEq.availableQuantity}`
    );

    // 3.2 Race Condition Test B: 2 đơn đặt phòng Studio trùng giờ duyệt ĐỒNG THỜI (không force)
    const raceRoom = `Studio Race ${ts}`;
    const raceDate = getFutureWeekdayDate(25);
    const bRace1 = await StudioBooking.create({
      userId: testUser.id,
      studioName: raceRoom,
      fullName: testUser.fullName,
      purpose: 'Race booking 1',
      startTime: new Date(`${raceDate}T08:00:00+07:00`),
      endTime: new Date(`${raceDate}T10:00:00+07:00`),
      attendees: 3,
      status: 'PENDING',
    });
    const bRace2 = await StudioBooking.create({
      userId: testCtvA.id,
      studioName: raceRoom,
      fullName: testCtvA.fullName,
      purpose: 'Race booking 2 (trùng giờ)',
      startTime: new Date(`${raceDate}T09:00:00+07:00`),
      endTime: new Date(`${raceDate}T11:00:00+07:00`),
      attendees: 3,
      status: 'PENDING',
    });
    createdIds.bookingIds.push(bRace1.id, bRace2.id);

    const [resBook1, resBook2] = await Promise.all([
      req('PUT', `/studio-bookings/${bRace1.id}/approve`, adminToken, {}),
      req('PUT', `/studio-bookings/${bRace2.id}/approve`, adminToken, {}),
    ]);
    await bRace1.reload();
    await bRace2.reload();

    const confirmedCount = [bRace1.status, bRace2.status].filter((s) => s === 'CONFIRMED').length;
    const warningCount = [resBook1.data?.status, resBook2.data?.status].filter((s) => s === 'warning').length;
    const studioRacePass = confirmedCount === 1 && warningCount === 1;

    record(
      '5.3-LOCK',
      'Chống Race Condition duyệt trùng lịch Studio (2 duyệt song song -> đúng 1 CONFIRMED, 1 warning)',
      studioRacePass,
      `confirmedCount=${confirmedCount}, warningCount=${warningCount}, states=[${bRace1.status},${bRace2.status}]`
    );

    // 3.3 Kiểm tra tính toàn vẹn dữ liệu trên toàn bộ CSDL SQL Server thực tế
    const eqTable = Equipment.getTableName();
    const [badStockRows] = await sequelize.query(`
      SELECT COUNT(*) AS cnt FROM [${eqTable}] WHERE available_quantity < 0 OR available_quantity > quantity
    `);
    const badStock = Number(badStockRows[0]?.cnt || 0);
    record('5.3-DB', 'Toàn vẹn tồn kho: 0 thiết bị có available_quantity < 0 hoặc > quantity', badStock === 0, `badStock=${badStock}`);

    const todayVN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const [futureCompletedShifts] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM StudioShifts WHERE status = 'COMPLETED' AND date > :todayVN`,
      { replacements: { todayVN } }
    );
    const badFutureShifts = Number(futureCompletedShifts[0]?.cnt || 0);
    record('5.3-DB', 'Toàn vẹn ca trực (TC-04/TC-13.1): 0 ca trực tương lai bị COMPLETED sớm', badFutureShifts === 0, `badFutureShifts=${badFutureShifts}`);

    const [leakedSecrets] = await sequelize.query(`
      SELECT COUNT(*) AS cnt FROM AuditLogs
      WHERE details LIKE '%"password":"%' AND details NOT LIKE '%"password":"[PROTECTED]"%'
    `);
    const secretLeakCount = Number(leakedSecrets[0]?.cnt || 0);
    record('5.3-DB', 'Bảo mật AuditLogs (QUY_TAC 11.4): 0 bản ghi rò rỉ mật khẩu thô', secretLeakCount === 0, `leaked=${secretLeakCount}`);

    // =========================================================================
    // PHẦN 4 (TASK 5.4): SWAGGER OPENAPI SPEC & FRONTEND SSR CHECK
    // =========================================================================
    console.log('\n▶ PHẦN 4 (TASK 5.4): SWAGGER OPENAPI 3.0 & FRONTEND SSR ROUTES');

    const swaggerRes = await fetch(`${BACKEND_ROOT}/api-docs.json`);
    const swaggerJson = swaggerRes.ok ? await swaggerRes.json() : null;
    const swaggerPathCount = swaggerJson?.paths ? Object.keys(swaggerJson.paths).length : 0;
    const hasCoreSwaggerPaths = Boolean(
      swaggerJson?.paths?.['/api/tasks'] &&
        swaggerJson?.paths?.['/api/duty/periods'] &&
        swaggerJson?.paths?.['/api/payroll/monthly'] &&
        swaggerJson?.paths?.['/api/notifications'] &&
        swaggerJson?.paths?.['/api/maintenances'] &&
        swaggerJson?.paths?.['/api/audit-logs'] &&
        swaggerJson?.paths?.['/api/auth/theme']
    );
    record(
      '5.4-DOCS',
      'Swagger OpenAPI 3.0.0 (/api-docs.json) phủ đầy đủ các module FR-01 -> FR-09',
      swaggerRes.status === 200 && hasCoreSwaggerPaths && swaggerPathCount >= 40,
      `status=${swaggerRes.status}, paths=${swaggerPathCount}, version=${swaggerJson?.info?.version}`
    );

    const feRoutes = [
      '/',
      '/auth/login',
      '/equipment',
      '/studio',
      '/history',
      '/tasks',
      '/notifications',
      '/profile',
      '/admin/dashboard',
      '/admin/equipment',
      '/admin/equipment/maintenance',
      '/admin/requests',
      '/admin/tasks',
      '/admin/duty',
      '/admin/payroll',
      '/admin/users',
      '/admin/audit-logs',
      '/admin/cms',
    ];
    let feOk = true;
    const feFails = [];
    for (const route of feRoutes) {
      const r = await fetch(`${FRONTEND_ROOT}${route}`);
      if (r.status !== 200) {
        feOk = false;
        feFails.push(`${route}=${r.status}`);
      }
    }
    record(
      '5.4-FE',
      `Frontend Production Server SSR: ${feRoutes.length}/${feRoutes.length} tuyến trang trả HTTP 200 OK`,
      feOk,
      feOk ? '100% 200 OK' : feFails.join(', ')
    );
  } finally {
    // Dọn sạch 100% dữ liệu test phát sinh trong CSDL
    console.log('\n🧹 Dọn dẹp dữ liệu kiểm thử tạm thời...');
    try {
      if (createdIds.taskIds.length) {
        await AttendanceRecord.destroy({ where: { sourceId: { [Op.in]: createdIds.taskIds } } });
        await Task.destroy({ where: { id: { [Op.in]: createdIds.taskIds } } });
      }
      if (createdIds.borrowIds.length) {
        await BorrowRequest.destroy({ where: { id: { [Op.in]: createdIds.borrowIds } } });
      }
      if (createdIds.bookingIds.length) {
        await StudioBooking.destroy({ where: { id: { [Op.in]: createdIds.bookingIds } } });
      }
      if (createdIds.maintenanceIds.length) {
        await EquipmentMaintenance.destroy({ where: { id: { [Op.in]: createdIds.maintenanceIds } } });
      }
      if (createdIds.equipmentIds.length) {
        await Equipment.destroy({ where: { id: { [Op.in]: createdIds.equipmentIds } } });
      }
      if (createdIds.userIds.length) {
        await MonthlyPayroll.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await StudioBooking.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await BorrowRequest.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await Notification.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await AuditLog.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await AttendanceRecord.destroy({ where: { userId: { [Op.in]: createdIds.userIds } } });
        await User.destroy({ where: { id: { [Op.in]: createdIds.userIds } } });
      }
      // Dọn cả dữ liệu phase5 test cũ nếu lần chạy trước bị ngắt giữa chừng
      const staleUsers = await User.findAll({ where: { email: { [Op.like]: 'phase5_%@lhu.edu.vn' } }, attributes: ['id'] });
      if (staleUsers.length) {
        const sIds = staleUsers.map((u) => u.id);
        await MonthlyPayroll.destroy({ where: { userId: { [Op.in]: sIds } } });
        await StudioBooking.destroy({ where: { userId: { [Op.in]: sIds } } });
        await BorrowRequest.destroy({ where: { userId: { [Op.in]: sIds } } });
        await Notification.destroy({ where: { userId: { [Op.in]: sIds } } });
        await AuditLog.destroy({ where: { userId: { [Op.in]: sIds } } });
        await AttendanceRecord.destroy({ where: { userId: { [Op.in]: sIds } } });
        await User.destroy({ where: { id: { [Op.in]: sIds } } });
      }
      console.log('✅ Đã dọn sạch toàn bộ dữ liệu test (bảo toàn nguyên vẹn CSDL thực tế).');
    } catch (cleanErr) {
      console.error('⚠️ Lỗi khi dọn dữ liệu test:', cleanErr.message);
    }
    await sequelize.close();
  }

  console.log('\n====================================================================');
  console.log(`📊 TỔNG KẾT GIAI ĐOẠN 5: ${results.pass}/${results.pass + results.fail} PASS | ${results.fail} FAIL`);
  console.log('====================================================================\n');
  if (results.fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
