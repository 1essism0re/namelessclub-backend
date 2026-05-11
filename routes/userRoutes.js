const express = require('express');
const router = express.Router();
const {
  adminGetUsers,
  adminUpdateUserStatus,
  getDashboardStats
} = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 管理后台路由
router.get('/admin/list', authMiddleware, adminMiddleware, adminGetUsers);              // 用户列表
router.put('/admin/:id/status', authMiddleware, adminMiddleware, adminUpdateUserStatus); // 更新用户状态
router.get('/admin/dashboard', authMiddleware, adminMiddleware, getDashboardStats);      // 仪表盘统计

module.exports = router;
