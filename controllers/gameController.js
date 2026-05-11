const db = require('../models/db');

// ==================== 客户端接口 ====================

// 获取游戏列表（所有用户可访问）
const getGameList = async (req, res) => {
  try {
    const games = await db.findAll('games', { is_active: 1 }, 'sort_order ASC');
    res.json({ code: 200, data: games });
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取单个游戏详情
const getGameDetail = async (req, res) => {
  try {
    const game = await db.findOne('games', { id: req.params.id });
    if (!game) {
      return res.status(404).json({ code: 404, message: '游戏不存在' });
    }
    res.json({ code: 200, data: game });
  } catch (error) {
    console.error('获取游戏详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 管理后台接口 ====================

// 获取所有游戏（管理后台）
const adminGetGames = async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = {};
    if (keyword) {
      where = { name: [`%${keyword}%`, 'LIKE'] };
    }
    const games = await db.findAll('games', where, 'sort_order ASC');
    res.json({ code: 200, data: games });
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 创建游戏
const adminCreateGame = async (req, res) => {
  try {
    const { name, icon, cover, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ code: 400, message: '游戏名称不能为空' });
    }

    // 检查游戏名是否已存在
    const existing = await db.findOne('games', { name });
    if (existing) {
      return res.status(400).json({ code: 400, message: '该游戏已存在' });
    }

    const result = await db.insert('games', {
      name,
      icon: icon || '',
      cover: cover || '',
      sort_order: sort_order || 0,
      is_active: 1
    });

    res.json({ code: 200, message: '创建成功', data: { id: result.id } });
  } catch (error) {
    console.error('创建游戏失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新游戏
const adminUpdateGame = async (req, res) => {
  try {
    const { name, icon, cover, sort_order, is_active } = req.body;
    const { id } = req.params;

    const game = await db.findOne('games', { id });
    if (!game) {
      return res.status(404).json({ code: 404, message: '游戏不存在' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (cover !== undefined) updateData.cover = cover;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db.update('games', updateData, { id });
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新游戏失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 删除游戏
const adminDeleteGame = async (req, res) => {
  try {
    const { id } = req.params;

    const game = await db.findOne('games', { id });
    if (!game) {
      return res.status(404).json({ code: 404, message: '游戏不存在' });
    }

    // 检查是否有关联的陪玩师
    const playerGames = await db.findAll('player_games', { game_id: id });
    if (playerGames.length > 0) {
      return res.status(400).json({ code: 400, message: '该游戏下还有陪玩师，无法删除' });
    }

    await db.delete('games', { id });
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除游戏失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  getGameList,
  getGameDetail,
  adminGetGames,
  adminCreateGame,
  adminUpdateGame,
  adminDeleteGame
};
