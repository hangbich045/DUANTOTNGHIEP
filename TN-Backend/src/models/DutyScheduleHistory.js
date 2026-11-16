'use strict';

/**
 * @file models/DutyScheduleHistory.js
 * @description Model ghi nhận lịch sử chỉnh sửa, thay đổi và xóa ca trực Studio (FR-05 & Yêu cầu nghiệp vụ).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DutyScheduleHistory = sequelize.define(
    'DutyScheduleHistory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      periodId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        field: 'period_id',
      },
      shiftId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        field: 'shift_id',
      },
      changedByUserId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'changed_by_user_id',
      },
      action: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['ADD', 'UPDATE', 'DELETE']],
        },
      },
      targetUserId: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        field: 'target_user_id',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      session: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      oldValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'old_value',
      },
      newValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'new_value',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'DutyScheduleHistories',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['period_id'] },
        { fields: ['shift_id'] },
        { fields: ['changed_by_user_id'] },
        { fields: ['target_user_id'] },
        { fields: ['date'] },
      ],
    }
  );

  return DutyScheduleHistory;
};

