const express = require('express');
const router = express.Router();
const {
  createRecharge,
  simulatePay,
  getWalletInfo,
  adminGetTransactions,
} = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由（需要登录）
router.post('/recharge', authMiddleware, createRecharge);     // 发起充值
router.post('/simulate-pay', authMiddleware, simulatePay);    // 模拟支付确认
router.get('/wallet', authMiddleware, getWalletInfo);          // 钱包信息

// 管理后台路由
router.get('/admin/transactions', authMiddleware, adminMiddleware, adminGetTransactions);

module.exports = router;
