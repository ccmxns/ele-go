package utils

import (
	"time"
)

// GetCurrentTimestamp 获取当前时间戳（秒）
func GetCurrentTimestamp() int64 {
	return time.Now().Unix()
}

// GetCurrentTimestampMs 获取当前时间戳（毫秒）
func GetCurrentTimestampMs() int64 {
	return time.Now().UnixMilli()
}

// FormatTime 格式化时间
func FormatTime(t time.Time, layout ...string) string {
	format := "2006-01-02 15:04:05"
	if len(layout) > 0 {
		format = layout[0]
	}
	return t.Format(format)
}

// GetCurrentTimeString 获取当前时间字符串
func GetCurrentTimeString(layout ...string) string {
	return FormatTime(time.Now(), layout...)
}

// ParseTime 解析时间字符串
func ParseTime(timeStr string, layout ...string) (time.Time, error) {
	format := "2006-01-02 15:04:05"
	if len(layout) > 0 {
		format = layout[0]
	}
	return time.Parse(format, timeStr)
}
