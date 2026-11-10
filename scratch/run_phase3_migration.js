require('dotenv').config({ path: 'C:/STUDY/1. TOT_NGHIEP/CODE/TN-Backend/.env' });
const { sequelize } = require('C:/STUDY/1. TOT_NGHIEP/CODE/TN-Backend/src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const sqlFile = path.join(__dirname, '..', 'TN-Backend', 'scripts', 'add_phase3_tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split by GO
  const batches = sql
    .split(/\bGO\b/i)
    .map(b => b.trim())
    .filter(b => b.length > 0 && !b.startsWith('USE '));

  console.log(`Executing ${batches.length} SQL batches...`);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Executing batch ${i + 1}/${batches.length}...`);
    await sequelize.query(batch);
  }

  console.log('✅ Migration Phase 3 hoàn thành thành công!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  if (err.original && err.original.errors) {
    err.original.errors.forEach(e => console.error('SQL Error:', e.message));
  }
  process.exit(1);
});
