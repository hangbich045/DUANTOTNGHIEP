const ExcelJS = require('exceljs');
const path = require('path');

async function inspectBottom() {
  const filePath = path.join(__dirname, '..', '1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const t10 = workbook.getWorksheet('T10.2026');
  console.log(`T10.2026 total rows: ${t10.actualRowCount}`);

  // Find last 20 rows that have content
  for (let r = t10.actualRowCount - 15; r <= t10.actualRowCount + 5; r++) {
    const row = t10.getRow(r);
    const values = [];
    for (let c = 1; c <= 8; c++) {
      values.push(row.getCell(c).value ? String(row.getCell(c).value).trim() : '');
    }
    if (values.some(v => v !== '')) {
      console.log(`T10 Row ${r}: | ` + values.join(' | '));
    }
  }

  const sheet1 = workbook.getWorksheet('Sheet1');
  console.log(`\nSheet1 total rows: ${sheet1.actualRowCount}`);
  for (let r = sheet1.actualRowCount - 15; r <= sheet1.actualRowCount + 5; r++) {
    const row = sheet1.getRow(r);
    const values = [];
    for (let c = 1; c <= 42; c++) {
      values.push(row.getCell(c).value ? String(row.getCell(c).value).trim() : '');
    }
    if (values.some(v => v !== '')) {
      console.log(`Sheet1 Row ${r} (1-5): | ` + values.slice(0, 5).join(' | ') + ' | (34-42): | ' + values.slice(34, 42).join(' | '));
    }
  }
}

inspectBottom().catch(console.error);

