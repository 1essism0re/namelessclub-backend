// 数据库配置
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'kk-esports-jwt-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'kk_esports',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: process.env.MAX_FILE_SIZE || '5mb',
  },
};
