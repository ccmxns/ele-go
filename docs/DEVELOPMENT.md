# 开发指南

本文档详细说明如何使用 Electron Go 框架进行桌面应用开发。

## 开发环境搭建

### 系统要求

- **Node.js**: 16.x 或更高版本
- **Go**: 1.21 或更高版本
- **Git**: 用于版本控制
- **IDE**: 推荐 VS Code 或 GoLand

### 环境安装

#### 1. 安装 Node.js
```bash
# 使用 nvm (推荐)
nvm install 18
nvm use 18

# 或直接下载安装
# https://nodejs.org/
```

#### 2. 安装 Go
```bash
# macOS (使用 Homebrew)
brew install go

# Ubuntu/Debian
sudo apt-get install golang-go

# 或直接下载安装
# https://golang.org/dl/
```

#### 3. 验证安装
```bash
node --version  # v18.x.x
npm --version   # 9.x.x
go version      # go version go1.21.x
```

### 项目初始化

#### 1. 创建新项目
```bash
# 复制框架模板
cp -r electron-go-framework your-project-name
cd your-project-name

# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit"
```

#### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 检查 Go 依赖
cd server
go mod tidy
```

#### 3. 配置项目
```bash
# 复制配置文件
cp config/development.json server/config.json

# 修改应用信息
vim package.json  # 更新 name, version, description 等
vim server/go.mod        # 更新模块名
```

## 开发工作流

### 启动开发环境

```bash
# 启动完整开发环境
cd scripts
node dev.js

# 或分别启动
node dev.js --server-only  # 只启动服务器
node dev.js --client-only  # 只启动客户端
```

### 开发模式功能

- **热重载**: 文件修改后自动重启
- **错误监控**: 实时显示错误信息
- **调试工具**: 开发者工具和日志
- **API 测试**: 内置 API 测试界面

### 目录结构解析

```
your-project/
├── server/                 # Go 服务器
│   ├── main.go            # 入口文件
│   ├── api/               # API 路由
│   │   └── routes.go      # 路由定义
│   ├── config/            # 配置管理
│   │   └── config.go      # 配置加载
│   ├── middleware/        # 中间件
│   │   └── logger.go      # 日志中间件
│   ├── models/            # 数据模型
│   │   └── user.go        # 示例模型
│   └── utils/             # 工具函数
│       ├── response.go    # 响应工具
│       └── time.go        # 时间工具
├── src/                   # Electron 前端
│   ├── main.js            # 主进程
│   ├── preload.js         # 预加载脚本
│   ├── renderer/          # 渲染进程
│   │   ├── html/          # HTML 页面
│   │   ├── css/           # 样式文件
│   │   └── js/            # JavaScript 文件
│   └── assets/            # 静态资源
├── dist/                  # 构建输出
├── scripts/               # 构建脚本
│   ├── dev.js            # 开发脚本
│   ├── build.js          # 构建脚本
│   └── clean.js          # 清理脚本
├── config/               # 配置文件
│   ├── development.json  # 开发配置
│   ├── production.json   # 生产配置
│   └── build.json        # 构建配置
└── docs/                 # 文档
    ├── API.md            # API 文档
    ├── DEPLOYMENT.md     # 部署指南
    └── DEVELOPMENT.md    # 开发指南
```

## 后端开发

### API 开发

#### 1. 添加新路由
```go
// 在 api/routes.go 中添加
func RegisterRoutes(r *gin.Engine, cfg *config.Config) {
    v1 := r.Group("/api/v1")
    {
        // 现有路由...
        
        // 新增用户管理路由
        users := v1.Group("/users")
        {
            users.GET("", getUsers)
            users.POST("", createUser)
            users.GET("/:id", getUserByID)
            users.PUT("/:id", updateUser)
            users.DELETE("/:id", deleteUser)
        }
    }
}
```

#### 2. 实现处理函数
```go
// 获取用户列表
func getUsers(c *gin.Context) {
    // 解析查询参数
    page := c.DefaultQuery("page", "1")
    limit := c.DefaultQuery("limit", "10")
    
    // 业务逻辑
    users, err := userService.GetUsers(page, limit)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    
    // 返回响应
    utils.SuccessResponse(c, users, "获取用户列表成功")
}

// 创建用户
func createUser(c *gin.Context) {
    var req models.CreateUserRequest
    
    // 绑定请求参数
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.BadRequestResponse(c, "请求参数错误: "+err.Error())
        return
    }
    
    // 创建用户
    user, err := userService.CreateUser(req)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    
    utils.SuccessResponse(c, user, "用户创建成功")
}
```

#### 3. 定义数据模型
```go
// 在 models/user.go 中定义
type User struct {
    ID        uint      `json:"id" gorm:"primarykey"`
    Username  string    `json:"username" gorm:"uniqueIndex;not null"`
    Email     string    `json:"email" gorm:"uniqueIndex;not null"`
    Avatar    string    `json:"avatar"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=20"`
    Email    string `json:"email" binding:"required,email"`
    Avatar   string `json:"avatar"`
}
```

### 数据库集成

#### 1. 添加 GORM 依赖
```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/sqlite  # 或其他数据库驱动
```

#### 2. 数据库配置
```go
// config/database.go
type DatabaseConfig struct {
    Driver   string `json:"driver"`
    Host     string `json:"host"`
    Port     int    `json:"port"`
    Username string `json:"username"`
    Password string `json:"password"`
    Database string `json:"database"`
}

