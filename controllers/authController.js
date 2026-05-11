// 用户认证控制器
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const db = require('../models/db');

// 注册
async function register(req, res) {
  try {
    const { phone, password, nickname } = req.body;

    // 参数校验
    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '手机号和密码不能为空' });
    }
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ code: 400, message: '手机号格式不正确' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少6位' });
    }

    // 检查手机号是否已注册
    const existing = await db.findOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) {
      return res.status(400).json({ code: 400, message: '该手机号已注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.insert('users', {
      phone,
      password: hashedPassword,
      nickname: nickname || `KK用户${phone.slice(-4)}`,
      avatar: '',
      last_login_at: new Date(),
    });

    // 生成Token
    const token = generateToken({
      id: result.id,
      phone,
      role: 'user',
    });

    res.json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.id,
          phone,
          nickname: nickname || `KK用户${phone.slice(-4)}`,
          role: 'user',
        },
      },
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 登录
async function login(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '手机号和密码不能为空' });
    }

    // 查找用户
    const user = await db.findOne('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(400).json({ code: 400, message: '用户不存在' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: '密码错误' });
    }

    // 检查账号状态
    if (user.status === 0) {
      return res.status(403).json({ code: 403, message: '账号已被禁用' });
    }

    // 更新最后登录时间
    await db.update('users', { last_login_at: new Date() }, 'id = ?', [user.id]);

    // 生成Token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: user.role,
    });

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          balance: user.balance,
        },
      },
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取当前用户信息
async function getProfile(req, res) {
  try {
    const user = await db.findOne(
      'SELECT id, phone, nickname, avatar, gender, role, balance, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    // 如果是陪玩师，获取陪玩师信息
    let playerInfo = null;
    if (user.role === 'player') {
      playerInfo = await db.findOne(
        'SELECT * FROM players WHERE user_id = ?',
        [user.id]
      );

      if (playerInfo) {
        // 获取擅长的游戏
        const games = await db.findAll(
          `SELECT g.*, pg.level FROM player_games pg
           JOIN games g ON pg.game_id = g.id
           WHERE pg.player_id = ?`,
          [playerInfo.id]
        );
        playerInfo.games = games;
        try { playerInfo.tags = JSON.parse(playerInfo.tags || '[]'); } catch(e) { playerInfo.tags = []; }
      }
    }

    res.json({
      code: 200,
      data: { ...user, playerInfo },
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

module.exports = { register, login, getProfile };
