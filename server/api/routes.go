package api

import (
	"app-server/config"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册所有路由
func RegisterRoutes(r *gin.Engine, cfg *config.Config) {
	// 健康检查
	r.GET("/health", healthCheck(cfg))

	// API版本组
	v1 := r.Group("/api/v1")
	{
		// 系统信息
		v1.GET("/info", getSystemInfo(cfg))

		// 示例路由组
		v1.GET("/hello", sayHello)
		v1.POST("/echo", echoMessage)
	}
}

// healthCheck 健康检查端点
func healthCheck(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
			"service":   cfg.App.Name,
			"version":   cfg.App.Version,
		})
	}
}

// getSystemInfo 获取系统信息
func getSystemInfo(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"app": gin.H{
				"name":        cfg.App.Name,
				"version":     cfg.App.Version,
				"description": cfg.App.Description,
				"author":      cfg.App.Author,
			},
			"server": gin.H{
				"host": cfg.Server.Host,
				"port": cfg.Server.Port,
				"mode": cfg.Server.Mode,
			},
			"timestamp": time.Now().Unix(),
		})
	}
}

// sayHello 示例Hello接口
func sayHello(c *gin.Context) {
	name := c.DefaultQuery("name", "World")
	c.JSON(http.StatusOK, gin.H{
		"message": "Hello, " + name + "!",
		"time":    time.Now().Format("2006-01-02 15:04:05"),
	})
}

// echoMessage 示例Echo接口
func echoMessage(c *gin.Context) {
	var request struct {
		Message string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"echo":      request.Message,
		"timestamp": time.Now().Unix(),
	})
}
