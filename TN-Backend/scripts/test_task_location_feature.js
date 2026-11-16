/**
 * Test kịch bản: Trường Địa điểm khi giao nhiệm vụ cho CTV
 * 1. Kiểm tra requiresLocation cho các nhóm công việc: Chụp ảnh, Quay phim/video, Diễn viên, Khác vs các nhóm khác
 * 2. Admin giao việc thuộc nhóm yêu cầu địa điểm (Cơ sở 1 + Phòng B502) -> Lưu đúng campus, room, location
 * 3. Đồng bộ lên Lịch trực Studio: getWeeklySchedule trả về location và fullDisplay chứa địa điểm
 * 4. Chuyển đổi loại việc sang nhóm không yêu cầu địa điểm (Viết content) -> Tự động xóa/reset campus, room, location
 * 5. Cập nhật lại sang nhóm yêu cầu địa điểm (Quay highlight với Cơ sở Dược + Hội trường T) -> Cập nhật chính xác
 * 6. Dọn dẹp dữ liệu kiểm thử
 */

const { sequelize } = require('../src/config/database');
const { Task, User } = require('../src/models');
const taskService = require('../src/services/task.service');
const dutyService = require('../src/services/duty.service');

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ: TRƯỜNG ĐỊA ĐIỂM KHI GIAO NHIỆM VỤ CHO CTV ===\n');
  let testTaskId = null;

  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối CSDL thành công.');

    const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
    const ctvUser = await User.findOne({ where: { role: 'COLLABORATOR' } });

    if (!adminUser || !ctvUser) {
      throw new Error('Thiếu tài khoản ADMIN hoặc COLLABORATOR để test');
    }

    // --- TEST 1: Logic requiresLocation ---
    console.log('\n--- TEST 1: Kiểm tra logic phân loại requiresLocation ---');
    const positiveCases = [
      'Chụp & xử lý hình sự kiện',
      'Chụp ảnh',
      'Quay highlight',
      'Quay phim',
      'Quay clip TikTok',
      'Diễn viên',
      'Khác',
    ];
    const negativeCases = [
      'Viết content',
      'Dựng clip highlight',
      'Dựng clip TikTok',
      'Viết kịch bản',
      'MC bản tin',
      'Thư ký trường quay',
      'Dựng phim',
      'Thiết kế',
    ];

    for (const type of positiveCases) {
      if (!taskService.requiresLocation(type)) {
        throw new Error(`Sai logic requiresLocation: ${type} phải là TRUE`);
      }
    }
    console.log('✅ Nhóm Chụp ảnh, Quay phim/video, Diễn viên, Khác: TẤT CẢ đều requiresLocation = true');

    for (const type of negativeCases) {
      if (taskService.requiresLocation(type)) {
        throw new Error(`Sai logic requiresLocation: ${type} phải là FALSE`);
      }
    }
    console.log('✅ Nhóm Viết content, Dựng clip, Thiết kế, MC...: TẤT CẢ đều requiresLocation = false');

    // --- TEST 2: Giao nhiệm vụ với Cơ sở & Phòng ---
    console.log('\n--- TEST 2: Tạo nhiệm vụ Chụp & xử lý hình sự kiện với Cơ sở 1 và Phòng B502 ---');
    const createdTask = await taskService.createTask(
      {
        title: 'Chụp ảnh Lễ Khai Mạc Giải Thể Thao Sinh Viên',
        description: 'Chụp toàn cảnh và lễ trao giải',
        assignedToUserId: ctvUser.id,
        taskType: 'Chụp & xử lý hình sự kiện',
        campus: 'Cơ sở 1',
        room: 'Phòng B502',
        executionDate: '2026-11-20',
        shiftSession: 'S',
        deadline: '2026-11-20T11:30:00.000Z',
      },
      adminUser
    );
    testTaskId = createdTask.id;

    console.log(`✅ Tạo task thành công ID: ${testTaskId}`);
    console.log(`   - Campus: "${createdTask.campus}"`);
    console.log(`   - Room: "${createdTask.room}"`);
    console.log(`   - Location: "${createdTask.location}"`);

    if (createdTask.campus !== 'Cơ sở 1' || createdTask.room !== 'Phòng B502' || createdTask.location !== 'Cơ sở 1 - Phòng B502') {
      throw new Error('Dữ liệu campus, room hoặc location không khớp!');
    }

    // --- TEST 3: Kiểm tra hiển thị và đồng bộ trên Lịch trực Studio (getWeeklySchedule) ---
    console.log('\n--- TEST 3: Kiểm tra Lịch trực Studio getWeeklySchedule hiển thị đúng địa điểm ---');
    const scheduleRes = await dutyService.getWeeklySchedule({ date: '2026-11-20' }, adminUser);
    const ctvRow = scheduleRes.rows.find((r) => r.user.id === ctvUser.id);
    if (!ctvRow) {
      throw new Error('Không tìm thấy CTV trong lịch trực tuần 2026-11-20');
    }

    const fridaySlot = ctvRow.days['2026-11-20'];
    if (!fridaySlot || !fridaySlot.S || fridaySlot.S.symbol !== 'SV') {
      throw new Error('Ca Sáng ngày 2026-11-20 chưa hiển thị ký hiệu SV');
    }

    const taskInSlot = fridaySlot.S.tasks.find((t) => t.id === testTaskId);
    if (!taskInSlot) {
      throw new Error('Không tìm thấy task trong ca Sáng của Lịch trực');
    }

    console.log(`✅ Lịch trực đã ghi nhận task trong ca S:`);
    console.log(`   - Task location: "${taskInSlot.location}"`);
    console.log(`   - Task fullDisplay: "${taskInSlot.fullDisplay}"`);

    if (taskInSlot.location !== 'Cơ sở 1 - Phòng B502') {
      throw new Error(`Location trên lịch trực không khớp: ${taskInSlot.location}`);
    }
    if (!taskInSlot.fullDisplay.includes('Cơ sở 1 - Phòng B502')) {
      throw new Error(`fullDisplay trên lịch trực không chứa địa điểm: ${taskInSlot.fullDisplay}`);
    }

    // --- TEST 4: Chuyển loại việc sang nhóm không yêu cầu địa điểm (Viết content) -> Tự động dọn sạch location ---
    console.log('\n--- TEST 4: Đổi loại việc sang "Viết content" -> Tự động reset địa điểm về NULL ---');
    const updatedToNonLoc = await taskService.updateTask(
      testTaskId,
      {
        taskType: 'Viết content',
        title: 'Viết bài truyền thông Lễ Khai Mạc',
      },
      adminUser
    );

    console.log(`   - TaskType mới: "${updatedToNonLoc.taskType}"`);
    console.log(`   - Campus sau đổi: ${updatedToNonLoc.campus}`);
    console.log(`   - Room sau đổi: ${updatedToNonLoc.room}`);
    console.log(`   - Location sau đổi: ${updatedToNonLoc.location}`);

    if (updatedToNonLoc.campus !== null || updatedToNonLoc.room !== null || updatedToNonLoc.location !== null) {
      throw new Error('Lỗi: Khi chuyển sang nhóm không cần địa điểm, dữ liệu cũ vẫn bị giữ lại!');
    }
    console.log('✅ Xác nhận: Dữ liệu địa điểm cũ đã được xóa sạch hoàn toàn, không bị gắn nhầm.');

    // --- TEST 5: Cập nhật lại sang nhóm yêu cầu địa điểm (Quay phim) với Cơ sở Dược + Hội trường T ---
    console.log('\n--- TEST 5: Đổi sang "Quay phim" với Cơ sở Dược và Hội trường T ---');
    const updatedToLoc = await taskService.updateTask(
      testTaskId,
      {
        taskType: 'Quay phim',
        campus: 'Cơ sở Dược',
        room: 'Hội trường T',
      },
      adminUser
    );

    console.log(`   - TaskType: "${updatedToLoc.taskType}"`);
    console.log(`   - Campus: "${updatedToLoc.campus}"`);
    console.log(`   - Room: "${updatedToLoc.room}"`);
    console.log(`   - Location: "${updatedToLoc.location}"`);

    if (updatedToLoc.campus !== 'Cơ sở Dược' || updatedToLoc.room !== 'Hội trường T' || updatedToLoc.location !== 'Cơ sở Dược - Hội trường T') {
      throw new Error('Lỗi: Cập nhật lại địa điểm mới không thành công!');
    }
    console.log('✅ Xác nhận: Cập nhật địa điểm mới hoạt động hoàn hảo.');

    // --- TEST 6: Dọn dẹp dữ liệu kiểm thử ---
    console.log('\n--- TEST 6: Dọn dẹp dữ liệu kiểm thử ---');
    await taskService.deleteTask(testTaskId, adminUser);
    testTaskId = null;
    console.log('✅ Đã xóa task kiểm thử.');

    console.log('\n======================================================================');
    console.log('🎉 TẤT CẢ 6/6 BÀI KIỂM THỬ ĐỊA ĐIỂM ĐÃ PASS 100%! TÍNH NĂNG HOẠT ĐỘNG HOÀN HẢO.');
    console.log('======================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI:', error.message);
    if (testTaskId) {
      try {
        const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
        if (adminUser) await taskService.deleteTask(testTaskId, adminUser);
      } catch {}
    }
    process.exit(1);
  }
}

runTests();
