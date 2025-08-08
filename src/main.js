const { app, BrowserWindow, ipcMain, nativeTheme, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const windowStateKeeper = require('electron-window-state');

// 禁用GPU加速，避免Windows部分环境GPU进程崩溃
app.disableHardwareAcceleration();

let mainWindow;
let settingsWindow;
let tray = null;
let serverProcess = null;
let registeredHotkeys = new Map();

let isQuitting = false;

// 应用设置
let appSettings = null;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 应用配置
const appConfig = {
  name: 'Electron Go App',
  version: '1.0.0',
      serverPort: 1313,
  serverExecutable: process.platform === 'win32' ? 'app-server.exe' : 'app-server'
};

function createWindow() {
  // 加载窗口状态
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  // 创建主窗口
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    backgroundColor: '#ffffff'
  });

  // 让窗口状态管理器管理新窗口
  mainWindowState.manage(mainWindow);

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, 'renderer/html/index.html'));

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    if (!appSettings.general.silentStartup) {
      mainWindow.show();
    }
    
    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 监听主题变化
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    mainWindow.webContents.send('theme-changed', isDark);
    
    // 如果设置窗口是打开的，也通知它
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('theme-changed', isDark);
    }
  });

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', async () => {
    mainWindow = null;
    if (settingsWindow) {
      settingsWindow.close();
    }
    
    console.log('主窗口关闭，开始清理...');
    if (!isQuitting) {
      isQuitting = true;
      try {
        await stopServer();
        console.log('主窗口关闭清理完成');
      } catch (error) {
        console.error('主窗口关闭时清理失败:', error);
      }
    }
  });
}

// 创建托盘
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            showMainWindow();
          }
        }
      }
    },
    {
      label: '设置',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip(appConfig.name);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
      } else {
        showMainWindow();
      }
    }
  });
}

// 创建设置窗口
function createSettingsWindow() {
  if (settingsWindow) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    backgroundColor: '#ffffff'
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer/html/settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });


}



// 显示主窗口
function showMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

// 启动服务器
function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('正在启动服务器...');
      
      // 查找服务器可执行文件
      const serverPaths = [];
      if (process.resourcesPath) {
        serverPaths.push(
          path.join(process.resourcesPath, 'app.asar.unpacked', 'server', appConfig.serverExecutable),
          path.join(process.resourcesPath, 'server', appConfig.serverExecutable)
        );
      }
      serverPaths.push(path.join(__dirname, '../server', appConfig.serverExecutable));

      let serverPath = null;
      for (const p of serverPaths) {
        if (require('fs').existsSync(p)) {
          serverPath = p;
          break;
        }
      }

      if (serverPath) {
        console.log('使用服务器可执行文件:', serverPath);
        serverProcess = spawn(serverPath, [], { 
          cwd: path.dirname(serverPath), 
          shell: false 
        });
      } else {
        // 尝试使用源码运行
        const serverDir = path.join(__dirname, '../server');
        console.log('使用Go源码启动服务器:', serverDir);
        serverProcess = spawn('go', ['run', 'main.go'], {
          cwd: serverDir,
          shell: true
        });
      }

      serverProcess.stdout.on('data', data => {
        console.log('服务器输出:', data.toString());
      });

      serverProcess.stderr.on('data', data => {
        console.error('服务器错误:', data.toString());
      });

      serverProcess.on('error', error => {
        console.error('服务器启动失败:', error);
        reject(error);
      });

      serverProcess.on('close', code => {
        console.log('服务器已退出:', code);
        serverProcess = null;
      });

      // 等待服务器启动
      setTimeout(() => {
        checkServerHealth()
          .then(() => {
            console.log('服务器启动成功！');
            resolve();
          })
          .catch(err => {
            console.error('服务器健康检查失败:', err);
            reject(err);
          });
      }, 3000);
      
    } catch (error) {
      console.error('启动服务器时出错:', error);
      reject(error);
    }
  });
}

// 检查服务器健康状态
async function checkServerHealth(maxRetries = 10, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${appConfig.serverPort}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 服务器健康检查通过:', data);
        return true;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.log(`服务器健康检查第 ${i + 1}/${maxRetries} 次失败: ${error.message}`);
      if (i === maxRetries - 1) {
        throw new Error('服务器连接失败，请检查服务是否正在运行');
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 停止服务器
function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      return resolve();
    }

    console.log('正在停止服务器...');
    const pid = serverProcess.pid;

    serverProcess.once('close', () => {
      console.log('服务器进程已关闭');
      serverProcess = null;
      resolve();
    });

    if (process.platform === 'win32') {
      const { execFile } = require('child_process');
      execFile('taskkill', ['/F', '/T', '/PID', pid.toString()], (err) => {
        if (err) {
          console.warn('taskkill 执行失败:', err.message);
        }
        setTimeout(() => {
          try {
            process.kill(pid, 0);
            try { process.kill(pid, 'SIGKILL'); } catch (_) {}
          } catch (_) {}
          resolve();
        }, 1000);
      });
    } else {
      try { process.kill(pid, 'SIGTERM'); } catch (_) {}
      setTimeout(() => {
        try { process.kill(pid, 'SIGKILL'); } catch (_) {}
        resolve();
      }, 1000);
    }
  });
}

