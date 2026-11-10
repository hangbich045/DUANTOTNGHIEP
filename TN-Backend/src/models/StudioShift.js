'use strict';

/**
 * @file models/StudioShift.js
 * @description Model Sequelize cho bảng StudioShifts (Lịch trực Studio CTV phân hệ FR-05).
 *
 * Nghiệp vụ (FR-05, QUY_TAC.md Mục 6 & 7):
 * - CTV đăng ký ca trực Studio.
 * - Nhân sự xếp lịch, điều phối và xác nhận ca trực (status: CONFIRMED).
 * - Ca trực tiêu chuẩn: 4 giờ/ca (80.000 đồng/ca theo mức cơ bản 20.000 đ/h).
 * - Ca trực hoàn thành (status: COMPLETED) được ghi nhận ký hiệu 'LV' trên Bảng chấm công.
 * - Ca trực tương lai (dù đã CONFIRMED) TUYỆT ĐỐI không được tính tiền trước (TC-04).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudioShift = sequelize.define(
  'StudioShift',
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
      comment: 'ID của CTV trực Studio',
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Ngày trực Studio (YYYY-MM-DD)',
    },

    shiftType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'shift_type',
      validate: {
        isIn: {
          args: [['MORNING', 'AFTERNOON', 'EVENING']],
          msg: 'Ca trực phải là MORNING (Sáng), AFTERNOON (Chiều) hoặc EVENING (Tối)',
        },
      },
      comment: 'MORNING: Sáng (S), AFTERNOON: Chiều (C), EVENING: Tối (T)',
    },

    startTime: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'start_time',
      defaultValue: '07:30',
    },

    endTime: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'end_time',
      defaultValue: '11:30',
    },

    hours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 4.00,
      comment: 'Số giờ trực tiêu chuẩn (4 giờ/ca)',
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'REGISTERED',
      validate: {
        isIn: {
          args: [['REGISTERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']],
          msg: 'Trạng thái ca trực không hợp lệ',
        },
      },
      comment: 'REGISTERED: CTV đăng ký, CONFIRMED: Nhân sự duyệt, COMPLETED: Đã hoàn thành, CANCELLED: Đã hủy',
    },

    attendanceSymbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'LV',
      field: 'attendance_symbol',
      comment: 'Ký hiệu chấm công: LV (Làm việc/trực studio), NL (Nghỉ lễ)',
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ghi chú phân công ca trực',
    },

    confirmedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'confirmed_by_user_id',
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'ID của Nhân sự xác nhận ca trực',
    },
  },
  {
    tableName: 'StudioShifts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['shift_type'] },
    ],
  }
);

module.exports = StudioShift;

