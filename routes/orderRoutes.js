const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderList,
  getOrderDetail,
  adminGetOrders,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由（需要登录）
router.post('/create', authMiddleware, createOrder);
router.get('/my', authMiddleware, getOrderList);
router.get('/detail/:id', authMiddleware, getOrderDetail);
router.put('/cancel/:id', authMiddleware, cancelOrder);

// 管理后台路由
router.get('/admin/list', authMiddleware, adminMiddleware, adminGetOrders);
router.put('/admin/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;
