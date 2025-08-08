# 部署指南

本文档详细说明如何部署基于 Electron Go 框架的桌面应用程序。

## 部署概述

Electron Go 应用的部署包含两个主要部分：
1. **Go 服务器**：后端 API 服务
2. **Electron 客户端**：桌面应用界面

## 环境要求

### 开发环境
- Node.js 16.x 或更高版本
- Go 1.21 或更高版本
- Git（用于版本控制）

### 构建环境
- 与开发环境相同
- 额外的平台特定工具（见平台构建要求）

### 运行环境
- 仅需要构建后的可执行文件
- 无需 Node.js 和 Go 运行时

## 构建流程

### 1. 环境准备

```bash
# 克隆项目模板
git clone <your-repo-url>
cd your-project

# 安装前端依赖
npm install

# 检查 Go 依赖
cd server
go mod tidy
```

### 2. 开发构建

```bash
# 开发模式（自动重启）
npm start

# 或分别启动
npm run server  # 只启动服务器
npm run client  # 只启动客户端
```

### 3. 生产构建

```bash
# 完整构建
npm run build

# 或分步构建
npm run build:server  # 只构建服务器
npm run build:client  # 只构建客户端
```

## 平台构建

### Windows

#### 要求
- Visual Studio Build Tools 或 Visual Studio Community
- Windows SDK

#### 构建步骤
```bash
# 设置环境变量
set CGO_ENABLED=0
set GOOS=windows
set GOARCH=amd64

# 构建服务器
cd server
go build -ldflags="-s -w" -o app-server.exe main.go

# 构建客户端
npm run build
```

#### 输出文件
- `dist/win-unpacked/` - 解压版本
- `dist/Your App Setup.exe` - 安装程序
- `dist/Your App.exe` - 便携版

### macOS

#### 要求
- Xcode Command Line Tools
- Apple Developer ID（用于代码签名）

#### 构建步骤
```bash
# 设置环境变量
export CGO_ENABLED=0
export GOOS=darwin

# 构建 Intel 版本
export GOARCH=amd64
go build -ldflags="-s -w" -o app-server-intel main.go

# 构建 Apple Silicon 版本
export GOARCH=arm64
go build -ldflags="-s -w" -o app-server-arm64 main.go

# 创建通用二进制文件
lipo -create -output app-server app-server-intel app-server-arm64

# 构建客户端
npm run build
```

#### 输出文件
- `dist/mac/` - 应用包
- `dist/Your App.dmg` - 磁盘映像
- `dist/Your App.zip` - 压缩包

### Linux

#### 要求
- GCC 编译器
- 平台特定的依赖包

#### 构建步骤
```bash
# 设置环境变量
export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64

# 构建服务器
cd server
go build -ldflags="-s -w" -o app-server main.go

# 构建客户端
npm run build
```

#### 输出文件
- `dist/linux-unpacked/` - 解压版本
- `dist/Your App.AppImage` - AppImage 格式
- `dist/Your App.deb` - Debian 包

## 配置管理

### 环境配置

应用支持通过配置文件和环境变量进行配置：

#### 配置文件优先级
1. 命令行参数
2. 环境变量
3. 配置文件
4. 默认值

#### 生产环境配置
```json
{
  "app": {
    "name": "Your App",
    "version": "1.0.0"
  },
  "server": {
    "host": "localhost",
    "port": 1313,
    "mode": "release"
  },
  "features": {
    "autoUpdate": true,
    "crashReporting": true,
    "devTools": false
  }
}
```

#### 环境变量
```bash
# 应用配置
APP_MODE=production
APP_PORT=1313

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 功能开关
ENABLE_AUTO_UPDATE=true
ENABLE_CRASH_REPORTING=true
```

### 安全配置

#### 内容安全策略 (CSP)
```javascript
// 在生产环境中启用严格的 CSP
const csp = {
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data:",
  'connect-src': "'self' http://localhost:1313"
};
```

#### 网络安全
```go
// 限制允许的来源
allowOrigins := []string{
  "http://localhost",
  "https://localhost"
}
```