func InitDatabase(cfg DatabaseConfig) (*gorm.DB, error) {
    var dsn string
    
    switch cfg.Driver {
    case "sqlite":
        dsn = cfg.Database
    case "mysql":
        dsn = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
            cfg.Username, cfg.Password, cfg.Host, cfg.Port, cfg.Database)
    // 其他数据库...
    }
    
    db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err
    }
    
    // 自动迁移
    err = db.AutoMigrate(&User{})
    if err != nil {
        return nil, err
    }
    
    return db, nil
}
```

### 中间件开发

#### 1. 认证中间件
```go
// middleware/auth.go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        
        if token == "" {
            utils.UnauthorizedResponse(c, "缺少认证令牌")
            c.Abort()
            return
        }
        
        // 验证令牌
        claims, err := validateToken(token)
        if err != nil {
            utils.UnauthorizedResponse(c, "无效的认证令牌")
            c.Abort()
            return
        }
        
        // 设置用户信息
        c.Set("userID", claims.UserID)
        c.Set("username", claims.Username)
        
        c.Next()
    }
}
```

#### 2. 限流中间件
```go
// middleware/ratelimit.go
func RateLimitMiddleware(maxRequests int, duration time.Duration) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(duration), maxRequests)
    
    return func(c *gin.Context) {
        if !limiter.Allow() {
            utils.ErrorResponse(c, http.StatusTooManyRequests, "请求过于频繁")
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

## 前端开发

### 页面开发

#### 1. 创建新页面
```html
<!-- renderer/html/users.html -->
<!DOCTYPE html>
<html>
<head>
    <title>用户管理</title>
    <link rel="stylesheet" href="../css/main.css">
</head>
<body>
    <div class="page" id="usersPage">
        <div class="page-header">
            <h1>用户管理</h1>
        </div>
        
        <div class="user-list">
            <!-- 用户列表内容 -->
        </div>
    </div>
    
    <script src="../js/users.js"></script>
</body>
</html>
```

#### 2. 添加页面逻辑
```javascript
// renderer/js/users.js
class UserManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.pageSize = 10;
    }
    
    async loadUsers() {
        try {
            const response = await window.httpAPI.get(
                `${window.httpAPI.endpoints.baseURL}/api/v1/users?page=${this.currentPage}&limit=${this.pageSize}`
            );
            
            this.users = response.data;
            this.renderUsers();
        } catch (error) {
            console.error('加载用户失败:', error);
            this.showError('加载用户失败');
        }
    }
    
    renderUsers() {
        const container = document.querySelector('.user-list');
        container.innerHTML = this.users.map(user => `
            <div class="user-card" data-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar || 'default-avatar.png'}" alt="${user.username}">
                </div>
                <div class="user-info">
                    <h3>${user.username}</h3>
                    <p>${user.email}</p>
                </div>
                <div class="user-actions">
                    <button onclick="userManager.editUser(${user.id})">编辑</button>
                    <button onclick="userManager.deleteUser(${user.id})">删除</button>
                </div>
            </div>
        `).join('');
    }
    
    async createUser(userData) {
        try {
            await window.httpAPI.post(
                `${window.httpAPI.endpoints.baseURL}/api/v1/users`,
                userData
            );
            
            this.loadUsers(); // 重新加载列表
            this.showSuccess('用户创建成功');
        } catch (error) {
            console.error('创建用户失败:', error);
            this.showError('创建用户失败');
        }
    }
}

const userManager = new UserManager();
```

#### 3. 添加样式
```css
/* renderer/css/users.css */
.user-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
}

.user-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s ease;
}

.user-card:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
}

.user-avatar img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
}

.user-info h3 {
    margin: 10px 0 5px;
    color: var(--text-primary);
}

.user-info p {
    color: var(--text-secondary);
    font-size: 14px;
}

.user-actions {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}
```

### IPC 通信

#### 1. 主进程 IPC 处理
```javascript
// main.js 中添加
ipcMain.handle('get-app-data', async () => {
    try {
        const data = await loadAppData();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-app-data', async (event, data) => {
    try {
        await saveAppData(data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

#### 2. 预加载脚本暴露 API
```javascript
// preload.js 中添加
contextBridge.exposeInMainWorld('appAPI', {
    // 数据操作
    getAppData: () => ipcRenderer.invoke('get-app-data'),
    saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
    
    // 文件操作
    selectFile: () => ipcRenderer.invoke('select-file'),
    saveFile: (content) => ipcRenderer.invoke('save-file', content),
    
    // 通知
    showNotification: (message) => ipcRenderer.invoke('show-notification', message)
});
```

#### 3. 渲染进程使用
```javascript
// 在渲染进程中使用
async function loadData() {
    const result = await window.appAPI.getAppData();
    if (result.success) {
        console.log('数据加载成功:', result.data);
    } else {
        console.error('数据加载失败:', result.error);
    }
}
```

## 测试

### 单元测试

#### 1. Go 后端测试
```go
// api/routes_test.go
func TestHealthCheck(t *testing.T) {
    router := gin.Default()
    RegisterRoutes(router, &config.Config{})
    
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/health", nil)
    router.ServeHTTP(w, req)
    
    assert.Equal(t, 200, w.Code)
    
    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, "ok", response["status"])
}
```

#### 2. 前端测试
```javascript
// test/api-test.spec.js
describe('API Tests', () => {
    test('should get system info', async () => {
        const response = await fetch('http://localhost:1313/api/v1/info');
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.app).toBeDefined();
        expect(data.server).toBeDefined();
    });
});
```

### 集成测试

```bash
# 运行所有测试
npm test

