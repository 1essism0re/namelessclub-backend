// 璁㈠崟鎺у埗鍣?const db = require('../models/db');

// 鐢熸垚璁㈠崟鍙?function generateOrderNo() {
  const now = new Date().toISOString();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `KK${dateStr}${rand}`;
}

// 鍒涘缓璁㈠崟锛堜笅鍗曪級
async function createOrder(req, res) {
  try {
    const { player_id, game_id, duration = 1, remark = '' } = req.body;
    const userId = req.user.id;

    // 鍙傛暟鏍￠獙
    if (!player_id || !game_id) {
      return res.status(400).json({ code: 400, message: '闄帺甯堝拰娓告垙涓嶈兘涓虹┖' });
    }

    // 鏌ヨ闄帺甯堜俊鎭?    const player = await db.findOne('SELECT * FROM players WHERE id = ? AND status = 1', [player_id]);
    if (!player) {
      return res.status(400).json({ code: 400, message: '闄帺甯堜笉瀛樺湪鎴栧凡涓嬫灦' });
    }

    // 鏌ヨ娓告垙淇℃伅
    const game = await db.findOne('SELECT * FROM games WHERE id = ?', [game_id]);

    // 璁＄畻浠锋牸
    const totalPrice = player.price * duration;

    // 妫€鏌ョ敤鎴蜂綑棰?    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < totalPrice) {
      return res.status(400).json({ 
        code: 400, 
        message: `浣欓涓嶈冻锛岄渶瑕伮?{totalPrice}锛屽綋鍓嶄綑棰澛?{user?.balance || 0}` 
      });
    }

    // 鎵ｅ噺鐢ㄦ埛浣欓
    await db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [totalPrice, userId]);

    // 鍒涘缓璁㈠崟
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

    // 鍒涘缓娑堣垂浜ゆ槗璁板綍
    await db.insert('transactions', {
      trade_no: `TX${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      user_id: userId,
      type: 'expense',
      amount: totalPrice,
      status: 'completed',
      description: `璁㈠崟${orderNo}娑堣垂`,
      order_id: result.id,
      completed_at: new Date().toISOString(),
    });

    // 鏌ヨ鎵ｆ鍚庝綑棰?    const updatedUser = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    res.json({
      code: 200,
      message: '涓嬪崟鎴愬姛',
      data: {
        order_id: result.id,
        order_no: orderNo,
        price: totalPrice,
        balance: updatedUser?.balance || 0,
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('鍒涘缓璁㈠崟澶辫触:', err);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
}

// 鑾峰彇鎴戠殑璁㈠崟鍒楄〃
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
    console.error('鑾峰彇璁㈠崟鍒楄〃澶辫触:', err);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
}

// 鑾峰彇璁㈠崟璇︽儏
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
      return res.status(404).json({ code: 404, message: '璁㈠崟涓嶅瓨鍦? });
    }

    res.json({ code: 200, data: order });
  } catch (err) {
    console.error('鑾峰彇璁㈠崟璇︽儏澶辫触:', err);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
}

// ========== 鍚庡彴绠＄悊鎺ュ彛 ==========

// 鑾峰彇鎵€鏈夎鍗?async function adminGetOrders(req, res) {
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
    console.error('鑾峰彇璁㈠崟鍒楄〃澶辫触:', err);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
}

// 鏇存柊璁㈠崟鐘舵€?async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    const validStatuses = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '鏃犳晥鐨勮鍗曠姸鎬? });
    }

    const data = { status };
    if (status === 'accepted') data.accept_at = new Date().toISOString();
    if (status === 'ongoing') data.start_at = new Date().toISOString();
    if (status === 'completed') data.end_at = new Date().toISOString();
    if (status === 'cancelled' && cancel_reason) data.cancel_reason = cancel_reason;

    const result = await db.update('orders', data, 'id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '璁㈠崟涓嶅瓨鍦? });
    }

    res.json({ code: 200, message: '璁㈠崟鐘舵€佸凡鏇存柊' });
  } catch (err) {
    console.error('鏇存柊璁㈠崟鐘舵€佸け璐?', err);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
}

module.exports = {
  createOrder, getMyOrders, getOrderDetail,
  adminGetOrders, updateOrderStatus,
};

