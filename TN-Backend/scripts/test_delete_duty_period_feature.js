const {
  sequelize,
  User,
  DutyPeriod,
  ShiftRegistration,
  StudioShift,
  AttendanceRecord,
  MonthlyPayroll,
  DutyScheduleHistory,
} = require('../src/models');
const dutyService = require('../src/services/duty.service');
const { Op } = require('sequelize');

async function runTest() {
  console.log('=== TESTING COMPLETE DATA DELETION & FRESH NEW PERIOD FEATURE ===');
  await sequelize.authenticate();
  console.log('Connected to MSSQL database successfully.');

  const admin = await User.findOne({ where: { role: 'ADMIN' } });
  const ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });

  console.log(`Admin: ${admin.fullName} (${admin.id})`);
  console.log(`CTV: ${ctv.fullName} (${ctv.id})`);

  // Dọn dẹp các đợt test cũ (year >= 2028)
  const oldTestPeriods = await DutyPeriod.findAll({ where: { year: { [Op.gte]: 2028 } } });
  for (const op of oldTestPeriods) {
    await dutyService.deleteDutyPeriod(admin.id, op.id).catch(() => {});
  }

  // --- Test 1: Kiểm tra phân quyền RBAC (CTV không được xóa) ---
  console.log('\n--- Test 1: Kiểm tra phân quyền RBAC (CTV không được xóa) ---');
  const testP1 = await DutyPeriod.create({
    month: 1,
    year: 2029,
    status: 'OPEN',
    createdByUserId: admin.id,
  });

  try {
    await dutyService.deleteDutyPeriod(ctv.id, testP1.id);
    console.error('FAIL: CTV không bị chặn!');
    process.exit(1);
  } catch (err) {
    if (err.statusCode === 403) {
      console.log('PASS: CTV bị chặn 403 Forbidden chính xác:', err.message);
    } else {
      console.error('FAIL: Lỗi không đúng 403:', err);
      process.exit(1);
    }
  }

  // --- Test 2: Xóa đợt có dữ liệu đầy đủ (Đăng ký, ca trực, ca xác nhận, chấm công) ---
  console.log('\n--- Test 2: Xóa đợt có dữ liệu phong phú (Tháng 5/2029) ---');
  const month = 5;
  const year = 2029;
  const testP2 = await DutyPeriod.create({
    month,
    year,
    status: 'CONFIRMED',
    createdByUserId: admin.id,
    confirmedByUserId: admin.id,
    confirmedAt: new Date(),
  });

  // Tạo nguyện vọng đăng ký
  await ShiftRegistration.create({
    periodId: testP2.id,
    userId: ctv.id,
    date: `${year}-05-10`,
    session: 'S',
  });

  // Tạo ca trực CONFIRMED
  const shift1 = await StudioShift.create({
    periodId: testP2.id,
    userId: ctv.id,
    date: `${year}-05-10`,
    shiftType: 'MORNING',
    hours: 4.0,
    status: 'CONFIRMED',
  });

  // Tạo ca trực COMPLETED
  const shift2 = await StudioShift.create({
    periodId: testP2.id,
    userId: ctv.id,
    date: `${year}-05-11`,
    shiftType: 'AFTERNOON',
    hours: 4.0,
    status: 'COMPLETED',
  });

  // Tạo bản ghi chấm công ca trực
  await AttendanceRecord.create({
    userId: ctv.id,
    date: `${year}-05-10`,
    session: 'S',
    symbol: 'LV',
    hours: 4.0,
    sourceType: 'DUTY_SHIFT',
    sourceId: shift1.id,
    month,
    year,
  });
  await AttendanceRecord.create({
    userId: ctv.id,
    date: `${year}-05-11`,
    session: 'C',
    symbol: 'LV',
    hours: 4.0,
    sourceType: 'DUTY_SHIFT',
    sourceId: shift2.id,
    month,
    year,
  });

  // Tạo lịch sử chỉnh sửa
  await DutyScheduleHistory.create({
    periodId: testP2.id,
    changedByUserId: admin.id,
    action: 'ADD',
    date: `${year}-05-10`,
    session: 'S',
  });

  // Kiểm tra trước khi xóa
  const beforeRegs = await ShiftRegistration.count({ where: { periodId: testP2.id } });
  const beforeShifts = await StudioShift.count({ where: { periodId: testP2.id } });
  const beforeAtt = await AttendanceRecord.count({ where: { month, year, sourceType: 'DUTY_SHIFT' } });
  const beforeHist = await DutyScheduleHistory.count({ where: { periodId: testP2.id } });

  console.log(`Trước khi xóa Tháng ${month}/${year}: Regs=${beforeRegs}, Shifts=${beforeShifts}, Attendance=${beforeAtt}, History=${beforeHist}`);

  // Thực hiện xóa toàn bộ dữ liệu
  const deleteResult = await dutyService.deleteDutyPeriod(admin.id, testP2.id);
  console.log('Kết quả xóa:', deleteResult);

  // Xác minh sau khi xóa
  const afterPeriod = await DutyPeriod.findByPk(testP2.id);
  const afterRegs = await ShiftRegistration.count({ where: { periodId: testP2.id } });
  const afterShifts = await StudioShift.count({ where: { periodId: testP2.id } });
  const afterAtt = await AttendanceRecord.count({ where: { month, year, sourceType: 'DUTY_SHIFT' } });
  const afterHist = await DutyScheduleHistory.count({ where: { periodId: testP2.id } });

  console.log(`Sau khi xóa Tháng ${month}/${year}: Period=${afterPeriod ? 'Tồn tại' : 'Đã xóa'}, Regs=${afterRegs}, Shifts=${afterShifts}, Attendance=${afterAtt}, History=${afterHist}`);

  if (afterPeriod || afterRegs > 0 || afterShifts > 0 || afterAtt > 0 || afterHist > 0) {
    console.error('FAIL: Dữ liệu chưa được xóa sạch sẽ!');
    process.exit(1);
  }
  console.log('PASS: Toàn bộ dữ liệu của đợt đã bị xóa sạch sẽ 100%!');

  // --- Test 3: Tạo đợt mới cho tháng/năm vừa xóa và kiểm tra dữ liệu làm mới, để trống ---
  console.log(`\n--- Test 3: Tạo đợt mới Tháng ${month}/${year} - Kiểm tra dữ liệu được làm mới và để trống ---`);
  const newPeriod = await dutyService.createDutyPeriod(
    admin.id,
    {
      month,
      year,
      registrationDeadline: `${year}-05-03`,
      note: 'Đợt mới tạo lại từ đầu',
    }
  );
  console.log('Đợt mới tạo:', {
    id: newPeriod.id,
    month: newPeriod.month,
    year: newPeriod.year,
    status: newPeriod.status,
  });

  // Lấy tổng hợp đợt mới tạo
  const summary = await dutyService.getPeriodRegistrationsSummary(newPeriod.id);
  let totalAssignedInSlots = 0;
  let totalRegisteredInSlots = 0;
  for (const dateKey of Object.keys(summary.slots)) {
    for (const sess of ['S', 'C', 'T']) {
      totalAssignedInSlots += (summary.slots[dateKey][sess]?.assigned || []).length;
      totalRegisteredInSlots += (summary.slots[dateKey][sess]?.registered || []).length;
    }
  }

  console.log(`Thống kê đợt mới: totalRegisteredInSlots=${totalRegisteredInSlots}, totalAssignedInSlots=${totalAssignedInSlots}`);

  const checkRegs = await ShiftRegistration.count({ where: { periodId: newPeriod.id } });
  const checkShifts = await StudioShift.count({ where: { periodId: newPeriod.id } });
  const checkAtt = await AttendanceRecord.count({ where: { month, year, sourceType: 'DUTY_SHIFT' } });

  console.log(`Kiểm tra DB đợt mới: Regs=${checkRegs}, Shifts=${checkShifts}, Attendance=${checkAtt}`);

  if (totalRegisteredInSlots !== 0 || totalAssignedInSlots !== 0 || checkRegs !== 0 || checkShifts !== 0 || checkAtt !== 0) {
    console.error('FAIL: Đợt mới không để trống hoàn toàn!');
    process.exit(1);
  }
  console.log('PASS: Đợt mới hoàn toàn trống, 0 CTV đăng ký, 0 ca phân công, sẵn sàng nhận dữ liệu mới!');

  // Dọn dẹp đợt test
  await dutyService.deleteDutyPeriod(admin.id, testP1.id).catch(() => {});
  await dutyService.deleteDutyPeriod(admin.id, newPeriod.id).catch(() => {});

  console.log('\n=== ALL TESTS FOR HARD DELETE & BLANK NEW PERIOD PASSED 100%! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
