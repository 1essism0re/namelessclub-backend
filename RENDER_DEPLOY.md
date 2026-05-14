# Render 部署指南 - namelessclub-backend

## 步骤 1：Fork 仓库

1. 访问 https://github.com/1essism0re/namelessclub-backend
2. 点击右上角 **Fork** 按钮
3. 创建 fork 到您的账号

## 步骤 2：在本地准备文件

如果您需要更新现有仓库，执行以下操作：

```bash
# 克隆您 fork 的仓库
git clone https://github.com/您的用户名/namelessclub-backend.git
cd namelessclub-backend

# 添加上游仓库（用于获取更新）
git remote add upstream https://github.com/1essism0re/namelessclub-backend.git

# 拉取最新代码
git pull upstream main
```

## 步骤 3：获取 MongoDB 和 Redis

### 选项 A：使用 Render Managed Database（推荐）

1. 登录 Render Dashboard
2. 点击 "New +" → "PostgreSQL"（注意：Render 免费版只有 PostgreSQL）
3. 创建数据库
4. 复制连接字符串

**注意**：Render 免费版不提供 MongoDB！您需要使用：
- MongoDB Atlas 免费版
- 或其他 MongoDB 云服务

### 选项 B：使用 MongoDB Atlas

1. 访问 https://www.mongodb.com/atlas
2. 注册并登录
3. 创建免费集群 (M0 Sandbox)
4. 在 Network Access 添加 `0.0.0.0/0`
5. 在 Database Access 创建用户
6. 复制连接字符串，格式如下：
   ```
   mongodb+srv://用户名:密码@cluster.xxxxx.mongodb.net/数据库名?retryWrites=true&w=majority
   ```

### 获取 Redis

可以使用：
- Redis Cloud 免费版
- Render Redis（如果可用）

## 步骤 4：在 Render 创建服务

### 4.1 创建 Web Service

1. 登录 https://dashboard.render.com
2. 点击 "New +" → "Web Service"
3. 连接您的 GitHub 仓库
4. 配置以下设置：

| 配置项 | 值 |
|--------|-----|
| Name | namelessclub-api |
| Region | Singapore |
| Branch | main |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | Free |

### 4.2 添加环境变量

点击 "Environment" 选项卡，添加：

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=您的MongoDB连接字符串
REDIS_URL=您的Redis连接字符串
JWT_SECRET=随机密钥（使用 openssl rand -base64 32 生成）
```

### 4.3 配置健康检查

默认健康检查路径是 `/health`，确保您的应用有这个端点。

## 步骤 5：部署

1. 点击 "Create Web Service"
2. Render 会自动开始构建和部署
3. 等待部署完成（通常 2-5 分钟）
4. 部署成功后，您会获得一个 URL，如：
   ```
   https://namelessclub-backend.onrender.com
   ```

## 步骤 6：验证部署

```bash
# 测试健康检查
curl https://您的服务URL/health

# 预期响应
{"status":"ok","timestamp":...}
```

## 故障排除

### 部署失败

1. 检查 Build Logs 中的错误信息
2. 常见问题：
   - `npm install` 失败：检查 package.json
   - 启动失败：检查环境变量
   - 端口错误：确保使用 `process.env.PORT`

### 服务无法访问

1. 检查 Health Check 是否通过
2. 检查日志：`render logs`
3. 确认环境变量配置正确

### 数据库连接失败

1. 确认 MongoDB URI 格式正确
2. 检查 MongoDB Atlas 的 Network Access
3. 确认用户名密码正确

## 更新代码

当您推送新代码到 GitHub 时，Render 会自动重新部署。

```bash
git add .
git commit -m "更新内容"
git push origin main
```

## 监控

- 查看日志：`render logs -s namelessclub-api`
- 查看指标：Render Dashboard → 您的服务 → Metrics

## 下一步

部署完成后，请：
1. 配置您的 .env 变量
2. 设置支付接口（支付宝/微信）
3. 配置前端调用后端 API

如有问题，请查看 Render 官方文档：https://render.com/docs
