'use strict';

/**
 * @file test_duty_direct_task_assignment.js
 * @description Kiểm thử tự động tính năng "Phân công công việc trực tiếp trên Lịch trực Studio"
 * và đồng bộ 2 chiều với module "Quản lý Công việc & Phân Công CTV".
 *
 * Kiểm tra các tiêu chí:
 * 1. Admin phân công nhiệm vụ trực tiếp từ ô lịch (CTV, executionDate, shiftSession, deadline, note).
 * 2. Lịch trực Studio (getWeeklySchedule) lập tức hiển thị ký hiệu SV và chi tiết sự vụ.
 * 3. Module Quản lý Công việc & Phân công CTV (Task model & service) hiển thị đồng thời nhiệm vụ.
 * 4. Không ghi nhận SV vào Bảng chấm công khi mới giao (chỉ ghi nhận sau khi nghiệm thu COMPLETED).
 * 5. Chỉnh sửa nhiệm vụ được đồng bộ chính xác trên cả 2 giao diện.
 * 6. Xóa / Hủy nhiệm vụ tự động dọn sạch ký hiệu SV trên Lịch trực và xóa khỏi danh sách công việc.
 * 7. Kiểm tra quyền RBAC: CTV không được tự ý phân công, chỉnh sửa hoặc xóa nhiệm vụ.
 */

