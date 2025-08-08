const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  
  // 设置窗口
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window'),
  
  // 主题相关
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  toggleTheme: () => ipcRenderer.invoke('toggle-theme'),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, isDark) => callback(isDark));
  },
  
  // 窗口状态
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  
  // 窗口透明度
  setWindowOpacity: (opacity) => ipcRenderer.invoke('set-window-opacity', opacity),
  getWindowOpacity: () => ipcRenderer.invoke('get-window-opacity'),
  
  // 系统集成
  setGlobalHotkey: (setting, hotkey) => ipcRenderer.invoke('set-global-hotkey', setting, hotkey),
  
  // 服务器管理
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  
  // 应用配置
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  
  // 设置管理
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // 监听器移除
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// HTTP API 客户端
contextBridge.exposeInMainWorld('httpAPI', {
  // 基础请求方法
  async request(method, url, data = null, headers = {}) {
    const config = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return result;
    } catch (error) {
      console.error('HTTP请求失败:', error);
      throw error;
    }
  },

  // 便捷方法
  get: (url, headers = {}) => httpAPI.request('GET', url, null, headers),
  post: (url, data, headers = {}) => httpAPI.request('POST', url, data, headers),
  put: (url, data, headers = {}) => httpAPI.request('PUT', url, data, headers),
  delete: (url, headers = {}) => httpAPI.request('DELETE', url, null, headers),

  // API端点
  endpoints: {
    baseURL: 'http://localhost:1313',
    health: 'http://localhost:1313/health',
    info: 'http://localhost:1313/api/v1/info',
    hello: 'http://localhost:1313/api/v1/hello',
    echo: 'http://localhost:1313/api/v1/echo'
  }
});

// 工具函数
contextBridge.exposeInMainWorld('utils', {
  // 时间格式化
  formatTime(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  },

  // 生成随机ID
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
});