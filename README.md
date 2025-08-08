# Electron-Go 桌面应用开发框架

🚀 现代化的跨平台桌面应用开发框架，集成 **Electron 前端** + **Go 后端**，提供完整的开发、构建和部署解决方案。

## ✨ 框架特色

- 🎨 **现代化 UI**: 无边框设计 + 主题切换
- ⚡ **高性能后端**: Go + Gin 框架，毫秒级响应
- 🛠️ **开发友好**: 热重载 + 智能重启 + 文件监听
- 🔧 **系统集成**: 全局快捷键 + 窗口管理
- 📦 **一键部署**: 跨平台打包 + 自动化构建
- 🎯 **生产就绪**: 优雅关闭 + 错误处理 + 日志系统

## ⚡ 快速启动

```bash
# 克隆并启动
git clone <repository-url>
cd electron-go-framework
npm install && npm start
```

🎉 **就这么简单！** 框架会自动启动 Go 服务器和 Electron 客户端。

## 📋 开发命令

```bash
# 🚀 开发环境
npm start              # 启动完整开发环境 (推荐)
npm run dev            # 等同于 npm start
npm start 8080         # 快速切换到指定端口并启动

# 🎯 分离启动
npm run server         # 仅启动 Go 服务器
npm run client         # 仅启动 Electron 客户端

# 📦 构建和部署
npm run build          # 构建生产版本
npm run pack           # 打包为可执行文件
npm run dist           # 创建安装包

# 🧹 维护工具
npm run clean          # 清理构建文件
npm run change-port    # 更改服务器端口
```

## 🌐 服务端点

| 端点 | 地址 | 说明 |
|------|------|------|
| **Web 服务器** | http://localhost:1313 | Go 后端服务 |
| **健康检查** | http://localhost:1313/health | 服务器状态监控 |
| **系统信息** | http://localhost:1313/api/v1/info | 应用配置信息 |
| **示例 API** | http://localhost:1313/api/v1/hello | Hello World 接口 |

## 📁 项目架构

```
electron-go-framework/
├── 📱 src/                    # Electron 前端
│   ├── main.js               # 主进程 (窗口管理、系统集成)
│   ├── preload.js            # 预加载脚本 (安全API桥接)
│   └── renderer/             # 渲染进程 (用户界面)
│       ├── html/            # HTML 页面
│       ├── css/             # 样式文件
│       └── js/              # JavaScript 逻辑
│
├── 🚀 server/                 # Go 后端服务
│   ├── main.go              # 服务器入口
│   ├── api/                 # RESTful API
│   ├── config/              # 配置管理
│   ├── middleware/          # 中间件
│   ├── models/              # 数据模型
│   └── utils/               # 工具函数
│
├── ⚙️ config/                 # 环境配置
│   ├── development.json     # 开发环境
│   ├── production.json      # 生产环境
│   └── build.json           # 构建配置
│
├── 🔧 scripts/               # 自动化脚本
│   ├── dev.js              # 开发服务器
│   ├── build.js            # 构建脚本
│   ├── clean.js            # 清理脚本
│   └── change-port.js      # 端口管理
│
└── 📚 docs/                  # 项目文档
    ├── DEVELOPMENT.md       # 开发指南
    ├── API.md              # API 文档
    └── DEPLOYMENT.md       # 部署指南
```

## 🛠️ 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **Node.js** | 18.0.0+ | 20.0.0+ |
| **Go** | 1.19+ | 1.21+ |
| **npm** | 8.0.0+ | 9.0.0+ |

## 🎯 框架特性

### 🎨 前端特性
- ✅ **无边框窗口设计** - 现代化用户界面
- ✅ **主题系统** - 支持亮色/暗色/跟随系统

- ✅ **全局快捷键** - 自定义全局热键控制
- ✅ **窗口管理** - 透明度调节、置顶、状态记忆
- ✅ **设置面板** - 完整的配置管理界面

### 🚀 后端特性  
- ✅ **Go 高性能服务器** - 基于 Gin 框架
- ✅ **RESTful API** - 标准化 API 接口
- ✅ **配置管理系统** - 环境配置热切换
- ✅ **中间件支持** - 日志、CORS、错误处理
- ✅ **优雅关闭机制** - 安全的服务器关闭
- ✅ **健康监控** - 服务状态实时监控

### 🛠️ 开发工具
- ✅ **智能开发脚本** - 自动化环境管理
- ✅ **热重载支持** - 代码变更自动重启
- ✅ **文件监听** - Go 文件变化检测
- ✅ **端口管理** - 一键切换开发端口
- ✅ **多模式启动** - 服务器/客户端独立启动
- ✅ **依赖检查** - 自动验证开发环境

### 📦 构建部署
- ✅ **跨平台打包** - Windows/macOS/Linux
- ✅ **自动化构建** - 生产环境优化
- ✅ **资源嵌入** - Go 服务器内嵌打包
- ✅ **安装程序** - NSIS/DMG/AppImage 支持

## 🚀 快速开发指南

### 1. 环境准备
```bash
# 检查环境
node --version  # >= 18.0.0
go version     # >= 1.19
npm --version  # >= 8.0.0
```

### 2. 项目初始化
```bash
# 安装依赖
npm install    # 安装 Node.js 依赖
cd server && go mod tidy  # 安装 Go 依赖
```

### 3. 启动开发环境
```bash
# 方式一：完整启动 (推荐)
npm start

# 方式二：指定端口启动
npm start 8080

# 方式三：分别启动
npm run server  # 启动后端
npm run client  # 启动前端
```

### 4. 开发调试
- 📝 修改 `server/*.go` 文件 → 自动重启后端
- 🎨 修改 `src/renderer/*` 文件 → 刷新前端
- ⚙️ 修改配置文件 → 重启查看效果

### 5. 构建部署
```bash
# 构建生产版本
npm run build

# 创建安装包
npm run dist
```

## 📖 开发文档

| 文档 | 说明 |
|------|------|
| [📖 开发指南](docs/DEVELOPMENT.md) | 详细开发教程和最佳实践 |
| [🔌 API 文档](docs/API.md) | 后端 API 接口说明 |
| [🚀 部署指南](docs/DEPLOYMENT.md) | 生产环境部署指南 |
| [💾 状态持久化](docs/状态持久化说明.md) | 数据持久化方案 |

## 🤝 技术栈

| 分层 | 技术选型 | 版本 |
|------|----------|------|
| **前端框架** | Electron | ^27.0.0 |
| **后端框架** | Go + Gin | 1.21 + 1.9.1 |
| **构建工具** | electron-builder | ^24.13.3 |
| **开发工具** | Node.js Scripts | Custom |
| **UI 组件** | 原生 HTML/CSS/JS | - |

## 💡 使用建议

1. **开发阶段**: 使用 `npm start` 获得最佳开发体验
2. **调试模式**: 使用 `npm start -- --dev` 开启调试工具
3. **端口管理**: 使用 `npm start <端口>` 快速切换端口
4. **性能优化**: 生产构建前先执行 `npm run clean`
5. **多环境**: 修改 `config/` 目录下的配置文件

---

🎯 **开始构建您的现代化桌面应用！** 如有问题，请查看 [开发文档](docs/DEVELOPMENT.md) 或提交 Issue。