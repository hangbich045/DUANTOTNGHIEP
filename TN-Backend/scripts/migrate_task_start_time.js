const { sequelize } = require('../src/config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable('Tasks');

    if (!cols.start_time && !cols.startTime) {
      await sequelize.query('ALTER TABLE Tasks ADD start_time DATETIMEOFFSET NULL;');
      console.log('✅ Added column start_time to Tasks table');
    } else {
      await sequelize.query('ALTER TABLE Tasks ALTER COLUMN start_time DATETIMEOFFSET NULL;');
      console.log('ℹ️ Column start_time updated to DATETIMEOFFSET NULL');
    }

    const updatedCols = await qi.describeTable('Tasks');
    console.log('📋 Updated columns:', Object.keys(updatedCols));
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
