'use strict';

/**
 * @file utils/dbLock.util.js
 * @description Helper dùng chung để xin khóa ứng dụng độc quyền (sp_getapplock) trong Transaction SQL Server,
 * ngăn chặn race condition khi nhiều yêu cầu cập nhật cùng một tài nguyên (thiết bị, phòng Studio) đồng thời.
 */

/**
 * Xin khóa độc quyền trong phạm vi Transaction hiện tại trên SQL Server (MSSQL).
 * Không làm gì nếu dialect không phải mssql (ví dụ unit test mock).
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string} resourceKey - Khóa tài nguyên duy nhất (tối đa 255 ký tự)
 * @param {import('sequelize').Transaction} transaction - Transaction đang mở
 * @param {number} [timeoutMs=10000] - Thời gian chờ khóa (ms)
 */
const acquireAppLock = async (sequelize, resourceKey, transaction, timeoutMs = 10000) => {
  if (!sequelize || typeof sequelize.getDialect !== 'function' || sequelize.getDialect() !== 'mssql') {
    return;
  }
  const lockResource = String(resourceKey).slice(0, 200);
  await sequelize.query(
    `DECLARE @res INT; EXEC @res = sp_getapplock @Resource = :lockResource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = :timeoutMs; SELECT @res AS lockResult;`,
    {
      replacements: { lockResource, timeoutMs },
      transaction,
    }
  );
};

module.exports = { acquireAppLock };
