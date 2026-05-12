/**
 * 鏀粯鎺у埗鍣? * 
 * 褰撳墠涓烘ā鎷熸敮浠樼郴缁燂紝娴佺▼锛? * 1. 鐢ㄦ埛鍙戣捣鍏呭€?鈫?鍒涘缓浜ゆ槗璁板綍锛坰tatus=pending锛? * 2. 妯℃嫙鏀粯纭 鈫?鏇存柊浜ゆ槗璁板綍锛坰tatus=completed锛? 澧炲姞鐢ㄦ埛浣欓
 * 3. 涓嬪崟娑堣垂 鈫?鍒涘缓浜ゆ槗璁板綍锛坱ype=expense锛? 鍑忓皯鐢ㄦ埛浣欓
 * 
 * 鍚庣画鎺ュ叆鐪熷疄鏀粯鏃讹紝鍙渶锛? * - 灏?simulatePay 鏇挎崲涓哄井淇?鏀粯瀹濈殑涓嬪崟API璋冪敤
 * - 娣诲姞鏀粯鍥炶皟鎺ュ彛澶勭悊寮傛閫氱煡
 */
const db = require('../models/db');

// ==================== 鍏呭€?====================

// 鍙戣捣鍏呭€硷紙鍒涘缓鍏呭€艰鍗曪級
const createRecharge = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ code: 400, message: '鍏呭€奸噾棰濆繀椤诲ぇ浜?' });
    }

    if (amount > 10000) {
      return res.status(400).json({ code: 400, message: '鍗曟鍏呭€间笉鑳借秴杩?0000鍏? });
    }

    // 鐢熸垚浜ゆ槗鍙?    const tradeNo = `TX${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // 鍒涘缓浜ゆ槗璁板綍
    const result = await db.insert('transactions', {
      trade_no: tradeNo,
      user_id: userId,
      type: 'recharge',
      amount: Number(amount),
      status: 'pending',
      description: `鍏呭€悸?{amount}`,
    });

    res.json({
      code: 200,
      message: '鍏呭€艰鍗曞凡鍒涘缓',
      data: {
        id: result.id,
        trade_no: tradeNo,
        amount: Number(amount),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('鍒涘缓鍏呭€艰鍗曞け璐?', error);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
};

// 妯℃嫙鏀粯纭锛堝疄闄呮槸鍏呭€煎埌璐︼級
const simulatePay = async (req, res) => {
  try {
    const { trade_no } = req.body;
    const userId = req.user.id;

    if (!trade_no) {
      return res.status(400).json({ code: 400, message: '缂哄皯浜ゆ槗鍙? });
    }

    // 鏌ユ壘浜ゆ槗璁板綍
    const transaction = await db.findOne(
      'SELECT * FROM transactions WHERE trade_no = ? AND user_id = ? AND type = ?',
      [trade_no, userId, 'recharge']
    );

    if (!transaction) {
      return res.status(404).json({ code: 404, message: '浜ゆ槗璁板綍涓嶅瓨鍦? });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ code: 400, message: '璇ヤ氦鏄撳凡瀹屾垚' });
    }

    // 鏇存柊浜ゆ槗鐘舵€?    await db.update('transactions',
      { status: 'completed', completed_at: new Date().toISOString() },
      'id = ?',
      [transaction.id]
    );

    // 澧炲姞鐢ㄦ埛浣欓
    await db.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [transaction.amount, userId]
    );

    // 鏌ヨ鏇存柊鍚庣殑浣欓
    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    res.json({
      code: 200,
      message: '鍏呭€兼垚鍔燂紒',
      data: {
        trade_no,
        amount: transaction.amount,
        balance: user?.balance || 0
      }
    });
  } catch (error) {
    console.error('妯℃嫙鏀粯澶辫触:', error);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
};

// ==================== 浣欓鏌ヨ ====================

// 鑾峰彇閽卞寘淇℃伅锛堜綑棰?+ 浜ゆ槗璁板綍锛?const getWalletInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // 鏌ヨ浣欓
    const user = await db.findOne('SELECT balance FROM users WHERE id = ?', [userId]);

    // 鏌ヨ浜ゆ槗璁板綍
    const transactions = await db.findAll(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    // 缁熻
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
    console.error('鑾峰彇閽卞寘淇℃伅澶辫触:', error);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
};

// ==================== 绠＄悊鍚庡彴 ====================

// 鑾峰彇鎵€鏈変氦鏄撹褰?const adminGetTransactions = async (req, res) => {
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

    // 鎬绘暟
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
    console.error('鑾峰彇浜ゆ槗璁板綍澶辫触:', error);
    res.status(500).json({ code: 500, message: '鏈嶅姟鍣ㄩ敊璇? });
  }
};

module.exports = {
  createRecharge,
  simulatePay,
  getWalletInfo,
  adminGetTransactions,
};

