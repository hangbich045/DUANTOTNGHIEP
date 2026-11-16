const { sequelize } = require('../src/config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable('Tasks');
    
    if (!cols.location) {
      await sequelize.query('ALTER TABLE Tasks ADD location NVARCHAR(255) NULL;');
      console.log('✅ Added column location to Tasks');
    } else {
      console.log('ℹ️ Column location already exists');
    }

    if (!cols.campus) {
      await sequelize.query('ALTER TABLE Tasks ADD campus NVARCHAR(100) NULL;');
      console.log('✅ Added column campus to Tasks');
    } else {
      console.log('ℹ️ Column campus already exists');
    }

    if (!cols.room) {
      await sequelize.query('ALTER TABLE Tasks ADD room NVARCHAR(150) NULL;');
      console.log('✅ Added column room to Tasks');
    } else {
      console.log('ℹ️ Column room already exists');
    }

    const updatedCols = await qi.describeTable('Tasks');
    console.log('📋 Updated Tasks columns:', Object.keys(updatedCols));
    console.log('🎉 Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
