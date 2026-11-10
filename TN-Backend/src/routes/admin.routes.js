'use strict';

/**
 * @file routes/admin.routes.js
 * @description Admin-specific routes: quản lý users
 */

const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const router = Router();
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Quản lý người dùng dành cho Admin
 */

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: "[ADMIN] Tạo tài khoản mới (không cần OTP)"
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn B
 *               email:
 *                 type: string
 *                 example: nhanvien@lhu.edu.vn
 *               password:
 *                 type: string
 *                 example: "123456"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN, COLLABORATOR]
 *                 default: USER
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       409:
 *         description: Email đã tồn tại
 *   get:
 *     summary: "[ADMIN] Danh sách người dùng"
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Mảng danh sách users
 */
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!email || !password) {
      return res.status(422).json({ message: 'Email và mật khẩu là bắt buộc.' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email đã tồn tại.' });
    }
    const employeeCode = `EMP${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: name || email.split('@')[0],
      email, password: hashedPassword, employeeCode,
      phone: phone || null, role: role || 'USER', isActive: true,
    });
    const { password: _, ...result } = user.toJSON();
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await authService.getAllUsers(req.query);
    return res.status(200).json(result.items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/toggle-active:
 *   patch:
 *     summary: "[ADMIN] Kích hoạt hoặc khóa tài khoản người dùng"
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng (UUID)
 *     responses:
 *       200:
 *         description: Trạng thái tài khoản đã thay đổi
 *       400:
 *         description: Không thể tự thao tác trên tài khoản của chính mình
 *       404:
 *         description: Người dùng không tồn tại
 */
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const result = await userService.toggleUserActiveStatus(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: "[ADMIN] Xóa hoặc Vô hiệu hóa người dùng (bảo toàn lịch sử dữ liệu)"
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa hoặc vô hiệu hóa thành công
 *       400:
 *         description: Không thể tự thao tác trên chính mình
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const result = await userService.deleteOrDisableUser(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/admin/collaborators:
 *   get:
 *     summary: "[ADMIN] Lấy danh sách Cộng tác viên (COLLABORATOR) chuẩn hóa cho dropdown và bộ lọc"
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [assign, filter]
 *         description: "assign: chỉ lấy CTV Active; filter: lấy tất cả CTV (kể cả Disabled để lọc lịch sử)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, ALL, Locked, Disabled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách CTV chuẩn hóa
 */
router.get('/collaborators', async (req, res) => {
  try {
    const list = await userService.getCollaborators(req.query);
    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
