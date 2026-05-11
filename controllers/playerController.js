// 陪玩师控制器
const db = require('../models/db');

// 获取陪玩师列表（客户端用）
async function getPlayerList(req, res) {
  try {
    const { game_id, keyword, page = 1, limit = 20 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = (parseInt(page) - 1) * limitNum;

    let sql = `
      SELECT p.*, u.nickname, u.avatar, u.gender
      FROM players p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 1
    `;
    const params = [];

    // 按游戏筛选
    if (game_id) {
      sql += ` AND p.id IN (SELECT player_id FROM player_games WHERE game_id = ?)`;
      params.push(game_id);
    }

    // 关键词搜索
    if (keyword) {
      sql += ` AND (u.nickname LIKE ? OR p.description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 排序：在线优先，评分优先
    sql += ` ORDER BY p.is_online DESC, p.rating DESC`;

    // 分页
    sql += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const players = await db.findAll(sql, params);

    // 为每个陪玩师获取游戏列表
    for (const player of players) {
      try { player.tags = JSON.parse(player.tags || '[]'); } catch(e) { player.tags = []; }
      const games = await db.findAll(
        `SELECT g.id, g.name, g.icon, pg.level FROM player_games pg
         JOIN games g ON pg.game_id = g.id
         WHERE pg.player_id = ?`,
        [player.id]
      );
      player.games = games;
    }

    res.json({
      code: 200,
      data: {
        list: players,
        page: parseInt(page),
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error('获取陪玩师列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取陪玩师详情
async function getPlayerDetail(req, res) {
  try {
    const { id } = req.params;

    const player = await db.findOne(
      `SELECT p.*, u.nickname, u.avatar, u.gender
       FROM players p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!player) {
      return res.status(404).json({ code: 404, message: '陪玩师不存在' });
    }

    try { player.tags = JSON.parse(player.tags || '[]'); } catch(e) { player.tags = []; }

    // 获取游戏列表
    const games = await db.findAll(
      `SELECT g.id, g.name, g.icon, pg.level FROM player_games pg
       JOIN games g ON pg.game_id = g.id
       WHERE pg.player_id = ?`,
      [player.id]
    );
    player.games = games;

    // 获取评价
    const reviews = await db.findAll(
      `SELECT r.*, u.nickname as user_name, u.avatar as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.player_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [player.id]
    );

    res.json({
      code: 200,
      data: { ...player, reviews },
    });
  } catch (err) {
    console.error('获取陪玩师详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 申请成为陪玩师
async function applyPlayer(req, res) {
  try {
    const { price, tags, description, games } = req.body;
    const userId = req.user.id;

    // 检查是否已是陪玩师
    const existing = await db.findOne('SELECT id FROM players WHERE user_id = ?', [userId]);
    if (existing) {
      return res.status(400).json({ code: 400, message: '您已是陪玩师' });
    }

    // 创建陪玩师记录
    const result = await db.insert('players', {
      user_id: userId,
      rating: 5.0,
      order_count: 0,
      price: price || 30,
      tags: JSON.stringify(tags || []),
      description: description || '',
      is_online: 1,
      is_verified: 0,
      status: 1,
    });

    // 关联游戏
    if (games && games.length > 0) {
      for (const g of games) {
        await db.insert('player_games', {
          player_id: result.id,
          game_id: g.game_id,
          level: g.level || '',
        });
      }
    }

    // 更新用户角色
    await db.update('users', { role: 'player' }, 'id = ?', [userId]);

    res.json({
      code: 200,
      message: '申请成功，等待审核',
      data: { playerId: result.id },
    });
  } catch (err) {
    console.error('申请陪玩师失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// ========== 后台管理接口 ==========

// 获取所有陪玩师（后台用，含分页和筛选）
async function adminGetPlayers(req, res) {
  try {
    const { keyword, status, page = 1, limit = 10 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = (parseInt(page) - 1) * limitNum;

    let sql = `
      SELECT p.*, u.nickname, u.phone, u.avatar, u.gender
      FROM players p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      sql += ` AND u.nickname LIKE ?`;
      params.push(`%${keyword}%`);
    }
    if (status !== undefined && status !== '') {
      sql += ` AND p.status = ?`;
      params.push(parseInt(status));
    }

    const total = await db.count(sql.replace('SELECT p.*, u.nickname, u.phone, u.avatar, u.gender', 'SELECT COUNT(*) as count'), params);

    sql += ` ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    const players = await db.findAll(sql, params);

    for (const p of players) {
      try { p.tags = JSON.parse(p.tags || '[]'); } catch(e) { p.tags = []; }
    }

    res.json({
      code: 200,
      data: {
        list: players,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('获取陪玩师列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 后台更新陪玩师
async function adminUpdatePlayer(req, res) {
  try {
    const { id } = req.params;
    const { price, tags, description, status, is_verified } = req.body;

    const data = {};
    if (price !== undefined) data.price = price;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (is_verified !== undefined) data.is_verified = is_verified;

    const result = await db.update('players', data, 'id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '陪玩师不存在' });
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error('更新陪玩师失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 后台删除陪玩师
async function adminDeletePlayer(req, res) {
  try {
    const { id } = req.params;
    await db.delete('players', 'id = ?', [id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('删除陪玩师失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

module.exports = {
  getPlayerList, getPlayerDetail, applyPlayer,
  adminGetPlayers, adminUpdatePlayer, adminDeletePlayer,
};
