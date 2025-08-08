# API 文档

## 概述

本文档描述了 Electron Go 框架中 Go 服务器提供的 REST API 接口。

## 基本信息

- **基础URL**: `http://localhost:1313`
- **内容类型**: `application/json`
- **字符编码**: UTF-8

## 通用响应格式

所有 API 响应都遵循以下格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "error": null,
  "timestamp": 1640995200
}
```

## 端点列表

### 1. 健康检查

检查服务器运行状态。

**端点**: `GET /health`

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": 1640995200,
  "service": "Electron Go App Server",
  "version": "1.0.0"
}
```

**状态码**:
- `200`: 服务器运行正常

---

### 2. 系统信息

获取应用和服务器详细信息。

**端点**: `GET /api/v1/info`

**响应示例**:
```json
{
  "app": {
    "name": "Electron Go App Server",
    "version": "1.0.0",
    "description": "基于Go的桌面应用后端服务",
    "author": "开发者"
  },
  "server": {
            "host": "localhost",
        "port": 1313,
    "mode": "debug"
  },
  "timestamp": 1640995200
}
```

**状态码**:
- `200`: 成功获取信息

---

### 3. Hello API

简单的问候接口，用于测试。

**端点**: `GET /api/v1/hello`

**查询参数**:
- `name` (可选): 问候的姓名，默认为 "World"

**请求示例**:
```
GET /api/v1/hello?name=张三
```

**响应示例**:
```json
{
  "message": "Hello, 张三!",
  "time": "2023-12-31 23:59:59"
}
```

**状态码**:
- `200`: 成功

---

### 4. Echo API

回显消息接口，用于测试 POST 请求。

**端点**: `POST /api/v1/echo`

**请求体**:
```json
{
  "message": "要回显的消息"
}
```

**响应示例**:
```json
{
  "echo": "要回显的消息",
  "timestamp": 1640995200
}
```

**状态码**:
- `200`: 成功
- `400`: 请求参数错误

---

## 错误处理

### 错误响应格式

当 API 请求失败时，服务器会返回以下格式的错误响应：

```json
{
  "success": false,
  "error": "错误描述",
  "timestamp": 1640995200
}
```

### 常见错误码

| 状态码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源未找到 |
| 405 | 方法不允许 |
| 500 | 内部服务器错误 |

### 错误示例

**400 错误 - 请求参数错误**:
```json
{
  "success": false,
  "error": "请求参数错误: message不能为空",
  "timestamp": 1640995200
}
```

**404 错误 - 资源未找到**:
```json
{
  "success": false,
  "error": "请求的资源未找到",
  "timestamp": 1640995200
}
```

**500 错误 - 内部服务器错误**:
```json
{
  "success": false,
  "error": "内部服务器错误",
  "timestamp": 1640995200
}
```

---

## 请求和响应示例

### 使用 cURL

#### 获取系统信息
```bash
curl -X GET http://localhost:1313/api/v1/info
```

#### Hello API
```bash
curl -X GET "http://localhost:1313/api/v1/hello?name=张三"
```

#### Echo API
```bash
curl -X POST http://localhost:1313/api/v1/echo \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World"}'
```

### 使用 JavaScript (Fetch)

#### 获取系统信息
```javascript
const response = await fetch('http://localhost:1313/api/v1/info');
const data = await response.json();
console.log(data);
```

#### Hello API
```javascript
const response = await fetch('http://localhost:1313/api/v1/hello?name=张三');
const data = await response.json();
console.log(data.message); // "Hello, 张三!"
```

#### Echo API
```javascript
const response = await fetch('http://localhost:1313/api/v1/echo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello World' })
});
const data = await response.json();
console.log(data.echo); // "Hello World"
```

---

## 扩展开发

### 添加新的 API 端点

1. 在 `server/api/routes.go` 中注册新路由
2. 创建处理函数
3. 添加必要的数据模型到 `server/models/`
4. 更新本文档

### 示例：添加用户管理 API

```go
// 在 routes.go 中添加
v1.GET("/users", getUsers)
v1.POST("/users", createUser)
v1.GET("/users/:id", getUserByID)
v1.PUT("/users/:id", updateUser)
v1.DELETE("/users/:id", deleteUser)
```

### 中间件

框架支持以下中间件：

- **CORS**: 跨域请求支持
- **Logger**: 请求日志记录
- **Recovery**: 错误恢复
- **Rate Limiting**: 速率限制（可扩展）
- **Authentication**: 身份验证（可扩展）

---

## 版本历史

### v1.0.0
- 初始版本
- 基础健康检查和系统信息 API
- Hello 和 Echo 测试 API
- 完整的错误处理

---

## 联系信息

如有问题或建议，请联系开发团队或查看项目文档。