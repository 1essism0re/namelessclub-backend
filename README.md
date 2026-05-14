# namelessclub-backend

KK电竞平台后端服务

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MongoDB
- **缓存**: Redis
- **实时通信**: Socket.IO
- **部署**: Render

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 启动服务
npm run dev
```

### 环境变量配置

在 `.env` 中配置以下变量：

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=your_secret_key
```

## 部署到 Render

### 方式一：推送代码自动部署

1. Fork 本仓库到您的 GitHub
2. 登录 [Render Dashboard](https://dashboard.render.com)
3. 点击 "New +" → "Blueprint"
4. 连接您的 GitHub 仓库
5. Render 会自动读取 `render.yaml` 并创建服务

### 方式二：手动创建服务

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New +" → "Web Service"
3. 连接 GitHub 仓库
4. 配置构建命令和启动命令：
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 添加环境变量
6. 点击 "Create Web Service"

### 必须配置的环境变量

在 Render Dashboard 的 Environment 选项卡中配置：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| MONGODB_URI | MongoDB 连接地址 | Render Managed Database 或 MongoDB Atlas |
| REDIS_URL | Redis 连接地址 | Render Managed Redis 或第三方 |
| JWT_SECRET | JWT 密钥 | 使用 `openssl rand -base64 32` 生成 |

### 可选环境变量

| 变量名 | 说明 |
|--------|------|
| ALIPAY_APP_ID | 支付宝应用ID |
| ALIPAY_PRIVATE_KEY | 支付宝私钥 |
| ALIPAY_PUBLIC_KEY | 支付宝公钥 |
| WECHAT_APP_ID | 微信AppID |
| WECHAT_MCH_ID | 微信商户号 |
| WECHAT_API_KEY | 微信API密钥 |
| SMS_ACCESS_KEY | 阿里云短信AccessKey |
| SMS_ACCESS_SECRET | 阿里云短信Secret |

## API 端点

| 端点 | 描述 |
|------|------|
| GET /health | 健康检查 |
| POST /api/auth/register | 用户注册 |
| POST /api/auth/login | 用户登录 |
| GET /api/players | 获取陪玩师列表 |
| POST /api/orders | 创建订单 |

## 目录结构

```
├── server/
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 数据模型
│   ├── routes/        # 路由
│   ├── services/      # 业务服务
│   ├── socket/        # Socket.IO
│   ├── cache/        # Redis 缓存
│   ├── monitoring/   # 监控配置
│   ├── app.js        # 应用入口
│   └── package.json
├── render.yaml       # Render 部署配置
├── .env.example      # 环境变量模板
└── README.md
```

## 许可证

MIT
