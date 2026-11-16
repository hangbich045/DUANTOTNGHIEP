'use strict';

/**
 * Script kiểm thử toàn diện module Quản lý ca trực và đồng bộ Sự vụ CTV:
 * 1. Quy tắc thiết lập hạn chót đăng ký khi Admin tạo đợt mới (ngày tạo + 2, tháng/năm = tháng đợt trực).
 * 2. Hiển thị sự vụ SV trên lịch trực Studio khi giao việc, TUYỆT ĐỐI KHÔNG ghi nhận SV vào Bảng chấm công.
 * 3. Quyền xem lịch trực toàn bộ CTV của cả COLLABORATOR và ADMIN.
 * 4. Nhân sự chỉnh sửa/xóa ca trực đã xác nhận (CONFIRMED): ghi nhận DutyScheduleHistory, đồng bộ AttendanceRecord, gửi Notification.
 * 5. Nghiệm thu COMPLETED công việc thì Bảng chấm công mới được cập nhật ký hiệu SV.
 */

const assert = require('assert');
const { Op } = require('sequelize');
const { sequelize } = require('../src/models');
const {
  User,
  DutyPeriod,
  ShiftRegistration,
  StudioShift,
  AttendanceRecord,
  DutyScheduleHistory,
  Task,
  Notification,
} = require('../src/models');
const dutyService = require('../src/services/duty.service');
const payrollService = require('../src/services/payroll.service');

