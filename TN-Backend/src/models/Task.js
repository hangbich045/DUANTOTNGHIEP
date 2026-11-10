'use strict';

/**
 * @file models/Task.js
 * @description Model Sequelize cho bảng Tasks (Quản lý công việc phân hệ FR-04).
 *
 * Nghiệp vụ (FR-04, QUY_TAC.md Mục 5):
 * - Nhân sự giao việc cho CTV, đặt deadline.
 * - CTV cập nhật tiến độ, nộp link sản phẩm và upload file minh chứng.
 * - Nhân sự kiểm tra kết quả: có thể yêu cầu chỉnh sửa (REVISION_REQUESTED) hoặc xác nhận hoàn thành (COMPLETED).
 * - CTV có thể tự khai báo công việc phát sinh ngoài hệ thống (isExternal = true).
 * - Luồng trạng thái:
 *     NOT_STARTED -> IN_PROGRESS -> PENDING_APPROVAL -> COMPLETED
 *                                                    -> REVISION_REQUESTED -> IN_PROGRESS
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define(
  'Task',
  {
    // PRIMARY KEY: UUID v4
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Khóa chính UUID tự sinh',
    },

    // Tiêu đề công việc
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Tiêu đề công việc không được để trống' },
        len: { args: [3, 255], msg: 'Tiêu đề công việc phải từ 3 đến 255 ký tự' },
      },
    },

    // Mô tả chi tiết yêu cầu công việc
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // FOREIGN KEY: Người được phân công thực hiện (CTV)
    assignedToUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'assigned_to_user_id',
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'ID của CTV được phân công thực hiện nhiệm vụ',
    },

    // FOREIGN KEY: Người tạo nhiệm vụ (Nhân sự giao việc hoặc CTV tự khai báo ngoài hệ thống)
    createdByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by_user_id',
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'ID của người tạo nhiệm vụ (Admin/Nhân sự hoặc CTV)',
    },

    // Hạn chót hoàn thành nhiệm vụ
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'Thời hạn hoàn thành không hợp lệ' },
      },
    },

    /**
     * Trạng thái công việc:
     * - NOT_STARTED: Chưa thực hiện (mới được giao)
     * - IN_PROGRESS: Đang thực hiện
     * - PENDING_APPROVAL: Chờ duyệt (CTV đã nộp kết quả/minh chứng)
     * - REVISION_REQUESTED: Cần chỉnh sửa (Nhân sự phản hồi yêu cầu làm lại)
     * - COMPLETED: Hoàn thành (Nhân sự đã nghiệm thu xác nhận)
     */
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'NOT_STARTED',
      validate: {
        isIn: {
          args: [['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'REVISION_REQUESTED', 'COMPLETED']],
          msg: 'Trạng thái công việc không hợp lệ',
        },
      },
    },

    // Đường dẫn liên kết kết quả sản phẩm (Google Drive, Figma, Canva, Youtube, v.v.)
    resultLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'result_link',
      validate: {
        isUrlOrEmpty(value) {
          if (value && value.trim() !== '') {
            // Kiểm tra sơ bộ định dạng URL
            const urlPattern = /^(https?:\/\/)/i;
            if (!urlPattern.test(value.trim())) {
              throw new Error('Đường dẫn kết quả phải bắt đầu bằng http:// hoặc https://');
            }
          }
        },
      },
    },

    // Đường dẫn file minh chứng đính kèm (ảnh, tài liệu đã tải lên)
    proofFile: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proof_file',
    },

    // Ý kiến phản hồi / đánh giá từ Nhân sự (khi yêu cầu sửa đổi hoặc nghiệm thu)
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Đánh dấu công việc phát sinh ngoài hệ thống do CTV tự khai báo
    isExternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_external',
      comment: 'true: Công việc phát sinh ngoài hệ thống do CTV tự khai báo',
    },

    // Thời điểm nghiệm thu hoàn thành (dùng phục vụ Bảng công việc tháng và tính thù lao FR-05)
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },

    // Phân loại công việc
    taskType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'task_type',
      comment: 'Loại công việc: Viết content, Quay phim, Dựng clip, Khác, v.v.',
    },

    // Tên loại công việc tùy chỉnh khi chọn taskType = 'Khác'
    otherTaskType: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'other_task_type',
      comment: 'Nội dung loại công việc tự nhập khi chọn Khác',
    },

    // Ngày thực hiện công việc sự vụ (Bảng thống kê công việc tháng)
    executionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'execution_date',
      comment: 'Ngày thực hiện công việc sự vụ (YYYY-MM-DD)',
    },

    // Số giờ thực hiện thực tế (Cột Thực hiện (giờ) trên Bảng thống kê công việc)
    actualHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'actual_hours',
      comment: 'Số giờ thực hiện thực tế phục vụ tính thù lao',
    },

    // Buổi làm việc: 'S' (Sáng), 'C' (Chiều), 'T' (Tối)
    shiftSession: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'shift_session',
      comment: 'Buổi thực hiện công việc sự vụ: S, C, T',
    },

    // Ghi chú công việc sự vụ (Cột Ghi chú trên Bảng thống kê công việc)
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ghi chú thời gian làm việc, sự kiện, địa điểm',
    },

    // Làm ngoài giờ sau 16:30 T2-T7 (hệ số 1.5)
    isOvertime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_overtime',
    },

    // Số giờ làm ngoài giờ sau 16:30 T2-T7
    overtimeHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'overtime_hours',
    },

    // Công việc diễn ra vào Chủ nhật (hệ số 2.0, không nhân chồng)
    isSunday: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_sunday',
    },
  },
  {
    tableName: 'Tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['assigned_to_user_id'] },
      { fields: ['created_by_user_id'] },
      { fields: ['status'] },
      { fields: ['deadline'] },
      { fields: ['is_external'] },
      { fields: ['task_type'] },
      { fields: ['execution_date'] },
    ],
  }
);

module.exports = Task;

