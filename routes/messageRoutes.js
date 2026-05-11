const express = require('express');
const router = express.Router();
const { getChatHistory, getConversations, getUnreadCount } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

router.get('/history', authMiddleware, getChatHistory);        // 聊天历史
router.get('/conversations', authMiddleware, getConversations); // 会话列表
router.get('/unread', authMiddleware, getUnreadCount);           // 未读消息数

module.exports = router;
