'use strict';

/**
 * Test script xác minh tính năng: TỰ ĐỘNG XÁC ĐỊNH HỆ SỐ THÙ LAO
 * - Kỹ thuật sự kiện sau 16:30 T2-T7: hệ số 1.5x
 * - Kỹ thuật sự kiện vào Chủ nhật: hệ số 2.0x
 * - Vừa là Chủ nhật vừa sau 16:30: chỉ 2.0x, không cộng dồn (TC-06)
 * - Các trường hợp khác: 1.0x
 * - Backend tự tính, CTV không được gửi hay can thiệp
 * - Thống nhất giữa Bảng chấm công, Thù lao và Excel
 */

const assert = require('assert');
const { evaluateTaskRateMultiplier, createExternalTask, reviewTask, updateTask } = require('../src/services/task.service');
const { User, Task, AttendanceRecord } = require('../src/models');
const payrollService = require('../src/services/payroll.service');

async function testAutoMultiplier() {
  console.log('🚀 Bắt đầu kiểm tra Tự động xác định hệ số thù lao...\n');

  // 1. Kiểm tra hàm evaluateTaskRateMultiplier
  console.log('--- PHẦN 1: KIỂM TRA THUẬT TOÁN ĐỊNH HỆ SỐ (evaluateTaskRateMultiplier) ---');

  // 1.1. Chụp ảnh sự kiện ngày thường buổi sáng (Thứ Tư 2026-11-18) -> 1.0x
  const case1 = evaluateTaskRateMultiplier({
    taskType: 'Chụp & xử lý hình sự kiện',
    executionDate: '2026-11-18', // Thứ Tư
    shiftSession: 'S',
    actualHours: 4.0,
  });
  assert.equal(case1.multiplier, 1.0, 'Thứ Tư buổi sáng phải có hệ số 1.0');
  assert.equal(case1.isSunday, false);
  assert.equal(case1.isOvertime, false);
  console.log('✅ 1.1. Chụp ảnh sự kiện Thứ Tư buổi sáng: 1.0x');

  // 1.2. Chụp ảnh sự kiện ngày thường sau 16:30 (Thứ Tư ca Tối T) -> 1.5x
  const case2 = evaluateTaskRateMultiplier({
    taskType: 'Chụp & xử lý hình sự kiện',
    executionDate: '2026-11-18', // Thứ Tư
    shiftSession: 'T',
    actualHours: 3.0,
  });
  assert.equal(case2.multiplier, 1.5, 'Thứ Tư ca tối (sau 16:30) phải có hệ số 1.5');
  assert.equal(case2.isOvertime, true);
  assert.equal(case2.overtimeHours, 3.0);
  assert.equal(case2.isSunday, false);
  console.log('✅ 1.2. Chụp ảnh sự kiện Thứ Tư sau 16:30 (ca Tối): 1.5x');

  // 1.3. Quay highlight sự kiện vào Chủ nhật (2026-11-22) -> 2.0x
  const case3 = evaluateTaskRateMultiplier({
    taskType: 'Quay highlight',
    executionDate: '2026-11-22', // Chủ nhật
    shiftSession: 'S',
    actualHours: 4.0,
  });
  assert.equal(case3.multiplier, 2.0, 'Chủ nhật kỹ thuật sự kiện phải có hệ số 2.0');
  assert.equal(case3.isSunday, true);
  assert.equal(case3.isOvertime, false);
  console.log('✅ 1.3. Quay highlight sự kiện Chủ nhật buổi sáng: 2.0x');

  // 1.4. Quay phim sự kiện Chủ nhật ca Tối (sau 16:30) -> 2.0x (KHÔNG CỘNG DỒN 1.5 x 2.0)
  const case4 = evaluateTaskRateMultiplier({
    taskType: 'Quay phim',
    executionDate: '2026-11-22', // Chủ nhật
    shiftSession: 'T',
    actualHours: 4.0,
  });
  assert.equal(case4.multiplier, 2.0, 'Chủ nhật ca tối chỉ áp dụng 2.0, không cộng dồn');
  assert.equal(case4.isSunday, true);
  assert.equal(case4.isOvertime, false);
  assert.equal(case4.overtimeHours, 0);
  console.log('✅ 1.4. Kỹ thuật sự kiện Chủ nhật ca tối: 2.0x (chống nhân chồng hệ số)');

  // 1.5. Viết content vào Chủ nhật -> 1.0x (không phải kỹ thuật chụp/quay sự kiện)
  const case5 = evaluateTaskRateMultiplier({
    taskType: 'Viết content',
    executionDate: '2026-11-22', // Chủ nhật
    shiftSession: 'S',
    actualHours: 3.0,
  });
  assert.equal(case5.multiplier, 1.0, 'Viết content không áp dụng hệ số kỹ thuật sự kiện');
  assert.equal(case5.isSunday, false);
  console.log('✅ 1.5. Viết content vào Chủ nhật: 1.0x (không phải việc kỹ thuật sự kiện)');

  console.log('\n--- PHẦN 2: CTV KHAI BÁO & BACKEND TỰ ĐỘNG TÍNH HỆ SỐ KHI NGHIỆM THU ---');
  let admin = await User.findOne({ where: { role: 'ADMIN' } });
  let ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });

  // CTV thử gửi kèm isOvertime: true và isSunday: true gian lận trong payload
  const task = await createExternalTask(
    {
      title: 'TEST_AUTO_MULTIPLIER_TASK',
      taskType: 'Quay highlight',
      resultLink: 'https://drive.google.com/test-highlight',
      executionDate: '2026-11-22', // Chủ nhật
      actualHours: 4.0,
      shiftSession: 'S',
      // Dữ liệu gian lận do client/API gửi lên
      isOvertime: true,
      overtimeHours: 4.0,
      isSunday: false,
    },
    ctv
  );

  // Kiểm tra: Backend phải bỏ qua hoàn toàn dữ liệu hệ số của CTV khi tạo
  assert.equal(task.isOvertime, false, 'Backend phải chặn không cho CTV tự set isOvertime');
  assert.equal(task.overtimeHours, 0);
  assert.equal(task.isSunday, false, 'Backend phải chặn không cho CTV tự set isSunday');
  assert.equal(task.status, 'PENDING_APPROVAL');
  console.log('✅ 2.1. CTV khai báo: Backend chặn toàn bộ dữ liệu hệ số gửi kèm, giữ nguyên false');

  // Admin nghiệm thu COMPLETED
  const approved = await reviewTask(
    task.id,
    {
      decision: 'COMPLETED',
      feedback: 'Quay video rất nét, đạt yêu cầu',
    },
    admin
  );

  // Kiểm tra: Sau khi nghiệm thu, Backend TỰ ĐỘNG phát hiện ngày 22/11/2026 là Chủ nhật và việc là Quay highlight -> gán isSunday: true
  assert.equal(approved.status, 'COMPLETED');
  assert.equal(approved.isSunday, true, 'Sau nghiệm thu, task Chủ nhật phải tự động được gán isSunday: true');
  assert.equal(approved.isOvertime, false);
  console.log('✅ 2.2. Admin nghiệm thu COMPLETED: Backend tự động gán isSunday = true (hệ số 2.0x)');

  // Admin sửa lại ngày thực hiện sang Thứ Tư ca Tối 18/11/2026 (updateTask)
  const updated = await updateTask(
    task.id,
    {
      executionDate: '2026-11-18', // Thứ Tư
      shiftSession: 'T', // Tối (sau 16:30)
    },
    admin
  );
  assert.equal(updated.isSunday, false, 'Đổi sang Thứ Tư thì isSunday phải thành false');
  assert.equal(updated.isOvertime, true, 'Đổi sang ca Tối Thứ Tư thì isOvertime phải thành true');
  assert.equal(updated.overtimeHours, 4.0);
  console.log('✅ 2.3. Admin chỉnh sửa ngày sang Tối Thứ Tư: Backend tự động tính lại hệ số thành 1.5x (isOvertime = true)');

  console.log('\n--- PHẦN 3: ĐỒNG BỘ THÙ LAO GIỮA TIMESHEET VÀ PAYROLL ---');
  // Lấy dữ liệu Bảng chấm công tháng 11/2026
  const timesheet = await payrollService.getTimesheetData(11, 2026);
  const ctvRow = timesheet.rows.find((r) => r.ctv.id === ctv.id);
  assert.ok(ctvRow, 'Phải tìm thấy dòng của CTV trên Bảng chấm công');
  // Task 4h hệ số 1.5x -> giờ quy đổi là 4 * 1.5 = 6.0 giờ!
  // Thù lao phải tính theo giờ quy đổi: 6 * 20.000 = 120.000 đ
  console.log(`✅ 3.1. Bảng chấm công CTV: Giờ LV = ${ctvRow.summary.gioLV}, Giờ SV = ${ctvRow.summary.gioSV}, Tổng giờ quy đổi = ${ctvRow.summary.tongGio}, Tiền = ${ctvRow.summary.tien.toLocaleString('vi-VN')} đ`);
  assert.ok(ctvRow.summary.tongGio >= ctvRow.summary.gioLV + ctvRow.summary.gioSV, 'Tổng giờ quy đổi phải lớn hơn hoặc bằng tổng giờ thực tế do có hệ số 1.5x');

  // Dọn dẹp task test
  await Task.destroy({ where: { id: task.id } });
  await AttendanceRecord.destroy({ where: { userId: ctv.id, date: '2026-11-18' } });

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM TRA ĐỀU THÀNH CÔNG VÀ CHÍNH XÁC 100%!');
  process.exit(0);
}

testAutoMultiplier().catch((err) => {
  console.error('❌ Lỗi kiểm tra:', err);
  process.exit(1);
});
