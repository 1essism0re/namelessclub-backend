const db = require('../models/db');

// 获取与某用户的聊天历史
const getChatHistory = async (req, res) => {
  try {
    const { targetUserId, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ code: 400, message: '缺少目标用户ID' });
    }

    const limitNum = Number(limit);
    const offsetNum = (Number(page) - 1) * limitNum;

    // 查询两人之间的消息
    const messages = await db.query(`
      SELECT m.*, 
             u1.nickname as from_nickname, u1.avatar as from_avatar,
             u2.nickname as to_nickname, u2.avatar as to_avatar
      FROM messages m
      JOIN users u1 ON m.from_user_id = u1.id
      JOIN users u2 ON m.to_user_id = u2.id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?)
         OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, [userId, targetUserId, targetUserId, userId]);

    // 标记未读消息为已读
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
      [targetUserId, userId]
    );

    res.json({ code: 200, data: messages });
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取会话列表（最近联系人）
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await db.query(`
      SELECT 
        m.id,
        CASE 
          WHEN m.from_user_id = ? THEN m.to_user_id 
          ELSE m.from_user_id 
        END as target_user_id,
        CASE 
          WHEN m.from_user_id = ? THEN u2.nickname 
          ELSE u1.nickname 
        END as target_nickname,
        CASE 
          WHEN m.from_user_id = ? THEN u2.avatar 
          ELSE u1.avatar 
        END as target_avatar,
        m.content as last_message,
        m.created_at as last_time,
        (SELECT COUNT(*) FROM messages 
         WHERE from_user_id = CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END
         AND to_user_id = ? AND is_read = 0) as unread_count
      FROM messages m
      JOIN users u1 ON m.from_user_id = u1.id
      JOIN users u2 ON m.to_user_id = u2.id
      WHERE m.from_user_id = ? OR m.to_user_id = ?
      GROUP BY target_user_id
      ORDER BY last_time DESC
    `, [userId, userId, userId, userId, userId, userId, userId]);

    res.json({ code: 200, data: conversations });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取未读消息总数
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0',
      [userId]
    );
    res.json({ code: 200, data: { count: result[0]?.count || 0 } });
  } catch (error) {
    console.error('获取未读数失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  getChatHistory,
  getConversations,
  getUnreadCount,
};