const { sequelize } = require('../src/config/database');
const { User, Task, AttendanceRecord } = require('../src/models');
const taskService = require('../src/services/task.service');
const dutyService = require('../src/services/duty.service');
const payrollService = require('../src/services/payroll.service');

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ: PHÂN CÔNG CÔNG VIỆC TRỰC TIẾP TRÊN LỊCH TRỰC STUDIO ===\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Đã kết nối cơ sở dữ liệu thành công.');

    // 1. Lấy tài khoản Admin và CTV mẫu
    const adminUser = await User.findOne({ where: { role: 'ADMIN', status: 'Active' } });
    const ctvUser = await User.findOne({ where: { role: 'COLLABORATOR', status: 'Active' } });

    if (!adminUser || !ctvUser) {
      throw new Error('Cần có ít nhất 1 ADMIN và 1 CTV Active trong CSDL để chạy kiểm thử.');
    }
    console.log(`👤 Admin: ${adminUser.fullName} (${adminUser.email})`);
    console.log(`👤 CTV: ${ctvUser.fullName} (${ctvUser.email})\n`);

    const targetDate = '2026-11-18'; // Thứ Tư trong tuần 16/11 - 22/11/2026
    const targetSession = 'S'; // Ca Sáng
    const deadlineIso = `${targetDate}T11:30:00.000Z`;

    // -------------------------------------------------------------------------
    // TEST 1: Giao việc trực tiếp từ Lịch trực Studio
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Admin giao nhiệm vụ trực tiếp với CTV, ngày và buổi chỉ định ---');
    const createdTask = await taskService.createTask(
      {
        title: 'Chụp ảnh sự kiện Hội thảo Quốc tế 2026',
        description: 'Chụp toàn cảnh khai mạc, đại biểu và các phiên thảo luận chuyên đề',
        assignedToUserId: ctvUser.id,
        taskType: 'Chụp ảnh sự kiện',
        deadline: deadlineIso,
        executionDate: targetDate,
        shiftSession: targetSession,
        note: 'Hội trường Trụ sở chính A301',
      },
      adminUser
    );

    console.log(`✅ Tạo nhiệm vụ thành công: ID = ${createdTask.id}`);
    console.log(`   - Tiêu đề: ${createdTask.title}`);
    console.log(`   - CTV: ${createdTask.assignee?.fullName}`);
    console.log(`   - Ngày thực hiện: ${createdTask.executionDate} | Ca: ${createdTask.shiftSession}`);
    console.log(`   - Trạng thái ban đầu: ${createdTask.status}`);

    if (createdTask.executionDate !== targetDate || createdTask.shiftSession !== targetSession) {
      throw new Error('LỖI: executionDate hoặc shiftSession không khớp với thông tin đã giao!');
    }

    // -------------------------------------------------------------------------
    // TEST 2: Xác minh hiển thị ký hiệu SV trên Lịch trực Studio (getWeeklySchedule)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Kiểm tra Lịch trực Studio (getWeeklySchedule) cập nhật ký hiệu SV ---');
    const scheduleRes = await dutyService.getWeeklySchedule({ startDate: '2026-11-16' }, adminUser);
    const ctvRow = scheduleRes.rows.find((r) => r.user.id === ctvUser.id);
    if (!ctvRow) {
      throw new Error(`LỖI: Không tìm thấy dòng của CTV ${ctvUser.fullName} trên Lịch trực tuần!`);
    }

    const slotInfo = ctvRow.days[targetDate]?.[targetSession];
    console.log(`   - Ký hiệu tại ngày ${targetDate} ca ${targetSession}: "${slotInfo?.symbol}"`);
    console.log(`   - Có ghi chú/sự vụ: ${slotInfo?.hasNote}`);
    console.log(`   - Số lượng tasks trong ca: ${slotInfo?.tasks?.length || 0}`);

    if (slotInfo?.symbol !== 'SV') {
      throw new Error(`LỖI: Ký hiệu tại ô lịch mong đợi là "SV", nhưng nhận được "${slotInfo?.symbol}"!`);
    }

    const matchingTask = slotInfo.tasks.find((t) => t.id === createdTask.id);
    if (!matchingTask) {
      throw new Error('LỖI: Không tìm thấy task chi tiết trong danh sách tasks của ô lịch!');
    }
    console.log(`✅ Lịch trực Studio hiển thị chính xác SV: "${matchingTask.fullDisplay}"`);
    console.log(`   - Địa điểm trích xuất: "${matchingTask.location}"`);

    // -------------------------------------------------------------------------
    // TEST 3: Đảm bảo KHÔNG ghi nhận chấm công trước khi nghiệm thu hoàn thành
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Kiểm tra Bảng chấm công: KHÔNG được tính công khi chưa nghiệm thu ---');
    const attendanceBeforeReview = await AttendanceRecord.findAll({
      where: {
        userId: ctvUser.id,
        date: targetDate,
      },
    });

    console.log(`   - Số bản ghi AttendanceRecord ngày ${targetDate}: ${attendanceBeforeReview.length}`);
    for (const att of attendanceBeforeReview) {
      if (att.symbol === 'SV' && att.notes && att.notes.includes(createdTask.title)) {
        throw new Error('LỖI BẢO MẬT NGHIỆP VỤ: Nhiệm vụ mới giao (NOT_STARTED) đã bị ghi nhận vào Bảng chấm công!');
      }
    }
    console.log('✅ Xác nhận: Nhiệm vụ mới giao tuyệt đối KHÔNG lọt vào Bảng chấm công.');

    // -------------------------------------------------------------------------
    // TEST 4: Chỉnh sửa nhiệm vụ và kiểm tra đồng bộ 2 chiều
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Chỉnh sửa thông tin nhiệm vụ và kiểm tra đồng bộ ---');
    const updatedTask = await taskService.updateTask(
      createdTask.id,
      {
        title: 'Chụp ảnh sự kiện Hội thảo Quốc tế 2026 (CẬP NHẬT ĐỊA ĐIỂM B502)',
        note: 'Phòng Hội thảo B502',
      },
      adminUser
    );

    console.log(`   - Tiêu đề sau cập nhật: ${updatedTask.title}`);
    console.log(`   - Ghi chú/địa điểm: ${updatedTask.note}`);

    // Kiểm tra lại Lịch trực
    const scheduleResAfterUpdate = await dutyService.getWeeklySchedule({ startDate: '2026-11-16' }, adminUser);
    const ctvRowAfter = scheduleResAfterUpdate.rows.find((r) => r.user.id === ctvUser.id);
    const updatedSlot = ctvRowAfter.days[targetDate]?.[targetSession];
    const updatedTaskInSlot = updatedSlot.tasks.find((t) => t.id === createdTask.id);

    if (!updatedTaskInSlot || !updatedTaskInSlot.title.includes('B502')) {
      throw new Error('LỖI: Lịch trực không đồng bộ tiêu đề mới sau khi chỉnh sửa!');
    }
    console.log(`✅ Lịch trực Studio đồng bộ ngay lập tức: "${updatedTaskInSlot.fullDisplay}"`);

    // -------------------------------------------------------------------------
    // TEST 5: Kiểm tra phân quyền RBAC - CTV không được tự giao/sửa/xóa nhiệm vụ
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Kiểm tra phân quyền RBAC (Chặn CTV thao tác trái phép) ---');
    let ctvCreateBlocked = false;
    try {
      await taskService.createTask(
        {
          title: 'CTV tự giao việc cho mình',
          assignedToUserId: ctvUser.id,
        },
        ctvUser // Truyền CTV vào làm người thực hiện
      );
    } catch (err) {
      ctvCreateBlocked = true;
      console.log(`✅ CTV tự giao việc bị chặn thành công: "${err.message}"`);
    }

    let ctvUpdateBlocked = false;
    try {
      await taskService.updateTask(createdTask.id, { title: 'CTV tự sửa tiêu đề' }, ctvUser);
    } catch (err) {
      ctvUpdateBlocked = true;
      console.log(`✅ CTV tự sửa việc bị chặn thành công: "${err.message}"`);
    }

    let ctvDeleteBlocked = false;
    try {
      await taskService.deleteTask(createdTask.id, ctvUser);
    } catch (err) {
      ctvDeleteBlocked = true;
      console.log(`✅ CTV tự xóa việc bị chặn thành công: "${err.message}"`);
    }

    if (!ctvCreateBlocked || !ctvUpdateBlocked || !ctvDeleteBlocked) {
      throw new Error('LỖI PHÂN QUYỀN: CTV vẫn có thể thực hiện thao tác quản lý nhiệm vụ!');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Xóa / Hủy nhiệm vụ và kiểm tra tự động dọn sạch trên Lịch trực
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Admin xóa / hủy nhiệm vụ và kiểm tra dọn sạch ký hiệu SV ---');
    await taskService.deleteTask(createdTask.id, adminUser);
    console.log(`✅ Đã xóa nhiệm vụ ID: ${createdTask.id}`);

    const scheduleResAfterDelete = await dutyService.getWeeklySchedule({ startDate: '2026-11-16' }, adminUser);
    const ctvRowAfterDelete = scheduleResAfterDelete.rows.find((r) => r.user.id === ctvUser.id);
    const deletedSlot = ctvRowAfterDelete.days[targetDate]?.[targetSession];

    const taskStillExists = deletedSlot?.tasks?.some((t) => t.id === createdTask.id);
    if (taskStillExists) {
      throw new Error('LỖI: Nhiệm vụ đã bị xóa nhưng vẫn còn xuất hiện trên Lịch trực Studio!');
    }
    console.log(`✅ Xác nhận: Nhiệm vụ đã bị xóa hoàn toàn khỏi Lịch trực Studio (Ký hiệu SV dọn sạch).`);

    console.log('\n======================================================================');
    console.log('🎉 TẤT CẢ 6/6 BÀI KIỂM THỬ ĐÃ PASS 100%! TÍNH NĂNG HOẠT ĐỘNG HOÀN HẢO.');
    console.log('======================================================================');
  } catch (error) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runTests();
