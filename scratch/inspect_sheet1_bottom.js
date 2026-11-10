const ExcelJS = require('exceljs');
const path = require('path');

async function inspectSheet1Bottom() {
  const filePath = path.join(__dirname, '..', '1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet1 = workbook.getWorksheet('Sheet1');
  for (let r = 36; r <= 65; r++) {
    const row = sheet1.getRow(r);
    const nonEmpties = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      let val = cell.value;
      if (val && typeof val === 'object') {
        if (val.result !== undefined) val = `formula(${val.formula})=${val.result}`;
        else if (val.text !== undefined) val = val.text;
      }
      nonEmpties.push(`[Col ${colNumber}]: ${val}`);
    });
    if (nonEmpties.length > 0) {
      console.log(`Sheet1 Row ${r}: ` + nonEmpties.join(' | '));
    }
  }
}

inspectSheet1Bottom().catch(console.error);

