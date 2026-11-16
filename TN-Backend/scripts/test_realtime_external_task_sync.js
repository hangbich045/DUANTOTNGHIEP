'use strict';

/**
 * Script kiểm thử tính năng Cập nhật theo thời gian thực (Real-time sync)
 * khi CTV khai báo công việc ngoài hệ thống.
 */

const assert = require('assert');
const { Task, StudioShift, AttendanceRecord, User } = require('../src/models');
const { createExternalTask, deleteTask } = require('../src/services/task.service');
const { getTimesheetData, normalizeExecutionDate } = require('../src/services/payroll.service');

async function testRealtimeSync() {
  console.log('================================================================');
  console.log('KIỂM THỬ CẬP NHẬT THEO THỜI GIAN THỰC KHI KHAI BÁO VIỆC NGOÀI');
  console.log('================================================================\n');

  // 1. Kiểm thử hàm normalizeExecutionDate
  console.log('1. KIỂM THỬ HÀM CHUẨN HÓA NGÀY (normalizeExecutionDate):');
  assert.strictEqual(normalizeExecutionDate('2026-11-02'), '2026-11-02');
  assert.strictEqual(normalizeExecutionDate('02/11/2026'), '2026-11-02');
  assert.strictEqual(normalizeExecutionDate('03-11-2026'), '2026-11-03');
  // Trường hợp date picker đảo 02/11 thành 2026-02-11
  assert.strictEqual(normalizeExecutionDate('2026-02-11'), '2026-11-02', 'Phải tự động sửa 2026-02-11 thành 2026-11-02');
  assert.strictEqual(normalizeExecutionDate('2026-03-11'), '2026-11-03', 'Phải tự động sửa 2026-03-11 thành 2026-11-03');
  assert.strictEqual(normalizeExecutionDate('2026-05-11'), '2026-11-05', 'Phải tự động sửa 2026-05-11 thành 2026-11-05');
  console.log('  PASS: Chuẩn hóa ngày chính xác 100%, chống lỗi đảo ngày-tháng từ trình duyệt!\n');

  // 2. Kiểm thử luồng thời gian thực
  console.log('2. KIỂM THỬ KHAI BÁO VIỆC NGOÀI -> TỰ ĐỘNG CHUYỂN LV SANG SV LIỀN:');

  const ctvId = '7d91b9bb-dadd-4309-84c9-e4df98f01635'; // Châu Ngọc Thanh Thảo
  const ctvUser = await User.findByPk(ctvId);
  assert(ctvUser, 'Phải tìm thấy CTV');

  // Ngày test: ngày 03/11/2026 (ngày đầu tháng 11, CTV đang có ca trực LV)
  const testDate = '2026-11-03';

  // Kiểm tra trước khi khai báo: ngày 03/11 ban đầu có ca trực LV
  const tsBefore = await getTimesheetData(11, 2026);
  const rowBefore = tsBefore.rows.find((r) => r.ctv.id === ctvId);
  const sBefore = rowBefore.sessions.find((s) => s.session === 'S').days[3];
  const cBefore = rowBefore.sessions.find((s) => s.session === 'C').days[3];
  console.log(`  TRƯỚC KHI KHAI BÁO (Ngày 03/11): Buổi Sáng = '${sBefore}', Buổi Chiều = '${cBefore}'`);

  // CTV thực hiện khai báo công việc ngoài hệ thống: 6 giờ trong ngày 03/11/2026
  console.log('  -> CTV tiến hành khai báo công việc ngoài: "Hỗ trợ quay livestream lễ khai mạc" (6 giờ)...');
  const createdTask = await createExternalTask(
    {
      title: 'TEST REALTIME - Hỗ trợ quay livestream lễ khai mạc',
      description: 'Test tự động đồng bộ thời gian thực sang Bảng chấm công',
      taskType: 'Quay phim',
      executionDate: testDate,
      actualHours: 6,
      resultLink: 'https://youtube.com/test-realtime',
      proofFile: 'minh_chung.jpg',
    },
    ctvUser
  );

  console.log(`  -> Task ngoài đã tạo thành công! ID: ${createdTask.id}, Status: ${createdTask.status}`);

  // KIỂM TRA NGAY LẬP TỨC: Không cần Admin duyệt, ô ngày 03/11 đã phải chuyển sang SV liền!
  const tsAfter = await getTimesheetData(11, 2026);
  const rowAfter = tsAfter.rows.find((r) => r.ctv.id === ctvId);
  const sAfter = rowAfter.sessions.find((s) => s.session === 'S').days[3];
  const cAfter = rowAfter.sessions.find((s) => s.session === 'C').days[3];
  console.log(`  SAU KHI KHAI BÁO LIỀN (Ngày 03/11): Buổi Sáng = '${sAfter}', Buổi Chiều = '${cAfter}'`);

  assert.strictEqual(sAfter, 'SV', 'Buổi Sáng ngày 03/11 phải lập tức chuyển sang SV liền!');
  assert.strictEqual(cAfter, 'SV', 'Buổi Chiều ngày 03/11 phải lập tức chuyển sang SV liền (vì 6h thuộc khoảng 5-8h)!');
  console.log('  PASS: Hệ thống đã cập nhật theo thời gian thực từ LV sang SV liền ngay khi khai báo!\n');

  // Kiểm tra CSDL AttendanceRecords
  const attS = await AttendanceRecord.findOne({ where: { userId: ctvId, date: testDate, session: 'S' } });
  const attC = await AttendanceRecord.findOne({ where: { userId: ctvId, date: testDate, session: 'C' } });
  assert.strictEqual(attS.symbol, 'SV', 'AttendanceRecord buổi S phải có symbol là SV');
  assert.strictEqual(attC.symbol, 'SV', 'AttendanceRecord buổi C phải có symbol là SV');
  console.log('  PASS: CSDL AttendanceRecords đã tự động upsert ký hiệu SV theo thời gian thực!\n');

  // Dọn dẹp dữ liệu test
  console.log('3. DỌN DẸP DỮ LIỆU TEST:');
  const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
  // Chuyển task sang COMPLETED rồi xóa hoặc xóa trực tiếp
  await Task.destroy({ where: { id: createdTask.id } });
  // Phục hồi lại ca trực
  const { syncTaskAttendanceToDatabase } = require('../src/services/payroll.service');
  await syncTaskAttendanceToDatabase(ctvId, testDate);
  console.log('  PASS: Đã dọn dẹp task test và phục hồi trạng thái ca trực an toàn.\n');

  console.log('================================================================');
  console.log('TẤT CẢ CÁC BÀI KIỂM THỬ THỜI GIAN THỰC ĐÃ PASS 100%!');
  console.log('================================================================');
}

testRealtimeSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST REALTIME FAILED:', err);
    process.exit(1);
  });