// 注册全局快捷键
function registerGlobalHotkey(setting, hotkey) {
  try {
    if (registeredHotkeys.has(setting)) {
      const oldHotkey = registeredHotkeys.get(setting);
      if (oldHotkey && globalShortcut.isRegistered(oldHotkey)) {
        globalShortcut.unregister(oldHotkey);
      }
    }
    
    if (!hotkey) {
      registeredHotkeys.delete(setting);
      console.log(`快捷键已取消注册: ${setting}`);
      return { success: true };
    }
    
    const electronHotkey = hotkey.replace(/Ctrl/g, 'CommandOrControl');
    
    if (globalShortcut.isRegistered(electronHotkey)) {
      console.warn(`快捷键已被占用: ${electronHotkey}`);
      return { success: false, error: '快捷键已被其他应用占用' };
    }
    
    const success = globalShortcut.register(electronHotkey, () => {
      handleHotkeyAction(setting);
    });
    
    if (success) {
      registeredHotkeys.set(setting, electronHotkey);
      console.log(`快捷键注册成功: ${setting} = ${electronHotkey}`);
      return { success: true };
    } else {
      console.error(`快捷键注册失败: ${electronHotkey}`);
      return { success: false, error: '快捷键注册失败' };
    }
  } catch (error) {
    console.error('注册全局快捷键时出错:', error);
    return { success: false, error: error.message };
  }
}

// 处理快捷键动作
function handleHotkeyAction(setting) {
  try {
    switch (setting) {
      case 'hotkeyToggle':
        if (mainWindow) {
          if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
            mainWindow.hide();
          } else {
            showMainWindow();
          }
        }
        break;
      case 'hotkeyShow':
        showMainWindow();
        break;
      case 'hotkeyHide':
        if (mainWindow) {
          mainWindow.hide();
        }
        break;
      default:
        console.warn(`未知的快捷键设置: ${setting}`);
    }
  } catch (error) {
    console.error('处理快捷键动作时出错:', error);
  }
}

// 取消注册所有快捷键
function unregisterAllHotkeys() {
  try {
    registeredHotkeys.forEach((hotkey, setting) => {
      if (globalShortcut.isRegistered(hotkey)) {
        globalShortcut.unregister(hotkey);
        console.log(`快捷键已取消注册: ${setting} = ${hotkey}`);
      }
    });
    registeredHotkeys.clear();
    return { success: true };
  } catch (error) {
    console.error('取消注册快捷键时出错:', error);
    return { success: false, error: error.message };
  }
}



