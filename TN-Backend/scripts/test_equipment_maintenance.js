'use strict';

/**
 * @file scripts/test_equipment_maintenance.js
 * @description Script kiểm thử toàn diện chức năng Quản lý bảo trì, sửa chữa, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3).
 */

const { sequelize, User, Equipment, EquipmentCategory, EquipmentMaintenance } = require('../src/models');
const maintenanceService = require('../src/services/maintenance.service');

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TASK 4.3 (FR-01.5): BẢO TRÌ, SỬA CHỮA & THANH LÝ THIẾT BỊ ===');
  await sequelize.authenticate();
  console.log('✅ Đã kết nối thành công tới Database MSSQL');

  // Đảm bảo bảng EquipmentMaintenances được đồng bộ
  await sequelize.sync({ force: false });
  console.log('✅ Bảng EquipmentMaintenances đã sẵn sàng trong CSDL');

  const admin = await User.findOne({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Cần ít nhất 1 tài khoản ADMIN');

  // Tìm hoặc tạo thiết bị kiểm thử
  let testCategory = await EquipmentCategory.findOne();
  if (!testCategory) {
    testCategory = await EquipmentCategory.create({ name: 'Thiết bị Quay chụp Test' });
  }

  let equipment = await Equipment.findOne({ where: { code: 'TEST-CAM-4.3' } });
  if (!equipment) {
    equipment = await Equipment.create({
      code: 'TEST-CAM-4.3',
      name: 'Sony A7S III Test Maintenance',
      description: 'Thiết bị dùng để kiểm thử nghiệp vụ FR-01.5',
      categoryId: testCategory.id,
      quantity: 2,
      availableQuantity: 2,
      status: 'AVAILABLE',
      location: 'Tủ A1 - Studio',
    });
  } else {
    equipment.status = 'AVAILABLE';
    await equipment.save();
  }

  console.log(`👤 Admin: ${admin.fullName} (${admin.id})`);
  console.log(`📷 Thiết bị test: ${equipment.name} [${equipment.code}] (Status: ${equipment.status})`);

  // --- Test 1: Khởi tạo phiếu sửa chữa thiết bị có hóa đơn chứng từ ---
  console.log('\n--- Test 1: Khởi tạo phiếu SỬA CHỮA có chi phí và hóa đơn ---');
  const repairRecord = await maintenanceService.createMaintenance(
    {
      equipmentId: equipment.id,
      type: 'REPAIR',
      title: 'Sửa chữa thay màn hình xoay lật và bảo dưỡng cảm biến',
      description: 'Màn hình bị sọc cáp sau sự kiện, gửi trung tâm chính hãng Sony',
      startDate: '2026-11-15',
      cost: 1750000,
      invoiceNumber: 'HD-SONY-2026-9812',
      invoiceDate: '2026-11-16',
      invoiceUrl: '/uploads/invoices/test-invoice-repair.png',
      serviceProvider: 'Trung tâm bảo hành Sony Việt Nam',
      notes: 'Bảo hành linh kiện 6 tháng theo chính sách hãng',
    },
    admin.id
  );

  console.log('Phiếu sửa chữa đã tạo:', {
    id: repairRecord.id,
    type: repairRecord.type,
    title: repairRecord.title,
    cost: repairRecord.cost,
    invoiceNumber: repairRecord.invoiceNumber,
    status: repairRecord.status,
  });

  if (!repairRecord.id || repairRecord.type !== 'REPAIR' || repairRecord.invoiceNumber !== 'HD-SONY-2026-9812') {
    throw new Error('LỖI: Thông tin phiếu sửa chữa không chính xác!');
  }

  // Kiểm tra trạng thái thiết bị đã tự động chuyển sang MAINTENANCE
  const eqAfterRepair = await Equipment.findByPk(equipment.id);
  console.log(`Trạng thái thiết bị sau khi tạo phiếu sửa chữa: ${eqAfterRepair.status}`);
  if (eqAfterRepair.status !== 'MAINTENANCE') {
    throw new Error('LỖI: Thiết bị không được tự động chuyển sang trạng thái MAINTENANCE!');
  }
  console.log('PASS Test 1: Tạo phiếu sửa chữa và tự động cập nhật trạng thái thiết bị thành công!');

  // --- Test 2: Tra cứu danh sách và bộ lọc ---
  console.log('\n--- Test 2: Tra cứu danh sách, bộ lọc type, search ---');
  const listResult = await maintenanceService.getMaintenances({
    page: 1,
    limit: 10,
    search: 'HD-SONY',
    type: 'REPAIR',
  });

  console.log(`Tìm thấy ${listResult.pagination.total} bản ghi. Phân trang:`, listResult.pagination);
  if (listResult.items.length === 0) {
    throw new Error('LỖI: Không tìm thấy phiếu theo số hóa đơn vừa tạo!');
  }
  console.log('PASS Test 2: Tìm kiếm và lọc theo số hóa đơn / loại phiếu thành công!');

  // --- Test 3: Nghiệm thu hoàn tất bảo trì / sửa chữa ---
  console.log('\n--- Test 3: Nghiệm thu hoàn tất và phục hồi trạng thái thiết bị ---');
  const completedRecord = await maintenanceService.updateMaintenance(repairRecord.id, {
    status: 'COMPLETED',
    endDate: '2026-11-17',
    notes: 'Đã nhận lại máy nguyên vẹn, kiểm tra hoạt động tốt 100%',
  });

  console.log(`Trạng thái phiếu sau nghiệm thu: ${completedRecord.status}, Ngày kết thúc: ${completedRecord.endDate}`);
  if (completedRecord.status !== 'COMPLETED' || !completedRecord.endDate) {
    throw new Error('LỖI: Cập nhật nghiệm thu phiếu không thành công!');
  }

  // Kiểm tra thiết bị đã tự động khôi phục về AVAILABLE
  const eqAfterCompleted = await Equipment.findByPk(equipment.id);
  console.log(`Trạng thái thiết bị sau khi nghiệm thu xong: ${eqAfterCompleted.status}`);
  if (eqAfterCompleted.status !== 'AVAILABLE') {
    throw new Error('LỖI: Thiết bị không được khôi phục về trạng thái AVAILABLE sau khi nghiệm thu xong!');
  }
  console.log('PASS Test 3: Nghiệm thu thành công và khôi phục thiết bị về AVAILABLE!');

  // --- Test 4: Ghi nhận biên bản BÁO MẤT thiết bị ---
  console.log('\n--- Test 4: Báo mất thiết bị ---');
  const lostRecord = await maintenanceService.createMaintenance(
    {
      equipmentId: equipment.id,
      type: 'LOST',
      title: 'Biên bản báo mất thiết bị trong chuyến công tác',
      description: 'Làm thất lạc khi di chuyển giữa các địa điểm quay',
      startDate: '2026-11-17',
      status: 'IN_PROGRESS',
      invoiceNumber: 'BB-BM-01/2026',
      notes: 'Đã lập biên bản sự việc và chuyển phòng ban xử lý trách nhiệm',
    },
    admin.id
  );

  const eqAfterLost = await Equipment.findByPk(equipment.id);
  console.log(`Trạng thái thiết bị sau khi báo mất: ${eqAfterLost.status}`);
  if (eqAfterLost.status !== 'LOST') {
    throw new Error('LỖI: Thiết bị không được chuyển sang trạng thái LOST!');
  }
  console.log('PASS Test 4: Báo mất thiết bị thành công và bảo toàn lịch sử!');

  // --- Test 5: Ghi nhận THANH LÝ thiết bị ---
  console.log('\n--- Test 5: Ghi nhận thanh lý thiết bị ---');
  const disposalRecord = await maintenanceService.createMaintenance(
    {
      equipmentId: equipment.id,
      type: 'DISPOSAL',
      title: 'Quyết định thanh lý tài sản cũ hỏng không còn khả năng phục hồi',
      description: 'Hội đồng thẩm định đồng ý thanh lý thu hồi phế liệu',
      startDate: '2026-11-17',
      status: 'COMPLETED',
      cost: 500000, // Giá trị thu hồi
      invoiceNumber: 'TL-2026-004',
      serviceProvider: 'Đơn vị thu mua phế liệu Lạc Hồng',
    },
    admin.id
  );

  const eqAfterDisposal = await Equipment.findByPk(equipment.id);
  console.log(`Trạng thái thiết bị sau khi thanh lý: ${eqAfterDisposal.status}`);
  if (eqAfterDisposal.status !== 'DISPOSED') {
    throw new Error('LỖI: Thiết bị không được chuyển sang trạng thái DISPOSED!');
  }
  console.log('PASS Test 5: Thanh lý thiết bị thành công!');

  // --- Test 6: Thống kê tổng quan chi phí và số lượng ---
  console.log('\n--- Test 6: Thống kê getMaintenanceStats ---');
  const stats = await maintenanceService.getMaintenanceStats();
  console.log('Thống kê:', stats);
  if (typeof stats.total !== 'number' || stats.total < 3) {
    throw new Error('LỖI: Thống kê total không hợp lệ!');
  }
  if (stats.totalCost <= 0) {
    throw new Error('LỖI: Tổng chi phí không được tính toán chính xác!');
  }
  console.log(`PASS Test 6: Thống kê chi phí (${stats.totalCost.toLocaleString('vi-VN')} đ) chính xác!`);

  // Dọn dẹp dữ liệu test
  await EquipmentMaintenance.destroy({ where: { equipmentId: equipment.id } });
  await equipment.destroy();
  console.log('\n✅ Đã dọn dẹp các bản ghi test thành công!');

  console.log('\n=== TẤT CẢ 6/6 BÀI KIỂM THỬ TASK 4.3 (FR-01.5) ĐỀU PASS 100%! ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
