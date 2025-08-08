package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// Logger 自定义日志中间件
func Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// 格式化时间
		var timeFormat = "2006/01/02 15:04:05"

		// 状态码颜色
		var statusColor, methodColor, resetColor string
		if param.IsOutputColor() {
			statusColor = param.StatusCodeColor()
			methodColor = param.MethodColor()
			resetColor = param.ResetColor()
		}

		// 输出格式
		return fmt.Sprintf("[GIN] %v |%s %3d %s| %13v | %15s |%s %-7s %s %#v\n%s",
			param.TimeStamp.Format(timeFormat),
			statusColor, param.StatusCode, resetColor,
			param.Latency,
			param.ClientIP,
			methodColor, param.Method, resetColor,
			param.Path,
			param.ErrorMessage,
		)
	})
}

// Recovery 恢复中间件
func Recovery() gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultWriter, func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			c.String(500, fmt.Sprintf("内部服务器错误: %s", err))
		}
		c.AbortWithStatus(500)
	})
}
