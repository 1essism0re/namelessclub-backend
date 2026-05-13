const db = require('./models/db');

function setupSocketIO(io) {
  // 在线用户 Map: userId -> socketId
  const onlineUsers = new Map();
  
  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);
    
    // 用户登录/认证
    socket.on('auth', async (data) => {
      const { userId, token } = data;
      if (userId) {
        // 保存用户socket映射
        onlineUsers.set(userId.toString(), socket.id);
        socket.userId = userId;
        console.log(`用户 ${userId} 已认证`);
        
        // 通知所有在线用户该用户上线
        io.emit('user_online', { userId });
      }
    });
    
    // 发送私聊消息
    socket.on('send_message', async (data) => {
      const { toUserId, content, type = 'text' } = data;
      const fromUserId = socket.userId;
      
      if (!fromUserId || !toUserId) {
        socket.emit('error', { message: '参数错误' });
        return;
      }
      
      try {
        // 保存消息到数据库
        const result = await db.insert('messages', {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          content: content,
          type: type,
          is_read: 0
        });
        
        const message = {
          id: result.id,
          fromUserId,
          toUserId,
          content,
          type,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        
        // 发送给接收者（如果在线）
        const targetSocketId = onlineUsers.get(toUserId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit('new_message', message);
        }
        
        // 发送确认给发送者
        socket.emit('message_sent', message);
        
      } catch (err) {
        console.error('发送消息失败:', err);
        socket.emit('error', { message: '发送失败' });
      }
    });
    
    // 加入语音房
    socket.on('join_voice_room', async (data) => {
      const { roomId, userId } = data;
      const user = await db.findOne('SELECT * FROM users WHERE id = ?', [userId]);
      
      socket.join(`voice_${roomId}`);
      
      // 通知房间内其他人
      io.to(`voice_${roomId}`).emit('user_joined', {
        roomId,
        userId,
        nickname: user?.nickname || '用户',
        avatar: user?.avatar || '😊'
      });
      
      // 广播房间在线人数
      const room = io.sockets.adapter.rooms.get(`voice_${roomId}`);
      const count = room ? room.size : 0;
      io.to(`voice_${roomId}`).emit('room_count', { roomId, count });
    });
    
    // 离开语音房
    socket.on('leave_voice_room', (data) => {
      const { roomId, userId } = data;
      
      socket.leave(`voice_${roomId}`);
      
      // 通知房间内其他人
      io.to(`voice_${roomId}`).emit('user_left', {
        roomId,
        userId
      });
      
      // 广播房间在线人数
      const room = io.sockets.adapter.rooms.get(`voice_${roomId}`);
      const count = room ? room.size : 0;
      io.to(`voice_${roomId}`).emit('room_count', { roomId, count });
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId.toString());
        io.emit('user_offline', { userId: socket.userId });
        console.log(`用户 ${socket.userId} 已断开`);
      }
    });
  });
  
  return io;
}

module.exports = { setupSocketIO };
