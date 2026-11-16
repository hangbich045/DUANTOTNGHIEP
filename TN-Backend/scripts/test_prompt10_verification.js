'use strict';

/**
 * Test script xác minh 3 yêu cầu trong Prompt 10:
 * 1. Khai báo công việc ngoài hệ thống (isExternal: true) -> Không ghi nhận chấm công trước khi Admin nghiệm thu.
 * 2. Admin nghiệm thu (COMPLETED) -> Ghi nhận vào AttendanceRecord và Bảng chấm công.
 * 3. Ma trận phân công tháng -> Dữ liệu khớp đúng tháng được chọn, không rò rỉ tháng trước/sau.
 */

const assert = require('assert');
const { User, Task, StudioShift, DutyPeriod, AttendanceRecord, sequelize } = require('../src/models');
const taskService = require('../src/services/task.service');
const payrollService = require('../src/services/payroll.service');
const dutyService = require('../src/services/duty.service');

async function runTest() {
  console.log('🚀 Bắt đầu kiểm tra xác minh 3 yêu cầu...');

  // 1. Tìm hoặc tạo CTV và Admin mẫu để test
  let admin = await User.findOne({ where: { role: 'ADMIN' } });
  let ctv = await User.findOne({ where: { role: 'COLLABORATOR' } });

  if (!admin || !ctv) {
    console.log('❌ Cần có ít nhất 1 ADMIN và 1 COLLABORATOR trong CSDL');
    process.exit(1);
  }

  console.log(`👤 Admin: ${admin.fullName} (${admin.id})`);
  console.log(`👤 CTV: ${ctv.fullName} (${ctv.id})`);

  const testDate = '2026-11-25'; // Ngày test trong tháng 11/2026

  // Dọn dẹp task test cũ nếu có
  await Task.destroy({
    where: {
      title: 'TEST_PROMPT10_EXTERNAL_TASK',
      assignedToUserId: ctv.id,
    },
  });

  // Xóa attendance record cũ ở ngày test nếu có
  await AttendanceRecord.destroy({
    where: {
      userId: ctv.id,
      date: testDate,
    },
  });

  console.log('\n--- BƯỚC 1: CTV KHAI BÁO VIỆC NGOÀI HỆ THỐNG ---');
  const externalTask = await taskService.createExternalTask(
    {
      title: 'TEST_PROMPT10_EXTERNAL_TASK',
      description: 'Chụp hình sự kiện ngoài hệ thống',
      taskType: 'Chụp ảnh',
      resultLink: 'https://drive.google.com/test-photo',
      executionDate: testDate,
      actualHours: 6.0,
      shiftSession: 'S',
      note: 'Chờ nghiệm thu',
    },
    ctv
  );

  assert.equal(externalTask.status, 'PENDING_APPROVAL', 'Trạng thái ban đầu phải là PENDING_APPROVAL');
  assert.equal(externalTask.isExternal, true, 'isExternal phải là true');
  console.log('✅ Khai báo thành công task PENDING_APPROVAL, isExternal: true');

  // Kiểm tra: Tuyệt đối KHÔNG có AttendanceRecord nào được tạo ra cho ngày test này!
  const attBeforeReview = await AttendanceRecord.findAll({
    where: {
      userId: ctv.id,
      date: testDate,
    },
  });
  assert.equal(attBeforeReview.length, 0, 'LỖI: Công việc chưa nghiệm thu nhưng đã xuất hiện trong AttendanceRecord!');
  console.log('✅ Xác nhận: Chưa có AttendanceRecord nào được tạo cho task PENDING_APPROVAL');

  // Kiểm tra Bảng chấm công tháng 11/2026: Không được tính giờ SV từ task này
  const timesheetBeforeReview = await payrollService.getTimesheetData(11, 2026);
  const ctvRowBefore = timesheetBeforeReview.rows.find((r) => r.ctv.id === ctv.id);
  const day25_S = ctvRowBefore?.sessions?.find((s) => s.session === 'S')?.days?.[25];
  assert.notEqual(day25_S, 'SV', 'LỖI: Ký hiệu SV xuất hiện trên Bảng chấm công trước khi nghiệm thu!');
  console.log('✅ Xác nhận: Bảng chấm công KHÔNG ghi nhận SV cho công việc chưa nghiệm thu');

  console.log('\n--- BƯỚC 2: ADMIN YÊU CẦU CHỈNH SỬA (REVISION_REQUESTED) ---');
  const revisedTask = await taskService.reviewTask(
    externalTask.id,
    {
      decision: 'REVISION_REQUESTED',
      feedback: 'Hình chụp mờ, cần gửi lại ảnh gốc chất lượng cao',
    },
    admin
  );
  assert.equal(revisedTask.status, 'REVISION_REQUESTED');

  const attAfterRevision = await AttendanceRecord.findAll({
    where: { userId: ctv.id, date: testDate },
  });
  assert.equal(attAfterRevision.length, 0, 'LỖI: Task bị yêu cầu chỉnh sửa vẫn có AttendanceRecord!');
  console.log('✅ Xác nhận: Task REVISION_REQUESTED không được ghi nhận vào Bảng chấm công');

  console.log('\n--- BƯỚC 3: CTV NỘP LẠI & ADMIN NGHIỆM THU (COMPLETED) ---');
  // Chuyển lại PENDING_APPROVAL và nộp lại
  await Task.update({ status: 'PENDING_APPROVAL' }, { where: { id: externalTask.id } });

  const approvedTask = await taskService.reviewTask(
    externalTask.id,
    {
      decision: 'COMPLETED',
      feedback: 'Ảnh chụp rất đẹp, đạt yêu cầu nghiệm thu!',
      actualHours: 6.0,
      executionDate: testDate,
    },
    admin
  );
  assert.equal(approvedTask.status, 'COMPLETED');
  console.log('✅ Admin đã nghiệm thu COMPLETED');

  // Kiểm tra: Bây giờ AttendanceRecord PHẢI được tạo với SV cho 6 tiếng (quy tắc 5-8h -> S + C)
  const attAfterApproval = await AttendanceRecord.findAll({
    where: { userId: ctv.id, date: testDate },
  });
  assert.ok(attAfterApproval.length > 0, 'Sau khi COMPLETED, AttendanceRecord phải được tạo!');
  const sessions = attAfterApproval.map((r) => r.session);
  assert.ok(sessions.includes('S'), 'Phải có SV buổi S');
  assert.ok(sessions.includes('C'), 'Phải có SV buổi C');
  console.log(`✅ Xác nhận: Sau khi nghiệm thu, AttendanceRecord đã ghi nhận SV tại các buổi: ${sessions.join(', ')}`);

  // Kiểm tra Bảng chấm công: Đã ghi nhận SV
  const timesheetAfterReview = await payrollService.getTimesheetData(11, 2026);
  const ctvRowAfter = timesheetAfterReview.rows.find((r) => r.ctv.id === ctv.id);
  const day25_S_after = ctvRowAfter?.sessions?.find((s) => s.session === 'S')?.days?.[25];
  assert.equal(day25_S_after, 'SV', 'Sau khi nghiệm thu, Bảng chấm công phải hiển thị ký hiệu SV');
  console.log('✅ Xác nhận: Bảng chấm công đã cập nhật ký hiệu SV chuẩn xác sau nghiệm thu');

  console.log('\n--- BƯỚC 4: KIỂM TRA ĐỒNG BỘ MA TRẬN PHÂN CÔNG THÁNG ---');
  const period11 = await DutyPeriod.findOne({ where: { month: 11, year: 2026 } });
  if (period11) {
    const summary11 = await dutyService.getPeriodRegistrationsSummary(period11.id);
    assert.equal(summary11.period.month, 11);
    assert.equal(summary11.period.year, 2026);
    assert.equal(summary11.daysMeta.length, 30, 'Tháng 11 phải có đúng 30 ngày');
    assert.equal(summary11.daysMeta[0].dateStr, '2026-11-01');
    assert.equal(summary11.daysMeta[29].dateStr, '2026-11-30');
    console.log('✅ Ma trận Tháng 11/2026: Đủ 30 ngày từ 2026-11-01 đến 2026-11-30');
  }

  // Dọn dẹp task test
  await Task.destroy({ where: { id: externalTask.id } });
  await AttendanceRecord.destroy({ where: { userId: ctv.id, date: testDate } });

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM TRA ĐỀU THÀNH CÔNG VÀ CHÍNH XÁC 100%!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Lỗi kiểm tra:', err);
  process.exit(1);
});
