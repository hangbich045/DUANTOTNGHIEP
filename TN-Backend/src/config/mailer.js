'use strict';

/**
 * @file config/mailer.js
 * @description Cấu hình Nodemailer để gửi email OTP qua Gmail SMTP.
 *
 * Biến môi trường cần có:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Lưu ý: Gmail cần bật "App Password" thay vì mật khẩu thường.
 * Hướng dẫn: https://support.google.com/accounts/answer/185833
 */

const nodemailer = require('nodemailer');

// Tạo transporter một lần, tái sử dụng
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // false = STARTTLS (port 587), true = SSL (port 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Cho phép self-signed cert (dev)
  },
});

/**
 * Gửi email OTP xác thực
 * @param {string} to - Email người nhận
 * @param {string} otp - Mã OTP 6 số
 * @param {string} type - 'verify' | 'reset'
 */
async function sendOTPEmail(to, otp, type = 'verify') {
  const isVerify = type === 'verify';
  const subject = isVerify
    ? '🔐 Xác thực tài khoản LHU Media Studio'
    : '🔑 Đặt lại mật khẩu LHU Media Studio';

  const title = isVerify ? 'Xác thực tài khoản' : 'Đặt lại mật khẩu';
  const desc = isVerify
    ? 'Cảm ơn bạn đã đăng ký. Nhập mã OTP bên dưới để xác thực tài khoản:'
    : 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Nhập mã OTP bên dưới:';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#13131a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2540,#284F9E);padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🎬 LHU Media Studio
              </h1>
              <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">${title}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="color:#c8cad0;font-size:15px;margin:0 0 24px;line-height:1.6;">${desc}</p>
              
              <!-- OTP Box -->
              <div style="background:rgba(40,79,158,0.12);border:1px solid rgba(40,79,158,0.3);border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                <p style="color:#8a8d9a;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Mã xác thực OTP</p>
                <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#ffffff;font-family:monospace;">${otp}</div>
                <p style="color:#8a8d9a;font-size:12px;margin:12px 0 0;">⏱ Mã có hiệu lực trong <strong style="color:#ECC354;">10 phút</strong></p>
              </div>

              <p style="color:#8a8d9a;font-size:13px;margin:0;line-height:1.6;">
                Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.03);padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#555;font-size:12px;margin:0;text-align:center;">
                © 2026 LHU Media Studio · Trường Đại học Lạc Hồng
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"LHU Media Studio" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

/**
 * Escape ký tự HTML đặc biệt tránh vỡ bố cục hoặc XSS trong email
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Định dạng thời gian Việt Nam (UTC+7): HH:mm, dd/MM/yyyy
 */
function formatVietnamTimestamp(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  }).format(d);
}

/**
 * Ánh xạ loại thông báo sang tên phân mục tiếng Việt dễ hiểu cho người dùng
 */
function getNotificationCategoryLabel(type = 'SYSTEM') {
  const t = String(type || 'SYSTEM').toUpperCase();
  if (t.startsWith('TASK_')) return 'Quản lý Công việc';
  if (t.startsWith('STUDIO_')) return 'Đặt phòng Studio';
  if (t.startsWith('BORROW_') || t.startsWith('EQUIPMENT_')) return 'Mượn / Trả Thiết bị';
  if (t.startsWith('DUTY_')) return 'Lịch trực Studio';
  return 'Thông báo Hệ thống';
}

/**
 * Kiểm tra cấu hình SMTP hiện có (không trả về mật khẩu)
 */
function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      !process.env.SMTP_USER.includes('example.com')
  );
}

/**
 * Gửi email thông báo giao dịch nghiệp vụ (FR-07)
 * Tái sử dụng cùng transporter SMTP & cấu hình .env với gửi OTP.
 *
 * @param {string} to - Email người nhận
 * @param {Object} data - { title, message, link, type, senderName, recipientName, occurredAt, detailRows }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string, reason?: string }>}
 */
