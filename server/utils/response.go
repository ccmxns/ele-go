package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse 标准API响应结构
type APIResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// SuccessResponse 成功响应
func SuccessResponse(c *gin.Context, data interface{}, message ...string) {
	msg := "success"
	if len(message) > 0 {
		msg = message[0]
	}

	c.JSON(http.StatusOK, APIResponse{
		Success:   true,
		Message:   msg,
		Data:      data,
		Timestamp: GetCurrentTimestamp(),
	})
}

// ErrorResponse 错误响应
func ErrorResponse(c *gin.Context, statusCode int, error string) {
	c.JSON(statusCode, APIResponse{
		Success:   false,
		Error:     error,
		Timestamp: GetCurrentTimestamp(),
	})
}

// BadRequestResponse 400错误响应
func BadRequestResponse(c *gin.Context, error string) {
	ErrorResponse(c, http.StatusBadRequest, error)
}

// UnauthorizedResponse 401错误响应
func UnauthorizedResponse(c *gin.Context, error string) {
	ErrorResponse(c, http.StatusUnauthorized, error)
}

// NotFoundResponse 404错误响应
func NotFoundResponse(c *gin.Context, error string) {
	ErrorResponse(c, http.StatusNotFound, error)
}

// InternalServerErrorResponse 500错误响应
func InternalServerErrorResponse(c *gin.Context, error string) {
	ErrorResponse(c, http.StatusInternalServerError, error)
}
