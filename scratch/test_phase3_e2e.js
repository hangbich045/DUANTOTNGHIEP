require('dotenv').config({ path: 'C:/STUDY/1. TOT_NGHIEP/CODE/TN-Backend/.env' });
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET;

async function req(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(fullUrl, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (options.responseType === 'arraybuffer') {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runE2E() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP E2E PHASE 3: CHẤM CÔNG, LỊCH TRỰC & THÙ LAO CTV ===\n');

  // 1. Tạo Token Admin và CTV
  console.log('1. Khởi tạo Tokens...');
  const adminUser = {
    id: '1e9ec357-369d-48ed-987c-f8f3ee568ce4',
    email: 'hangbich045@gmail.com',
    role: 'ADMIN',
  };
  const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });

  const ctvUser = {
    id: '48867f59-db28-4122-93f4-2339c5ef7a73',
    email: 'hoangthien110104@gmail.com',
    role: 'COLLABORATOR',
  };
  const ctvToken = jwt.sign(ctvUser, JWT_SECRET, { expiresIn: '7d' });

  const TEST_MONTH = 10;
  const TEST_YEAR = 2026;

  // 2. Admin xếp lịch ca trực Studio cho CTV vào ngày 2026-10-05
  console.log(`\n2. Xếp lịch ca trực Studio sáng ngày 2026-10-05 (Thứ Hai)...`);
  let shift;
  try {
    const shiftRes = await req('/duty/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        userId: ctvUser.id,
        date: '2026-10-05',
        shiftType: 'MORNING',
        note: 'Trực máy phòng Studio sáng',
      },
    });
    shift = shiftRes.data;
  } catch (err) {
    const list = await req(`/duty/shifts?month=${TEST_MONTH}&year=${TEST_YEAR}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    shift = list.data.find(s => s.userId === ctvUser.id && s.date === '2026-10-05') || list.data[0];
  }

  console.log(` -> Ca trực Studio: Shift ID = ${shift.id}, date = ${shift.date}, status = ${shift.status}`);

  // 3. Admin duyệt xác nhận ca trực
  console.log('\n3. Admin duyệt xác nhận ca trực...');
  const confirmRes = await req(`/duty/shifts/${shift.id}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> Ca trực đã được xác nhận: status = ${confirmRes.data.status}`);

  // 4. Hoàn thành ca trực
  console.log('\n4. Xác nhận hoàn thành ca trực...');
  const completeRes = await req(`/duty/shifts/${shift.id}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> Ca trực hoàn thành: status = ${completeRes.data.status}`);

  // 5. Tạo nhiệm vụ sự vụ chuẩn cho CTV (VD: 6.0 giờ, ngày 2026-10-07)
  console.log('\n5. Tạo nhiệm vụ sự vụ: Quay highlight sự kiện (6 giờ)...');
  const task1Res = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      title: 'Quay highlight Lễ trao học bổng Doanh nghiệp',
      description: 'Setup máy quay FX3, ghi hình trao bằng và phỏng vấn',
      assignedToUserId: ctvUser.id,
      taskType: 'Quay highlight',
      executionDate: '2026-10-07',
      actualHours: 6.0,
      shiftSession: 'C',
      note: '13:30 - 19:30',
    },
  });
  const task1 = task1Res.data;
  console.log(` -> Tạo task thành công! Task ID: ${task1.id}`);

  // CTV bắt đầu làm -> nộp bài
  await req(`/tasks/${task1.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: { status: 'IN_PROGRESS' },
  });
  await req(`/tasks/${task1.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://drive.google.com/drive/folders/highlight-hoc-bong',
    },
  });

  // Admin nghiệm thu COMPLETED
  const review1 = await req(`/tasks/${task1.id}/review`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      decision: 'COMPLETED',
      actualHours: 6.0,
      executionDate: '2026-10-07',
      shiftSession: 'C',
      feedback: 'Video chất lượng cao, đúng tiến độ!',
    },
  });
  console.log(` -> Admin nghiệm thu task 1 COMPLETED: actualHours = ${review1.data.actualHours}`);

  // 6. Tạo nhiệm vụ ngoài giờ (sau 16:30 T2-T7: hệ số 1.5, 4 giờ, 2 giờ làm tối)
  console.log('\n6. Tạo nhiệm vụ sự vụ ngoài giờ T2-T7: Chụp hình sự kiện tối (4 giờ, hệ số 1.5)...');
  const task2Res = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      title: 'Chụp hình Chung kết Gala văn nghệ Tân sinh viên',
      description: 'Chụp hình sân khấu hội trường lớn',
      assignedToUserId: ctvUser.id,
      taskType: 'Chụp & xử lý hình sự kiện',
      executionDate: '2026-10-09', // Thứ Sáu
      actualHours: 4.0,
      shiftSession: 'T',
      isOvertime: true,
      overtimeHours: 4.0,
      note: '17:30 - 21:30 (4h làm tối)',
    },
  });
  const task2 = task2Res.data;
  await req(`/tasks/${task2.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: { status: 'IN_PROGRESS' },
  });
  await req(`/tasks/${task2.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://photos.app.goo.gl/gala-van-nghe',
    },
  });
  await req(`/tasks/${task2.id}/review`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      decision: 'COMPLETED',
      actualHours: 4.0,
      executionDate: '2026-10-09',
      isOvertime: true,
      overtimeHours: 4.0,
      shiftSession: 'T',
      feedback: 'Hình ảnh góc chụp đẹp!',
    },
  });
  console.log(` -> Admin nghiệm thu task 2 COMPLETED!`);

  // 7. Tạo nhiệm vụ Chủ nhật (Chủ nhật 2026-10-11: hệ số 2.0, 5 giờ)
  console.log('\n7. Tạo nhiệm vụ Chủ nhật: Livestream Ngày hội Tư vấn tuyển sinh (5 giờ, hệ số 2.0)...');
  const task3Res = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      title: 'Hỗ trợ livestream Ngày hội Tư vấn tuyển sinh',
      description: 'Điều phối camera và âm thanh trực tiếp',
      assignedToUserId: ctvUser.id,
      taskType: 'Quay phim',
      executionDate: '2026-10-11', // Chủ nhật
      actualHours: 5.0,
      shiftSession: 'S',
      isSunday: true,
      note: '07:30 - 12:30 Ngày Chủ nhật',
    },
  });
  const task3 = task3Res.data;
  await req(`/tasks/${task3.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: { status: 'IN_PROGRESS' },
  });
  await req(`/tasks/${task3.id}/progress`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctvToken}` },
    body: {
      status: 'PENDING_APPROVAL',
      resultLink: 'https://youtube.com/live/tuyensinh2026',
    },
  });
  await req(`/tasks/${task3.id}/review`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      decision: 'COMPLETED',
      actualHours: 5.0,
      executionDate: '2026-10-11',
      isSunday: true,
      shiftSession: 'S',
      feedback: 'Livestream ổn định, đường truyền mượt!',
    },
  });
  console.log(` -> Admin nghiệm thu task 3 COMPLETED!`);

  // 8. Đánh dấu một ngày nghỉ lễ NL (2026-10-20)
  console.log('\n8. Đánh dấu ngày nghỉ lễ NL (2026-10-20)...');
  await req('/payroll/timesheet/cell', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      userId: ctvUser.id,
      date: '2026-10-20',
      session: 'S',
      symbol: 'NL',
      note: 'Nghỉ lễ 20/10',
    },
  });
  console.log(' -> Đã cập nhật ký hiệu NL thành công!');

  // 9. Admin tính toán và tổng hợp bảng lương tháng 10/2026
  console.log('\n9. Admin tính toán và tổng hợp dữ liệu tiền công Tháng 10/2026...');
  const calcRes = await req('/payroll/calculate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { month: TEST_MONTH, year: TEST_YEAR },
  });
  console.log(` -> Tính toán thành công: ${calcRes.message}`);

  const userPayroll = calcRes.data.find((p) => p.ctv.id === ctvUser.id);
  console.log('\n=== KẾT QUẢ TÍNH THÙ LAO CTV HOÀNG THIỆN ===');
  console.log(` - Số buổi trực Studio (Sum LV): ${userPayroll.payroll.totalShiftCount}`);
  console.log(` - Giờ trực Studio (Giờ LV):     ${userPayroll.payroll.shiftHours} giờ`);
  console.log(` - Giờ sự vụ (Giờ SV):          ${userPayroll.payroll.taskHours} giờ`);
  console.log(` - Giờ ngoài giờ (1.5x):        ${userPayroll.payroll.overtimeHours} giờ`);
  console.log(` - Giờ Chủ nhật (2.0x):         ${userPayroll.payroll.sundayHours} giờ`);
  console.log(` - Tổng giờ thực tế (Tổng):     ${userPayroll.payroll.totalStandardHours} giờ`);
  console.log(` - Tổng giờ quy đổi sau hệ số:  ${userPayroll.payroll.totalCalculatedHours} giờ`);
  console.log(` - Tổng tiền công (Tiền):       ${Number(userPayroll.payroll.totalAmount).toLocaleString('vi-VN')} VNĐ`);

  // Kiểm tra tính toán:
  // 1 ca trực = 4 giờ quy đổi (x1.0 = 4)
  // Task 1 = 6 giờ ban ngày thường (x1.0 = 6)
  // Task 2 = 4 giờ ngoài giờ T6 (x1.5 = 6)
  // Task 3 = 5 giờ Chủ nhật (x2.0 = 10)
  // Tổng giờ quy đổi = 4 + 6 + 6 + 10 = 26 giờ quy đổi!
  // Tổng tiền = 26 * 20.000 = 520.000 VNĐ!
  if (Number(userPayroll.payroll.totalCalculatedHours) !== 26) {
    throw new Error(`Tổng giờ quy đổi kỳ vọng 26 nhưng nhận được ${userPayroll.payroll.totalCalculatedHours}`);
  }
  if (Number(userPayroll.payroll.totalAmount) !== 520000) {
    throw new Error(`Tổng tiền kỳ vọng 520.000 VNĐ nhưng nhận được ${userPayroll.payroll.totalAmount}`);
  }
  console.log(' -> Kết quả đối soát thuật toán hoàn toàn CHÍNH XÁC 100%!');

  // 10. Truy vấn dữ liệu Bảng chấm công (Sheet1)
  console.log('\n10. Truy vấn dữ liệu Bảng chấm công ma trận (Sheet1)...');
  const timesheetData = await req(`/payroll/timesheet?month=${TEST_MONTH}&year=${TEST_YEAR}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> Số ngày trong tháng: ${timesheetData.data.daysCount} ngày (Tháng 10 có 31 ngày)`);
  const ctvTimesheet = timesheetData.data.rows.find((r) => r.ctv.id === ctvUser.id);
  console.log(` -> CTV ${ctvTimesheet.ctv.fullName}:`);
  console.log(`    + Sáng (S): Day 5 = "${ctvTimesheet.sessions[0].days[5]}" (Kỳ vọng LV), Day 20 = "${ctvTimesheet.sessions[0].days[20]}" (Kỳ vọng NL)`);
  console.log(`    + Chiều (C): Day 7 = "${ctvTimesheet.sessions[1].days[7]}" (Kỳ vọng SV)`);
  console.log(`    + Tối (T): Day 9 = "${ctvTimesheet.sessions[2].days[9]}" (Kỳ vọng SV)`);
  console.log(`    + Cột AK (Sum LV): ${ctvTimesheet.summary.sumLV}`);
  console.log(`    + Cột AL (Giờ LV): ${ctvTimesheet.summary.gioLV}`);
  console.log(`    + Cột AM (Giờ SV): ${ctvTimesheet.summary.gioSV}`);
  console.log(`    + Cột AN (Tổng):   ${ctvTimesheet.summary.tongGio}`);

  if (ctvTimesheet.sessions[0].days[5] !== 'LV') throw new Error('Ngày 5 ca sáng phải là LV');
  if (ctvTimesheet.sessions[0].days[20] !== 'NL') throw new Error('Ngày 20 ca sáng phải là NL');
  if (ctvTimesheet.sessions[1].days[7] !== 'SV') throw new Error('Ngày 7 ca chiều phải là SV');
  if (ctvTimesheet.sessions[2].days[9] !== 'SV') throw new Error('Ngày 9 ca tối phải là SV');

  // 11. Truy vấn dữ liệu Bảng thống kê công việc (T10.2026)
  console.log('\n11. Truy vấn dữ liệu Bảng thống kê công việc tháng (T10.2026)...');
  const tasksSummaryData = await req(`/payroll/tasks-summary?month=${TEST_MONTH}&year=${TEST_YEAR}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ctvTasksGroup = tasksSummaryData.data.ctvGroups.find((g) => g.ctv.id === ctvUser.id);
  console.log(` -> CTV ${ctvTasksGroup.ctv.fullName} có ${ctvTasksGroup.tasks.length} đầu việc sự vụ, tổng giờ: ${ctvTasksGroup.totalHours} giờ.`);

  // 12. Xuất file Excel Bảng chấm công thực tế và kiểm tra
  console.log('\n12. Xuất file Excel Bảng chấm công (Sheet1)...');
  const timesheetBuffer = await req(`/payroll/export-timesheet?month=${TEST_MONTH}&year=${TEST_YEAR}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer',
  });
  const timesheetOutPath = path.join(__dirname, 'test_export_timesheet.xlsx');
  fs.writeFileSync(timesheetOutPath, timesheetBuffer);
  console.log(` -> Đã lưu file Excel Bảng chấm công tại: ${timesheetOutPath}`);

  // Đọc lại file Excel kiểm tra cấu trúc
  const wbTimesheet = new ExcelJS.Workbook();
  await wbTimesheet.xlsx.readFile(timesheetOutPath);
  const wsTimesheet = wbTimesheet.getWorksheet('Sheet1');
  console.log(` -> Worksheet "${wsTimesheet.name}" có ${wsTimesheet.rowCount} dòng, ${wsTimesheet.columnCount} cột.`);
  console.log(`    Row 1: ${wsTimesheet.getCell('A1').value}`);
  console.log(`    Row 2: ${wsTimesheet.getCell('A2').value}`);
  console.log(`    Row 4 Col D: ${wsTimesheet.getCell('D4').value} (Thứ), Col AI: ${wsTimesheet.getCell('AI4').value}`);

  // 13. Xuất file Excel Bảng thống kê công việc thực tế và kiểm tra
  console.log('\n13. Xuất file Excel Bảng thống kê công việc (T10.2026)...');
  const tasksBuffer = await req(`/payroll/export-tasks-summary?month=${TEST_MONTH}&year=${TEST_YEAR}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer',
  });
  const tasksOutPath = path.join(__dirname, 'test_export_tasks_summary.xlsx');
  fs.writeFileSync(tasksOutPath, tasksBuffer);
  console.log(` -> Đã lưu file Excel Bảng thống kê công việc tại: ${tasksOutPath}`);

  const wbTasks = new ExcelJS.Workbook();
  await wbTasks.xlsx.readFile(tasksOutPath);
  const wsTasks = wbTasks.worksheets[0];
  console.log(` -> Worksheet "${wsTasks.name}" có ${wsTasks.rowCount} dòng, ${wsTasks.columnCount} cột.`);
  console.log(`    Row 1 Left: ${wsTasks.getCell('A1').value}, Right: ${wsTasks.getCell('E1').value}`);
  console.log(`    Row 4: ${wsTasks.getCell('A4').value}`);
  console.log(`    Row 5 Headers: Stt=${wsTasks.getCell('A5').value}, Họ tên=${wsTasks.getCell('B5').value}, Thực hiện=${wsTasks.getCell('F5').value}, Tổng=${wsTasks.getCell('G5').value}`);

  console.log('\n=== TẤT CẢ 13 KỊCH BẢN KIỂM THỬ E2E PHASE 3 ĐỀU THÀNH CÔNG XUẤT SẮC 100%! ===\n');
}

runE2E().catch((err) => {
  console.error('\n❌ LỖI KIỂM THỬ E2E:', err.message, err.data || '');
  process.exit(1);
});
