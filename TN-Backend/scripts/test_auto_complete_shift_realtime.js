'use strict';

/**
 * Script kiểm thử toàn diện chức năng:
 * TỰ ĐỘNG HOÀN THÀNH CA TRỰC KHI HẾT THỜI GIAN THEO THỜI GIAN THỰC & CHỐNG TỰ XÁC NHẬN BỞI CTV
 *
 * Kiểm tra các tiêu chí bắt buộc:
 * 1. Ca trực kết thúc bình thường (đã qua endTime): Tự động chuyển COMPLETED, ghi nhận LV và tính thù lao.
 * 2. Ca trực bị hủy (CANCELLED): Giữ nguyên CANCELLED, KHÔNG chuyển COMPLETED, KHÔNG tính thù lao.
 * 3. Ca trực chưa đến giờ (hôm nay chưa hết ca hoặc ca tương lai): Giữ nguyên CONFIRMED, KHÔNG chuyển COMPLETED.
 * 4. Chống chạy trùng / Idempotency: Quét nhiều lần không làm sai lệch, không nhân đôi chấm công/thù lao.
 * 5. Bỏ quyền CTV tự xác nhận: CTV gọi API completeShift bị chặn 403.
 * 6. Tác động đến Bảng chấm công và thù lao theo đúng nghiệp vụ hiện hành.
 */

const assert = require('assert');
const { Op } = require('sequelize');
const { sequelize } = require('../src/models');
const {
  User,
  DutyPeriod,
  StudioShift,
  AttendanceRecord,
  MonthlyPayroll,
} = require('../src/models');
const dutyService = require('../src/services/duty.service');
const payrollService = require('../src/services/payroll.service');

