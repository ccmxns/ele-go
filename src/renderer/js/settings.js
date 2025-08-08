// 设置页面脚本
class SettingsManager {
    constructor() {
        this.settings = {
            general: {
                alwaysOnTop: false,
                launchOnStartup: false,
                silentStartup: false
            },
            
            appearance: {
                theme: 'system', // 'system', 'light', 'dark'
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
        
        this.currentSection = 'general';
        this.isRecordingHotkey = false;
        this.recordingInput = null;
        this.isDirty = false;
    }

    async initialize() {
        await this.loadSettings();
        this.bindEvents();
        this.bindNavigation();
        this.bindTitlebarButtons();
        this.initializeTheme();
        this.updateUI();
        this.showSection('general');
    }

    bindEvents() {
        // 导航事件
        this.bindNavigation();
        
        // 常规设置
        this.bindGeneralSettings();

        
        // 快捷键设置
        this.bindHotkeySettings();
        
        // 系统设置
        this.bindSystemSettings();
        
        // 服务器设置
        this.bindServerSettings();
        
        // 底部按钮
        this.bindFooterButtons();
        
        // 标题栏按钮
        this.bindTitlebarButtons();
    }

    bindNavigation() {
        document.addEventListener('click', (event) => {
            const navItem = event.target.closest('.settings-nav-item');
            if (navItem) {
                event.preventDefault();
                const section = navItem.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            }
        });
    }

    bindGeneralSettings() {




        // 窗口置顶
        const alwaysOnTopCheckbox = document.getElementById('alwaysOnTopCheckbox');
        if (alwaysOnTopCheckbox) {
            alwaysOnTopCheckbox.addEventListener('change', (e) => {
                this.settings.general.alwaysOnTop = e.target.checked;
                this.setAlwaysOnTop(e.target.checked);
                this.markDirty();
            });
        }

        // 开机自启动
        const launchOnStartupCheckbox = document.getElementById('launchOnStartupCheckbox');
        if (launchOnStartupCheckbox) {
            launchOnStartupCheckbox.addEventListener('change', (e) => {
                this.settings.general.launchOnStartup = e.target.checked;
                this.setLaunchOnStartup(e.target.checked);
                this.markDirty();
            });
        }

        // 静默启动
        const silentStartupCheckbox = document.getElementById('silentStartupCheckbox');
        if (silentStartupCheckbox) {
            silentStartupCheckbox.addEventListener('change', (e) => {
                this.settings.general.silentStartup = e.target.checked;
                this.markDirty();
            });
        }


    }



    bindHotkeySettings() {
        const hotkeyInputs = [
            'hotkeyToggleInput',
            'hotkeyShowInput', 
            'hotkeyHideInput'
        ];

        hotkeyInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const clearBtn = document.getElementById(inputId.replace('Input', '').replace('hotkey', 'clearHotkey'));
            
            if (input) {
                input.addEventListener('click', () => {
                    this.startHotkeyRecording(input);
                });
                
                input.addEventListener('keydown', (e) => {
                    if (this.isRecordingHotkey && this.recordingInput === input) {
                        this.recordHotkey(e, input);
                    }
                });
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearHotkey(input);
                });
            }
        });
    }

    bindSystemSettings() {
        // 通知设置
        const notificationsCheckbox = document.getElementById('notificationsCheckbox');
        if (notificationsCheckbox) {
            notificationsCheckbox.addEventListener('change', (e) => {
                this.settings.system.notifications = e.target.checked;
                this.markDirty();
            });
        }

        // 清除缓存
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }

        // 重置设置
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
    }

    bindServerSettings() {
        // 服务器端口
        const serverPortInput = document.getElementById('serverPortInput');
        if (serverPortInput) {
            serverPortInput.addEventListener('change', (e) => {
                const port = parseInt(e.target.value);
                if (port >= 1024 && port <= 65535) {
                    this.settings.server.port = port;
                    this.markDirty();
                } else {
                    e.target.value = this.settings.server.port;
                    this.showMessage('端口号必须在 1024-65535 之间', 'warning');
                }
            });
        }

        // 请求超时
        const timeoutInput = document.getElementById('timeoutInput');
        if (timeoutInput) {
            timeoutInput.addEventListener('change', (e) => {
                const timeout = parseInt(e.target.value);
                if (timeout >= 5 && timeout <= 300) {
                    this.settings.server.timeout = timeout;
                    this.markDirty();
                } else {
                    e.target.value = this.settings.server.timeout;
                    this.showMessage('超时时间必须在 5-300 秒之间', 'warning');
                }
            });
        }

        // 检查服务器状态
        const checkServerBtn = document.getElementById('checkServerBtn');
        if (checkServerBtn) {
            checkServerBtn.addEventListener('click', () => {
                this.checkServerStatus();
            });
        }

        // 重启服务器
        const restartServerBtn = document.getElementById('restartServerBtn');
        if (restartServerBtn) {
            restartServerBtn.addEventListener('click', () => {
                this.restartServer();
            });
        }
    }

    bindFooterButtons() {
        // 保存按钮
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }
    }

    bindTitlebarButtons() {
        // 最小化按钮
        const minimizeBtn = document.getElementById('minimizeBtn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', async () => {
                try {
                    await window.electronAPI.minimizeWindow();
                } catch (error) {
                    console.error('最小化窗口失败:', error);
                }
            });
        }

        // 关闭按钮 - 专门为设置窗口设计
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeWindow();
            });
        }
        
        // 双击标题栏区域最大化（可选，设置窗口通常不需要）
        const dragRegion = document.querySelector('.titlebar-drag-region');
        if (dragRegion) {
            dragRegion.addEventListener('dblclick', async () => {
                try {
                    await window.electronAPI.maximizeWindow();
                } catch (error) {
                    console.error('最大化窗口失败:', error);
                }
            });
        }
    }

    // 初始化主题
    async initializeTheme() {
        try {
            // 获取当前主题
            const isDark = await window.electronAPI.getTheme();
            this.updateTheme(isDark);
            
            // 监听主题变化
            if (window.electronAPI.onThemeChanged) {
                window.electronAPI.onThemeChanged((isDark) => {
                    this.updateTheme(isDark);
                });
            }
        } catch (error) {
            console.error('初始化主题失败:', error);
        }
    }

    // 更新主题
    updateTheme(isDark) {
        // 在body元素上设置主题类
        const body = document.body;
        if (isDark) {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
        }
        
        // 同步设置标题栏样式
        const titlebar = document.querySelector('.titlebar');
        if (titlebar) {
            if (isDark) {
                titlebar.classList.add('dark-theme');
            } else {
                titlebar.classList.remove('dark-theme');
            }
        }
    }

    showSection(sectionId) {
        // 隐藏所有区域
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });

        // 移除所有导航项的激活状态
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 显示目标区域
        const targetSection = document.getElementById(`${sectionId}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // 激活对应的导航项
        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
        }

        this.currentSection = sectionId;

        // 特殊处理某些区域
        if (sectionId === 'server') {
            this.updateServerStatus();
        }
    }

    async loadSettings() {
        try {
            // 使用全局设置管理器
            if (window.globalSettings) {
                if (!window.globalSettings.initialized) {
                    await window.globalSettings.initialize();
                }
                
                const settings = window.globalSettings.getAll();
                if (settings) {
                    this.settings = settings;
                    console.log('设置加载完成:', this.settings);
                } else {
                    console.log('使用默认设置');
                }
            } else {
                console.warn('全局设置管理器未找到，使用本地存储');
                // 备用：从本地存储加载设置
                const saved = localStorage.getItem('appSettings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.settings = { ...this.settings, ...parsed };
                }
            }

            // 获取系统设置状态
            await this.loadSystemSettings();
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    async loadSystemSettings() {
        try {
            // 获取窗口置顶状态
            const alwaysOnTop = await window.electronAPI.getAlwaysOnTop();
            this.settings.general.alwaysOnTop = alwaysOnTop;

            // 获取开机自启动状态
            const launchOnStartup = await window.electronAPI.getLaunchOnStartup();
            this.settings.general.launchOnStartup = launchOnStartup;
            
            // 获取应用配置，特别是服务器端口
            const appConfig = await window.electronAPI.getAppConfig();
            if (appConfig && appConfig.serverPort) {
                this.settings.server.port = appConfig.serverPort;
            }
        } catch (error) {
            console.warn('获取系统设置失败:', error);
        }
    }

    updateUI() {
        // 更新常规设置
        this.updateCheckbox('alwaysOnTopCheckbox', this.settings.general.alwaysOnTop);
        this.updateCheckbox('launchOnStartupCheckbox', this.settings.general.launchOnStartup);
        this.updateCheckbox('silentStartupCheckbox', this.settings.general.silentStartup);


        // 更新快捷键设置
        this.updateInput('hotkeyToggleInput', this.settings.hotkeys.hotkeyToggle);
        this.updateInput('hotkeyShowInput', this.settings.hotkeys.hotkeyShow);
        this.updateInput('hotkeyHideInput', this.settings.hotkeys.hotkeyHide);

        // 更新系统设置
        this.updateCheckbox('notificationsCheckbox', this.settings.system.notifications);

        // 更新服务器设置
        this.updateInput('serverPortInput', this.settings.server.port);
        this.updateInput('timeoutInput', this.settings.server.timeout);
    }

    updateCheckbox(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = value;
        }
    }

    updateSelect(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    updateSlider(id, value) {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(id.replace('Slider', 'Value'));
        
        if (slider) {
            slider.value = value;
        }
        if (valueDisplay) {
            valueDisplay.textContent = `${value}%`;
        }
    }

    updateInput(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    }

    // 快捷键录制
    startHotkeyRecording(input) {
        if (this.isRecordingHotkey) {
            this.stopHotkeyRecording();
        }

        this.isRecordingHotkey = true;
        this.recordingInput = input;
        
        input.classList.add('recording');
        input.value = '请按下快捷键...';
        input.focus();
    }

    recordHotkey(event, input) {
        event.preventDefault();
        
        const keys = [];
        
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Super');
        
        // 添加主键
        if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            keys.push(event.key.toUpperCase());
        }
        
        if (keys.length >= 2) { // 至少需要一个修饰键
            const hotkey = keys.join('+');
            input.value = hotkey;
            
            // 保存快捷键
            const settingKey = input.id.replace('Input', '').replace('hotkey', 'hotkey');
            this.settings.hotkeys[settingKey] = hotkey;
            
            // 注册快捷键
            this.setGlobalHotkey(settingKey, hotkey);
            
            this.stopHotkeyRecording();
            this.markDirty();
        }
    }

    stopHotkeyRecording() {
        if (this.recordingInput) {
            this.recordingInput.classList.remove('recording');
            this.recordingInput = null;
        }
        this.isRecordingHotkey = false;
    }

    clearHotkey(input) {
        input.value = '';
        
        // 清除设置
        const settingKey = input.id.replace('Input', '').replace('hotkey', 'hotkey');
        this.settings.hotkeys[settingKey] = '';
        
        // 取消注册快捷键
        this.setGlobalHotkey(settingKey, '');
        
        this.markDirty();
    }

    // 系统设置方法


    async setAlwaysOnTop(enabled) {
        try {
            await window.electronAPI.toggleAlwaysOnTop();
        } catch (error) {
            console.error('设置窗口置顶失败:', error);
            this.showMessage('设置窗口置顶失败', 'error');
        }
    }

    async setLaunchOnStartup(enabled) {
        try {
            await window.electronAPI.setLaunchOnStartup(enabled);
        } catch (error) {
            console.error('设置开机自启动失败:', error);
            this.showMessage('设置开机自启动失败', 'error');
        }
    }



    async setGlobalHotkey(setting, hotkey) {
        try {
            const result = await window.electronAPI.setGlobalHotkey(setting, hotkey);
            if (!result.success) {
                this.showMessage(result.error || '设置快捷键失败', 'error');
            }
        } catch (error) {
            console.error('设置快捷键失败:', error);
            this.showMessage('设置快捷键失败', 'error');
        }
    }



    async checkServerStatus() {
        const statusDisplay = document.getElementById('serverStatusDisplay');
        
        try {
            this.updateServerStatusDisplay(statusDisplay, 'checking', '检查中...');
            
            const result = await window.electronAPI.checkServerStatus();
            
            if (result.success && result.running) {
                this.updateServerStatusDisplay(statusDisplay, 'online', '运行正常');
            } else {
                this.updateServerStatusDisplay(statusDisplay, 'offline', '离线');
            }
        } catch (error) {
            console.error('检查服务器状态失败:', error);
            this.updateServerStatusDisplay(statusDisplay, 'error', '检查失败');
        }
    }

    async restartServer() {
        const restartBtn = document.getElementById('restartServerBtn');
        const statusDisplay = document.getElementById('serverStatusDisplay');
        
        try {
            this.setButtonLoading(restartBtn, true);
            this.updateServerStatusDisplay(statusDisplay, 'restarting', '重启中...');
            
            const result = await window.electronAPI.restartServer();
            
            if (result.success) {
                this.updateServerStatusDisplay(statusDisplay, 'restarting', '重启成功');
                this.showMessage('服务器重启成功', 'success');
                
                // 等待几秒后重新检查状态
                setTimeout(() => {
                    this.checkServerStatus();
                }, 3000);
            } else {
                throw new Error(result.error || '重启失败');
            }
        } catch (error) {
            console.error('重启服务器失败:', error);
            this.updateServerStatusDisplay(statusDisplay, 'error', '重启失败');
            this.showMessage(`重启失败: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(restartBtn, false);
        }
    }

    updateServerStatus() {
        // 页面显示时检查服务器状态
        setTimeout(() => {
            this.checkServerStatus();
        }, 500);
    }

    updateServerStatusDisplay(element, status, text) {
        if (!element) return;
        
        const dot = element.querySelector('.status-dot');
        const textElement = element.querySelector('.status-text');
        
        if (dot) {
            dot.className = 'status-dot';
            dot.classList.add(status);
        }
        
        if (textElement) {
            textElement.textContent = text;
        }
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="loading"></span> 处理中...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }

    clearCache() {
        try {
            // 清除应用缓存
            const keys = Object.keys(localStorage);
            const keysToKeep = ['appSettings']; // 保留设置
            
            keys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            this.showMessage('缓存已清理', 'success');
        } catch (error) {
            console.error('清理缓存失败:', error);
            this.showMessage('清理缓存失败', 'error');
        }
    }

    resetSettings() {
        if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
            try {
                localStorage.removeItem('appSettings');
                this.showMessage('设置已重置，重启应用后生效', 'success');
                
                // 重新加载默认设置
                this.settings = {
                    general: {
                        alwaysOnTop: false
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
                
                this.updateUI();
                this.isDirty = false;
            } catch (error) {
                console.error('重置设置失败:', error);
                this.showMessage('重置设置失败', 'error');
            }
        }
    }

    async saveSettings() {
        try {
            // 使用全局设置管理器保存
            if (window.globalSettings && window.globalSettings.initialized) {
                // 更新全局设置
                window.globalSettings.settings = this.settings;
                const success = await window.globalSettings.save();
                
                if (success) {
                    this.isDirty = false;
                    this.updateSaveStatus('设置已保存', 'success');
                    this.showMessage('设置已保存', 'success');
                } else {
                    throw new Error('全局设置保存失败');
                }
            } else {
                console.warn('全局设置管理器未初始化，使用本地存储');
                // 备用：保存到本地存储
                localStorage.setItem('appSettings', JSON.stringify(this.settings));
                this.isDirty = false;
                this.updateSaveStatus('设置已保存', 'success');
                this.showMessage('设置已保存', 'success');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.updateSaveStatus('保存失败', 'error');
            this.showMessage('保存设置失败', 'error');
        }
    }

    async closeWindow() {
        if (this.isDirty) {
            const result = confirm('有未保存的更改，是否要保存？');
            if (result) {
                await this.saveSettings();
            }
        }
        
        try {
            await window.electronAPI.closeSettingsWindow();
        } catch (error) {
            console.error('关闭窗口失败:', error);
        }
    }

    markDirty() {
        this.isDirty = true;
        this.updateSaveStatus('有未保存的更改', 'warning');
    }

    updateSaveStatus(message, type) {
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.textContent = message;
            saveStatus.className = `save-status ${type}`;
        }
    }

    showMessage(message, type = 'info') {
        // 简单的消息显示
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 如果父窗口有showMessage方法，使用它
        if (window.opener && window.opener.app && window.opener.app.showMessage) {
            window.opener.app.showMessage(message, type);
        }
    }
}

// 全局设置管理器实例
let settingsManager;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
});

// 页面卸载时保存设置
window.addEventListener('beforeunload', () => {
    if (settingsManager && settingsManager.isDirty) {
        settingsManager.saveSettings();
    }
});

// 导出设置管理器供其他脚本使用
window.settingsManager = settingsManager;