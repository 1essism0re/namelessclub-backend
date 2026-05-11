// 订单控制器
const db = require('../models/db');

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `KK${dateStr}${rand}`;
}

// 创建订单（下单）
async function createOrder(req, res) {
  try {
    const { player_id, game_id, duration = 1, remark = '' } = req.body;
    const userId = req.user.id;

    // 参数校验
    if (!player_id || !game_id) {
      return res.status(400).json({ code: 400, message: '陪玩师和游戏不能为空' });
    }

    // 查询陪玩师信息
    const player = await db.findOne('SELECT * FROM players WHERE id = ? AND status = 1', [player_id]);
    if (!player) {
      return res.status(400).json({ code: 400, message: '陪玩师不存在或已下架' });
    }

    // 查询游戏信息
    const game = await db.findOne('SELECT * FROM games WHERE id = ?', [game_id]);

    // 计算价格
    const totalPrice = player.price * duration;

    // 检查用户余额
    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < totalPrice) {
      return res.status(400).json({ 
        code: 400, 
        message: `余额不足，需要¥${totalPrice}，当前余额¥${user?.balance || 0}` 
      });
    }

    // 扣减用户余额
    await db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [totalPrice, userId]);

    // 创建订单
    const orderNo = generateOrderNo();
    const result = await db.insert('orders', {
      order_no: orderNo,
      user_id: userId,
      player_id: parseInt(player_id),
      game_id: parseInt(game_id),
      game_name: game ? game.name : '',
      duration: parseInt(duration),
      price: totalPrice,
      status: 'pending',
      remark,
    });

    // 创建消费交易记录
    await db.insert('transactions', {
      trade_no: `TX${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      user_id: userId,
      type: 'expense',
      amount: totalPrice,
      status: 'completed',
      description: `订单${orderNo}消费`,
      order_id: result.id,
      completed_at: new Date(),
    });

    // 查询扣款后余额
    const updatedUser = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    res.json({
      code: 200,
      message: '下单成功',
      data: {
        order_id: result.id,
        order_no: orderNo,
        price: totalPrice,
        balance: updatedUser?.balance || 0,
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取我的订单列表
async function getMyOrders(req, res) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, p.price as player_price,
             u1.nickname as player_name, u1.avatar as player_avatar,
             u2.nickname as user_name
      FROM orders o
      JOIN players p ON o.player_id = p.id
      JOIN users u1 ON p.user_id = u1.id
      JOIN users u2 ON o.user_id = u2.id
      WHERE o.user_id = ?
    `;
    const params = [userId];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    const total = await db.count(
      sql.replace('SELECT o.*, p.price as player_price, u1.nickname as player_name, u1.avatar as player_avatar, u2.nickname as user_name', 'SELECT COUNT(*) as count'),
      params
    );

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    sql += ` ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const orders = await db.findAll(sql, params);

    res.json({
      code: 200,
      data: {
        list: orders,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('获取订单列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取订单详情
async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;

    const order = await db.findOne(
      `SELECT o.*, u1.nickname as player_name, u1.avatar as player_avatar,
              u2.nickname as user_name
       FROM orders o
       JOIN players p ON o.player_id = p.id
       JOIN users u1 ON p.user_id = u1.id
       JOIN users u2 ON o.user_id = u2.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    res.json({ code: 200, data: order });
  } catch (err) {
    console.error('获取订单详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// ========== 后台管理接口 ==========

// 获取所有订单
async function adminGetOrders(req, res) {
  try {
    const { status, keyword, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, u1.nickname as player_name, u1.avatar as player_avatar,
             u2.nickname as user_name, u2.phone as user_phone
      FROM orders o
      JOIN players p ON o.player_id = p.id
      JOIN users u1 ON p.user_id = u1.id
      JOIN users u2 ON o.user_id = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (o.order_no LIKE ? OR u1.nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const total = await db.count(
      sql.replace('SELECT o.*, u1.nickname as player_name, u1.avatar as player_avatar, u2.nickname as user_name, u2.phone as user_phone', 'SELECT COUNT(*) as count'),
      params
    );

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    sql += ` ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const orders = await db.findAll(sql, params);

    res.json({
      code: 200,
      data: { list: orders, total, page: parseInt(page), totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('获取订单列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 更新订单状态
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    const validStatuses = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的订单状态' });
    }

    const data = { status };
    if (status === 'accepted') data.accept_at = new Date();
    if (status === 'ongoing') data.start_at = new Date();
    if (status === 'completed') data.end_at = new Date();
    if (status === 'cancelled' && cancel_reason) data.cancel_reason = cancel_reason;

    const result = await db.update('orders', data, 'id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    res.json({ code: 200, message: '订单状态已更新' });
  } catch (err) {
    console.error('更新订单状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

module.exports = {
  createOrder, getMyOrders, getOrderDetail,
  adminGetOrders, updateOrderStatus,
};
