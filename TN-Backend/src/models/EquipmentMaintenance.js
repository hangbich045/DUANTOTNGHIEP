'use strict';

/**
 * @file models/EquipmentMaintenance.js
 * @description Model quản lý lịch sử bảo trì, sửa chữa theo hóa đơn chứng từ, báo mất và thanh lý thiết bị (FR-01.5 - Task 4.3).
 *
 * Yêu cầu nghiệp vụ (FR-01.5 & QUY_TAC.md 2.2, 2.4):
 * - Theo dõi lịch sử bảo trì định kỳ, sửa chữa sự cố hỏng hóc.
 * - Lưu trữ số hóa đơn, ngày hóa đơn, chi phí và chứng từ/biên bản đính kèm.
 * - Ghi nhận trường hợp báo mất và thanh lý/tiêu hủy thiết bị.
 * - Thiết bị mất hoặc thanh lý vẫn phải giữ lịch sử, không xóa dữ liệu để loại bỏ thiết bị.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentMaintenance = sequelize.define(
    'EquipmentMaintenance',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Khóa chính UUID',
      },

      equipmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'equipment_id',
        references: {
          model: 'Equipments',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID thiết bị được bảo trì / sửa chữa / báo mất / thanh lý',
      },

      type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'MAINTENANCE',
        validate: {
          isIn: {
            args: [['MAINTENANCE', 'REPAIR', 'LOST', 'DISPOSAL']],
            msg: 'Loại thao tác phải là MAINTENANCE (Bảo trì), REPAIR (Sửa chữa), LOST (Báo mất) hoặc DISPOSAL (Thanh lý)',
          },
        },
        comment: 'Loại ghi nhận: MAINTENANCE, REPAIR, LOST, DISPOSAL',
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Tiêu đề phiếu không được để trống' },
          len: { args: [3, 255], msg: 'Tiêu đề phải từ 3 đến 255 ký tự' },
        },
        comment: 'Tiêu đề tóm tắt phiếu bảo trì/sửa chữa/biên bản',
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết nguyên nhân, tình trạng hỏng hóc, linh kiện thay thế',
      },

      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
        defaultValue: DataTypes.NOW,
        comment: 'Ngày bắt đầu gửi bảo trì/sửa chữa hoặc ngày xảy ra sự cố/báo mất/thanh lý',
      },

      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date',
        comment: 'Ngày hoàn thành nghiệm thu bàn giao lại thiết bị',
      },

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'IN_PROGRESS',
        validate: {
          isIn: {
            args: [['IN_PROGRESS', 'COMPLETED', 'CANCELLED']],
            msg: 'Trạng thái phải là IN_PROGRESS, COMPLETED hoặc CANCELLED',
          },
        },
        comment: 'Trạng thái xử lý: IN_PROGRESS (Đang xử lý), COMPLETED (Đã hoàn tất), CANCELLED (Hủy)',
      },

      cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Chi phí bảo dưỡng/sửa chữa hoặc giá trị thu hồi thanh lý (VNĐ)',
      },

      invoiceNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'invoice_number',
        comment: 'Số hóa đơn VAT / Phiếu thu-chi / Mã chứng từ kế toán',
      },

      invoiceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'invoice_date',
        comment: 'Ngày xuất hóa đơn chứng từ',
      },

      invoiceUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'invoice_url',
        comment: 'Đường dẫn ảnh chụp/scan hóa đơn, biên bản bàn giao chứng từ',
      },

      serviceProvider: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'service_provider',
        comment: 'Đơn vị thực hiện sửa chữa / trung tâm bảo hành / đơn vị thu mua thanh lý',
      },

      performedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'performed_by',
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'ID của Quản trị viên / Nhân sự lập phiếu',
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú bổ sung',
      },
    },
    {
      tableName: 'EquipmentMaintenances',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['equipment_id'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['start_date'] },
        { fields: ['invoice_number'] },
      ],
    }
  );

  return EquipmentMaintenance;
};
