'use strict';

/**
 * @file config/swagger.js
 * @description Cấu hình Swagger (OpenAPI 3.0) cho tự động sinh tài liệu API.
 *
 * swagger-jsdoc: Đọc JSDoc comment trong code và tạo spec JSON.
 * swagger-ui-express: Render trang UI đẹp tại /api-docs từ spec JSON.
 */

const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Định nghĩa thông tin chung của API (OpenAPI Specification)
const options = {
  definition: {
    openapi: '3.0.0', // Phiên bản OpenAPI
    info: {
      title: '📋 LHU Media Studio — REST API Documentation',
      version: '3.0.0',
      description: `
## Tài liệu API đầy đủ — Hệ thống LHU Media Studio (FR-01 → FR-09)

### Tech Stack
- **Node.js + Express.js**: REST API server (JWT RBAC + Audit Logs + Transaction Concurrency Locks)
- **Sequelize ORM + SQL Server (MSSQL)**: Database với khóa ứng dụng \`sp_getapplock\` chống race condition
- **JWT + bcryptjs**: Xác thực & phân quyền 3 vai trò
- **Cloudinary / Local Uploads**: Upload hình ảnh, video và hóa đơn chứng từ
- **Nodemailer + Gmail SMTP**: Email OTP xác thực & thông báo giao dịch
- **ExcelJS**: 9 endpoint xuất báo cáo \`.xlsx\` có công thức thực

### Cách xác thực:
1. Đăng nhập qua \`POST /api/auth/login\` để lấy JWT token.
2. Nhấn nút **Authorize** (🔓) ở trên cùng, nhập \`Bearer <token>\`.
3. Tất cả API có 🔒 sẽ tự động gửi token.

### Phân quyền (RBAC — 3 vai trò):
- **Public** ❌: Không cần đăng nhập (\`/api/homepage\`, \`/api/auth/login\`, \`/api/auth/register\`, \`/health\`)
- **User (Người dùng)** ✅: Mượn thiết bị, đặt phòng Studio, hồ sơ, thông báo, chế độ sáng/tối
- **Collaborator (CTV)** 🎓: Toàn bộ quyền User + công việc được giao, khai báo việc ngoài, đăng ký ca trực, xem lịch tuần & tổng hợp công việc cá nhân
- **Admin (Quản trị viên)** 🔐: Toàn quyền quản trị thiết bị, bảo trì, duyệt đơn, giao việc, xếp ca trực, chấm công, bảng lương, thống kê, xuất Excel và lịch sử thao tác
      `,
      contact: {
        name: 'LHU Media Studio Backend',
        email: 'hangbich045@gmail.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: '🖥️ Local Development Server',
      },
    ],
    // Định nghĩa scheme bảo mật JWT (Bearer Token)
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT token nhận được sau khi đăng nhập. Ví dụ: `Bearer eyJhbGci...`',
        },
      },
    },
    // Áp dụng bảo mật mặc định cho tất cả API (có thể override ở từng endpoint)
    security: [{ BearerAuth: [] }],
  },

  // Đường dẫn chuẩn POSIX (forward slashes) để glob trong swagger-jsdoc quét chính xác 100% trên cả Windows & Linux
  apis: [
    path.join(__dirname, '../routes/*.js').replace(/\\/g, '/'),
    path.join(__dirname, '../controllers/*.js').replace(/\\/g, '/'),
  ],
};

// Tạo spec JSON từ JSDoc comments
const swaggerSpec = swaggerJsdoc(options);

/**
 * Hàm thiết lập Swagger UI cho Express app
 * @param {import('express').Application} app - Express application instance
 */
const setupSwagger = (app) => {
  // Trang Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true, // Hiển thị thanh tìm kiếm
      customSiteTitle: 'TN-Backend API Docs',
      customCss: `
        .swagger-ui .topbar { background-color: #1a1a2e; }
        .swagger-ui .topbar-wrapper img { display: none; }
        .swagger-ui .topbar-wrapper::before {
          content: '📋 TN-Backend API';
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
        }
      `,
    })
  );

  // Endpoint trả về spec JSON (dùng để import vào Postman)
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📄 Swagger UI: http://localhost:${process.env.PORT || 5000}/api-docs`);
};

module.exports = { setupSwagger };
