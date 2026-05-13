const db = require('../models/db');

// ==================== 公开接口 ====================

// 获取网站内容（按区块筛选）
const getSiteContent = async (req, res) => {
  try {
    const { section } = req.query;
    let rows;
    if (section) {
      rows = await db.query(
        `SELECT id, section, key, value, type, sort_order FROM site_contents WHERE section = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
        [section]
      );
    } else {
      rows = await db.query(
        `SELECT id, section, key, value, type, sort_order FROM site_contents WHERE is_active = 1 ORDER BY section ASC, sort_order ASC, id ASC`
      );
    }
    // 转为 key-value 对象
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json({ code: 200, data: result });
  } catch (error) {
    console.error('获取网站内容失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取系统设置（按分类筛选）
const getSiteSettings = async (req, res) => {
  try {
    const { category } = req.query;
    let rows;
    if (category) {
      rows = await db.query(
        `SELECT id, category, key, value FROM site_settings WHERE category = ?`,
        [category]
      );
    } else {
      rows = await db.query(
        `SELECT id, category, key, value FROM site_settings ORDER BY category ASC, id ASC`
      );
    }
    // 转为 key-value 对象
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json({ code: 200, data: result });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 一次性获取前端需要的所有配置
const getPublicSiteData = async (req, res) => {
  try {
    // 获取所有设置
    const settingsRows = await db.query(
      `SELECT category, key, value FROM site_settings ORDER BY category ASC, id ASC`
    );
    const settings = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    // 获取所有活跃内容，按 section 分组
    const contentsRows = await db.query(
      `SELECT section, key, value FROM site_contents WHERE is_active = 1 ORDER BY section ASC, sort_order ASC, id ASC`
    );
    const contents = {};
    for (const row of contentsRows) {
      if (!contents[row.section]) {
        contents[row.section] = {};
      }
      contents[row.section][row.key] = row.value;
    }

    res.json({ code: 200, data: { settings, contents } });
  } catch (error) {
    console.error('获取公开站点数据失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 管理接口 ====================

// 获取所有网站内容（按 section 分组）
const getAllSiteContent = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, section, key, value, type, sort_order, is_active, created_at, updated_at FROM site_contents ORDER BY section ASC, sort_order ASC, id ASC`
    );
    // 按 section 分组
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.section]) {
        grouped[row.section] = [];
      }
      grouped[row.section].push(row);
    }
    res.json({ code: 200, data: grouped });
  } catch (error) {
    console.error('获取所有网站内容失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新单条内容
const updateSiteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ code: 400, message: 'value 不能为空' });
    }

    const result = await db.query(
      `UPDATE site_contents SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [value, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: '内容不存在' });
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新网站内容失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 批量更新内容
const batchUpdateSiteContent = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: 'items 不能为空' });
    }

    for (const item of items) {
      if (!item.id || item.value === undefined) continue;
      await db.query(
        `UPDATE site_contents SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [item.value, item.id]
      );
    }

    res.json({ code: 200, message: '批量更新成功' });
  } catch (error) {
    console.error('批量更新网站内容失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新系统设置
const updateSiteSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ code: 400, message: 'settings 不能为空' });
    }

    for (const item of settings) {
      if (!item.category || !item.key) continue;
      await db.query(
        `UPDATE site_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ? AND key = ?`,
        [item.value, item.category, item.key]
      );
    }

    res.json({ code: 200, message: '设置更新成功' });
  } catch (error) {
    console.error('更新系统设置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  getSiteContent,
  getAllSiteContent,
  updateSiteContent,
  batchUpdateSiteContent,
  getSiteSettings,
  updateSiteSettings,
  getPublicSiteData
};
