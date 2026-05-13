const express = require('express');
const router = express.Router();
const {
  getSiteContent,
  getAllSiteContent,
  updateSiteContent,
  batchUpdateSiteContent,
  getSiteSettings,
  updateSiteSettings,
  getPublicSiteData
} = require('../controllers/siteController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 公开路由
router.get('/content', getSiteContent);                          // 获取指定区块内容
router.get('/settings', getSiteSettings);                        // 获取系统设置
router.get('/public', getPublicSiteData);                        // 获取所有前端配置

// 管理后台路由
router.get('/content/all', authMiddleware, adminMiddleware, getAllSiteContent);    // 获取所有内容
router.put('/content/batch', authMiddleware, adminMiddleware, batchUpdateSiteContent); // 批量更新内容
router.put('/content/:id', authMiddleware, adminMiddleware, updateSiteContent);    // 更新单条内容
router.put('/settings', authMiddleware, adminMiddleware, updateSiteSettings);      // 更新系统设置

module.exports = router;
