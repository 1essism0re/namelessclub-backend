const express = require('express');
const router = express.Router();
const {
  getPlayerList,
  getPlayerDetail,
  applyPlayer,
  adminGetPlayers,
  adminUpdatePlayer,
  adminDeletePlayer
} = require('../controllers/playerController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由（需要登录）
router.get('/list', authMiddleware, getPlayerList);           // 陪玩师列表（支持筛选+分页）
router.get('/detail/:id', authMiddleware, getPlayerDetail);   // 陪玩师详情（含评价）
router.post('/apply', authMiddleware, applyPlayer);            // 申请成为陪玩师

// 管理后台路由（需要管理员权限）
router.get('/admin/list', authMiddleware, adminMiddleware, adminGetPlayers);       // 管理员-陪玩师列表
router.put('/admin/:id', authMiddleware, adminMiddleware, adminUpdatePlayer);      // 管理员-审核/编辑陪玩师
router.delete('/admin/:id', authMiddleware, adminMiddleware, adminDeletePlayer);   // 管理员-删除陪玩师

module.exports = router;
