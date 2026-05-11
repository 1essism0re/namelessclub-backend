/**
 * KK电竞 后端服务入口文件
 * 
 * 架构说明：
 * app.js 是整个后端的入口，负责：
 * 1. 加载配置 → 2. 初始化中间件 → 3. 挂载路由 → 4. 启动服务器
 * 
 * 请求处理流程：
 * 客户端请求 → Express中间件(CORS/JSON解析) → 路由匹配 → 认证中间件 → 控制器 → 数据库 → 返回响应
 */

require('dotenv').config();  // 第一步：加载 .env 环境变量
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const gameRoutes = require('./routes/gameRoutes');
const contentRoutes = require('./routes/contentRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const voiceRoomRoutes = require('./routes/voiceRoomRoutes');

// 导入配置
const config = require('./config');

const app = express();
const server = http.createServer(app);

// ==================== 第三步：配置中间件 ====================

// CORS 跨域配置 —— 允许前端（开发环境5173端口）访问后端API
app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite 开发服务器
    'http://localhost:5174',   // Vite 备用端口
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true  // 允许发送 Cookie
}));

// 解析请求体 —— 让 req.body 能读取 JSON 格式的请求数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 —— 提供 uploads 目录下的图片等文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志中间件（开发环境）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString('zh-CN');
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });
}

// ==================== 第四步：挂载路由 ====================
// 路由前缀说明：
// /api/auth/*    → 用户认证（注册、登录、个人信息）
// /api/players/* → 陪玩师相关（列表、详情、申请）
// /api/orders/*  → 订单相关（创建、查询、状态更新）
// /api/games/*   → 游戏管理
// /api/content/* → 内容管理（轮播图、公告）
// /api/users/*   → 用户管理（后台）

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/voice-rooms', voiceRoomRoutes);

// 健康检查接口 —— 用于确认服务器是否正常运行
app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: 'KK电竞后端服务运行中',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 处理 —— 所有未匹配的路由返回404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// ==================== 第五步：启动服务器 ====================

const PORT = config.port || 3000;

server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     KK电竞 后端服务已启动            ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  地址: http://localhost:${PORT}          ║`);
  console.log(`║  环境: ${process.env.NODE_ENV || 'development'}                     ║`);
  console.log(`║  API:  http://localhost:${PORT}/api/health ║`);
  console.log('╚══════════════════════════════════════╝');
});

// ==================== WebSocket 实时通信 ====================
const { setupSocketIO } = require('./socket');

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
    ],
    methods: ['GET', 'POST']
  }
});

setupSocketIO(io);

// 导出 io 实例，供其他模块使用
module.exports = { app, server, io };
