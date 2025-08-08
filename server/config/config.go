package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config 应用配置结构
type Config struct {
	App    AppConfig    `json:"app"`
	Server ServerConfig `json:"server"`
	Log    LogConfig    `json:"log"`
}

// AppConfig 应用配置
type AppConfig struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Author      string `json:"author"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host         string   `json:"host"`
	Port         int      `json:"port"`
	Mode         string   `json:"mode"` // debug, release
	AllowOrigins []string `json:"allowOrigins"`
	ReadTimeout  int      `json:"readTimeout"`  // 秒
	WriteTimeout int      `json:"writeTimeout"` // 秒
}

// LogConfig 日志配置
type LogConfig struct {
	Level  string `json:"level"`  // debug, info, warn, error
	Format string `json:"format"` // json, text
}

// Address 返回服务器地址
func (s *ServerConfig) Address() string {
	return fmt.Sprintf("%s:%d", s.Host, s.Port)
}

// Load 加载配置
func Load() *Config {
	// 默认配置
	cfg := &Config{
		App: AppConfig{
			Name:        "App Server",
			Version:     "1.0.0",
			Description: "基于Go的桌面应用后端服务",
			Author:      "开发者",
		},
		Server: ServerConfig{
			Host:         "127.0.0.1",
			Port:         1313,
			Mode:         "debug",
			AllowOrigins: []string{"*"},
			ReadTimeout:  30,
			WriteTimeout: 30,
		},
		Log: LogConfig{
			Level:  "info",
			Format: "text",
		},
	}

	// 尝试从配置文件加载
	configFile := getConfigFile()
	if configFile != "" {
		if data, err := os.ReadFile(configFile); err == nil {
			if err := json.Unmarshal(data, cfg); err != nil {
				fmt.Printf("警告：配置文件解析失败，使用默认配置: %v\n", err)
			} else {
				fmt.Printf("已加载配置文件: %s\n", configFile)
			}
		}
	}

	// 环境变量覆盖
	if port := os.Getenv("APP_PORT"); port != "" {
		var p int
		if _, err := fmt.Sscanf(port, "%d", &p); err == nil {
			cfg.Server.Port = p
		}
	}

	if mode := os.Getenv("APP_MODE"); mode != "" {
		cfg.Server.Mode = mode
	}

	return cfg
}

// getConfigFile 获取配置文件路径
func getConfigFile() string {
	// 按优先级顺序查找配置文件
	candidates := []string{
		"config.json",                          // 当前目录
		"../config/config.json",                // 上级config目录
		filepath.Join("config", "config.json"), // config子目录
	}

	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return ""
}

// Save 保存配置到文件
func (c *Config) Save(filename string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	// 确保目录存在
	dir := filepath.Dir(filename)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}
