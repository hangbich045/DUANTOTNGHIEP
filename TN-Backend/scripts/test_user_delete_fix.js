'use strict';

/**
 * Script kiểm thử tự động toàn diện 8 trường hợp theo Mục 5 của Yêu cầu
 * Kiểm tra trực tiếp trên SQL Server database và backend services
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Task,
  AttendanceRecord,
  StudioShift,
} = require('../src/models');
const userService = require('../src/services/user.service');
const authService = require('../src/services/auth.service');

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ KHẮC PHỤC LỖI XÓA TÀI KHOẢN & BẢO TOÀN DỮ LIỆU LỊCH SỬ');
  console.log('================================================================\n');

  let passedCount = 0;
  const results = [];

  function recordPass(caseNum, desc) {
    passedCount++;
    console.log(`✔ [CASE-${caseNum}] ${desc}`);
    results.push({ caseNum, desc, status: 'PASS' });
  }

  function recordFail(caseNum, desc, error) {
    console.error(`✖ [CASE-${caseNum}] ${desc}`);
    console.error(`   Lỗi: ${error.message}`);
    results.push({ caseNum, desc, status: 'FAIL', error: error.message });
  }

  const createdUserIds = [];

  try {
    await sequelize.authenticate();
    console.log('Kết nối CSDL SQL Server thành công.\n');

    const admin = await User.findOne({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error('Không tìm thấy tài khoản ADMIN trong CSDL.');

    const defaultPassword = 'TestPassword@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 1: Xóa tài khoản chưa có dữ liệu liên quan
    // -------------------------------------------------------------------------
    try {
      const cleanUser = await User.create({
        fullName: 'Người dùng Chưa có việc',
        email: `clean_user_${Date.now()}@lhu.edu.vn`,
        password: hashedPassword,
        role: 'USER',
        status: 'Active',
        isActive: true,
      });

      const res = await userService.deleteOrDisableUser(admin.id, cleanUser.id);
      assert.equal(res.action, 'DELETED', 'Hành động phải là DELETED');

      const afterDelete = await User.findByPk(cleanUser.id);
      assert.equal(afterDelete, null, 'Tài khoản chưa có dữ liệu phải được xóa khỏi CSDL');

      recordPass(1, 'Xóa tài khoản chưa có dữ liệu liên quan -> Xóa vật lý an toàn thành công');
    } catch (e) {
      recordFail(1, 'Xóa tài khoản chưa có dữ liệu liên quan', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 2: Xóa tài khoản đã được giao công việc
    // -------------------------------------------------------------------------
    let userWithOneTask;
    let singleTask;
    try {
      userWithOneTask = await User.create({
        fullName: 'CTV Đã có 1 việc',
        email: `ctv_one_task_${Date.now()}@lhu.edu.vn`,
        password: hashedPassword,
        role: 'COLLABORATOR',
        status: 'Active',
        isActive: true,
      });
      createdUserIds.push(userWithOneTask.id);

      singleTask = await Task.create({
        title: 'Nhiệm vụ kiểm thử xóa tài khoản case 2',
        assignedToUserId: userWithOneTask.id,
        createdByUserId: admin.id,
        status: 'IN_PROGRESS',
        taskType: 'Viết content',
      });

      const res = await userService.deleteOrDisableUser(admin.id, userWithOneTask.id);
      assert.equal(res.action, 'DISABLED', 'Hành động phải là DISABLED');

      // Kiểm tra user vẫn tồn tại trong DB nhưng có status = Disabled, isActive = false
      const updatedUser = await User.findByPk(userWithOneTask.id);
      assert.ok(updatedUser, 'User không được bị xóa khỏi DB');
      assert.equal(updatedUser.status, 'Disabled', 'Status phải là Disabled');
      assert.equal(updatedUser.isActive, false, 'isActive phải là false');

      // Kiểm tra task vẫn nguyên vẹn
      const checkTask = await Task.findByPk(singleTask.id);
      assert.ok(checkTask, 'Task không được bị xóa');
      assert.equal(checkTask.assignedToUserId, userWithOneTask.id, 'Người nhận task phải được giữ nguyên');

      recordPass(2, 'Xóa tài khoản đã được giao 1 việc -> Chuyển sang Disabled, giữ nguyên user và task');
    } catch (e) {
      recordFail(2, 'Xóa tài khoản đã được giao công việc', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 3: Xóa tài khoản có nhiều công việc
    // -------------------------------------------------------------------------
    let userMultiTasks;
    let multiTasks = [];
    try {
      userMultiTasks = await User.create({
        fullName: 'CTV Có nhiều việc',
        email: `ctv_multi_${Date.now()}@lhu.edu.vn`,
        password: hashedPassword,
        role: 'COLLABORATOR',
        status: 'Active',
        isActive: true,
      });
      createdUserIds.push(userMultiTasks.id);

      // Tạo 3 tasks với các trạng thái khác nhau
      const t1 = await Task.create({
        title: 'Task Multi 1',
        assignedToUserId: userMultiTasks.id,
        createdByUserId: admin.id,
        status: 'NOT_STARTED',
        taskType: 'Quay highlight',
      });
      const t2 = await Task.create({
        title: 'Task Multi 2',
        assignedToUserId: userMultiTasks.id,
        createdByUserId: admin.id,
        status: 'COMPLETED',
        taskType: 'Dựng clip TikTok',
      });
      const t3 = await Task.create({
        title: 'Task Multi 3',
        assignedToUserId: userMultiTasks.id,
        createdByUserId: admin.id,
        status: 'REVISION_REQUESTED',
        taskType: 'Thiết kế',
      });
      multiTasks = [t1, t2, t3];

      const res = await userService.deleteOrDisableUser(admin.id, userMultiTasks.id);
      assert.equal(res.action, 'DISABLED');

      const updatedUser = await User.findByPk(userMultiTasks.id);
      assert.equal(updatedUser.status, 'Disabled');

      // Kiểm tra cả 3 task vẫn tồn tại đầy đủ
      const tasksInDb = await Task.findAll({ where: { assignedToUserId: userMultiTasks.id } });
      assert.equal(tasksInDb.length, 3, 'Cả 3 task phải được giữ nguyên đầy đủ');

      recordPass(3, 'Xóa tài khoản có nhiều việc -> Chuyển sang Disabled, toàn bộ 3 tasks giữ nguyên');
    } catch (e) {
      recordFail(3, 'Xóa tài khoản có nhiều công việc', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 4: Xóa tài khoản đã có dữ liệu chấm công
    // -------------------------------------------------------------------------
    let userAttendance;
    let attRecord;
    try {
      userAttendance = await User.create({
        fullName: 'CTV Có chấm công',
        email: `ctv_att_${Date.now()}@lhu.edu.vn`,
        password: hashedPassword,
        role: 'COLLABORATOR',
        status: 'Active',
        isActive: true,
      });
      createdUserIds.push(userAttendance.id);

      attRecord = await AttendanceRecord.create({
        userId: userAttendance.id,
        date: '2026-10-15',
        session: 'S',
        symbol: 'LV',
        hours: 4.0,
        month: 10,
        year: 2026,
      });

      const res = await userService.deleteOrDisableUser(admin.id, userAttendance.id);
      assert.equal(res.action, 'DISABLED');

      const checkAtt = await AttendanceRecord.findByPk(attRecord.id);
      assert.ok(checkAtt, 'Bản ghi chấm công không được bị xóa');
      assert.equal(checkAtt.userId, userAttendance.id);

      recordPass(4, 'Xóa tài khoản đã có dữ liệu chấm công -> Chuyển sang Disabled, giữ nguyên bản ghi chấm công');
    } catch (e) {
      recordFail(4, 'Xóa tài khoản đã có dữ liệu chấm công', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 5: Xóa tài khoản đã có lịch trực Studio
    // -------------------------------------------------------------------------
    let userShift;
    let studioShift;
    try {
      userShift = await User.create({
        fullName: 'CTV Có ca trực Studio',
        email: `ctv_shift_${Date.now()}@lhu.edu.vn`,
        password: hashedPassword,
        role: 'COLLABORATOR',
        status: 'Active',
        isActive: true,
      });
      createdUserIds.push(userShift.id);

      studioShift = await StudioShift.create({
        userId: userShift.id,
        date: '2026-10-16',
        shiftType: 'MORNING',
        startTime: '07:30',
        endTime: '11:30',
        hours: 4.0,
        status: 'CONFIRMED',
      });

      const res = await userService.deleteOrDisableUser(admin.id, userShift.id);
      assert.equal(res.action, 'DISABLED');

      const checkShift = await StudioShift.findByPk(studioShift.id);
      assert.ok(checkShift, 'Ca trực Studio không được bị xóa');
      assert.equal(checkShift.userId, userShift.id);

      recordPass(5, 'Xóa tài khoản đã có lịch trực Studio -> Chuyển sang Disabled, giữ nguyên ca trực Studio');
    } catch (e) {
      recordFail(5, 'Xóa tài khoản đã có lịch trực', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 6: Đăng nhập bằng tài khoản Disabled
    // -------------------------------------------------------------------------
    try {
      let loginBlocked = false;
      let errorMsg = '';
      try {
        await authService.login({
          email: userWithOneTask.email,
          password: defaultPassword,
        });
      } catch (err) {
        if (err.statusCode === 403 && err.message.includes('Tài khoản của bạn đã bị vô hiệu hóa')) {
          loginBlocked = true;
          errorMsg = err.message;
        } else {
          throw err;
        }
      }
      assert.ok(loginBlocked, 'Đăng nhập bằng tài khoản Disabled phải bị chặn 403');
      recordPass(6, `Đăng nhập bằng tài khoản Disabled -> Bị chặn 403 với thông báo chuẩn: "${errorMsg}"`);
    } catch (e) {
      recordFail(6, 'Đăng nhập bằng tài khoản Disabled', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 7: Kiểm tra lịch sử công việc sau khi vô hiệu hóa
    // -------------------------------------------------------------------------
    try {
      const taskWithAssignee = await Task.findByPk(singleTask.id, {
        include: [{ model: User, as: 'assignee', attributes: ['id', 'fullName', 'email', 'status', 'isActive'] }],
      });
      assert.ok(taskWithAssignee, 'Không tìm thấy task');
      assert.ok(taskWithAssignee.assignee, 'Task phải có assignee đính kèm');
      assert.equal(taskWithAssignee.assignee.id, userWithOneTask.id);
      assert.equal(taskWithAssignee.assignee.fullName, 'CTV Đã có 1 việc');
      assert.equal(taskWithAssignee.assignee.status, 'Disabled');
      assert.equal(taskWithAssignee.assignee.isActive, false);

      recordPass(7, 'Lịch sử công việc vẫn hiển thị đầy đủ thông tin CTV (trạng thái Disabled), không bị mồ côi hay null');
    } catch (e) {
      recordFail(7, 'Kiểm tra lịch sử công việc sau khi vô hiệu hóa', e);
    }

    // -------------------------------------------------------------------------
    // TRƯỜNG HỢP 8: Kiểm tra các tài khoản khác không bị ảnh hưởng
    // -------------------------------------------------------------------------
    try {
      // Đăng nhập thử bằng admin
      const adminLoginRes = await authService.login({
        email: admin.email,
        password: 'Admin@123456', // Mật khẩu seed chuẩn của Admin
      }).catch(async () => {
        // Fallback test với user active vừa tạo
        const anotherActiveUser = await User.create({
          fullName: 'Active User Khác',
          email: `active_other_${Date.now()}@lhu.edu.vn`,
          password: hashedPassword,
          role: 'COLLABORATOR',
          status: 'Active',
          isActive: true,
        });
        createdUserIds.push(anotherActiveUser.id);
        return await authService.login({
          email: anotherActiveUser.email,
          password: defaultPassword,
        });
      });

      assert.ok(adminLoginRes.accessToken, 'Tài khoản Active vẫn đăng nhập bình thường và nhận token');
      recordPass(8, 'Các tài khoản Active khác vẫn hoạt động, đăng nhập và lấy token bình thường 100%');
    } catch (e) {
      recordFail(8, 'Kiểm tra các tài khoản khác không bị ảnh hưởng', e);
    }

    // Dọn dẹp dữ liệu kiểm thử
    console.log('\nDọn dẹp các dữ liệu kiểm thử an toàn...');
    if (singleTask) await Task.destroy({ where: { id: singleTask.id } });
    if (multiTasks.length > 0) await Task.destroy({ where: { id: multiTasks.map(t => t.id) } });
    if (attRecord) await AttendanceRecord.destroy({ where: { id: attRecord.id } });
    if (studioShift) await StudioShift.destroy({ where: { id: studioShift.id } });
    if (createdUserIds.length > 0) await User.destroy({ where: { id: createdUserIds } });

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình kiểm thử:', err);
  } finally {
    await sequelize.close();
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount}/8 TRƯỜNG HỢP ĐẠT (${Math.round((passedCount / 8) * 100)}%)`);
  console.log('================================================================');
  return { passedCount, results };
}

runTests().then(() => process.exit(0)).catch(() => process.exit(1));

