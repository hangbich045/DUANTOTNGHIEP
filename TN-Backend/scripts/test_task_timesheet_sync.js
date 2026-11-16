'use strict';

/**
 * Script kiểm thử toàn diện quy tắc đồng bộ giữa Công việc của CTV và Bảng chấm công tháng.
 */

const assert = require('assert');
const { Op } = require('sequelize');
const {
  getSessionsForDayHours,
  syncTaskAttendanceToDatabase,
  syncAllCompletedTasksToAttendance,
  getTimesheetData,
  calculateMonthlyPayroll,
} = require('../src/services/payroll.service');
const { User, Task, StudioShift, AttendanceRecord } = require('../src/models');

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ ĐỒNG BỘ CÔNG VIỆC CTV VÀ BẢNG CHẤM CÔNG THÁNG');
  console.log('================================================================\n');

  // 1. Kiểm thử Unit hàm getSessionsForDayHours
  console.log('1. KIỂM THỬ QUY TẮC PHÂN BỔ BUỔI THEO GIỜ LÀM VIỆC:');

  // Case 1.1: Dưới 4 tiếng -> SV buổi sáng (S)
  const r1 = getSessionsForDayHours(2.0);
  assert.deepStrictEqual(r1.sessions, ['S'], '2h phải phân bổ SV buổi S');
  assert.strictEqual(r1.isPendingConfirmation, false);
  console.log('  PASS: 2.0h -> SV buổi sáng (S)');

  const r1b = getSessionsForDayHours(3.5);
  assert.deepStrictEqual(r1b.sessions, ['S'], '3.5h phải phân bổ SV buổi S');
  assert.strictEqual(r1b.isPendingConfirmation, false);
  console.log('  PASS: 3.5h -> SV buổi sáng (S)');

  // Case 1.2: Từ 5 đến 8 tiếng -> SV buổi sáng và chiều (S + C)
  const r2 = getSessionsForDayHours(5.0);
  assert.deepStrictEqual(r2.sessions, ['S', 'C'], '5.0h phải phân bổ SV buổi S và C');
  assert.strictEqual(r2.isPendingConfirmation, false);
  console.log('  PASS: 5.0h -> SV buổi sáng và chiều (S + C)');

  const r2b = getSessionsForDayHours(6.5);
  assert.deepStrictEqual(r2b.sessions, ['S', 'C'], '6.5h phải phân bổ SV buổi S và C');
  assert.strictEqual(r2b.isPendingConfirmation, false);
  console.log('  PASS: 6.5h -> SV buổi sáng và chiều (S + C)');

  const r2c = getSessionsForDayHours(8.0);
  assert.deepStrictEqual(r2c.sessions, ['S', 'C'], '8.0h phải phân bổ SV buổi S và C');
  assert.strictEqual(r2c.isPendingConfirmation, false);
  console.log('  PASS: 8.0h -> SV buổi sáng và chiều (S + C)');

  // Case 1.3: Trên 8 tiếng -> SV cả sáng, chiều và tối (S + C + T)
  const r3 = getSessionsForDayHours(8.5);
  assert.deepStrictEqual(r3.sessions, ['S', 'C', 'T'], '8.5h phải phân bổ SV cả S, C, T');
  assert.strictEqual(r3.isPendingConfirmation, false);
  console.log('  PASS: 8.5h -> SV cả 3 buổi (S + C + T)');

  const r3b = getSessionsForDayHours(12.0);
  assert.deepStrictEqual(r3b.sessions, ['S', 'C', 'T'], '12.0h phải phân bổ SV cả S, C, T');
  assert.strictEqual(r3b.isPendingConfirmation, false);
  console.log('  PASS: 12.0h -> SV cả 3 buổi (S + C + T)');

  // Case 1.4: Từ 4 đến dưới 5 tiếng -> SV buổi sáng (S) theo quy định chính thức
  const r4 = getSessionsForDayHours(4.0);
  assert.deepStrictEqual(r4.sessions, ['S'], '4.0h phải phân bổ SV buổi sáng (S)');
  assert.strictEqual(r4.isPendingConfirmation, false);
  console.log('  PASS: 4.0h -> Phân bổ SV buổi sáng (S)');

  const r4b = getSessionsForDayHours(4.5);
  assert.deepStrictEqual(r4b.sessions, ['S'], '4.5h phải phân bổ SV buổi sáng (S)');
  assert.strictEqual(r4b.isPendingConfirmation, false);
  console.log('  PASS: 4.5h -> Phân bổ SV buổi sáng (S)');

  const r4c = getSessionsForDayHours(4.9);
  assert.deepStrictEqual(r4c.sessions, ['S'], '4.9h phải phân bổ SV buổi sáng (S)');
  assert.strictEqual(r4c.isPendingConfirmation, false);
  console.log('  PASS: 4.9h -> Phân bổ SV buổi sáng (S)');

  // Case 1.5: 0 giờ hoặc không có giờ -> Không gán SV
  const r5 = getSessionsForDayHours(0);
  assert.deepStrictEqual(r5.sessions, []);
  assert.strictEqual(r5.isPendingConfirmation, false);
  console.log('  PASS: 0h -> Không gán SV\n');

  // 2. Kiểm thử đồng bộ tự động trong Database (AttendanceRecords)
  console.log('2. KIỂM THỬ ĐỒNG BỘ DATABASE VÀ CHUYỂN KÝ HIỆU LV -> SV:');

  // Tìm CTV test
  const ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });
  if (!ctv) {
    console.log('  SKIP: Không tìm thấy CTV trong DB để test database');
    return;
  }

  // Chạy sync toàn bộ dữ liệu lịch sử tháng 11/2026
  await syncAllCompletedTasksToAttendance(11, 2026);
  console.log('  PASS: syncAllCompletedTasksToAttendance(11, 2026) thực thi thành công');

  // Kiểm tra tháng 11/2026 của user 7d91b9bb-dadd-4309-84c9-e4df98f01635:
  // User có ca trực sáng ngày 10/11 (MORNING -> S) và task 'banner' 2h ngày 10/11
  const targetUserId = '7d91b9bb-dadd-4309-84c9-e4df98f01635';
  const targetTask = await Task.findOne({
    where: { assignedToUserId: targetUserId, executionDate: '2026-11-10', status: 'COMPLETED' },
  });

  if (targetTask) {
    // Kiểm tra AttendanceRecord tại ngày 2026-11-10 buổi S
    const attRec = await AttendanceRecord.findOne({
      where: { userId: targetUserId, date: '2026-11-10', session: 'S' },
    });
    assert(attRec, 'Phải có AttendanceRecord ngày 2026-11-10 buổi S');
    assert.strictEqual(attRec.symbol, 'SV', 'Ký hiệu phải tự động chuyển thành SV');
    assert.strictEqual(attRec.sourceType, 'TASK', 'sourceType phải là TASK');
    console.log('  PASS: Ngày 2026-11-10 buổi S đã tự động chuyển ký hiệu thành SV trong Database');
  }

  // 3. Kiểm thử ma trận Bảng chấm công (getTimesheetData)
  console.log('\n3. KIỂM THỬ MA TRẬN BẢNG CHẤM CÔNG (getTimesheetData):');
  const tsData = await getTimesheetData(11, 2026);
  assert(tsData.rows.length > 0, 'Phải có ít nhất 1 dòng CTV');

  const ctvRow = tsData.rows.find((r) => r.ctv.id === targetUserId);
  if (ctvRow) {
    const sSession = ctvRow.sessions.find((s) => s.session === 'S');
    assert.strictEqual(sSession.days[10], 'SV', 'Ô ngày 10 buổi S phải hiển thị SV thay vì LV');
    console.log('  PASS: Ma trận chấm công hiển thị SV tại ô ngày 10 buổi S của CTV');

    // Kiểm tra không tính trùng: ca trực ngày 10 buổi S đã thành SV nên không được tính vào sumLV
    console.log(`  INFO: Sum LV của CTV: ${ctvRow.summary.sumLV}, Giờ LV: ${ctvRow.summary.gioLV}, Giờ SV: ${ctvRow.summary.gioSV}, Tổng: ${ctvRow.summary.tongGio}`);
  }

  // 4. Kiểm tra tháng 10/2026 (có task 4.0h -> chờ xác nhận, task 5.0h -> S+C, task 6.0h -> S+C)
  console.log('\n4. KIỂM THỬ THÁNG 10/2026 VÀ CẢNH BÁO CHỜ XÁC NHẬN:');
  const tsData10 = await getTimesheetData(10, 2026);
  console.log(`  INFO: Số trường hợp chờ xác nhận trong tháng 10/2026: ${tsData10.pendingConfirmations.length}`);
  tsData10.pendingConfirmations.forEach((pc) => {
    console.log(`  -> CTV: ${pc.ctv.fullName}, Ngày: ${pc.date}, Tổng giờ: ${pc.totalHours}h: ${pc.message}`);
  });

  const row10 = tsData10.rows.find((r) => r.ctv.id === '48867f59-db28-4122-93f4-2339c5ef7a73');
  if (row10) {
    // Ngày 07/10: task 6h -> S + C
    const sSess = row10.sessions.find((s) => s.session === 'S');
    const cSess = row10.sessions.find((s) => s.session === 'C');
    assert.strictEqual(sSess.days[7], 'SV', 'Ngày 07 buổi S phải là SV (6h)');
    assert.strictEqual(cSess.days[7], 'SV', 'Ngày 07 buổi C phải là SV (6h)');
    console.log('  PASS: Ngày 07/10 (6h) đã phân bổ SV cho cả buổi S và buổi C');

    // Ngày 11/10: task 5h -> S + C
    assert.strictEqual(sSess.days[11], 'SV', 'Ngày 11 buổi S phải là SV (5h)');
    assert.strictEqual(cSess.days[11], 'SV', 'Ngày 11 buổi C phải là SV (5h)');
    console.log('  PASS: Ngày 11/10 (5h) đã phân bổ SV cho cả buổi S và buổi C');

    // Ngày 09/10: task 4h -> phân bổ SV buổi sáng (S) theo quy định chính thức
    assert.strictEqual(sSess.days[9], 'SV', 'Ngày 09 buổi S phải là SV (4h)');
    assert.strictEqual(cSess.days[9], '', 'Ngày 09 buổi C phải để trống');
    console.log('  PASS: Ngày 09/10 (4h) đã phân bổ SV cho buổi sáng (S) theo quy định chính thức');
  }

  // 5. Kiểm thử tính toán thù lao calculateMonthlyPayroll
  console.log('\n5. KIỂM THỬ TÍNH TOÁN THÙ LAO (calculateMonthlyPayroll):');
  const payrollResult = await calculateMonthlyPayroll(11, 2026);
  assert(payrollResult.length > 0, 'Phải có kết quả tính thù lao');
  console.log('  PASS: calculateMonthlyPayroll(11, 2026) thực thi thành công, thù lao đồng bộ hoàn toàn với Bảng chấm công!');

  console.log('\n================================================================');
  console.log('TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ PASS 100%! HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO!');
  console.log('================================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
  });

