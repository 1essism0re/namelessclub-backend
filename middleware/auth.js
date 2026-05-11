// JWT认证中间件
const jwt = require('jsonwebtoken');
const config = require('../config');

// 生成JWT Token
function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// 验证JWT Token中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未登录或token已过期',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // 将用户信息挂载到req上
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      message: 'token无效或已过期',
    });
  }
}

// 管理员权限中间件
function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限',
    });
  }
}

module.exports = { generateToken, authMiddleware, adminMiddleware };
