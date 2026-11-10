'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize } = require('../src/models');

async function runMigration() {
  try {
    const sqlFile = path.resolve(__dirname, 'add_user_status_column.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    const statements = sqlContent
      .split(/\bGO\b/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      await sequelize.query(stmt);
      console.log(`Executed batch ${i + 1}/${statements.length}`);
    }

    console.log('✅ User status migration executed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

runMigration();

