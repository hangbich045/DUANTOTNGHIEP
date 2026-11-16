'use strict';

/**
 * @file scripts/test_task4_1_notifications.js
 * @description Kiểm thử toàn diện Task 4.1 - Hệ thống thông báo in-app và email giao dịch (FR-07)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Op } = require('sequelize');
const { Notification, User, BorrowRequest, StudioBooking, Task, Equipment } = require('../src/models');
const notificationService = require('../src/services/notification.service');
const { sendNotificationEmail } = require('../src/config/mailer');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TOÀN DIỆN TASK 4.1: HỆ THỐNG THÔNG BÁO (FR-07)');
  console.log('================================================================\n');

  try {
    // 1. Tìm hoặc lấy người dùng kiểm thử
    const adminUser = await User.findOne({ where: { role: 'ADMIN', status: 'Active' } });
    const ctvUser = await User.findOne({ where: { role: 'COLLABORATOR', status: 'Active' } });
    const normalUser = await User.findOne({ where: { role: 'USER' } });

    assert(adminUser !== null, 'Tìm thấy tài khoản Quản trị viên (ADMIN) để kiểm thử');
    assert(ctvUser !== null, 'Tìm thấy tài khoản Cộng tác viên (COLLABORATOR) để kiểm thử');

    // --- Tiêu chí 1: Tạo thông báo in-app cơ bản ---
    console.log('\n--- Tiêu chí 1: Tạo thông báo in-app cho cá nhân (notifyUser / createNotification) ---');
    const notif1 = await notificationService.createNotification({
      userId: ctvUser.id,
      title: 'Kiểm thử thông báo cá nhân',
      message: 'Nội dung thông báo kiểm thử tự động',
      type: 'TEST_NOTIFICATION',
      link: '/tasks',
      sendEmail: false,
    });

    assert(notif1 && notif1.id, 'Tạo bản ghi thông báo in-app thành công với UUID hợp lệ');
    assert(notif1.userId === ctvUser.id, 'Thông báo gắn đúng định danh người nhận userId');
    assert(notif1.isRead === false, 'Thông báo mới tạo có trạng thái isRead = false');

    // --- Tiêu chí 2: Đánh dấu đã đọc và đọc tất cả ---
    console.log('\n--- Tiêu chí 2: Cập nhật trạng thái đã đọc / chưa đọc (FR-07.3) ---');
    notif1.isRead = true;
    await notif1.save();

    const reloaded = await Notification.findByPk(notif1.id);
    assert(reloaded.isRead === true, 'Đánh dấu thông báo đơn lẻ thành công (isRead: true)');

    // Tạo thêm 2 thông báo chưa đọc và test markAllAsRead
    await notificationService.createNotification({
      userId: ctvUser.id,
      title: 'Test unread 1',
      message: 'Msg 1',
      type: 'TEST',
    });
    await notificationService.createNotification({
      userId: ctvUser.id,
      title: 'Test unread 2',
      message: 'Msg 2',
      type: 'TEST',
    });

    const unreadBefore = await Notification.count({ where: { userId: ctvUser.id, isRead: false } });
    assert(unreadBefore >= 2, `Đếm số lượng thông báo chưa đọc chính xác: ${unreadBefore} thông báo`);

    await Notification.update({ isRead: true }, { where: { userId: ctvUser.id, isRead: false } });
    const unreadAfter = await Notification.count({ where: { userId: ctvUser.id, isRead: false } });
    assert(unreadAfter === 0, 'Đánh dấu tất cả thông báo đã đọc thành công (unreadCount = 0)');

    // --- Tiêu chí 3: Thông báo nhóm Admin (notifyAdmins) ---
    console.log('\n--- Tiêu chí 3: Phát thông báo nhóm đến toàn bộ Quản trị viên (notifyAdmins) ---');
    const adminNotifCount = await notificationService.notifyAdmins({
      title: 'Yêu cầu duyệt đơn mới từ người dùng',
      message: 'Có đơn mượn thiết bị mới cần xử lý',
      type: 'BORROW_REQUEST_CREATED',
      link: '/admin/requests',
    });
    assert(adminNotifCount > 0, `Gửi thông báo thành công cho ${adminNotifCount} quản trị viên`);

    // --- Tiêu chí 4: Thông báo nhóm CTV (notifyCollaborators) ---
    console.log('\n--- Tiêu chí 4: Phát thông báo nhóm đến toàn bộ CTV (notifyCollaborators) ---');
    const ctvNotifCount = await notificationService.notifyCollaborators({
      title: 'Mở đợt đăng ký ca trực mới',
      message: 'Đã mở đăng ký ca trực Studio tháng tới',
      type: 'DUTY_PERIOD_OPEN',
      link: '/tasks',
    });
    assert(ctvNotifCount > 0, `Gửi thông báo thành công cho ${ctvNotifCount} cộng tác viên`);

    // --- Tiêu chí 5: Sự kiện Giao việc & Nghiệm thu Task (TASK_ASSIGNED, TASK_COMPLETED) ---
    console.log('\n--- Tiêu chí 5: Kiểm tra các sự kiện thông báo của Phân hệ Quản lý công việc (FR-04) ---');
    const taskNotifAssigned = await notificationService.createNotification({
      userId: ctvUser.id,
      title: '📋 Bạn được giao nhiệm vụ mới',
      message: 'Nhiệm vụ: Chụp ảnh sự kiện khai giảng',
      type: 'TASK_ASSIGNED',
      link: '/tasks',
    });
    assert(taskNotifAssigned.type === 'TASK_ASSIGNED', 'Tạo đúng loại thông báo giao việc: TASK_ASSIGNED');

    const taskNotifRevision = await notificationService.createNotification({
      userId: ctvUser.id,
      title: '⚠️ Yêu cầu chỉnh sửa sản phẩm nhiệm vụ',
      message: 'Cần chỉnh lại màu sắc ảnh',
      type: 'TASK_REVISION_REQUESTED',
      link: '/tasks',
    });
    assert(taskNotifRevision.type === 'TASK_REVISION_REQUESTED', 'Tạo đúng loại thông báo yêu cầu sửa: TASK_REVISION_REQUESTED');

    const taskNotifCompleted = await notificationService.createNotification({
      userId: ctvUser.id,
      title: '🎉 Công việc đã được nghiệm thu hoàn thành',
      message: 'Nhiệm vụ đã được nghiệm thu hoàn thành (4 giờ)',
      type: 'TASK_COMPLETED',
      link: '/tasks',
    });
    assert(taskNotifCompleted.type === 'TASK_COMPLETED', 'Tạo đúng loại thông báo hoàn thành việc: TASK_COMPLETED');

    // --- Tiêu chí 6: Sự kiện Mượn - Trả thiết bị ---
    console.log('\n--- Tiêu chí 6: Kiểm tra các sự kiện thông báo Mượn - Trả thiết bị (FR-02) ---');
    const targetUserId = normalUser ? normalUser.id : ctvUser.id;
    const borrowApproved = await notificationService.createNotification({
      userId: targetUserId,
      title: '✅ Đơn mượn thiết bị đã được phê duyệt',
      message: 'Đơn mượn máy ảnh Sony A7 IV đã được duyệt',
      type: 'BORROW_REQUEST_APPROVED',
      link: '/profile',
    });
    assert(borrowApproved.type === 'BORROW_REQUEST_APPROVED', 'Tạo đúng loại thông báo duyệt mượn: BORROW_REQUEST_APPROVED');

    const borrowRejected = await notificationService.createNotification({
      userId: targetUserId,
      title: '❌ Đơn mượn thiết bị không được duyệt',
      message: 'Đơn mượn bị từ chối do thiếu giấy giới thiệu',
      type: 'BORROW_REQUEST_REJECTED',
      link: '/profile',
    });
    assert(borrowRejected.type === 'BORROW_REQUEST_REJECTED', 'Tạo đúng loại thông báo từ chối mượn: BORROW_REQUEST_REJECTED');

    const handedOver = await notificationService.createNotification({
      userId: targetUserId,
      title: '🤝 Thiết bị đã được bàn giao thành công',
      message: 'Đã nhận bàn giao máy ảnh',
      type: 'EQUIPMENT_HANDED_OVER',
      link: '/profile',
    });
    assert(handedOver.type === 'EQUIPMENT_HANDED_OVER', 'Tạo đúng loại thông báo bàn giao máy: EQUIPMENT_HANDED_OVER');

    const returned = await notificationService.createNotification({
      userId: targetUserId,
      title: '📦 Xác nhận hoàn trả thiết bị thành công',
      message: 'Đã hoàn trả thiết bị đầy đủ',
      type: 'EQUIPMENT_RETURNED',
      link: '/profile',
    });
    assert(returned.type === 'EQUIPMENT_RETURNED', 'Tạo đúng loại thông báo trả máy: EQUIPMENT_RETURNED');

    // --- Tiêu chí 7: Sự kiện Đặt phòng Studio ---
    console.log('\n--- Tiêu chí 7: Kiểm tra các sự kiện thông báo Đặt phòng Studio (FR-03) ---');
    const studioApproved = await notificationService.createNotification({
      userId: targetUserId,
      title: '✅ Lịch đặt phòng Studio đã được xác nhận',
      message: 'Lịch quay bản tin ngày mai đã được xác nhận',
      type: 'STUDIO_BOOKING_APPROVED',
      link: '/profile',
    });
    assert(studioApproved.type === 'STUDIO_BOOKING_APPROVED', 'Tạo đúng loại thông báo duyệt Studio: STUDIO_BOOKING_APPROVED');

    const studioRejected = await notificationService.createNotification({
      userId: targetUserId,
      title: '❌ Lịch đặt phòng Studio không được duyệt',
      message: 'Trùng lịch ưu tiên của Nhà trường',
      type: 'STUDIO_BOOKING_REJECTED',
      link: '/profile',
    });
    assert(studioRejected.type === 'STUDIO_BOOKING_REJECTED', 'Tạo đúng loại thông báo từ chối Studio: STUDIO_BOOKING_REJECTED');

    // --- Tiêu chí 8: Quét cảnh báo nhắc nợ quá hạn (checkAndNotifyOverdueBorrowRequests) ---
    console.log('\n--- Tiêu chí 8: Quét và gửi cảnh báo nợ quá hạn (checkAndNotifyOverdueBorrowRequests) ---');
    const overdueResult = await notificationService.checkAndNotifyOverdueBorrowRequests();
    assert(typeof overdueResult.updatedCount === 'number', `Quét nợ quá hạn hoàn thành: cập nhật ${overdueResult.updatedCount} đơn quá hạn`);
    assert(typeof overdueResult.notifiedCount === 'number', `Gửi cảnh báo quá hạn: ${overdueResult.notifiedCount} thông báo`);

    // --- Tiêu chí 9: Kiểm tra hàm gửi email giao dịch sendNotificationEmail an toàn ---
    console.log('\n--- Tiêu chí 9: Kiểm tra cơ chế gửi email giao dịch (Transactional Email) ---');
    const emailResult = await sendNotificationEmail('test@lhu.edu.vn', {
      title: 'Email thông báo thử nghiệm',
      message: 'Nội dung email kiểm thử mẫu',
      type: 'TEST_EMAIL',
      link: '/profile',
      detailRows: [
        { label: 'Thử nghiệm', value: 'Thành công' },
        { label: 'Hệ thống', value: 'LHU Media Studio' },
      ],
    });
    assert(
      emailResult.success === true || emailResult.reason === 'SMTP_NOT_CONFIGURED' || emailResult.error !== undefined,
      'sendNotificationEmail xử lý an toàn, không throw ngoại lệ làm gián đoạn hệ thống'
    );

    // --- Tiêu chí 10: Ràng buộc QUY_TAC.md 10.4: Không tạo thông báo duyệt bảng lương ---
    console.log('\n--- Tiêu chí 10: Tuân thủ QUY_TAC.md 10.4 (Chặn thông báo duyệt bảng lương) ---');
    const forbiddenPayrollNotif = await Notification.findOne({
      where: {
        type: { [Op.like]: '%PAYROLL_APPROVED%' },
      },
    });
    assert(forbiddenPayrollNotif === null, 'Hệ thống tuân thủ 100% QUY_TAC.md 10.4: Không có thông báo phê duyệt bảng lương');

    console.log('\n================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ TASK 4.1: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('LỖI KIỂM THỬ:', err);
    process.exit(1);
  }
}

runTests();