// 应用就绪时创建窗口
app.whenReady().then(async () => {

  
  // 加载应用设置
  try {
    const data = await fs.readFile(settingsPath, 'utf8');
    appSettings = JSON.parse(data);
    console.log('✅ 应用设置已加载');
  } catch (error) {
    appSettings = getDefaultSettings();
    console.log('📝 使用默认设置');
  }

  // 应用开机自启动设置
  try {
    if (appSettings.general.launchOnStartup) {
      const settings = app.getLoginItemSettings();
      if (!settings.openAtLogin) {
        app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe') });
      }
    }
  } catch (error) {
    console.error('应用开机自启动设置失败:', error);
  }
  
  // 只在非开发模式下启动服务器
  const isDevMode = process.argv.includes('--dev');
  if (!isDevMode) {
    try {
      await startServer();
      console.log('服务器启动完成');
    } catch (error) {
      console.error('服务器启动失败:', error);
    }
  } else {
    console.log('开发模式：跳过服务器启动，使用外部服务器');
    // 在开发模式下检查服务器连接
    try {
      await checkServerHealth();
      console.log('✅ 已连接到开发服务器');
    } catch (error) {
      console.log('⚠️ 开发服务器连接失败，稍后重试');
    }
  }
  
  createWindow();
  createTray();
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    console.log('所有窗口已关闭，准备退出应用...');
    await stopServer();
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前清理
app.on('before-quit', async (event) => {
  console.log('应用即将退出，开始清理...');
  
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    
    try {
      if (tray) {
        tray.destroy();
      }
      unregisterAllHotkeys();
      await stopServer();
      
      console.log('所有清理工作完成，应用即将退出');
      
      setTimeout(() => {
        process.exit(0);
      }, 100);
      
    } catch (error) {
      console.error('清理过程中出错:', error);
      setTimeout(() => {
        process.exit(1);
      }, 100);
    }
  }
});

// IPC 处理器
ipcMain.handle('get-theme', () => {
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('set-theme', (event, theme) => {
  try {
    // theme 参数：'system' | 'light' | 'dark'
    if (theme === 'system') {
      nativeTheme.themeSource = 'system';
    } else if (theme === 'light') {
      nativeTheme.themeSource = 'light';
    } else if (theme === 'dark') {
      nativeTheme.themeSource = 'dark';
    } else {
      // 如果传入的是布尔值（向后兼容）
      nativeTheme.themeSource = theme ? 'dark' : 'light';
    }
    
    console.log('主题已设置为:', nativeTheme.themeSource);
    return { success: true, theme: nativeTheme.themeSource };
  } catch (error) {
    console.error('设置主题失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-theme', () => {
  try {
    // 切换主题：如果当前是深色则切换到浅色，反之亦然
    const currentIsDark = nativeTheme.shouldUseDarkColors;
    nativeTheme.themeSource = currentIsDark ? 'light' : 'dark';
    
    console.log('主题已切换为:', nativeTheme.themeSource);
    return { 
      success: true, 
      theme: nativeTheme.themeSource,
      isDark: nativeTheme.shouldUseDarkColors
    };
  } catch (error) {
    console.error('切换主题失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
    return !isAlwaysOnTop;
  }
  return false;
});

ipcMain.handle('get-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : false;
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('set-launch-on-startup', (event, enabled) => {
  try {
    const settings = app.getLoginItemSettings();
    if (settings.openAtLogin !== enabled) {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: app.getPath('exe')
      });
    }
    return { success: true };
  } catch (error) {
    console.error('设置开机自启动失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-launch-on-startup', () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (error) {
    console.error('获取开机自启动状态失败:', error);
    return false;
  }
});



ipcMain.handle('set-global-hotkey', (event, setting, hotkey) => {
  try {
    const result = registerGlobalHotkey(setting, hotkey);
    return result;
  } catch (error) {
    console.error('设置全局快捷键失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-server-status', async () => {
  try {
    await checkServerHealth();
    return { success: true, running: true };
  } catch (error) {
    return { success: false, running: false, error: error.message };
  }
});

ipcMain.handle('restart-server', async () => {
  try {
    console.log('重启服务器...');
    await stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startServer();
    return { success: true, message: '服务器重启成功' };
  } catch (error) {
    console.error('重启服务器失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf8');
    appSettings = JSON.parse(data);
    console.log('设置已加载');
    return { success: true, settings: appSettings };
  } catch (error) {
    // 文件不存在或格式错误，使用默认设置
    appSettings = getDefaultSettings();
    console.log('使用默认设置');
    return { success: true, settings: appSettings };
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    appSettings = settings;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log('设置已保存');
    return { success: true };
  } catch (error) {
    console.error('保存设置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', () => {
  if (!appSettings) {
    appSettings = getDefaultSettings();
  }
  return { success: true, settings: appSettings };
});

function getDefaultSettings() {
  return {
    general: {
      alwaysOnTop: false,
      launchOnStartup: false,
      silentStartup: false
    },
    appearance: {
      theme: 'system',
      windowOpacity: 100,
      opacityEnabled: false
    },
    hotkeys: {
      hotkeyToggle: '',
      hotkeyShow: '',
      hotkeyHide: ''
    },
    system: {
      notifications: true
    },
    server: {
      port: 1313,
      timeout: 30
    }
  };
}

ipcMain.handle('get-app-config', () => {
  return {
    name: appConfig.name,
    version: appConfig.version,
    serverPort: appConfig.serverPort,
    serverExecutable: appConfig.serverExecutable
  };
});

ipcMain.handle('set-window-opacity', (event, opacity) => {
  try {
    if (mainWindow) {
      // opacity 应该是 0-100 的数值，转换为 0-1 的范围
      const opacityValue = Math.max(0.1, Math.min(1, opacity / 100));
      mainWindow.setOpacity(opacityValue);
      console.log('窗口透明度已设置为:', opacity + '%');
      return { success: true, opacity: opacity };
    }
    return { success: false, error: '主窗口未找到' };
  } catch (error) {
    console.error('设置窗口透明度失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-window-opacity', () => {
  try {
    if (mainWindow) {
      const opacity = mainWindow.getOpacity();
      return { success: true, opacity: Math.round(opacity * 100) };
    }
    return { success: false, error: '主窗口未找到' };
  } catch (error) {
    console.error('获取窗口透明度失败:', error);
    return { success: false, error: error.message };
  }
});