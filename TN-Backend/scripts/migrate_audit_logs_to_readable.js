'use strict';

/**
 * @file scripts/migrate_audit_logs_to_readable.js
 * @description Chuyển đổi toàn bộ các bản ghi AuditLog cũ trong CSDL từ dạng JSON thô sang văn bản tiếng Việt dễ đọc cho người dùng.
 */

const { sequelize, AuditLog } = require('../src/models');
const { formatAuditDescription } = require('../src/services/auditLog.service');

async function migrate() {
  console.log('=== CHUYỂN ĐỔI DỮ LIỆU AUDIT LOGS SANG TIẾNG VIỆT DỄ ĐỌC ===');
  await sequelize.authenticate();
  console.log('✅ Đã kết nối Database MSSQL');

  const logs = await AuditLog.findAll();
  console.log(`Tìm thấy ${logs.length} bản ghi AuditLog trong hệ thống.`);

  let updatedCount = 0;

  for (const log of logs) {
    const rawDetails = log.getDataValue('details');
    if (!rawDetails) continue;

    // Nếu dữ liệu là JSON string hoặc object
    let needsConvert = false;
    let detailsObj = null;

    if (typeof rawDetails === 'string' && (rawDetails.trim().startsWith('{') || rawDetails.trim().startsWith('['))) {
      try {
        detailsObj = JSON.parse(rawDetails);
        needsConvert = true;
      } catch {
        needsConvert = false;
      }
    } else if (typeof rawDetails === 'object') {
      detailsObj = rawDetails;
      needsConvert = true;
    }

    if (needsConvert && detailsObj) {
      const readable = formatAuditDescription({
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: detailsObj,
        status: log.status,
      });

      console.log(`[Log ${log.id}] Chuyển đổi:`);
      console.log(`  Cũ (JSON): ${JSON.stringify(detailsObj).slice(0, 100)}...`);
      console.log(`  Mới (Tiếng Việt): ${readable}\n`);

      log.setDataValue('details', readable);
      await log.save();
      updatedCount++;
    }
  }

  console.log(`✅ Hoàn thành! Đã chuyển đổi thành công ${updatedCount} bản ghi sang tiếng Việt dễ đọc.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Lỗi khi migrate:', err);
  process.exit(1);
});
