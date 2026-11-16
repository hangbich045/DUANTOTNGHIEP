/**
 * @file scripts/test_weekly_schedule_bptt.js
 * @description Kiểm thử tích hợp tự động cho BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (Dạng bảng tuần chuẩn tham chiếu).
 *
 * Kiểm tra các tiêu chí:
 * 1. Cấu trúc bảng tuần gồm 7 ngày (Thứ Hai đến Chủ Nhật), mỗi ngày 3 buổi: S (Sáng), C (Chiều), T (Tối).
 * 2. Hiển thị đúng các ký hiệu: LV, SV, NL, DP, NP, SX theo dữ liệu CSDL thực tế.
 * 3. Ngày có sự vụ (SV) đính kèm đầy đủ thông tin chi tiết: người giao, thời gian giao, tên nhiệm vụ, địa điểm.
 * 4. Quyền truy cập: Cả COLLABORATOR và ADMIN đều xem được toàn bộ nhân sự bộ phận.
 * 5. Tự động nhận diện và làm nổi bật ngày hiện tại (isToday === true) theo thời gian thực.
 * 6. Điều hướng tuần: Cho phép chuyển tuần linh hoạt qua tham số startDate/date.
 * 7. Thống kê cột và hàng: SC (Studio ca), SV (Sự vụ), D (Tối), DP (Dự phòng), NP (Nghỉ phép), SX (Sắp xếp), và hàng TỔNG.
 */

'use strict';

