const ExcelJS = require('exceljs');
const path = require('path');

async function inspectMau() {
  const filePath = path.join(__dirname, '..', '1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const mau = workbook.getWorksheet('Mẫu');
  if (!mau) return console.log('No Mẫu sheet');
  console.log('--- SHEET MẪU ---');
  for (let r = 1; r <= 20; r++) {
    const row = mau.getRow(r);
    const nonEmpties = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      let val = cell.value;
      if (val && typeof val === 'object' && val.formula) {
        val = `FORMULA(${val.formula})`;
      }
      nonEmpties.push(`[${cell.address}]: ${val}`);
    });
    if (nonEmpties.length > 0) {
      console.log(`Row ${r}: ` + nonEmpties.join(' | '));
    }
  }
}

inspectMau().catch(console.error);

