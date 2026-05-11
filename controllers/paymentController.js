/**
 * 支付控制器
 * 
 * 当前为模拟支付系统，流程：
 * 1. 用户发起充值 → 创建交易记录（status=pending）
 * 2. 模拟支付确认 → 更新交易记录（status=completed）+ 增加用户余额
 * 3. 下单消费 → 创建交易记录（type=expense）+ 减少用户余额
 * 
 * 后续接入真实支付时，只需：
 * - 将 simulatePay 替换为微信/支付宝的下单API调用
 * - 添加支付回调接口处理异步通知
 */
const db = require('../models/db');

// ==================== 充值 ====================

// 发起充值（创建充值订单）
const createRecharge = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ code: 400, message: '充值金额必须大于0' });
    }

    if (amount > 10000) {
      return res.status(400).json({ code: 400, message: '单次充值不能超过10000元' });
    }

    // 生成交易号
    const tradeNo = `TX${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // 创建交易记录
    const result = await db.insert('transactions', {
      trade_no: tradeNo,
      user_id: userId,
      type: 'recharge',
      amount: Number(amount),
      status: 'pending',
      description: `充值¥${amount}`,
    });

    res.json({
      code: 200,
      message: '充值订单已创建',
      data: {
        id: result.id,
        trade_no: tradeNo,
        amount: Number(amount),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('创建充值订单失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 模拟支付确认（实际是充值到账）
const simulatePay = async (req, res) => {
  try {
    const { trade_no } = req.body;
    const userId = req.user.id;

    if (!trade_no) {
      return res.status(400).json({ code: 400, message: '缺少交易号' });
    }

    // 查找交易记录
    const transaction = await db.findOne(
      'SELECT * FROM transactions WHERE trade_no = ? AND user_id = ? AND type = ?',
      [trade_no, userId, 'recharge']
    );

    if (!transaction) {
      return res.status(404).json({ code: 404, message: '交易记录不存在' });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ code: 400, message: '该交易已完成' });
    }

    // 更新交易状态
    await db.update('transactions',
      { status: 'completed', completed_at: new Date() },
      'id = ?',
      [transaction.id]
    );

    // 增加用户余额
    await db.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [transaction.amount, userId]
    );

    // 查询更新后的余额
    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    res.json({
      code: 200,
      message: '充值成功！',
      data: {
        trade_no,
        amount: transaction.amount,
        balance: user?.balance || 0
      }
    });
  } catch (error) {
    console.error('模拟支付失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 余额查询 ====================

// 获取钱包信息（余额 + 交易记录）
const getWalletInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询余额
    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    // 查询交易记录
    const transactions = await db.findAll(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    // 统计
    const stats = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type='recharge' AND status='completed' THEN amount ELSE 0 END), 0) as total_recharge,
        COALESCE(SUM(CASE WHEN type='expense' AND status='completed' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions WHERE user_id = ? AND status = 'completed'
    `, [userId]);

    res.json({
      code: 200,
      data: {
        balance: user?.balance || 0,
        totalRecharge: stats[0]?.total_recharge || 0,
        totalExpense: stats[0]?.total_expense || 0,
        transactions
      }
    });
  } catch (error) {
    console.error('获取钱包信息失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// ==================== 管理后台 ====================

// 获取所有交易记录
const adminGetTransactions = async (req, res) => {
  try {
    const { type, status, page = 1, pageSize = 20 } = req.query;
    const limitNum = Number(pageSize);
    const offsetNum = (Number(page) - 1) * limitNum;

    let sql = `
      SELECT t.*, u.nickname, u.phone
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    // 总数
    const countSql = sql.replace('SELECT t.*, u.nickname, u.phone', 'SELECT COUNT(*) as count');
    const countResult = await db.query(countSql, params);

    sql += ` ORDER BY t.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    const transactions = await db.query(sql, params);

    res.json({
      code: 200,
      data: {
        list: transactions,
        total: countResult[0]?.count || 0,
        page: Number(page),
        pageSize: limitNum
      }
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  createRecharge,
  simulatePay,
  getWalletInfo,
  adminGetTransactions,
};
