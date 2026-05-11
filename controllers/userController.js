const db = require('../models/db');

// ==================== 管理后台接口 ====================

// 获取用户列表
const adminGetUsers = async (req, res) => {
  try {
    const { keyword, role, page = 1, pageSize = 20 } = req.query;
    const limitNum = Number(pageSize);
    const offsetNum = (Number(page) - 1) * limitNum;

    let sql = `SELECT id, phone, nickname, avatar, role, status, balance, created_at FROM users`;
    let countSql = 'SELECT COUNT(*) as total FROM users';
    const params = [];
    const countParams = [];

    if (keyword) {
      sql += ' WHERE (nickname LIKE ? OR phone LIKE ?)';
      countSql += ' WHERE (nickname LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      const prefix = keyword ? ' AND' : ' WHERE';
      sql += `${prefix} role = ?`;
      countSql += `${prefix} role = ?`;
      params.push(role);
      countParams.push(role);
    }

    sql += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const users = await db.query(sql, params);
    const countResult = await db.query(countSql, countParams);

    res.json({
      code: 200,
      data: {
        list: users,
        total: countResult[0]?.total || 0,
        page: Number(page),
        pageSize: limitNum
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 更新用户状态（封禁/解封）
const adminUpdateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({ code: 400, message: '缺少status参数' });
    }

    const user = await db.findOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    // 不能禁用管理员自己
    if (user.role === 'admin' && status === 0) {
      return res.status(400).json({ code: 400, message: '不能禁用管理员账号' });
    }

    await db.update('users', { status }, 'id = ?', [id]);
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取平台统计数据（仪表盘）
const getDashboardStats = async (req, res) => {
  try {
    // 用户总数
    const userCount = await db.count('SELECT COUNT(*) as count FROM users');
    // 陪玩师数量
    const playerCount = await db.query(
      `SELECT COUNT(*) as total FROM players WHERE status = 1`
    );
    // 今日订单数
    const todayOrders = await db.query(
      `SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) = CURDATE()`
    );
    // 总收入
    const totalRevenue = await db.query(
      `SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE status = 'completed'`
    );
    // 今日收入
    const todayRevenue = await db.query(
      `SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE status = 'completed' AND DATE(created_at) = CURDATE()`
    );
    // 最近7天订单趋势
    const orderTrend = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      code: 200,
      data: {
        userCount: userCount,
        playerCount: playerCount[0]?.total || 0,
        todayOrders: todayOrders[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        orderTrend
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  adminGetUsers,
  adminUpdateUserStatus,
  getDashboardStats
};
