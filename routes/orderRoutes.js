const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderDetail,
  adminGetOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由（需要登录）
router.post('/create', authMiddleware, createOrder);         // 创建订单
router.get('/my', authMiddleware, getMyOrders);               // 我的订单列表
router.get('/detail/:id', authMiddleware, getOrderDetail);    // 订单详情

// 管理后台路由（需要管理员权限）
router.get('/admin/list', authMiddleware, adminMiddleware, adminGetOrders);        // 管理员-订单列表
router.put('/admin/:id/status', authMiddleware, adminMiddleware, updateOrderStatus); // 管理员-更新订单状态

module.exports = router;
