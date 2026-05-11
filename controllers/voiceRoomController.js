/**
 * 语音房间控制器
 * 
 * 字段对照（与数据库 voice_rooms 表一致）：
 * - creator_id: 创建者ID
 * - room_id: 房间唯一标识（字符串）
 * - max_users: 最大人数
 * - status: waiting/active/ended
 */
const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

// 创建语音房间
const createRoom = async (req, res) => {
  try {
    const { name, order_id, max_users = 10 } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ code: 400, message: '房间名称不能为空' });
    }

    const roomId = uuidv4().replace(/-/g, '').substring(0, 16);

    const result = await db.insert('voice_rooms', {
      room_id: roomId,
      name,
      creator_id: userId,
      order_id: order_id || null,
      status: 'active',
      max_users: Number(max_users),
    });

    // 创建者自动加入
    await db.insert('voice_room_members', {
      room_id: result.id,
      user_id: userId,
      role: 'owner',
      is_muted: 0,
    });

    res.json({
      code: 200,
      message: '房间创建成功',
      data: { id: result.id, room_id: roomId, name },
    });
  } catch (error) {
    console.error('创建语音房间失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 加入语音房间
const joinRoom = async (req, res) => {
  try {
    const { id } = req.body; // 使用 voice_rooms.id
    const userId = req.user.id;

    const room = await db.findOne('SELECT * FROM voice_rooms WHERE id = ? AND status IN (?, ?)', [id, 'active', 'waiting']);
    if (!room) {
      return res.status(404).json({ code: 404, message: '房间不存在' });
    }

    // 检查人数
    const memberCount = await db.count('SELECT COUNT(*) as count FROM voice_room_members WHERE room_id = ?', [id]);
    if (memberCount >= room.max_users) {
      return res.status(400).json({ code: 400, message: '房间已满' });
    }

    // 检查是否已在房间
    const existing = await db.findOne(
      'SELECT * FROM voice_room_members WHERE room_id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing) {
      return res.status(400).json({ code: 400, message: '已在房间中' });
    }

    await db.insert('voice_room_members', {
      room_id: id,
      user_id: userId,
      role: 'member',
      is_muted: 0,
    });

    res.json({ code: 200, message: '加入成功' });
  } catch (error) {
    console.error('加入房间失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 退出语音房间
const leaveRoom = async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.user.id;

    await db.delete('voice_room_members', 'room_id = ? AND user_id = ?', [id, userId]);

    // 如果是房主退出，关闭房间
    const room = await db.findOne('SELECT * FROM voice_rooms WHERE id = ?', [id]);
    if (room && room.creator_id === userId) {
      await db.update('voice_rooms', { status: 'ended' }, 'id = ?', [id]);
      // 踢出所有成员
      await db.delete('voice_room_members', 'room_id = ?', [id]);
    }

    res.json({ code: 200, message: '已退出房间' });
  } catch (error) {
    console.error('退出房间失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取房间列表
const getRoomList = async (req, res) => {
  try {
    const rooms = await db.query(`
      SELECT vr.*, u.nickname as owner_name, u.avatar as owner_avatar
      FROM voice_rooms vr
      JOIN users u ON vr.creator_id = u.id
      WHERE vr.status IN ('active', 'waiting')
      ORDER BY vr.created_at DESC
    `);

    // 为每个房间附加成员数
    for (const room of rooms) {
      const count = await db.count('SELECT COUNT(*) as count FROM voice_room_members WHERE room_id = ?', [room.id]);
      room.member_count = count;
    }

    res.json({ code: 200, data: rooms });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

// 获取房间详情（含成员列表）
const getRoomDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await db.findOne(`
      SELECT vr.*, u.nickname as owner_name
      FROM voice_rooms vr
      JOIN users u ON vr.creator_id = u.id
      WHERE vr.id = ? AND vr.status IN ('active', 'waiting')
    `, [id]);

    if (!room) {
      return res.status(404).json({ code: 404, message: '房间不存在' });
    }

    const members = await db.query(`
      SELECT vrm.*, u.nickname, u.avatar
      FROM voice_room_members vrm
      JOIN users u ON vrm.user_id = u.id
      WHERE vrm.room_id = ?
      ORDER BY vrm.role = 'owner' DESC, vrm.joined_at ASC
    `, [id]);

    res.json({ code: 200, data: { ...room, members } });
  } catch (error) {
    console.error('获取房间详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomList,
  getRoomDetail,
};
