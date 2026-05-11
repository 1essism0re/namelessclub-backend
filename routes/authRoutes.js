const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// 公开路由（不需要登录）
router.post('/register', register);   // 用户注册
router.post('/login', login);         // 用户登录

// 需要登录的路由
router.get('/profile', authMiddleware, getProfile);  // 获取当前用户信息

module.exports = router;