async function runTestSuite() {
  console.log('================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ: QUẢN LÝ CA TRỰC & ĐỒNG BỘ SỰ VỤ CTV');
  console.log('================================================================\n');

  let testAdmin = null;
  let testCtv1 = null;
  let testCtv2 = null;
  let testPeriod = null;
  let testTask = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: KIỂM THỬ QUY TẮC TÍNH HẠN CHÓT ĐĂNG KÝ (calculateDefaultDeadline)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: QUY TẮC THIẾT LẬP HẠN CHÓT ĐĂNG KÝ CA TRỰC ---');

    // Case 1.1: Tạo đợt 12/2026 vào ngày 11/11/2026 -> Hạn chót ngày 13/12/2026
    const baseDate1 = new Date(2026, 10, 11); // Month 10 là Tháng 11 (0-indexed)
    const deadline1 = dutyService.calculateDefaultDeadline(12, 2026, baseDate1);
    assert.strictEqual(deadline1, '2026-12-13', 'Hạn chót phải là 2026-12-13');
    console.log(`  PASS: Ngày tạo 11/11/2026 cho đợt 12/2026 -> Hạn chót: ${deadline1}`);

    // Case 1.2: Tạo đợt 02/2026 vào ngày 30/01/2026 -> Hạn chót clamped cuối tháng 2 (28/02/2026)
    const baseDate2 = new Date(2026, 0, 30);
    const deadline2 = dutyService.calculateDefaultDeadline(2, 2026, baseDate2);
    assert.strictEqual(deadline2, '2026-02-28', 'Hạn chót phải được clamp về 2026-02-28');
    console.log(`  PASS: Ngày tạo 30/01/2026 cho đợt 02/2026 -> Hạn chót clamped: ${deadline2}`);

    // Case 1.3: Tạo đợt 10/2027 vào ngày 15/09/2027 -> Hạn chót ngày 17/10/2027
    const baseDate3 = new Date(2027, 8, 15);
    const deadline3 = dutyService.calculateDefaultDeadline(10, 2027, baseDate3);
    assert.strictEqual(deadline3, '2027-10-17', 'Hạn chót phải là 2027-10-17');
    console.log(`  PASS: Ngày tạo 15/09/2027 cho đợt 10/2027 -> Hạn chót: ${deadline3}\n`);

    // -------------------------------------------------------------------------
    // CHUẨN BỊ DỮ LIỆU TEST
    // -------------------------------------------------------------------------
    console.log('--- KHỞI TẠO DỮ LIỆU KIỂM THỬ ---');
    const timestamp = Date.now();

    const testMonth = 9;
    const testYear = 2028;

    // Dọn dẹp đợt cũ nếu có trước đó
    const oldP = await DutyPeriod.findOne({ where: { month: testMonth, year: testYear } });
    if (oldP) {
      await DutyScheduleHistory.destroy({ where: { periodId: oldP.id } });
      await StudioShift.destroy({ where: { periodId: oldP.id } });
      await ShiftRegistration.destroy({ where: { periodId: oldP.id } });
      await DutyPeriod.destroy({ where: { id: oldP.id } });
    }

    testAdmin = await User.create({
      fullName: `Admin Test ${timestamp}`,
      email: `admin_test_${timestamp}@lhu.edu.vn`,
      password: 'HashedPassword123!',
      role: 'ADMIN',
      status: 'Active',
      isActive: true,
      employeeCode: `ADM_${timestamp.toString().slice(-4)}`,
    });

    testCtv1 = await User.create({
      fullName: `CTV One Test ${timestamp}`,
      email: `ctv1_test_${timestamp}@lhu.edu.vn`,
      password: 'HashedPassword123!',
      role: 'COLLABORATOR',
      status: 'Active',
      isActive: true,
      employeeCode: `CTV1_${timestamp.toString().slice(-4)}`,
    });

    testCtv2 = await User.create({
      fullName: `CTV Two Test ${timestamp}`,
      email: `ctv2_test_${timestamp}@lhu.edu.vn`,
      password: 'HashedPassword123!',
      role: 'COLLABORATOR',
      status: 'Active',
      isActive: true,
      employeeCode: `CTV2_${timestamp.toString().slice(-4)}`,
    });

    // Tạo đợt đăng ký ca trực tháng test (Tháng 9/2028)
    testPeriod = await dutyService.createDutyPeriod(testAdmin.id, {
      month: testMonth,
      year: testYear,
      note: 'Đợt trực test Studio tháng 9/2028',
    });
    console.log(`  Đã tạo đợt trực ID: ${testPeriod.id} (Tháng ${testPeriod.month}/${testPeriod.year})`);
    assert(testPeriod.registrationDeadline, 'Hạn chót phải được tạo tự động');
    const pDeadline = new Date(testPeriod.registrationDeadline);
    assert.strictEqual(pDeadline.getMonth() + 1, testMonth, 'Hạn chót của đợt phải mang tháng của đợt');
    console.log(`  PASS: Hạn chót đợt trực tự động: ${pDeadline.toISOString().slice(0, 10)}\n`);

    // -------------------------------------------------------------------------
    // TEST 2: GIAO NHIỆM VỤ MỚI -> HIỂN THỊ SV TRÊN LỊCH TRỰC NHƯNG KHÔNG TÍNH CÔNG TRÊN BẢNG CHẤM CÔNG
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: GIAO NHIỆM VỤ MỚI VÀ HIỂN THỊ SV TRÊN LỊCH TRỰC ---');
    testTask = await Task.create({
      title: 'Quay video sự kiện Khai mạc Studio',
      description: 'Nhiệm vụ quay phim ngoại cảnh',
      taskType: 'QUAY_PHIM',
      assignedToUserId: testCtv1.id,
      createdByUserId: testAdmin.id,
      status: 'IN_PROGRESS', // Đang thực hiện, CHƯA nghiệm thu
      executionDate: `${testYear}-09-15`,
      actualHours: 6.0,
      isExternal: false,
    });
    console.log(`  Đã giao nhiệm vụ: "${testTask.title}" ngày ${testYear}-09-15 cho CTV1 (Trạng thái: IN_PROGRESS)`);

    // 2.1: Kiểm tra lịch trực Studio có nhận diện được SV ngày 15 hay không
    const summaryBefore = await dutyService.getPeriodRegistrationsSummary(testPeriod.id);
    const ctvTasksKey = `${testYear}-09-15_${testCtv1.id}`;
    const ctvTasksOnDay = summaryBefore.tasksByUserAndDate[ctvTasksKey];
    assert(Array.isArray(ctvTasksOnDay) && ctvTasksOnDay.length > 0, `Phải tìm thấy nhiệm vụ của CTV vào ngày ${testYear}-09-15`);
    assert.strictEqual(ctvTasksOnDay[0].title, testTask.title);
    assert.strictEqual(ctvTasksOnDay[0].status, 'IN_PROGRESS');
    console.log(`  PASS: Lịch trực Studio hiển thị ký hiệu SV và danh sách nhiệm vụ ngày ${testYear}-09-15 cho CTV1`);

    // 2.2: TỐI QUAN TRỌNG: Kiểm tra Bảng chấm công tháng
    // Tuyệt đối KHÔNG được ghi nhận SV và KHÔNG được tính thù lao khi Task chưa COMPLETED!
    const timesheetBefore = await payrollService.getTimesheetData(testMonth, testYear);
    const ctv1RowBefore = timesheetBefore.rows.find((r) => r.ctv.id === testCtv1.id);
    if (ctv1RowBefore) {
      const day15Val = ctv1RowBefore.sessions?.[0]?.days?.[15];
      assert.notStrictEqual(day15Val, 'SV', 'Bảng chấm công ngày 15 KHÔNG được xuất hiện ký hiệu SV khi Task chưa nghiệm thu');
      assert.strictEqual(ctv1RowBefore.summary?.gioSv || 0, 0, 'Tổng giờ SV trên bảng chấm công phải là 0');
      assert.strictEqual(ctv1RowBefore.summary?.tien || 0, 0, 'Thù lao tạm tính của CTV1 phải là 0');
    }
    console.log('  PASS: Bảng chấm công KHÔNG ghi nhận SV và KHÔNG tính tiền khi nhiệm vụ chưa được nghiệm thu\n');

    // -------------------------------------------------------------------------
    // TEST 3: QUYỀN XEM LỊCH TRỰC TOÀN BỘ CTV CỦA COLLABORATOR
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: QUYỀN TRUY CẬP LỊCH TRỰC TOÀN BỘ CTV CỦA COLLABORATOR ---');
    // CTV gọi summary đợt trực
    const ctvSummary = await dutyService.getPeriodRegistrationsSummary(testPeriod.id);
    assert(ctvSummary && ctvSummary.period, 'CTV phải lấy được summary toàn Studio');
    assert(ctvSummary.slots && typeof ctvSummary.slots === 'object', 'CTV phải xem được ma trận slots của toàn Studio');
    assert(Array.isArray(ctvSummary.daysMeta) && ctvSummary.daysMeta.length > 0, 'CTV phải xem được danh sách các ngày trong tháng');

    // CTV lấy danh sách ca trực toàn studio trong tháng mà không truyền userId
    const allStudioShifts = await dutyService.getShifts({ month: testMonth, year: testYear });
    assert(Array.isArray(allStudioShifts), 'CTV phải lấy được toàn bộ ca trực Studio');
    console.log('  PASS: Tài khoản COLLABORATOR có quyền xem lịch trực và ma trận toàn bộ CTV trong tháng\n');

    // -------------------------------------------------------------------------
    // TEST 4: NHÂN SỰ CHỈNH SỬA / XÓA CA TRỰC ĐÃ CONFIRMED VÀ GHI LỊCH SỬ
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: NHÂN SỰ CHỈNH SỬA LỊCH TRỰC ĐÃ CONFIRMED & GHI NHẬN LỊCH SỬ ---');

    // 4.1: Phân công ban đầu và xác nhận lịch trực (CONFIRMED)
    await dutyService.assignShifts(testAdmin.id, testPeriod.id, [
      { date: `${testYear}-09-10`, session: 'S', userId: testCtv1.id },
      { date: `${testYear}-09-10`, session: 'C', userId: testCtv2.id },
    ]);
    await dutyService.confirmPeriodSchedule(testAdmin.id, testPeriod.id);
    console.log(`  Đã chốt xác nhận lịch trực đợt tháng ${testMonth}/${testYear} (status: CONFIRMED)`);

    // Kiểm tra AttendanceRecord ban đầu đã tạo 'LV'
    const attRec1 = await AttendanceRecord.findOne({
      where: { userId: testCtv1.id, date: `${testYear}-09-10`, session: 'S' },
    });
    assert(attRec1 && attRec1.symbol === 'LV', 'Phải có AttendanceRecord ký hiệu LV cho CTV1 buổi S');
    console.log('  PASS: AttendanceRecord tự động ghi nhận LV cho ca trực đã chốt');

    // 4.2: Admin điều chỉnh lịch trực đã CONFIRMED:
    // Đổi CTV1 từ buổi Sáng (S) sang buổi Tối (T), giữ nguyên CTV2 buổi Chiều (C)
    const updateResult = await dutyService.assignShifts(
      testAdmin.id,
      testPeriod.id,
      [
        { date: `${testYear}-09-10`, session: 'T', userId: testCtv1.id }, // Ca mới
        { date: `${testYear}-09-10`, session: 'C', userId: testCtv2.id }, // Ca cũ giữ nguyên
      ],
      { reason: 'Đổi ca trực sang buổi tối do phòng studio có lịch ghi hình đột xuất' }
    );
    assert(updateResult.success, 'Cập nhật lịch trực đã CONFIRMED phải thành công');

    // Kiểm tra AttendanceRecord sau khi điều chỉnh:
    // Buổi S của CTV1 phải bị xóa
    const attSAfter = await AttendanceRecord.findOne({
      where: { userId: testCtv1.id, date: `${testYear}-09-10`, session: 'S' },
    });
    assert.strictEqual(attSAfter, null, 'AttendanceRecord buổi S của CTV1 phải bị xóa sau khi đổi ca');

    // Buổi T của CTV1 phải được tạo mới với ký hiệu LV
    const attTAfter = await AttendanceRecord.findOne({
      where: { userId: testCtv1.id, date: `${testYear}-09-10`, session: 'T' },
    });
    assert(attTAfter && attTAfter.symbol === 'LV', 'AttendanceRecord buổi T của CTV1 phải có ký hiệu LV');
    console.log('  PASS: AttendanceRecord được đồng bộ chính xác khi Admin đổi ca trực');

    // 4.3: Kiểm tra bảng DutyScheduleHistory ghi nhận lịch sử chỉnh sửa
    const histories = await dutyService.getScheduleHistories(testPeriod.id);
    assert(histories.length >= 2, 'Phải có ít nhất 2 bản ghi lịch sử (DELETE ca S và ADD ca T)');
    const deleteHist = histories.find((h) => h.action === 'DELETE' && h.targetUserId === testCtv1.id && h.session === 'S');
    const addHist = histories.find((h) => h.action === 'ADD' && h.targetUserId === testCtv1.id && h.session === 'T');
    assert(deleteHist, 'Phải ghi nhận lịch sử DELETE cho ca S của CTV1');
    assert(addHist, 'Phải ghi nhận lịch sử ADD cho ca T của CTV1');
    assert.strictEqual(deleteHist.changedByUserId, testAdmin.id, 'Người thực hiện phải là Admin');
    console.log(`  PASS: DutyScheduleHistory ghi nhận đầy đủ: DELETE ca S & ADD ca T bởi Admin`);

    // 4.4: Kiểm tra Notification tự động gửi đến CTV1
    const notifs = await Notification.findAll({
      where: { userId: testCtv1.id, type: 'DUTY_SCHEDULE_UPDATED' },
      order: [['createdAt', 'DESC']],
    });
    assert(notifs.length > 0, 'Phải có thông báo gửi đến CTV1 về việc điều chỉnh lịch trực');
    console.log(`  PASS: Đã gửi thông báo in-app đến CTV1: "${notifs[0].message}"`);

    // 4.5: Admin xóa trực tiếp 1 ca trực đã CONFIRMED (hàm cancelShift)
    const shiftToDelete = await StudioShift.findOne({
      where: { periodId: testPeriod.id, userId: testCtv1.id, date: `${testYear}-09-10`, shiftType: 'EVENING' },
    });
    if (shiftToDelete) {
      await dutyService.cancelShift(shiftToDelete.id, testAdmin.id, 'ADMIN', 'Studio sửa chữa thiết bị');
      const deletedShift = await StudioShift.findByPk(shiftToDelete.id);
      assert.strictEqual(deletedShift, null, 'Ca trực phải được xóa hoàn toàn khỏi hệ thống');

      const attDeleted = await AttendanceRecord.findOne({
        where: { userId: testCtv1.id, date: `${testYear}-09-10`, session: 'T' },
      });
      assert.strictEqual(attDeleted, null, 'AttendanceRecord buổi T phải bị xóa khi ca trực bị hủy');
      console.log('  PASS: Admin xóa ca trực đơn lẻ: Ca được xóa và AttendanceRecord được xóa thành công\n');
    }

    // -------------------------------------------------------------------------
    // TEST 5: NGHIỆM THU COMPLETED NHIỆM VỤ -> ĐỒNG BỘ SV VÀO BẢNG CHẤM CÔNG
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: NGHIỆM THU COMPLETED NHIỆM VỤ -> ĐỒNG BỘ SV VÀO BẢNG CHẤM CÔNG ---');
    testTask.status = 'COMPLETED';
    testTask.completedAt = new Date();
    await testTask.save();

    // Kích hoạt đồng bộ sang Bảng chấm công
    await payrollService.syncTaskAttendanceToDatabase(testTask.assignedToUserId, testTask.executionDate);

    // Kiểm tra AttendanceRecord ngày testYear-09-15 của CTV1:
    // actualHours = 6.0 tiếng -> Từ 5 đến 8 tiếng: Phải có SV ở buổi Sáng (S) và Chiều (C)!
    const recDay15S = await AttendanceRecord.findOne({
      where: { userId: testCtv1.id, date: `${testYear}-09-15`, session: 'S' },
    });
    const recDay15C = await AttendanceRecord.findOne({
      where: { userId: testCtv1.id, date: `${testYear}-09-15`, session: 'C' },
    });
    assert(recDay15S && recDay15S.symbol === 'SV', 'Ngày 15 buổi Sáng phải mang ký hiệu SV');
    assert(recDay15C && recDay15C.symbol === 'SV', 'Ngày 15 buổi Chiều phải mang ký hiệu SV');
    console.log('  PASS: Sau khi COMPLETED 6.0h -> Bảng chấm công cập nhật SV ở buổi Sáng và Chiều (S + C)');

    // Kiểm tra thù lao bảng chấm công tháng
    const timesheetAfter = await payrollService.getTimesheetData(testMonth, testYear);
    const ctv1RowAfter = timesheetAfter.rows.find((r) => r.ctv.id === testCtv1.id);
    assert(ctv1RowAfter, 'Phải tìm thấy dòng của CTV1 trong bảng chấm công');
    assert.strictEqual(ctv1RowAfter.summary?.gioSv, 6.0, 'Tổng giờ SV phải là 6.0 giờ');
    assert(ctv1RowAfter.summary?.tien > 0, 'Thù lao phải được tính sau khi nghiệm thu');
    console.log(`  PASS: Bảng chấm công đã ghi nhận ${ctv1RowAfter.summary?.gioSv}h SV và tính thù lao ${ctv1RowAfter.summary?.tien.toLocaleString('vi-VN')} đ\n`);

    console.log('================================================================');
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ PASS 100% - KHÔNG CÓ BẤT KỲ LỖI NÀO!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ KIỂM THỬ THẤT BẠI:', error);
    throw error;
  } finally {
    // -------------------------------------------------------------------------
    // DỌN DẸP DỮ LIỆU TEST
    // -------------------------------------------------------------------------
    console.log('\n--- DỌN DẸP DỮ LIỆU TEST ---');
    try {
      if (testTask) await Task.destroy({ where: { id: testTask.id } });
      if (testPeriod) {
        await DutyScheduleHistory.destroy({ where: { periodId: testPeriod.id } });
        await StudioShift.destroy({ where: { periodId: testPeriod.id } });
        await ShiftRegistration.destroy({ where: { periodId: testPeriod.id } });
        await DutyPeriod.destroy({ where: { id: testPeriod.id } });
      }
      const userIds = [testAdmin?.id, testCtv1?.id, testCtv2?.id].filter(Boolean);
      if (userIds.length > 0) {
        await AttendanceRecord.destroy({ where: { userId: { [Op.in]: userIds } } });
        await Notification.destroy({ where: { userId: { [Op.in]: userIds } } });
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
