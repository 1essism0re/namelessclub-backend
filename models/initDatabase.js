/**
 * 数据库初始化模块
 * 服务启动时自动创建表结构
 */
const db = require('./db');

const initSQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar VARCHAR(500),
  gender INT DEFAULT 0,
  role VARCHAR(20) DEFAULT 'user',
  status INT DEFAULT 1,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(500),
  cover VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.00,
  order_count INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 30.00,
  tags TEXT,
  description TEXT,
  is_online INT DEFAULT 1,
  is_verified INT DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_games (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  game_id INT NOT NULL,
  level VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  player_id INT NOT NULL,
  game_id INT NOT NULL,
  game_name VARCHAR(100),
  duration INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  voice_room_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  order_id INT,
  player_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT DEFAULT 5,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text',
  is_read INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_rooms (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(64) UNIQUE NOT NULL,
  order_id INT,
  name VARCHAR(100) NOT NULL,
  creator_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  max_users INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_room_members (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  is_muted INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  image VARCHAR(500) NOT NULL,
  link VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  type VARCHAR(20) DEFAULT 'system',
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  trade_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  description VARCHAR(500),
  order_id INT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_player_id ON orders(player_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trade_no ON transactions(trade_no);
`;

async function initDatabase() {
  try {
    console.log('正在初始化数据库...');
    
    // 执行建表SQL（分割成单独的语句）
    const statements = initSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
        } catch (err) {
          // 忽略已存在的错误
        }
      }
    }
    console.log('数据表创建完成');
    
    // 插入初始数据（使用 bcryptjs）
    const bcrypt = require('bcryptjs');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const userPassword = bcrypt.hashSync('test123456', 10);
    
    // 插入管理员
    try {
      await db.query(
        `INSERT INTO users (phone, password, nickname, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO NOTHING`,
        ['13800000000', adminPassword, 'KK管理员', 'admin', 1]
      );
      console.log('管理员账号已创建');
    } catch (err) {
      // 忽略重复插入
    }
    
    // 插入测试用户
    try {
      await db.query(
        `INSERT INTO users (phone, password, nickname, role) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO NOTHING`,
        ['13900001111', userPassword, 'KK用户001', 'user']
      );
      console.log('测试用户已创建');
    } catch (err) {
      // 忽略重复插入
    }
    
    // 插入游戏
    const games = [
      ['英雄联盟', '🎮', 1],
      ['王者荣耀', '👑', 2],
      ['和平精英', '🔫', 3],
      ['原神', '⚔️', 4],
      ['CSGO', '🎯', 5],
      ['DOTA2', '🛡️', 6],
      ['VALORANT', '💎', 7]
    ];
    for (const [name, icon, sort] of games) {
      try {
        await db.query(
          `INSERT INTO games (name, icon, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [name, icon, sort]
        );
      } catch (err) {}
    }
    console.log('游戏数据已插入');
    
    // 插入轮播图
    try {
      await db.query(
        `INSERT INTO banners (title, image, link, sort_order, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        ['KK电竞夏季赛', '/uploads/banner1.jpg', '/app', 1, 1]
      );
      await db.query(
        `INSERT INTO banners (title, image, link, sort_order, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        ['新人福利', '/uploads/banner2.jpg', '/app', 2, 1]
      );
      console.log('轮播图已插入');
    } catch (err) {}
    
    // 插入公告
    try {
      await db.query(
        `INSERT INTO announcements (title, content, type, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        ['欢迎来到KK电竞', '在这里找到你的游戏伙伴，开启愉快的游戏之旅！', 'system', 1]
      );
      await db.query(
        `INSERT INTO announcements (title, content, type, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        ['平台维护通知', '每周日凌晨2点-6点进行系统维护', 'system', 1]
      );
      console.log('公告已插入');
    } catch (err) {}
    
    console.log('数据库初始化完成！');
    return true;
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    return false;
  }
}

module.exports = { initDatabase };
