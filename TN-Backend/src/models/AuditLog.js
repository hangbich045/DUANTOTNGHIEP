'use strict';

/**
 * @file models/AuditLog.js
 * @description Model quản lý lịch sử thao tác hệ thống (Audit Logs - FR-09).
 *
 * Yêu cầu nghiệp vụ (FR-09):
 * - Ghi nhận người thực hiện thao tác (userId).
 * - Ghi nhận thời điểm thực hiện (timestamp).
 * - Ghi nhận nội dung hành động (action: thêm, sửa, xóa, duyệt, từ chối, cấp quyền...).
 * - Ghi nhận đối tượng/dữ liệu liên quan (resource, resourceId, details JSON).
 * - Ghi nhận địa chỉ IP và userAgent.
 * - Tuyệt đối không ghi mật khẩu, OTP, JWT token hoặc secret vào log (QUY_TAC.md 11.4).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Khóa chính UUID',
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id',
        comment: 'ID của người dùng thực hiện thao tác',
      },

      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Hành động: CREATE, UPDATE, DELETE, APPROVE, REJECT, ASSIGN_ROLE, TOGGLE_STATUS, HANDOVER, RETURN, CONFIRM_SCHEDULE...',
      },

      resource: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Đối tượng/Tài nguyên: USER, EQUIPMENT, CATEGORY, BORROW_REQUEST, STUDIO_BOOKING, TASK, DUTY_PERIOD, STUDIO_SHIFT, PAYROLL, SYSTEM...',
      },

      resourceId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'resource_id',
        comment: 'ID hoặc mã định danh của đối tượng chịu tác động',
      },

      details: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Nội dung chi tiết thao tác (văn bản tiếng Việt rõ ràng, dễ đọc cho người dùng)',
        get() {
          const raw = this.getDataValue('details');
          if (!raw) return '';
          // Nếu dữ liệu cũ trong DB là JSON string, chuyển sang chuỗi văn bản cho người dùng đọc
          if (typeof raw === 'string' && raw.trim().startsWith('{') && raw.trim().endsWith('}')) {
            try {
              const obj = JSON.parse(raw);
              if (obj.humanReadable) return obj.humanReadable;
              if (obj.description) return obj.description;
              if (obj.method && obj.path) {
                return `Thao tác ${obj.method} trên đường dẫn ${obj.path}${obj.statusCode ? ` (Phản hồi: ${obj.statusCode})` : ''}`;
              }
            } catch (e) {
              return raw;
            }
          }
          return raw;
        },
        set(val) {
          if (val === null || val === undefined) {
            this.setDataValue('details', null);
          } else if (typeof val === 'string') {
            this.setDataValue('details', val);
          } else {
            this.setDataValue('details', String(val));
          }
        },
      },

      ip: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Địa chỉ IP của client thực hiện request',
      },

      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'user_agent',
        comment: 'Thông tin trình duyệt / thiết bị của client',
      },

      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'SUCCESS',
        validate: {
          isIn: [['SUCCESS', 'FAILED']],
        },
        comment: 'Trạng thái thực thi: SUCCESS hoặc FAILED',
      },

      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Thời điểm thực hiện thao tác',
      },
    },
    {
      tableName: 'AuditLogs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['resource'] },
        { fields: ['created_at'] },
        { fields: ['timestamp'] },
        { fields: ['status'] },
      ],
    }
  );

  return AuditLog;
};
