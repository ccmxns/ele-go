// 主应用脚本
class ElectronGoApp {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.config = {
            theme: 'system',
            autoSave: true,
            checkInterval: 10000
        };
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // 加载用户配置
            await this.loadConfig();
            
            // 初始化主题
            await this.initializeTheme();
            
            // 初始化时间显示
            this.initializeTimeDisplay();
            
            // 初始化服务器状态检查
            this.initializeServerStatus();
            
            // 初始化键盘快捷键
            this.initializeKeyboardShortcuts();
            
            // 初始化错误处理
            this.initializeErrorHandling();
            
            // 标记为已初始化
            this.isInitialized = true;
            
            console.log('应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage('应用初始化失败，某些功能可能无法正常工作');
        }
    }

    async loadConfig() {
        try {
            const savedConfig = localStorage.getItem('appConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置:', error);
        }
    }

    async saveConfig() {
        try {
            localStorage.setItem('appConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('保存配置失败:', error);
        }
    }

    async initializeTheme() {
        try {
            // 获取当前主题
            const isDark = await window.electronAPI.getTheme();
            this.applyTheme(isDark);
            
            // 监听主题变化
            window.electronAPI.onThemeChanged((isDark) => {
                this.applyTheme(isDark);
            });
            
        } catch (error) {
            console.warn('主题初始化失败:', error);
        }
    }

    applyTheme(isDark) {
        const root = document.documentElement;
        
        if (isDark) {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        }
        
        // 触发主题变化事件
        const event = new CustomEvent('themeChanged', {
            detail: { isDark }
        });
        document.dispatchEvent(event);
    }

    initializeTimeDisplay() {
        const updateTime = () => {
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                const now = new Date();
                timeElement.textContent = now.toLocaleTimeString('zh-CN', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        };

        // 立即更新一次
        updateTime();
        
        // 每秒更新
        setInterval(updateTime, 1000);
    }

    initializeServerStatus() {
        // 立即检查一次服务器状态
        this.checkServerStatus();
        
        // 每10秒检查一次服务器状态
        setInterval(() => {
            this.checkServerStatus();
        }, 10000);
    }

    async checkServerStatus() {
        const statusElement = document.getElementById('statusBarServer');
        if (!statusElement) return;

        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('.status-text');
        
        if (!statusDot || !statusText) return;

        try {
            // 设置检查中状态
            this.updateServerStatus(statusElement, statusDot, statusText, 'checking', '服务器: 检查中');
            
            // 调用主进程的服务器状态检查
            const result = await window.electronAPI.checkServerStatus();
            
            if (result.success && result.running) {
                this.updateServerStatus(statusElement, statusDot, statusText, 'online', '服务器: 运行正常');
            } else {
                this.updateServerStatus(statusElement, statusDot, statusText, 'offline', '服务器: 离线');
            }
        } catch (error) {
            console.error('检查服务器状态失败:', error);
            this.updateServerStatus(statusElement, statusDot, statusText, 'error', '服务器: 检查失败');
        }
    }

    updateServerStatus(statusElement, statusDot, statusText, status, text) {
        // 移除所有状态类
        statusElement.classList.remove('status-online', 'status-offline', 'status-checking', 'status-error');
        statusDot.classList.remove('online', 'offline', 'checking', 'error');
        
        // 添加新状态类
        statusElement.classList.add(`status-${status}`);
        statusDot.classList.add(status);
        
        // 更新文本
        statusText.textContent = text;
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 全局快捷键处理
            if (this.handleGlobalShortcuts(event)) {
                event.preventDefault();
                return;
            }
            
            // 应用快捷键处理
            this.handleAppShortcuts(event);
        });
    }

    handleGlobalShortcuts(event) {
        const { ctrlKey, metaKey, altKey, shiftKey, key } = event;
        const cmdOrCtrl = ctrlKey || metaKey;
        
        // Ctrl/Cmd + R: 刷新页面
        if (cmdOrCtrl && key === 'r') {
            this.refreshCurrentPage();
            return true;
        }
        
        // Ctrl/Cmd + Shift + I: 打开开发者工具（开发模式）
        if (cmdOrCtrl && shiftKey && key === 'I') {
            console.log('开发者工具快捷键触发');
            return true;
        }
        
        // F5: 刷新
        if (key === 'F5') {
            this.refreshCurrentPage();
            return true;
        }
        
        // F11: 切换全屏
        if (key === 'F11') {
            this.toggleFullscreen();
            return true;
        }
        
        return false;
    }

    handleAppShortcuts(event) {
        const { ctrlKey, metaKey, key } = event;
        const cmdOrCtrl = ctrlKey || metaKey;
        
        // Ctrl/Cmd + ,: 打开设置
        if (cmdOrCtrl && key === ',') {
            event.preventDefault();
            this.openSettings();
        }
        
        // Ctrl/Cmd + 1-9: 切换页面
        if (cmdOrCtrl && key >= '1' && key <= '9') {
            event.preventDefault();
            const pageIndex = parseInt(key) - 1;
            this.switchToPage(pageIndex);
        }
    }

    initializeErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.handleError(event.error);
        });

        // Promise 拒绝处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.handleError(event.reason);
        });
    }

    handleError(error) {
        // 记录错误
        this.logError(error);
        
        // 根据错误类型决定是否显示用户提示
        if (this.shouldShowErrorToUser(error)) {
            this.showErrorMessage(`发生错误: ${error.message}`);
        }
    }

    shouldShowErrorToUser(error) {
        // 网络错误显示给用户
        if (error.message && error.message.includes('fetch')) {
            return true;
        }
        
        // API错误显示给用户
        if (error.message && error.message.includes('API')) {
            return true;
        }
        
        // 其他错误只记录日志
        return false;
    }

    logError(error) {
        const errorLog = {
            message: error.message || error.toString(),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 保存到本地存储
        try {
            const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            logs.push(errorLog);
            
            // 只保留最近50条错误日志
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }
            
            localStorage.setItem('errorLogs', JSON.stringify(logs));
        } catch (e) {
            console.warn('保存错误日志失败:', e);
        }
    }

    showErrorMessage(message, duration = 5000) {
        this.showMessage(message, 'error', duration);
    }

    showSuccessMessage(message, duration = 3000) {
        this.showMessage(message, 'success', duration);
    }

    showWarningMessage(message, duration = 4000) {
        this.showMessage(message, 'warning', duration);
    }

    showMessage(message, type = 'info', duration = 3000) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `app-message ${type}`;
        messageEl.textContent = message;
        
        // 设置样式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '50px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10001',
            maxWidth: '400px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'slideInRight 0.3s ease-out'
        });
        
        // 设置类型颜色
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007acc'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        closeBtn.addEventListener('click', () => {
            this.removeMessage(messageEl);
        });
        
        messageEl.appendChild(closeBtn);
        document.body.appendChild(messageEl);
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeMessage(messageEl);
            }, duration);
        }
        
        return messageEl;
    }

    removeMessage(messageEl) {
        if (messageEl && messageEl.parentNode) {
            messageEl.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }

    async openSettings() {
        try {
            await window.electronAPI.openSettings();
        } catch (error) {
            console.error('打开设置失败:', error);
            this.showErrorMessage('无法打开设置窗口');
        }
    }

    refreshCurrentPage() {
        if (window.navigation) {
            window.navigation.refreshCurrentPage();
        } else {
            location.reload();
        }
    }

    switchToPage(pageIndex) {
        if (window.navigation) {
            const pages = window.navigation.getAllPages();
            if (pageIndex < pages.length) {
                window.navigation.navigateTo(pages[pageIndex]);
            }
        }
    }

    async toggleFullscreen() {
        // 这里可以添加全屏切换逻辑
        console.log('切换全屏模式');
    }

    // 获取应用统计信息
    getAppStats() {
        return {
            startTime: this.startTime,
            uptime: Date.now() - this.startTime,
            errorCount: this.getErrorCount(),
            config: this.config,
            isInitialized: this.isInitialized
        };
    }

    getErrorCount() {
        try {
            const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            return logs.length;
        } catch (e) {
            return 0;
        }
    }

    // 清理错误日志
    clearErrorLogs() {
        localStorage.removeItem('errorLogs');
        this.showSuccessMessage('错误日志已清理');
    }

    // 导出错误日志
    exportErrorLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            const dataStr = JSON.stringify(logs, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showSuccessMessage('错误日志已导出');
        } catch (error) {
            console.error('导出错误日志失败:', error);
            this.showErrorMessage('导出失败');
        }
    }

    // 重置应用
    async resetApp() {
        try {
            // 清理存储
            localStorage.clear();
            
            // 重新加载页面
            location.reload();
        } catch (error) {
            console.error('重置应用失败:', error);
            this.showErrorMessage('重置失败');
        }
    }

    // 获取系统信息
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            }
        };
    }

    // 销毁应用
    destroy() {
        // 清理定时器
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }
        
        // 保存配置
        this.saveConfig();
        
        // 标记为未初始化
        this.isInitialized = false;
        
        console.log('应用已销毁');
    }
}

// 全局应用实例
let app;

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    app = new ElectronGoApp();
    app.startTime = Date.now();
    
    try {
        await app.initialize();
        console.log('Electron Go App 启动完成');
    } catch (error) {
        console.error('应用启动失败:', error);
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// 导出应用实例供其他脚本使用
window.app = app;

// 添加CSS动画和状态样式
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.app-message {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

/* 服务器状态样式 */
.server-status-indicator .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    transition: background-color 0.3s ease;
}

.server-status-indicator .status-dot.online {
    background-color: #28a745;
}

.server-status-indicator .status-dot.offline {
    background-color: #dc3545;
}

.server-status-indicator .status-dot.checking {
    background-color: #ffc107;
    animation: pulse 1.5s infinite;
}

.server-status-indicator .status-dot.error {
    background-color: #fd7e14;
}

.server-status-indicator.status-online .status-text {
    color: #28a745;
}

.server-status-indicator.status-offline .status-text {
    color: #dc3545;
}

.server-status-indicator.status-checking .status-text {
    color: #856404;
}

.server-status-indicator.status-error .status-text {
    color: #fd7e14;
}
`;
document.head.appendChild(style);