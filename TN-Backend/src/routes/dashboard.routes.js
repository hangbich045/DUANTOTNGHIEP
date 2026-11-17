'use strict';

/**
 * @file routes/dashboard.routes.js
 * @description Dashboard API routes cho Admin.
 */

const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { User, Equipment, BorrowRequest, StudioBooking, EquipmentCategory, Task, MonthlyPayroll } = require('../models');
const userService = require('../services/user.service');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');

const router = Router();

// Tất cả dashboard routes đều yêu cầu ADMIN
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Thống kê và báo cáo dành cho Admin
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: "[ADMIN] Thống kê tổng quan hệ thống"
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Số liệu tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equipment:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     available: { type: integer }
 *                     borrowed: { type: integer }
 *                     maintenance: { type: integer }
 *                 requests:
 *                   type: object
 *                   properties:
 *                     pendingBorrows: { type: integer }
 *                     pendingBookings: { type: integer }
 *                 users:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      totalUsers, totalEquipment, availableEquipment,
      borrowedEquipment, maintenanceEquipment,
      pendingBorrows, pendingBookings,
      totalTasks, notStartedTasks, inProgressTasks,
      pendingApprovalTasks, revisionTasks, completedTasks,
      overdueTasks,
      urgentTasksList,
    ] = await Promise.all([
      User.count(),
      Equipment.count(),
      Equipment.count({ where: { status: 'AVAILABLE' } }),
      Equipment.count({ where: { status: 'BORROWED' } }),
      Equipment.count({ where: { status: 'MAINTENANCE' } }),
      BorrowRequest.count({ where: { status: 'PENDING' } }),
      StudioBooking.count({ where: { status: 'PENDING' } }),
      Task.count(),
      Task.count({ where: { status: 'NOT_STARTED' } }),
      Task.count({ where: { status: 'IN_PROGRESS' } }),
      Task.count({ where: { status: 'PENDING_APPROVAL' } }),
      Task.count({ where: { status: 'REVISION_REQUESTED' } }),
      Task.count({ where: { status: 'COMPLETED' } }),
      Task.count({
        where: {
          status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
          deadline: { [Op.lt]: now, [Op.ne]: null },
        },
      }),
      Task.findAll({
        where: {
          status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] },
          deadline: { [Op.ne]: null },
        },
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'fullName', 'email', 'avatarUrl'] },
        ],
        order: [['deadline', 'ASC']],
        limit: 5,
      }),
    ]);

    // Lấy thông tin bảng lương tháng hiện tại
    let monthlyPayrolls = await MonthlyPayroll.findAll({
      where: { month: currentMonth, year: currentYear },
    });

    // Nếu chưa có dữ liệu trong MonthlyPayrolls của tháng hiện tại, tự động tính toán
    if (monthlyPayrolls.length === 0) {
      try {
        const payrollService = require('../services/payroll.service');
        const calculated = await payrollService.calculateMonthlyPayroll(currentMonth, currentYear);
        if (calculated && Array.isArray(calculated)) {
          monthlyPayrolls = calculated.map((item) => item.payroll).filter(Boolean);
        }
      } catch (payrollErr) {
        console.warn('Dashboard stats payroll calculation fallback:', payrollErr.message);
      }
    }

    let currentMonthTotalAmount = 0;
    let currentMonthHours = 0;
    let collaboratorCount = 0;
    const payrollStatusBreakdown = { DRAFT: 0, CONFIRMED: 0, PAID: 0 };

    if (monthlyPayrolls && monthlyPayrolls.length > 0) {
      for (const p of monthlyPayrolls) {
        const amt = parseFloat(p.totalAmount || 0);
        const hrs = parseFloat(p.totalCalculatedHours || p.totalStandardHours || 0);
        currentMonthTotalAmount += amt;
        currentMonthHours += hrs;
        if (amt > 0 || hrs > 0) {
          collaboratorCount++;
        }
        if (payrollStatusBreakdown[p.status] !== undefined) {
          payrollStatusBreakdown[p.status]++;
        }
      }
      if (collaboratorCount === 0 && monthlyPayrolls.length > 0) {
        collaboratorCount = monthlyPayrolls.length;
      }
    }

    const urgentTasks = (urgentTasksList || []).map((t) => {
      const isOverdue = t.deadline && new Date(t.deadline) < now;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        deadline: t.deadline,
        isOverdue: Boolean(isOverdue),
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              fullName: t.assignee.fullName,
              email: t.assignee.email,
              avatar: t.assignee.avatarUrl || null,
            }
          : null,
      };
    });

    return res.status(200).json({
      equipment: { total: totalEquipment, available: availableEquipment, borrowed: borrowedEquipment, maintenance: maintenanceEquipment },
      requests: { pendingBorrows, pendingBookings },
      users: { total: totalUsers },
      tasks: {
        total: totalTasks,
        notStarted: notStartedTasks,
        inProgress: inProgressTasks,
        pendingApproval: pendingApprovalTasks,
        revisionRequested: revisionTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        urgentTasks,
      },
      payroll: {
        month: currentMonth,
        year: currentYear,
        totalAmount: Math.round(currentMonthTotalAmount),
        totalHours: Math.round(currentMonthHours * 10) / 10,
        collaboratorCount,
        statusBreakdown: payrollStatusBreakdown,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/users:
 *   get:
 *     summary: "[ADMIN] Danh sách tất cả người dùng"
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Mảng users (không có trường password)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/reports:
 *   get:
 *     summary: "[ADMIN] Báo cáo thống kê theo khoảng thời gian"
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [week, month, year, custom]
 *           default: month
 *         description: Khoảng thời gian báo cáo
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (dùng khi range=custom)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (dùng khi range=custom)
 *     responses:
 *       200:
 *         description: Dữ liệu báo cáo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 borrowsCount: { type: integer }
 *                 bookingsCount: { type: integer }
 *                 utilizationRate: { type: number, description: "% thiết bị đang được mượn" }
 *                 topEquipment:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       name: { type: string }
 *                       code: { type: string }
 *                       count: { type: integer }
 *                 chartData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string }
 *                       borrows: { type: integer }
 *                       bookings: { type: integer }
 */
router.get('/reports', async (req, res) => {
  try {
    const { range = 'month', startDate, endDate } = req.query;
    const now = new Date();
    let rangeStart, rangeEnd;

    switch (range) {
      case 'week': {
        const day = now.getDay();
        rangeStart = new Date(now); rangeStart.setDate(now.getDate() - day); rangeStart.setHours(0, 0, 0, 0);
        rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case 'year': {
        rangeStart = new Date(now.getFullYear(), 0, 1);
        rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      }
      case 'custom': {
        if (startDate && endDate) {
          rangeStart = new Date(startDate);
          rangeEnd = new Date(endDate);
          rangeEnd.setHours(23, 59, 59, 999);
        } else {
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeEnd = now;
        }
        break;
      }
      case 'month':
      default: {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      }
    }

    const dateWhere = { created_at: { [Op.between]: [rangeStart, rangeEnd] } };

    const [borrows, bookings, tasks, topRaw, totalEquipment, payrollTrendRows] = await Promise.all([
      BorrowRequest.findAll({
        where: dateWhere,
        include: [
          { model: User, as: 'requester', attributes: ['fullName', 'email', 'employeeCode'] },
          { model: Equipment, as: 'equipment', attributes: ['name', 'code', 'imageUrl', 'categoryId'],
            include: [{ model: EquipmentCategory, as: 'category', attributes: ['name'] }] },
        ],
        order: [['created_at', 'DESC']],
      }),
      StudioBooking.findAll({
        where: dateWhere,
        include: [{ model: User, as: 'booker', attributes: ['fullName', 'email', 'employeeCode'] }],
        order: [['created_at', 'DESC']],
      }),
      Task.findAll({
        where: dateWhere,
        attributes: ['id', 'status', 'deadline', 'created_at', 'createdAt'],
        order: [['created_at', 'DESC']],
      }),
      sequelize.query(`
        SELECT TOP 5
          br.equipment_id,
          COUNT(br.equipment_id) AS [count],
          e.id AS eq_id, e.name AS eq_name, e.code AS eq_code,
          e.image_url AS eq_image, e.category_id,
          ec.name AS cat_name
        FROM BorrowRequests br
        INNER JOIN Equipments e ON e.id = br.equipment_id
        LEFT JOIN EquipmentCategories ec ON ec.id = e.category_id
        WHERE br.created_at BETWEEN :start AND :end
        GROUP BY br.equipment_id, e.id, e.name, e.code, e.image_url, e.category_id, ec.name
        ORDER BY COUNT(br.equipment_id) DESC
      `, { replacements: { start: rangeStart, end: rangeEnd }, type: sequelize.QueryTypes.SELECT }),
      Equipment.count(),
      sequelize.query(`
        SELECT
          [year],
          [month],
          SUM(total_amount) AS totalAmount,
          SUM(total_calculated_hours) AS totalHours,
          COUNT(DISTINCT user_id) AS collaboratorCount
        FROM MonthlyPayrolls
        GROUP BY [year], [month]
        ORDER BY [year] ASC, [month] ASC
      `, { type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);

    const chartMap = {};
    for (const b of borrows) {
      const d = new Date(b.created_at || b.createdAt);
      const key = range === 'year' ? `${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getDate()}/${d.getMonth() + 1}`;
      if (!chartMap[key]) chartMap[key] = { date: key, borrows: 0, bookings: 0, tasks: 0 };
      chartMap[key].borrows++;
    }
    for (const b of bookings) {
      const d = new Date(b.created_at || b.createdAt);
      const key = range === 'year' ? `${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getDate()}/${d.getMonth() + 1}`;
      if (!chartMap[key]) chartMap[key] = { date: key, borrows: 0, bookings: 0, tasks: 0 };
      chartMap[key].bookings++;
    }

    let tasksCompletedCount = 0;
    let tasksInProgressCount = 0;
    let tasksPendingApprovalCount = 0;
    let tasksOverdueCount = 0;

    for (const t of tasks) {
      if (t.status === 'COMPLETED') tasksCompletedCount++;
      else if (t.status === 'IN_PROGRESS') tasksInProgressCount++;
      else if (t.status === 'PENDING_APPROVAL') tasksPendingApprovalCount++;

      if (t.deadline && new Date(t.deadline) < now && !['COMPLETED', 'CANCELLED'].includes(t.status)) {
        tasksOverdueCount++;
      }

      const d = new Date(t.created_at || t.createdAt);
      const key = range === 'year' ? `${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getDate()}/${d.getMonth() + 1}`;
      if (!chartMap[key]) chartMap[key] = { date: key, borrows: 0, bookings: 0, tasks: 0 };
      chartMap[key].tasks = (chartMap[key].tasks || 0) + 1;
    }

    const chartData = Object.values(chartMap).sort((a, b) => {
      const [dA, mA] = a.date.split('/').map(Number);
      const [dB, mB] = b.date.split('/').map(Number);
      return mA !== mB ? mA - mB : dA - dB;
    });

    const topEquipment = topRaw.map(item => ({
      id: item.eq_id || item.equipment_id,
      name: item.eq_name || '',
      code: item.eq_code || '',
      category: item.cat_name || '',
      image: item.eq_image || '',
      count: parseInt(item.count) || 0,
    }));

    const payrollTrend = (payrollTrendRows || []).map((row) => ({
      year: row.year,
      month: row.month,
      label: `T${row.month}/${row.year}`,
      totalAmount: Math.round(Number(row.totalAmount || 0)),
      totalHours: Math.round(Number(row.totalHours || 0) * 10) / 10,
      collaboratorCount: Number(row.collaboratorCount || 0),
    }));

    const currentBorrowed = await Equipment.count({ where: { status: 'BORROWED' } });
    const utilizationRate = totalEquipment > 0 ? Math.round((currentBorrowed / totalEquipment) * 100) : 0;

    return res.status(200).json({
      borrowsCount: borrows.length,
      bookingsCount: bookings.length,
      tasksCount: tasks.length,
      tasksCompletedCount,
      tasksInProgressCount,
      tasksPendingApprovalCount,
      tasksOverdueCount,
      utilizationRate,
      topEquipment,
      chartData,
      payrollTrend,
    });
  } catch (error) {
    console.error('Dashboard reports error:', error.message);
    return res.status(200).json({
      borrowsCount: 0,
      bookingsCount: 0,
      tasksCount: 0,
      tasksCompletedCount: 0,
      tasksInProgressCount: 0,
      tasksPendingApprovalCount: 0,
      tasksOverdueCount: 0,
      utilizationRate: 0,
      topEquipment: [],
      chartData: [],
      payrollTrend: [],
    });
  }
});

/**
 * @swagger
 * /api/dashboard/users/{id}/role:
 *   put:
 *     summary: "[ADMIN] Thay đổi role của người dùng"
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, USER, COLLABORATOR]
 *     responses:
 *       200:
 *         description: Cập nhật role thành công
 *       400:
 *         description: Role không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'USER', 'COLLABORATOR'].includes(role)) {
      return res.status(400).json({ message: 'Role phải là ADMIN, USER hoặc COLLABORATOR.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    await user.update({ role });
    const { password: _, ...result } = user.toJSON();
    return res.status(200).json({ message: `Đã cập nhật role thành ${role}.`, user: result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/users/{id}:
 *   delete:
 *     summary: "[ADMIN] Xóa hoặc Vô hiệu hóa người dùng (bảo toàn lịch sử dữ liệu)"
 *     tags: [Dashboard]
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

module.exports = router;