# 运行后端测试
cd server && go test ./...

# 运行前端测试
cd client && npm test

# 端到端测试
npm run test:e2e
```

## 调试技巧

### 后端调试

#### 1. 使用 Delve 调试器
```bash
# 安装 Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# 启动调试
dlv debug main.go
```

#### 2. 添加调试日志
```go
import "github.com/sirupsen/logrus"

logrus.WithFields(logrus.Fields{
    "user_id": userID,
    "action":  "create_user",
}).Info("用户创建操作")
```

### 前端调试

#### 1. Electron 开发者工具
```javascript
// 在开发模式下自动打开
if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
}
```

#### 2. 远程调试
```bash
# 启用远程调试
electron . --remote-debugging-port=9222
```

## 最佳实践

### 代码规范

#### 1. Go 代码规范
- 使用 `gofmt` 格式化代码
- 遵循 Go 命名约定
- 编写有意义的注释
- 使用错误处理最佳实践

#### 2. JavaScript 代码规范
- 使用 ESLint 和 Prettier
- 采用模块化开发
- 避免全局变量
- 使用 async/await 处理异步操作

### 安全最佳实践

#### 1. 输入验证
```go
// 服务器端验证
type CreateUserRequest struct {
    Username string `json:"username" binding:"required,min=3,max=20,alphanum"`
    Email    string `json:"email" binding:"required,email"`
}
```

#### 2. 内容安全策略
```javascript
// 设置严格的 CSP
session.defaultSession.webSecurity = true;
```

### 性能优化

#### 1. 懒加载
```javascript
// 动态加载页面
async function loadPage(pageName) {
    const module = await import(`./pages/${pageName}.js`);
    return module.default;
}
```

#### 2. 缓存策略
```go
// 添加缓存中间件
func CacheMiddleware(duration time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Cache-Control", fmt.Sprintf("max-age=%d", int(duration.Seconds())))
        c.Next()
    }
}
```

## 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 查找占用端口的进程
lsof -i :1313
netstat -tulpn | grep 1313

# 杀死进程
kill -9 <PID>
```

#### 2. 依赖问题
```bash
# 清理并重新安装
npm run clean
rm -rf node_modules package-lock.json
npm install

# Go 模块问题
go clean -modcache
go mod download
```

#### 3. 跨平台兼容性
```javascript
// 路径处理
const path = require('path');
const configPath = path.join(__dirname, 'config.json');

// 平台检测
if (process.platform === 'win32') {
    // Windows 特定代码
} else if (process.platform === 'darwin') {
    // macOS 特定代码
}
```

## 扩展和插件

### 添加新功能模块

#### 1. 创建模块结构
```
modules/
├── user-management/
│   ├── server/
│   │   ├── routes.go
│   │   ├── models.go
│   │   └── service.go
│   └── client/
│       ├── users.html
│       ├── users.js
│       └── users.css
```

#### 2. 注册模块
```go
// 在主路由中注册模块
func RegisterModules(r *gin.Engine) {
    userModule.RegisterRoutes(r)
    settingsModule.RegisterRoutes(r)
    // 其他模块...
}
```

### 第三方集成

#### 1. 数据库 ORM
```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql
```

#### 2. 前端 UI 库
```bash
npm install element-plus  # Vue 组件库
npm install antd          # React 组件库
```

## 发布准备

### 版本管理
```bash
# 更新版本号
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0
```

### 构建检查
```bash
# 运行所有检查
npm run lint     # 代码规范检查
npm run test     # 运行测试
npm run build    # 构建应用
```

---

更多详细信息请参考 [API 文档](API.md) 和 [部署指南](DEPLOYMENT.md)。