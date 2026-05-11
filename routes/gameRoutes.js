const express = require('express');
const router = express.Router();
const {
  getGameList,
  getGameDetail,
  adminGetGames,
  adminCreateGame,
  adminUpdateGame,
  adminDeleteGame
} = require('../controllers/gameController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由
router.get('/list', getGameList);                          // 游戏列表（公开）
router.get('/detail/:id', getGameDetail);                  // 游戏详情（公开）

// 管理后台路由
router.get('/admin/list', authMiddleware, adminMiddleware, adminGetGames);
router.post('/admin', authMiddleware, adminMiddleware, adminCreateGame);
router.put('/admin/:id', authMiddleware, adminMiddleware, adminUpdateGame);
router.delete('/admin/:id', authMiddleware, adminMiddleware, adminDeleteGame);

module.exports = router;
