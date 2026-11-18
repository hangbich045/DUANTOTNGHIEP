'use strict';

/**
 * @file models/Notification.js
 * @description Model quản lý thông báo in-app cho người dùng, CTV và Admin (FR-07).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.CHAR(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'user_id',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'SYSTEM',
      },
      link: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_read',
      },
      senderName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'sender_name',
      },
      recipientEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'recipient_email',
      },
      emailStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'email_status',
      },
      emailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'email_sent_at',
      },
      emailError: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'email_error',
      },
      emailRetryCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'email_retry_count',
      },
      emailMessageId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'email_message_id',
      },
      emailMetadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'email_metadata',
      },
    },
    {
      tableName: 'Notifications',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['user_id', 'is_read'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['email_status'],
        },
      ],
    }
  );

  return Notification;
};

