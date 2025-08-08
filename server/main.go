package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"app-server/api"
	"app-server/config"
	"app-server/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 设置Gin模式
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建Gin实例
	r := gin.Default()

	// 配置CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.Server.AllowOrigins
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	// 添加中间件
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())

	// 注册路由
	api.RegisterRoutes(r, cfg)

	log.Printf("🚀 %s 正在启动...", cfg.App.Name)
	log.Printf("📡 监听端口: %d", cfg.Server.Port)
	log.Printf("🔗 健康检查: http://localhost:%d/health", cfg.Server.Port)
	log.Printf("🛠️ 模式: %s", cfg.Server.Mode)

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:         cfg.Server.Address(),
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// 启动服务器（在goroutine中）
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %v", err)
		}
	}()

	// 优雅关闭处理
	gracefulShutdown(srv)
}

func gracefulShutdown(srv *http.Server) {
	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)

	// 根据操作系统注册信号
	if runtime.GOOS == "windows" {
		log.Println("🔧 Windows平台：已注册 os.Interrupt 信号")
	} else {
		signal.Notify(quit, syscall.SIGTERM)
		log.Println("🔧 Unix平台：已注册 os.Interrupt 和 SIGTERM 信号")
	}

	log.Println("⏳ 等待关闭信号...")
	<-quit

	log.Println("🛑 收到关闭信号，正在优雅关闭服务器...")

	// 设置关闭超时
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("❌ 服务器强制关闭: %v", err)
	} else {
		log.Println("✅ 服务器已优雅关闭")
	}
}