## 自动更新

### 配置自动更新

```javascript
// 在 main.js 中配置
const { autoUpdater } = require('electron-updater');

// 设置更新服务器
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-username',
  repo: 'your-repo'
});

// 检查更新
autoUpdater.checkForUpdatesAndNotify();
```

### 发布更新

```bash
# 构建并发布
npm run build
npm run publish

# 或使用 GitHub Actions
git tag v1.0.1
git push origin v1.0.1
```

## 性能优化

### 构建优化

```bash
# 启用 Go 编译优化
go build -ldflags="-s -w" main.go

# 压缩 Electron 包
npm install --save-dev electron-builder-compression
```

### 运行时优化

```javascript
// 减少内存使用
app.commandLine.appendSwitch('--max-old-space-size', '512');

// 启用硬件加速
app.commandLine.appendSwitch('--enable-hardware-acceleration');
```

## 监控和日志

### 日志配置

```go
// 服务器日志
logger := logrus.New()
logger.SetFormatter(&logrus.JSONFormatter{})
logger.SetLevel(logrus.InfoLevel)

// 日志文件轮转
logger.SetOutput(&lumberjack.Logger{
  Filename:   "logs/app.log",
  MaxSize:    10, // MB
  MaxBackups: 3,
  MaxAge:     28, // days
})
```

### 错误监控

```javascript
// 集成 Sentry 或其他错误监控服务
const { crashReporter } = require('electron');

crashReporter.start({
  productName: 'Your App',
  companyName: 'Your Company',
  submitURL: 'https://your-crash-server.com/submit',
  uploadToServer: true
});
```

## 部署脚本

### 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "开始部署流程..."

# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm ci

# 3. 运行测试
npm test

# 4. 构建应用
npm run build

# 5. 创建发布包
npm run dist

# 6. 上传到分发服务器
scp dist/* user@server:/releases/

echo "部署完成!"
```

### Docker 容器化（可选）

```dockerfile
# Dockerfile for Go server
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY server/ .
RUN go mod download
RUN go build -ldflags="-s -w" -o app-server main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/app-server .
EXPOSE 1313
CMD ["./app-server"]
```

## 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存
npm run clean
rm -rf node_modules
npm install

# 检查 Go 环境
go version
go env
```

#### 2. 服务器无法启动
```bash
# 检查端口占用
netstat -an | grep 1313
lsof -i :1313

# 查看详细错误
./app-server --debug
```

#### 3. 权限问题
```bash
# macOS 权限
sudo spctl --assess --verbose dist/mac/Your\ App.app
codesign --verify --verbose dist/mac/Your\ App.app

# Linux 权限
chmod +x dist/linux-unpacked/your-app
```

### 调试技巧

#### 启用详细日志
```bash
# 环境变量
export DEBUG=*
export ELECTRON_ENABLE_LOGGING=1

# 启动应用
./your-app --enable-logging --debug
```

#### 网络调试
```bash
# 检查 API 连接
curl -v http://localhost:1313/health

# 测试 CORS
curl -H "Origin: http://localhost" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:1313/api/v1/info
```

## 生产环境清单

### 部署前检查
- [ ] 移除开发工具和调试代码
- [ ] 配置生产环境变量
- [ ] 启用错误监控
- [ ] 配置自动更新
- [ ] 设置日志轮转
- [ ] 进行安全审计
- [ ] 性能测试
- [ ] 跨平台兼容性测试

### 安全检查
- [ ] 禁用开发者工具
- [ ] 设置内容安全策略
- [ ] 验证网络通信
- [ ] 检查文件权限
- [ ] 代码签名（macOS/Windows）

### 监控设置
- [ ] 应用性能监控
- [ ] 错误日志收集
- [ ] 用户分析（可选）
- [ ] 系统资源监控

## 支持和维护

### 版本管理
- 遵循语义化版本控制
- 维护变更日志
- 创建发布标签

### 用户支持
- 提供用户手册
- 设置反馈渠道
- 建立问题跟踪系统

---

如需更多帮助，请参考项目文档或联系开发团队。