const ExcelJS = require('exceljs');
const path = require('path');

async function inspectFormulas() {
  const filePath = path.join(__dirname, '..', '1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet1 = workbook.getWorksheet('Sheet1');
  console.log('--- FORMULAS IN ROWS 6, 7, 8 OF SHEET1 ---');
  for (let r = 6; r <= 8; r++) {
    const row = sheet1.getRow(r);
    for (let c = 34; c <= 42; c++) {
      const cell = row.getCell(c);
      console.log(`Row ${r}, Col ${c} (${cell.address}): value=${JSON.stringify(cell.value)}`);
    }
  }

  console.log('\n--- HEADERS IN ROWS 4 AND 5 OF SHEET1 ---');
  for (let r = 4; r <= 5; r++) {
    const row = sheet1.getRow(r);
    for (let c = 1; c <= 42; c++) {
      const cell = row.getCell(c);
      if (cell.value) {
        console.log(`Row ${r}, Col ${c} (${cell.address}): ${cell.value}`);
      }
    }
  }
}

inspectFormulas().catch(console.error);