async function sendNotificationEmail(to, data = {}) {
  // Nếu chưa cấu hình SMTP thì ghi nhận và không làm gián đoạn nghiệp vụ
  if (!isSmtpConfigured()) {
    return { success: false, reason: 'SMTP_NOT_CONFIGURED', error: 'Chưa cấu hình SMTP_USER/SMTP_PASS trong biến môi trường .env' };
  }

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { success: false, reason: 'INVALID_RECIPIENT', error: 'Địa chỉ email người nhận không hợp lệ' };
  }

  const {
    title = 'Thông báo mới',
    message = '',
    link = null,
    type = 'SYSTEM',
    senderName = 'Hệ thống LHU Media Studio',
    recipientName = null,
    occurredAt = new Date(),
    detailRows = [],
  } = data;

  const cleanTitle = String(title).trim();
  const categoryLabel = getNotificationCategoryLabel(type);
  const timeStr = formatVietnamTimestamp(occurredAt);
  const subject = `[LHU Media Studio] ${cleanTitle}`;
  const clientUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const fullLink = link
    ? (link.startsWith('http://') || link.startsWith('https://') ? link : `${clientUrl}${link.startsWith('/') ? link : `/${link}`}`)
    : `${clientUrl}/notifications`;

  const metaRows = [
    { label: 'Chức năng', value: categoryLabel },
    { label: 'Người gửi', value: senderName || 'Hệ thống LHU Media Studio' },
    { label: 'Thời gian phát sinh', value: timeStr },
    ...(Array.isArray(detailRows) ? detailRows.filter((r) => r && r.label && r.value !== undefined && r.value !== null && String(r.value).trim() !== '') : []),
  ];

  const rowsHtml = `
    <table width="100%" cellpadding="10" cellspacing="0" style="margin:20px 0;border-collapse:collapse;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tbody>
        ${metaRows
          .map(
            (r) => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="font-weight:600;color:#475569;width:36%;vertical-align:top;padding:10px 14px;">${escapeHtml(r.label)}</td>
            <td style="color:#0f172a;font-weight:500;vertical-align:top;padding:10px 14px;">${escapeHtml(r.value)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;

  const greetingHtml = recipientName
    ? `<p style="color:#334155;font-size:14px;margin:0 0 12px;line-height:1.6;">Xin chào <strong>${escapeHtml(recipientName)}</strong>,</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#eef3fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;border:1px solid #d5dfee;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d3b7a,#284F9E);padding:26px 32px;text-align:left;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);color:#ffffff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:0.4px;text-transform:uppercase;margin-bottom:10px;">
                ${escapeHtml(categoryLabel)}
              </div>
              <h1 style="color:#ffffff;margin:0;font-size:21px;font-weight:800;letter-spacing:-0.3px;">
                LHU Media Studio
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:12px;">
                Bộ phận Truyền thông · Trường Đại học Lạc Hồng
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              ${greetingHtml}
              <h2 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 12px;line-height:1.4;">
                ${escapeHtml(cleanTitle)}
              </h2>
              <p style="color:#334155;font-size:14px;margin:0 0 16px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(message)}</p>

              ${rowsHtml}

              <div style="text-align:center;margin:26px 0 14px;">
                <a href="${escapeHtml(fullLink)}" target="_blank" rel="noopener noreferrer" style="background:#284F9E;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
                  Xem chi tiết trên hệ thống
                </a>
              </div>

              <p style="color:#64748b;font-size:11px;margin:0 0 20px;text-align:center;word-break:break-all;">
                Nếu nút không hoạt động, mở trực tiếp liên kết: <a href="${escapeHtml(fullLink)}" style="color:#284F9E;">${escapeHtml(fullLink)}</a>
              </p>

              <p style="color:#64748b;font-size:12px;margin:0;line-height:1.5;border-top:1px solid #e2e8f0;padding-top:14px;">
                Email này được gửi tự động song song với thông báo trên hệ thống <strong>LHU Media Studio</strong>. Vui lòng không trả lời trực tiếp email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:11px;margin:0;text-align:center;">
                © 2026 LHU Media Studio · Bộ phận Truyền thông · Trường Đại học Lạc Hồng
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"LHU Media Studio" <${process.env.SMTP_USER}>`,
      to: to.trim(),
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[sendNotificationEmail] Gửi email đến ${to} thất bại:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Kiểm tra trạng thái cấu hình & kết nối SMTP thực tế (dùng cho Admin kiểm tra sức khỏe email)
 */
async function getSmtpStatus() {
  const configured = isSmtpConfigured();
  const rawUser = process.env.SMTP_USER || '';
  const maskedUser = rawUser.includes('@')
    ? `${rawUser.slice(0, Math.min(3, rawUser.indexOf('@')))}***${rawUser.slice(rawUser.indexOf('@'))}`
    : '';

  if (!configured) {
    return {
      configured: false,
      connected: false,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      sender: maskedUser || null,
      frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
      error: 'Chưa cấu hình đầy đủ SMTP_USER / SMTP_PASS trong .env',
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      sender: maskedUser,
      frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      sender: maskedUser,
      frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
      error: err.message,
    };
  }
}

/**
 * Kiểm tra kết nối SMTP khi khởi động
 */
async function verifyMailer() {
  try {
    await transporter.verify();
    console.log('✅ SMTP Mailer đã kết nối thành công!');
  } catch (err) {
    console.warn('⚠️  SMTP Mailer không thể kết nối:', err.message);
  }
}

module.exports = {
  transporter,
  sendOTPEmail,
  sendNotificationEmail,
  verifyMailer,
  getSmtpStatus,
  isSmtpConfigured,
  getNotificationCategoryLabel,
  formatVietnamTimestamp,
};
