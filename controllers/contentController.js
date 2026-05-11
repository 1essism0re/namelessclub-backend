const db = require('../models/db');

// ==================== 客户端接口 ====================

// 获取轮播图列表
const getBanners = async (req, res) => {
  try {
    const banners = await db.findAll('banners', { is_active: 1 }, 'sort_order ASC');
    res.json({ code: 200, data: banners });
  } catch (error) {
    console.error('获取轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取公告列表
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await db.findAll('announcements', { is_active: 1 }, 'created_at DESC');
    res.json({ code: 200, data: announcements });
  } catch (error) {
    console.error('获取公告失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 管理后台接口 ====================

// 获取所有轮播图
const adminGetBanners = async (req, res) => {
  try {
    const banners = await db.findAll('banners', {}, 'sort_order ASC');
    res.json({ code: 200, data: banners });
  } catch (error) {
    console.error('获取轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 创建轮播图
const adminCreateBanner = async (req, res) => {
  try {
    const { title, image, link, sort_order } = req.body;

    if (!title || !image) {
      return res.status(400).json({ code: 400, message: '标题和图片不能为空' });
    }

    const result = await db.insert('banners', {
      title,
      image,
      link: link || '',
      sort_order: sort_order || 0,
      is_active: 1
    });

    res.json({ code: 200, message: '创建成功', data: { id: result.id } });
  } catch (error) {
    console.error('创建轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新轮播图
const adminUpdateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, link, sort_order, is_active } = req.body;

    const banner = await db.findOne('banners', { id });
    if (!banner) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (image !== undefined) updateData.image = image;
    if (link !== undefined) updateData.link = link;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db.update('banners', updateData, { id });
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 删除轮播图
const adminDeleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete('banners', { id });
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取所有公告
const adminGetAnnouncements = async (req, res) => {
  try {
    const announcements = await db.findAll('announcements', {}, 'created_at DESC');
    res.json({ code: 200, data: announcements });
  } catch (error) {
    console.error('获取公告失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 创建公告
const adminCreateAnnouncement = async (req, res) => {
  try {
    const { title, content, type } = req.body;

    if (!title || !content) {
      return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
    }

    const result = await db.insert('announcements', {
      title,
      content,
      type: type || 'system',
      is_active: 1
    });

    res.json({ code: 200, message: '创建成功', data: { id: result.id } });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新公告
const adminUpdateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, is_active } = req.body;

    const announcement = await db.findOne('announcements', { id });
    if (!announcement) {
      return res.status(404).json({ code: 404, message: '公告不存在' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db.update('announcements', updateData, { id });
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 删除公告
const adminDeleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete('announcements', { id });
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
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
};
