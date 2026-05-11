/**
 * WebSocket 事件处理
 * 
 * 功能：
 * 1. 用户上线/下线通知
 * 2. 一对一消息发送
 * 3. 消息存入数据库（支持离线消息）
 * 4. 未读消息数管理
 */

const db = require('../models/db');

// 在线用户映射 { userId: socketId }
const onlineUsers = new Map();

function setupSocketIO(io) {

  io.on('connection', (socket) => {
    console.log(`[WebSocket] 用户连接: ${socket.id}`);

    // 用户登录绑定（前端连接后发送 userId）
    socket.on('user:online', async (userId) => {
      socket.userId = userId;
      onlineUsers.set(Number(userId), socket.id);

      // 更新数据库在线状态
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);

      // 通知好友上线
      io.emit('user:status', { userId: Number(userId), online: true });
      console.log(`[WebSocket] 用户 ${userId} 上线`);
    });

    // 发送一对一消息
    socket.on('message:send', async (data) => {
      const { toUserId, content } = data;
      const fromUserId = socket.userId;

      if (!fromUserId || !toUserId || !content) return;

      try {
        // 存入数据库
        const result = await db.insert('messages', {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          content: content.trim(),
          type: 'text',
          is_read: 0,
        });

        const messageData = {
          id: result.id,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          content: content.trim(),
          type: 'text',
          created_at: new Date().toISOString(),
        };

        // 发送给接收方（如果在线）
        const receiverSocketId = onlineUsers.get(Number(toUserId));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', messageData);
        }

        // 发送确认给发送方
        socket.emit('message:sent', messageData);

      } catch (err) {
        console.error('发送消息失败:', err);
        socket.emit('message:error', { message: '发送失败' });
      }
    });

    // 标记消息已读
    socket.on('message:read', async (data) => {
      const { fromUserId } = data;
      const toUserId = socket.userId;

      if (!fromUserId || !toUserId) return;

      try {
        await db.query(
          'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
          [fromUserId, toUserId]
        );

        // 通知发送方消息已读
        const senderSocketId = onlineUsers.get(Number(fromUserId));
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', { fromUserId: toUserId });
        }
      } catch (err) {
        console.error('标记已读失败:', err);
      }
    });

    // 正在输入
    socket.on('typing', (data) => {
      const { toUserId } = data;
      const receiverSocketId = onlineUsers.get(Number(toUserId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { fromUserId: socket.userId });
      }
    });

    // ==================== 语音房间事件 ====================

    // 加入语音房间
    socket.on('room:join', (roomId) => {
      socket.join(`room_${roomId}`);
      socket.currentRoom = roomId;
      io.to(`room_${roomId}`).emit('room:member-joined', {
        userId: socket.userId,
        roomId: Number(roomId),
      });
    });

    // 房间内消息
    socket.on('room:message', (data) => {
      const { roomId, content } = data;
      if (!socket.currentRoom) return;
      io.to(`room_${roomId}`).emit('room:message', {
        from_user_id: socket.userId,
        content,
        created_at: new Date().toISOString(),
      });
    });

    // 离开语音房间
    socket.on('room:leave', (roomId) => {
      socket.leave(`room_${roomId}`);
      io.to(`room_${roomId}`).emit('room:member-left', {
        userId: socket.userId,
        roomId: Number(roomId),
      });
      socket.currentRoom = null;
    });

    // 断开连接
    socket.on('disconnect', async () => {
      if (socket.userId) {
        onlineUsers.delete(Number(socket.userId));
        io.emit('user:status', { userId: Number(socket.userId), online: false });
        console.log(`[WebSocket] 用户 ${socket.userId} 下线`);
      }
    });
  });

  return onlineUsers;
}

module.exports = { setupSocketIO, onlineUsers };
