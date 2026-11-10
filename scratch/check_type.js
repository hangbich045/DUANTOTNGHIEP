require('dotenv').config({ path: 'C:/STUDY/1. TOT_NGHIEP/CODE/TN-Backend/.env' });
const { sequelize } = require('C:/STUDY/1. TOT_NGHIEP/CODE/TN-Backend/src/config/database');

async function check() {
  const [cols] = await sequelize.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE (TABLE_NAME = 'Users' AND COLUMN_NAME = 'id')
       OR (TABLE_NAME = 'Tasks' AND COLUMN_NAME IN ('id', 'assigned_to_user_id'))
  `);
  console.log(cols);
  process.exit(0);
}

check().catch(console.error);

