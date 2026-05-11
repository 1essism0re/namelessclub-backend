-- KK电竞 PostgreSQL 数据库初始化脚本

-- 用户表
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

-- 游戏表
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(500),
  cover VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 陪玩师表
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

-- 陪玩师-游戏关联表
CREATE TABLE IF NOT EXISTS player_games (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL,
  game_id INT NOT NULL,
  level VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
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

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  order_id INT,
  player_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT DEFAULT 5,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text',
  is_read INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 语音房间表
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

-- 语音房间成员表
CREATE TABLE IF NOT EXISTS voice_room_members (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  is_muted INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- 轮播图表
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  image VARCHAR(500) NOT NULL,
  link VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  type VARCHAR(20) DEFAULT 'system',
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交易记录表
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

-- 创建索引
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

-- 插入管理员账号 (密码: admin123)
INSERT INTO users (phone, password, nickname, role, status) 
VALUES ('13800000000', '$2a$10$PAMdGJ2./FWTKnXdV3GRbOaFamWoQrwS/Z0rD7cpnBk/QKwa5ZL02', 'KK管理员', 'admin', 1)
ON CONFLICT (phone) DO NOTHING;

-- 插入测试用户 (密码: test123456)
INSERT INTO users (phone, password, nickname, role) 
VALUES ('13900001111', '$2a$10$8KzaXqZ9qFZWZqZ9qZqZqeZWZqZ9qZ9qZ9qZ9qZ9qZ9qZ9qZ9qZ9qZ', 'KK用户001', 'user')
ON CONFLICT (phone) DO NOTHING;

-- 插入游戏
INSERT INTO games (name, icon, sort_order) VALUES
  ('英雄联盟', '🎮', 1),
  ('王者荣耀', '👑', 2),
  ('和平精英', '🔫', 3),
  ('原神', '⚔️', 4),
  ('CSGO', '🎯', 5),
  ('DOTA2', '🛡️', 6),
  ('VALORANT', '💎', 7)
ON CONFLICT DO NOTHING;

-- 插入轮播图
INSERT INTO banners (title, image, link, sort_order, is_active) VALUES
  ('KK电竞夏季赛', '/uploads/banner1.jpg', '/app', 1, 1),
  ('新人福利', '/uploads/banner2.jpg', '/app', 2, 1)
ON CONFLICT DO NOTHING;

-- 插入公告
INSERT INTO announcements (title, content, type, is_active) VALUES
  ('欢迎来到KK电竞', '在这里找到你的游戏伙伴，开启愉快的游戏之旅！', 'system', 1),
  ('平台维护通知', '每周日凌晨2点-6点进行系统维护', 'system', 1)
ON CONFLICT DO NOTHING;
