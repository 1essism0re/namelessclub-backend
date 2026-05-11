const express = require('express');
const router = express.Router();
const {
  getBanners,
  getAnnouncements,
  adminGetBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminGetAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement
} = require('../controllers/contentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 客户端路由
router.get('/banners', getBanners);                        // 轮播图（公开）
router.get('/announcements', getAnnouncements);             // 公告列表（公开）

// 管理后台路由 - 轮播图
router.get('/admin/banners', authMiddleware, adminMiddleware, adminGetBanners);
router.post('/admin/banners', authMiddleware, adminMiddleware, adminCreateBanner);
router.put('/admin/banners/:id', authMiddleware, adminMiddleware, adminUpdateBanner);
router.delete('/admin/banners/:id', authMiddleware, adminMiddleware, adminDeleteBanner);

// 管理后台路由 - 公告
router.get('/admin/announcements', authMiddleware, adminMiddleware, adminGetAnnouncements);
router.post('/admin/announcements', authMiddleware, adminMiddleware, adminCreateAnnouncement);
router.put('/admin/announcements/:id', authMiddleware, adminMiddleware, adminUpdateAnnouncement);
router.delete('/admin/announcements/:id', authMiddleware, adminMiddleware, adminDeleteAnnouncement);

module.exports = router;
