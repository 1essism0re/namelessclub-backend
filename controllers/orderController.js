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

    // 查询陪玩师
    const player = await db.findOne(
      'SELECT * FROM players WHERE id = ? AND status = 1',
      [player_id]
    );
    if (!player) {
      return res.status(404).json({ code: 404, message: '陪玩师不存在' });
    }

    // 查询游戏
    const game = await db.findOne('SELECT * FROM games WHERE id = ?', [game_id]);
    if (!game) {
      return res.status(404).json({ code: 404, message: '游戏不存在' });
    }

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
      completed_at: new Date().toISOString(),
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
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取订单列表
async function getOrderList(req, res) {
  try {
    const { status, role = 'user', page = 1, pageSize = 20 } = req.query;
    const userId = req.user.id;
    const limitNum = Number(pageSize);
    const offsetNum = (Number(page) - 1) * limitNum;

    let sql, countSql, params;

    if (role === 'player') {
      // 陪玩师视角 - 查看别人下的订单
      const player = await db.findOne('SELECT id FROM players WHERE user_id = ?', [userId]);
      if (!player) {
        return res.status(400).json({ code: 400, message: '您还不是陪玩师' });
      }

      sql = `
        SELECT o.*, u.nickname as user_nickname, u.avatar as user_avatar, g.name as game_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN games g ON o.game_id = g.id
        WHERE o.player_id = ?
      `;
      countSql = 'SELECT COUNT(*) as count FROM orders WHERE player_id = ?';
      params = [player.id];
    } else {
      // 用户视角 - 查看自己下的订单
      sql = `
        SELECT o.*, p.user_id as player_user_id, u.nickname as player_nickname, u.avatar as player_avatar, g.name as game_name
        FROM orders o
        JOIN players p ON o.player_id = p.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON o.game_id = g.id
        WHERE o.user_id = ?
      `;
      countSql = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
      params = [userId];
    }

    if (status) {
      sql += ' AND o.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }

    sql += ` ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const orders = await db.findAll(sql, params);
    const countResult = await db.query(countSql, params);

    res.json({
      code: 200,
      data: {
        list: orders,
        total: parseInt(countResult[0]?.count) || 0,
        page: Number(page),
        pageSize: limitNum,
      },
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 获取订单详情
async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await db.findOne(
      `SELECT o.*, u.nickname as user_nickname, u.avatar as user_avatar
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    // 检查权限
    const player = await db.findOne('SELECT id FROM players WHERE user_id = ?', [userId]);
    if (order.user_id !== userId && order.player_id !== player?.id) {
      return res.status(403).json({ code: 403, message: '无权查看此订单' });
    }

    // 获取陪玩师信息
    const playerInfo = await db.findOne(
      `SELECT p.*, u.nickname, u.avatar, u.phone
       FROM players p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [order.player_id]
    );

    res.json({
      code: 200,
      data: { ...order, playerInfo },
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 更新订单状态
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const order = await db.findOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    // 检查权限
    const player = await db.findOne('SELECT id FROM players WHERE user_id = ?', [userId]);
    const isPlayer = order.player_id === player?.id;
    const isUser = order.user_id === userId;

    if (!isPlayer && !isUser) {
      return res.status(403).json({ code: 403, message: '无权操作此订单' });
    }

    // 状态流转校验
    const validTransitions = {
      pending: ['accepted', 'cancelled'],
      accepted: ['ongoing'],
      ongoing: ['completed'],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的状态流转' });
    }

    const data = { status };
    if (status === 'accepted') data.accept_at = new Date().toISOString();
    if (status === 'ongoing') data.start_at = new Date().toISOString();
    if (status === 'completed') data.end_at = new Date().toISOString();

    await db.update('orders', data, 'id = ?', [id]);

    res.json({ code: 200, message: '状态更新成功' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 取消订单
async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await db.findOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权取消此订单' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '只能取消待处理的订单' });
    }

    // 退款
    await db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [order.price, userId]);

    // 更新订单状态
    await db.update('orders', { status: 'cancelled' }, 'id = ?', [id]);

    res.json({ code: 200, message: '订单已取消，款项已退回' });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

// 管理后台 - 获取所有订单
async function adminGetOrders(req, res) {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const limitNum = Number(pageSize);
    const offsetNum = (Number(page) - 1) * limitNum;

    let sql = `
      SELECT o.*, u.nickname as user_nickname, p.user_id as player_user_id, pu.nickname as player_nickname
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN players p ON o.player_id = p.id
      JOIN users pu ON p.user_id = pu.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = await db.query(countSql, [...params]);

    sql += ` ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    const orders = await db.findAll(sql, params);

    res.json({
      code: 200,
      data: {
        list: orders,
        total: parseInt(countResult[0]?.count) || 0,
        page: Number(page),
        pageSize: limitNum,
      },
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
}

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  updateOrderStatus,
  cancelOrder,
  adminGetOrders,
};
