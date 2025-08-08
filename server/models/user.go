package models

import (
	"time"
)

// User 用户模型示例
type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=20"`
	Email    string `json:"email" binding:"required,email"`
	Avatar   string `json:"avatar,omitempty"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Username string `json:"username,omitempty" binding:"omitempty,min=3,max=20"`
	Email    string `json:"email,omitempty" binding:"omitempty,email"`
	Avatar   string `json:"avatar,omitempty"`
}

// UserService 用户服务接口
type UserService interface {
	Create(req CreateUserRequest) (*User, error)
	GetByID(id uint) (*User, error)
	GetByUsername(username string) (*User, error)
	Update(id uint, req UpdateUserRequest) (*User, error)
	Delete(id uint) error
	List(offset, limit int) ([]*User, error)
}