async function runTestSuite() {
  console.log('================================================================');
  console.log('KIỂM THỬ: TỰ ĐỘNG HOÀN THÀNH CA TRỰC THEO THỜI GIAN THỰC (FR-05)');
  console.log('================================================================\n');

  let testAdmin = null;
  let testCtv = null;
  let testPeriod = null;
  const createdShiftIds = [];

  try {
    const timestamp = Date.now();
    const testMonth = 11;
    const testYear = 2029; // Dùng năm riêng biệt để kiểm thử cô lập hoàn toàn

    // Khởi tạo người dùng kiểm thử
    testAdmin = await User.create({
      fullName: `Admin AutoShift ${timestamp}`,
      email: `admin_auto_${timestamp}@lhu.edu.vn`,
      password: 'HashedPassword123!',
      role: 'ADMIN',
      status: 'Active',
      isActive: true,
      employeeCode: `ADM_${timestamp.toString().slice(-4)}`,
    });

    testCtv = await User.create({
      fullName: `CTV AutoShift ${timestamp}`,
      email: `ctv_auto_${timestamp}@lhu.edu.vn`,
      password: 'HashedPassword123!',
      role: 'COLLABORATOR',
      status: 'Active',
      isActive: true,
      employeeCode: `CTV_${timestamp.toString().slice(-4)}`,
    });

    testPeriod = await DutyPeriod.create({
      month: testMonth,
      year: testYear,
      status: 'CONFIRMED',
      registrationDeadline: `${testYear}-11-15`,
      createdByUserId: testAdmin.id,
      confirmedByUserId: testAdmin.id,
      confirmedAt: new Date(),
    });

    console.log(`Đã tạo dữ liệu đợt trực mẫu: Tháng ${testMonth}/${testYear}`);

    // -------------------------------------------------------------------------
    // TEST 1: CA TRỰC KẾT THÚC BÌNH THƯỜNG (Quá khứ / Đã qua endTime)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: CA TRỰC ĐÃ QUA THỜI GIAN KẾT THÚC ---');
    const pastShift = await StudioShift.create({
      periodId: testPeriod.id,
      userId: testCtv.id,
      date: `${testYear}-11-05`,
      shiftType: 'MORNING',
      startTime: '07:30',
      endTime: '11:30',
      hours: 4.0,
      status: 'CONFIRMED', // Được Admin phân công chính thức
      attendanceSymbol: 'LV',
      confirmedByUserId: testAdmin.id,
    });
    createdShiftIds.push(pastShift.id);

    // Kiểm tra hàm isShiftEnded
    const now = new Date(`${testYear}-11-05T12:00:00`); // Lúc 12:00 (sau 11:30)
    assert.strictEqual(dutyService.isShiftEnded(pastShift, now), true, 'Ca sáng 07:30-11:30 ngày 05/11 tại thời điểm 12:00 phải được coi là đã kết thúc');

    // Chạy tự động hoàn thành trong phạm vi testPeriod
    const res1 = await dutyService.autoCompletePastConfirmedShifts({ targetNow: now, periodId: testPeriod.id });
    assert(res1.completedCount >= 1, 'Phải có ít nhất 1 ca được tự động hoàn thành');

    // Kiểm tra trong DB
    const pastShiftReloaded = await StudioShift.findByPk(pastShift.id);
    assert.strictEqual(pastShiftReloaded.status, 'COMPLETED', 'Ca trực quá khứ CONFIRMED phải tự động chuyển sang COMPLETED');
    console.log('  PASS: Ca trực đã qua thời gian kết thúc tự động chuyển sang trạng thái COMPLETED');

    // -------------------------------------------------------------------------
    // TEST 2: CA TRỰC BỊ HỦY (CANCELLED) -> KHÔNG ĐƯỢC TỰ ĐỘNG HOÀN THÀNH
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: CA TRỰC BỊ HỦY (CANCELLED) TRONG QUÁ KHỨ ---');
    const cancelledShift = await StudioShift.create({
      periodId: testPeriod.id,
      userId: testCtv.id,
      date: `${testYear}-11-06`,
      shiftType: 'AFTERNOON',
      startTime: '13:00',
      endTime: '17:00',
      hours: 4.0,
      status: 'CANCELLED', // Ca đã bị hủy
      attendanceSymbol: 'LV',
    });
    createdShiftIds.push(cancelledShift.id);

    // Chạy lại auto-complete trong phạm vi testPeriod
    await dutyService.autoCompletePastConfirmedShifts({ targetNow: new Date(`${testYear}-11-06T18:00:00`), periodId: testPeriod.id });

    const cancelledReloaded = await StudioShift.findByPk(cancelledShift.id);
    assert.strictEqual(cancelledReloaded.status, 'CANCELLED', 'Ca bị hủy CANCELLED tuyệt đối KHÔNG được chuyển sang COMPLETED');
    console.log('  PASS: Ca trực bị hủy giữ nguyên trạng thái CANCELLED, không bị hoàn thành nhầm');

    // -------------------------------------------------------------------------
    // TEST 3: CA TRỰC CHƯA ĐẾN THỜI GIAN KẾT THÚC
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: CA TRỰC CHƯA ĐẾN THỜI GIAN KẾT THÚC ---');
    // Case 3.1: Ca trực trong tương lai
    const futureShift = await StudioShift.create({
      periodId: testPeriod.id,
      userId: testCtv.id,
      date: `${testYear}-11-25`,
      shiftType: 'EVENING',
      startTime: '17:30',
      endTime: '21:30',
      hours: 4.0,
      status: 'CONFIRMED',
      attendanceSymbol: 'LV',
      confirmedByUserId: testAdmin.id,
    });
    createdShiftIds.push(futureShift.id);

    // Case 3.2: Ca trực ngày hôm nay nhưng chưa kết thúc (đang là 10:00 sáng cho ca 13:00-17:00)
    const todayUpcomingShift = await StudioShift.create({
      periodId: testPeriod.id,
      userId: testCtv.id,
      date: `${testYear}-11-10`,
      shiftType: 'AFTERNOON',
      startTime: '13:00',
      endTime: '17:00',
      hours: 4.0,
      status: 'CONFIRMED',
      attendanceSymbol: 'LV',
      confirmedByUserId: testAdmin.id,
    });
    createdShiftIds.push(todayUpcomingShift.id);

    // Giả lập thời điểm hiện tại: 10/11 lúc 10:00 sáng
    const midDayNow = new Date(`${testYear}-11-10T10:00:00`);
    assert.strictEqual(dutyService.isShiftEnded(todayUpcomingShift, midDayNow), false, 'Lúc 10:00 chưa kết thúc ca chiều 13:00-17:00');
    assert.strictEqual(dutyService.isShiftEnded(futureShift, midDayNow), false, 'Ca tương lai chưa kết thúc');

    await dutyService.autoCompletePastConfirmedShifts({ targetNow: midDayNow, periodId: testPeriod.id });

    const futureReloaded = await StudioShift.findByPk(futureShift.id);
    const upcomingReloaded = await StudioShift.findByPk(todayUpcomingShift.id);
    assert.strictEqual(futureReloaded.status, 'CONFIRMED', 'Ca tương lai phải giữ nguyên CONFIRMED');
    assert.strictEqual(upcomingReloaded.status, 'CONFIRMED', 'Ca chưa hết giờ phải giữ nguyên CONFIRMED');
    console.log('  PASS: Ca trực chưa đến giờ kết thúc hoặc trong tương lai giữ nguyên trạng thái CONFIRMED');

    // -------------------------------------------------------------------------
    // TEST 4: CHỐNG CHẠY TRÙNG LẶP (IDEMPOTENCY)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: KIỂM TRA CHỐNG CHẠY TRÙNG LẶP (IDEMPOTENCY) ---');
    const run2 = await dutyService.autoCompletePastConfirmedShifts({ targetNow: now, periodId: testPeriod.id });
    assert.strictEqual(run2.completedCount, 0, 'Lần chạy tiếp theo không có ca nào bị cập nhật lại');
    const run3 = await dutyService.autoCompletePastConfirmedShifts({ targetNow: now, periodId: testPeriod.id });
    assert.strictEqual(run3.completedCount, 0, 'Lần chạy thứ 3 cũng không cập nhật lại');
    console.log('  PASS: Cơ chế cập nhật đảm bảo tính Idempotent, không bao giờ chạy trùng lặp');

    // -------------------------------------------------------------------------
    // TEST 5: BỎ QUYỀN CTV TỰ XÁC NHẬN (RBAC & CHỐNG THAO TÁC THỦ CÔNG)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: CHẶN CTV TỰ BẤM XÁC NHẬN HOÀN THÀNH CA TRỰC ---');
    let ctvBlocked = false;
    try {
      await dutyService.completeShift(futureShift.id, testCtv.id, 'COLLABORATOR');
    } catch (err) {
      ctvBlocked = true;
      assert(
        err.message.includes('tự động ghi nhận') || err.statusCode === 403,
        `Thông báo lỗi phù hợp: ${err.message}`
      );
    }
    assert.strictEqual(ctvBlocked, true, 'CTV gọi completeShift phải bị ném lỗi 403');
    console.log('  PASS: CTV không thể tự xác nhận hoàn thành ca trực, hệ thống từ chối yêu cầu từ CTV');

    // -------------------------------------------------------------------------
    // TEST 6: ẢNH HƯỞNG ĐẾN BẢNG CHẤM CÔNG VÀ TÍNH THÙ LAO
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: TÁC ĐỘNG ĐẾN BẢNG CHẤM CÔNG VÀ THÙ LAO ---');
    // Tại thời điểm now (05/11), chỉ có 1 ca (pastShift ngày 05/11) là COMPLETED.
    // Các ca ngày 06/11 (CANCELLED), 10/11 (CONFIRMED chưa hết giờ), 25/11 (CONFIRMED tương lai)
    // đều KHÔNG được tính công!
    const payrollList = await payrollService.calculateMonthlyPayroll(testMonth, testYear);
    const ctvPayroll = payrollList.find((p) => p.ctv.id === testCtv.id);
    assert(ctvPayroll, 'Phải tìm thấy dòng bảng lương của CTV');
    assert.strictEqual(ctvPayroll.payroll.totalShiftCount, 1, 'Chỉ duy nhất 1 ca đã hoàn thành được tính công');
    assert.strictEqual(ctvPayroll.payroll.shiftHours, 4.0, 'Tổng giờ trực phải là 4.0 giờ (1 ca x 4h)');
    assert.strictEqual(ctvPayroll.payroll.totalAmount, 80000, 'Thù lao tính đúng 80.000 VNĐ (4h x 20.000 đ)');
    console.log(`  PASS: Bảng tính lương ghi nhận chính xác 1 ca hoàn thành = ${ctvPayroll.payroll.shiftHours}h = ${ctvPayroll.payroll.totalAmount.toLocaleString('vi-VN')} đ`);

    // Kiểm tra Bảng chấm công (Timesheet matrix)
    const timesheetData = await payrollService.getTimesheetData(testMonth, testYear);
    const ctvRow = timesheetData.rows.find((r) => r.ctv.id === testCtv.id);
    assert(ctvRow, 'Phải tìm thấy dòng chấm công của CTV');
    // Ngày 5 buổi Sáng (pastShift) phải có 'LV'
    assert.strictEqual(ctvRow.sessions[0].days[5], 'LV', 'Ngày 5 buổi Sáng phải có ký hiệu LV vì đã hoàn thành');
    // Ngày 6 (CANCELLED) phải không có 'LV'
    assert.notStrictEqual(ctvRow.sessions[1].days[6], 'LV', 'Ngày 6 buổi Chiều KHÔNG được có LV vì ca bị hủy');
    // Ngày 10 (chưa đến giờ hết ca) phải không có 'LV'
    assert.notStrictEqual(ctvRow.sessions[1].days[10], 'LV', 'Ngày 10 buổi Chiều KHÔNG được có LV vì chưa hết giờ');
    // Ngày 25 (tương lai) phải không có 'LV'
    assert.notStrictEqual(ctvRow.sessions[2].days[25], 'LV', 'Ngày 25 buổi Tối KHÔNG được có LV vì là ca tương lai');
    console.log('  PASS: Bảng chấm công chỉ hiển thị LV cho ca đã hoàn thành, các ca hủy/chưa đến giờ không xuất hiện');

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ 6 NHÓM KIỂM THỬ ĐÃ ĐẠT 100% - KHÔNG CÓ BẤT KỲ LỖI NÀO!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ KIỂM THỬ THẤT BẠI:', error);
    throw error;
  } finally {
    console.log('\n--- DỌN DẸP DỮ LIỆU TEST ---');
    try {
      if (createdShiftIds.length > 0) {
        await StudioShift.destroy({ where: { id: { [Op.in]: createdShiftIds } } });
      }
      if (testPeriod) {
        await StudioShift.destroy({ where: { periodId: testPeriod.id } });
        await DutyPeriod.destroy({ where: { id: testPeriod.id } });
      }
      const userIds = [testAdmin?.id, testCtv?.id].filter(Boolean);
      if (userIds.length > 0) {
        await MonthlyPayroll.destroy({ where: { userId: { [Op.in]: userIds } } });
        await AttendanceRecord.destroy({ where: { userId: { [Op.in]: userIds } } });
        await User.destroy({ where: { id: { [Op.in]: userIds } } });
      }
      console.log('✅ Đã dọn dẹp sạch sẽ dữ liệu kiểm thử.');
    } catch (cleanupErr) {
      console.error('Lỗi dọn dẹp:', cleanupErr);
    }
    await sequelize.close();
  }
}

runTestSuite();
