'use strict';

/**
 * @file models/AttendanceRecord.js
 * @description Model Sequelize cho bảng AttendanceRecords (Bảng chấm công ma trận ngày x buổi FR-05).
 *
 * Nghiệp vụ (FR-05, Sheet1 Excel):
 * - Mỗi CTV có 3 buổi/ngày: 'S' (Sáng), 'C' (Chiều), 'T' (Tối).
 * - Ký hiệu chấm công:
 *     + 'LV': Trực – làm việc tại Studio (4 giờ/buổi)
 *     + 'SV': Làm sự vụ (công việc sự vụ từ Tasks)
 *     + 'NL': Nghỉ lễ
 *     + '': Không làm việc
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttendanceRecord = sequelize.define(
  'AttendanceRecord',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Khóa chính UUID',
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'ID của CTV',
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Ngày chấm công (YYYY-MM-DD)',
    },

    session: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        isIn: {
          args: [['S', 'C', 'T']],
          msg: 'Buổi làm việc phải là S (Sáng), C (Chiều) hoặc T (Tối)',
        },
      },
      comment: 'S: Sáng, C: Chiều, T: Tối',
    },

    symbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '',
      comment: 'Ký hiệu chấm công: LV, SV, NL hoặc rỗng',
    },

    hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Số giờ làm việc tương ứng',
    },

    sourceType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'MANUAL',
      field: 'source_type',
      comment: 'Nguồn phát sinh: STUDIO_SHIFT, TASK, HOLIDAY, MANUAL',
    },

    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'source_id',
      comment: 'ID của StudioShift hoặc Task liên kết',
    },

    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'AttendanceRecords',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'month', 'year'] },
      { fields: ['date'] },
      { fields: ['symbol'] },
    ],
  }
);

module.exports = AttendanceRecord;

