// 数据库配置
require('dotenv').config();

// 优先使用 Render 自动设置的 DATABASE_URL
let dbConfig;

if (process.env.DATABASE_URL) {
  // 从 DATABASE_URL 解析连接信息
  // 格式: postgres://user:password@host:5432/database
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // 去掉开头的 /
  };
} else {
  // 本地开发使用单独的环境变量
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kk_esports',
  };
}

module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'kk-esports-jwt-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: dbConfig,
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: process.env.MAX_FILE_SIZE || '5mb',
  },
};
