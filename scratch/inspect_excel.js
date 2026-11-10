const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
  const filePath = path.join(__dirname, '..', '1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('Worksheet names:');
  workbook.eachSheet((sheet, id) => {
    console.log(` - ID: ${id}, Name: "${sheet.name}", RowCount: ${sheet.rowCount}, ColCount: ${sheet.columnCount}`);
  });

  // 1. Inspect sheet T10.2026
  const t10 = workbook.getWorksheet('T10.2026') || workbook.worksheets.find(s => s.name.includes('T10'));
  if (t10) {
    console.log('\n====================================');
    console.log(`INSPECTING SHEET: "${t10.name}"`);
    console.log('====================================');
    for (let r = 1; r <= Math.min(30, t10.rowCount); r++) {
      const row = t10.getRow(r);
      const values = [];
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = `formula(${val.formula})=${val.result}`;
          else if (val.text !== undefined) val = val.text;
          else val = JSON.stringify(val);
        }
        values.push(val !== null && val !== undefined ? String(val).trim() : '');
      }
      if (values.some(v => v !== '')) {
        console.log(`Row ${r}: | ` + values.join(' | '));
      }
    }
  }

  // 2. Inspect sheet Sheet1
  const sheet1 = workbook.getWorksheet('Sheet1') || workbook.worksheets[0];
  if (sheet1) {
    console.log('\n====================================');
    console.log(`INSPECTING SHEET: "${sheet1.name}"`);
    console.log('====================================');
    for (let r = 1; r <= Math.min(35, sheet1.rowCount); r++) {
      const row = sheet1.getRow(r);
      const values = [];
      for (let c = 1; c <= 45; c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = `formula(${val.formula})=${val.result}`;
          else if (val.text !== undefined) val = val.text;
          else val = JSON.stringify(val);
        }
        values.push(val !== null && val !== undefined ? String(val).trim() : '');
      }
      if (values.some(v => v !== '')) {
        console.log(`Row ${r} (Cols 1-10): | ` + values.slice(0, 10).join(' | '));
        console.log(`Row ${r} (Summary Cols 35-42): | ` + values.slice(34, 42).join(' | '));
      }
    }
  }
}

inspect().catch(console.error);