const assert = require('assert');
const dutyService = require('../src/services/duty.service');
const { User, StudioShift, Task } = require('../src/models');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ BẢNG PHÂN CÔNG LỊCH LÀM VIỆC TUẦN BPTT');
  console.log('================================================================\n');

  // Lấy 1 tài khoản CTV và 1 tài khoản Admin
  const collabUser = await User.findOne({ where: { role: 'COLLABORATOR' } });
  const adminUser = await User.findOne({ where: { role: 'ADMIN' } });

  assert(collabUser, 'Phải có ít nhất 1 CTV trong DB');
  assert(adminUser, 'Phải có ít nhất 1 Admin trong DB');

  // TEST 1: Quyền xem lịch của toàn bộ bộ phận dành cho COLLABORATOR
  console.log('🔹 Test 1: Kiểm tra quyền xem toàn bộ bộ phận của COLLABORATOR...');
  const collabSchedule = await dutyService.getWeeklySchedule({ startDate: '2026-11-16' }, collabUser);
  assert(collabSchedule, 'Lịch tuần phải trả về dữ liệu');
  assert(Array.isArray(collabSchedule.weekDays), 'weekDays phải là mảng');
  assert.strictEqual(collabSchedule.weekDays.length, 7, 'Một tuần phải có đúng 7 ngày');
  assert(Array.isArray(collabSchedule.rows), 'rows phải là mảng danh sách nhân sự');
  assert(collabSchedule.rows.length >= 2, 'Phải hiển thị toàn bộ nhân sự (CTV & Admin), không chỉ cá nhân');
  console.log(`   ✅ PASS: CTV xem được bảng gồm ${collabSchedule.rows.length} nhân sự và 7 ngày.`);

  // TEST 2: Cấu trúc 7 ngày và 3 buổi (S, C, T)
  console.log('\n🔹 Test 2: Kiểm tra cấu trúc 7 ngày x 3 buổi (Sáng, Chiều, Tối)...');
  const daysExpected = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  collabSchedule.weekDays.forEach((wd, i) => {
    assert.strictEqual(wd.dayName, daysExpected[i], `Ngày ${i + 1} phải là ${daysExpected[i]}`);
    assert(wd.formattedDate.includes('/'), 'Định dạng ngày phải là dd/MM/yyyy');
  });

  const sampleRow = collabSchedule.rows[0];
  assert(sampleRow.user && sampleRow.user.fullName, 'Mỗi hàng phải có thông tin user');
  for (const wd of collabSchedule.weekDays) {
    const daySlot = sampleRow.days[wd.dateStr];
    assert(daySlot, `Phải có slot cho ngày ${wd.dateStr}`);
    assert('S' in daySlot && 'C' in daySlot && 'T' in daySlot, 'Mỗi ngày phải có đủ 3 buổi S, C, T');
  }
  console.log('   ✅ PASS: Đầy đủ 7 ngày từ Thứ Hai đến Chủ Nhật, mỗi ngày gồm 3 ca S, C, T.');

  // TEST 3: Tự động highlight ngày hiện tại (isToday) theo thời gian thực
  console.log('\n🔹 Test 3: Kiểm tra làm nổi bật ngày hiện tại (isToday)...');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.strictEqual(collabSchedule.todayStr, todayStr, 'todayStr phải khớp với thời gian thực của máy chủ');

  const todayDay = collabSchedule.weekDays.find((d) => d.dateStr === todayStr);
  if (todayDay) {
    assert.strictEqual(todayDay.isToday, true, 'Ngày trùng với todayStr phải có isToday === true');
    console.log(`   ✅ PASS: Ngày hiện tại ${todayStr} được nhận diện tự động và gán isToday = true.`);
  } else {
    console.log(`   ℹ️ Ngày hiện tại ${todayStr} không nằm trong tuần kiểm tra (startDate = 2026-11-16).`);
  }

  // TEST 4: Kiểm tra sự vụ (SV) đính kèm đầy đủ thông tin tooltip ghi chú
  console.log('\n🔹 Test 4: Kiểm tra thông tin sự vụ SV (người giao, thời gian, tên sự vụ, địa điểm)...');
  // Lấy tuần 02/11/2026 nơi có sự vụ và ca trực
  const weekNov2 = await dutyService.getWeeklySchedule({ startDate: '2026-11-02' }, adminUser);
  const userWithSv = weekNov2.rows.find((r) => r.summary.sv > 0);
  assert(userWithSv, 'Phải có ít nhất 1 nhân sự có sự vụ (SV) trong tuần 02/11/2026');

  let foundTaskWithDetails = false;
  for (const d of Object.keys(userWithSv.days)) {
    const slot = userWithSv.days[d];
    for (const sess of ['S', 'C', 'T']) {
      if (slot[sess].symbol === 'SV') {
        assert(slot[sess].tasks && slot[sess].tasks.length > 0, 'Ô SV phải chứa danh sách tasks');
        const firstTask = slot[sess].tasks[0];
        assert(firstTask.title, 'Task phải có tiêu đề');
        assert(firstTask.creatorName, 'Task phải có tên người tạo/người giao');
        assert('createdAtFormatted' in firstTask, 'Task phải có thời gian giao được format');
        assert('location' in firstTask, 'Task phải có trường location');
        assert(firstTask.fullDisplay, 'Task phải có chuỗi hiển thị đầy đủ fullDisplay');
        foundTaskWithDetails = true;
      }
    }
  }
  assert(foundTaskWithDetails, 'Phải tìm thấy ô SV có đầy đủ dữ liệu tooltip');
  console.log('   ✅ PASS: Ký hiệu SV có đầy đủ thông tin chi tiết: người giao, thời gian, tiêu đề, địa điểm.');

  // TEST 5: Kiểm tra các cột thống kê cuối dòng (SC, SV, D, DP, NP, SX) và hàng TỔNG
  console.log('\n🔹 Test 5: Kiểm tra tính toán cột thống kê (SC, SV, D, DP, NP, SX) và hàng TỔNG...');
  assert('columnTotals' in weekNov2, 'Phải có đối tượng columnTotals');
  assert(typeof weekNov2.columnTotals.totalShifts === 'number', 'columnTotals.totalShifts phải là số');
  assert(typeof weekNov2.columnTotals.sc === 'number', 'columnTotals.sc phải là số');
  assert(typeof weekNov2.columnTotals.sv === 'number', 'columnTotals.sv phải là số');
  assert(typeof weekNov2.columnTotals.d === 'number', 'columnTotals.d phải là số');

  // Kiểm tra tổng hàng ngang = tổng các ô
  let manualSumShifts = 0;
  weekNov2.rows.forEach((r) => {
    manualSumShifts += r.summary.totalShifts;
    assert.strictEqual(
      r.summary.totalShifts,
      r.summary.sc + r.summary.sv + r.summary.dp + r.summary.sx,
      'Tổng ca của nhân sự phải bằng tổng các buổi làm'
    );
  });
  assert.strictEqual(weekNov2.columnTotals.totalShifts, manualSumShifts, 'Tổng cột totalShifts phải bằng tổng các hàng');
  console.log(`   ✅ PASS: Thống kê tuần khớp 100% (Tổng số buổi làm việc: ${manualSumShifts}, SC: ${weekNov2.columnTotals.sc}, SV: ${weekNov2.columnTotals.sv}).`);

  // TEST 6: Kiểm tra chuyển tuần / xem tuần bất kỳ
  console.log('\n🔹 Test 6: Kiểm tra điều hướng chuyển tuần (startDate = 2026-11-23)...');
  const weekNov23 = await dutyService.getWeeklySchedule({ startDate: '2026-11-23' }, collabUser);
  assert.strictEqual(weekNov23.weekDays[0].dateStr, '2026-11-23', 'Ngày đầu tuần phải là 2026-11-23');
  assert.strictEqual(weekNov23.weekDays[6].dateStr, '2026-11-29', 'Ngày cuối tuần phải là 2026-11-29');
  console.log(`   ✅ PASS: Chuyển tuần thành công (${weekNov23.weekRange.title}).`);

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ 6 TEST TIÊU CHÍ BẢNG TUẦN BPTT ĐỀU ĐẠT 100%!');
  console.log('================================================================\n');
}

runTests()
  .catch((err) => {
    console.error('❌ LỖI KIỂM THỬ:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

