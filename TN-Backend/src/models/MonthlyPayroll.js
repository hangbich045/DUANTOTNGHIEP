'use strict';

/**
 * @file models/MonthlyPayroll.js
 * @description Model Sequelize cho bảng MonthlyPayrolls (Bảng tổng hợp tiền công và thù lao tháng CTV FR-05).
 *
 * Nghiệp vụ (FR-05, QUY_TAC.md Mục 7 & 8, Sheet1 Excel):
 * - Đơn giá cơ bản: 20.000 VNĐ/giờ.
 * - Ca trực Studio: 4 giờ/ca tiêu chuẩn.
 * - Sự vụ sau 16:30 T2-T7: hệ số 1.5.
 * - Sự vụ Chủ nhật: hệ số 2.0.
 * - Chủ nhật sau 16:30: chỉ tính hệ số 2.0 (không nhân chồng 1.5 x 2.0) (TC-06).
 * - Không tính việc chưa COMPLETED (TC-03).
 * - Không tính ca trực tương lai (TC-04).
 * - Không tính trùng thời gian giữa ca trực Studio và sự vụ sự kiện (TC-05).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MonthlyPayroll = sequelize.define(
  'MonthlyPayroll',
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

    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Tổng số buổi trực Studio (Cột Sum LV)
    totalShiftCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_shift_count',
      comment: 'Tổng số buổi trực Studio (Sum LV)',
    },

    // Tổng số giờ trực Studio (Cột Giờ LV = Sum LV * 4)
    shiftHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'shift_hours',
      comment: 'Tổng giờ trực Studio (Giờ LV = Sum LV * 4)',
    },

    // Tổng số giờ công việc sự vụ (Cột Giờ SV)
    taskHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'task_hours',
      comment: 'Tổng giờ công việc sự vụ đủ điều kiện thanh toán (Giờ SV)',
    },

    // Số giờ làm ngoài giờ sau 16:30 T2-T7 (hệ số 1.5)
    overtimeHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'overtime_hours',
    },

    // Số giờ làm vào ngày Chủ nhật (hệ số 2.0)
    sundayHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'sunday_hours',
    },

    // Tổng giờ thực tế tiêu chuẩn (Cột Tổng = Giờ LV + Giờ SV)
    totalStandardHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_standard_hours',
      comment: 'Tổng giờ thực tế = Giờ LV + Giờ SV (Cột Tổng trên Sheet1)',
    },

    // Tổng giờ quy đổi sau khi áp dụng hệ số 1.5 và 2.0
    totalCalculatedHours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_calculated_hours',
      comment: 'Tổng giờ tính lương sau hệ số',
    },

    // Mức tiền công cơ bản (20.000 VNĐ/giờ)
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 20000.00,
      field: 'hourly_rate',
      comment: 'Đơn giá 20.000 VNĐ/giờ theo quy định',
    },

    // Tổng tiền công (Cột Tiền = Tổng giờ quy đổi * 20.000 VNĐ)
    totalAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount',
      comment: 'Tổng tiền công (Cột Tiền trên Sheet1)',
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: {
          args: [['DRAFT', 'CONFIRMED', 'PAID']],
          msg: 'Trạng thái bảng lương phải là DRAFT, CONFIRMED hoặc PAID',
        },
      },
      comment: 'DRAFT: Bản nháp, CONFIRMED: Đã đối soát xác nhận, PAID: Đã thanh toán',
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'calculated_at',
    },
  },
  {
    tableName: 'MonthlyPayrolls',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'month', 'year'] },
      { fields: ['month', 'year'] },
    ],
  }
);

module.exports = MonthlyPayroll;

