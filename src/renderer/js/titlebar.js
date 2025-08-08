// 标题栏控制脚本
class TitleBar {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.updateMaximizeButton();
        this.updateThemeButton();
        this.updatePinButton();
        this.updateOpacityButton();
    }

    // 初始化设置状态
    async initializeSettings() {
        if (!window.globalSettings) {
            console.warn('全局设置管理器未找到');
            return;
        }

        try {
            // 等待设置管理器初始化
            await window.globalSettings.initialize();
            
            // 恢复状态
            await this.restoreAllStates();
            
            console.log('标题栏状态初始化完成');
        } catch (error) {
            console.error('初始化设置状态失败:', error);
        }
    }

    // 恢复所有状态
    async restoreAllStates() {
        try {
            // 恢复主题状态
            const theme = window.globalSettings.get('appearance.theme', 'system');
            if (theme !== 'system') {
                const result = await window.electronAPI.setTheme(theme);
                if (result.success) {
                    const isDark = theme === 'dark';
                    this.updateTheme(isDark);
                    this.updateThemeButton(isDark);
                }
            }

            // 恢复置顶状态
            const alwaysOnTop = window.globalSettings.get('general.alwaysOnTop', false);
            if (alwaysOnTop) {
                const isOnTop = await window.electronAPI.toggleAlwaysOnTop();
                this.updatePinButton(isOnTop);
            }

            // 恢复透明度状态
            const opacityEnabled = window.globalSettings.get('appearance.opacityEnabled', false);
            const windowOpacity = window.globalSettings.get('appearance.windowOpacity', 100);
            
            this.isOpacityEnabled = opacityEnabled;
            this.updateOpacityButton(opacityEnabled);
            
            if (opacityEnabled && windowOpacity < 100) {
                await window.electronAPI.setWindowOpacity(windowOpacity);
            }

            console.log('所有状态恢复完成');
        } catch (error) {
            console.error('恢复状态时出错:', error);
        }
    }

    initializeElements() {
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.maximizeBtn = document.getElementById('maximizeBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        this.opacityBtn = document.getElementById('opacityBtn');
        this.pinBtn = document.getElementById('pinBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // 透明度控制状态
        this.isOpacityEnabled = false;
        this.normalOpacity = 100;
        this.lowOpacity = 70;
        this.isHoveringOpacityBtn = false;
    }

    bindEvents() {
        // 窗口控制按钮事件
        if (this.minimizeBtn) {
            this.minimizeBtn.addEventListener('click', this.minimizeWindow.bind(this));
        }

        if (this.maximizeBtn) {
            this.maximizeBtn.addEventListener('click', this.maximizeWindow.bind(this));
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.closeWindow.bind(this));
        }

        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', this.toggleTheme.bind(this));
        }

        if (this.opacityBtn) {
            this.opacityBtn.addEventListener('click', this.toggleOpacity.bind(this));
            
            // 鼠标悬停时的滚轮事件支持
            this.opacityBtn.addEventListener('mouseenter', () => {
                this.isHoveringOpacityBtn = true;
            });
            
            this.opacityBtn.addEventListener('mouseleave', () => {
                this.isHoveringOpacityBtn = false;
            });
        }

        if (this.pinBtn) {
            this.pinBtn.addEventListener('click', this.togglePin.bind(this));
        }

        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', this.openSettings.bind(this));
        }

        // 双击标题栏最大化/还原
        const dragRegion = document.querySelector('.titlebar-drag-region');
        if (dragRegion) {
            dragRegion.addEventListener('dblclick', this.maximizeWindow.bind(this));
        }

        // 监听窗口状态变化
        this.listenToWindowStateChanges();
        
        // 添加全局滚轮事件监听器
        window.addEventListener('wheel', (event) => {
            this.handleWheelEvent(event);
        }, { passive: false });
    }

    async minimizeWindow() {
        try {
            await window.electronAPI.minimizeWindow();
        } catch (error) {
            console.error('最小化窗口失败:', error);
        }
    }

    async maximizeWindow() {
        try {
            await window.electronAPI.maximizeWindow();
            this.updateMaximizeButton();
        } catch (error) {
            console.error('最大化窗口失败:', error);
        }
    }

    async closeWindow() {
        try {
            await window.electronAPI.closeWindow();
        } catch (error) {
            console.error('关闭窗口失败:', error);
        }
    }

    async updateMaximizeButton() {
        try {
            const isMaximized = await window.electronAPI.isMaximized();
            
            if (this.maximizeBtn) {
                if (isMaximized) {
                    this.maximizeBtn.classList.add('is-maximized');
                    this.maximizeBtn.title = '还原';
                    this.maximizeBtn.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M2 2h8v8H2z" fill="none" stroke="currentColor" stroke-width="1"/>
                            <path d="M0 0h8v8" fill="none" stroke="currentColor" stroke-width="1"/>
                        </svg>
                    `;
                } else {
                    this.maximizeBtn.classList.remove('is-maximized');
                    this.maximizeBtn.title = '最大化';
                    this.maximizeBtn.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M1 1h10v10H1z" fill="none" stroke="currentColor" stroke-width="1"/>
                        </svg>
                    `;
                }
            }
        } catch (error) {
            console.error('更新最大化按钮状态失败:', error);
        }
    }

    listenToWindowStateChanges() {
        // 监听窗口大小变化
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateMaximizeButton();
            }, 100);
        });

        // 监听主题变化
        if (window.electronAPI.onThemeChanged) {
            window.electronAPI.onThemeChanged((isDark) => {
                this.updateTheme(isDark);
                this.updateThemeButton(isDark);
            });
        }
    }

    updateTheme(isDark) {
        // 在body元素上设置主题类
        const body = document.body;
        if (isDark) {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            console.log('应用深色主题');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            console.log('应用浅色主题');
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

    // 设置标题
    setTitle(title) {
        const titleElement = document.querySelector('.app-name');
        if (titleElement) {
            titleElement.textContent = title;
        }
        document.title = title;
    }

    // 设置图标
    setIcon(iconPath) {
        const iconElement = document.querySelector('.titlebar-icon');
        if (iconElement) {
            iconElement.src = iconPath;
        }
    }

    // 显示加载状态
    setLoading(isLoading) {
        const titlebar = document.querySelector('.titlebar');
        if (titlebar) {
            if (isLoading) {
                titlebar.classList.add('loading');
            } else {
                titlebar.classList.remove('loading');
            }
        }
    }

    // 启用/禁用控制按钮
    setControlsEnabled(enabled) {
        const buttons = [this.minimizeBtn, this.maximizeBtn, this.closeBtn];
        buttons.forEach(button => {
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    // 平台特定样式
    setPlatformStyle() {
        const titlebar = document.querySelector('.titlebar');
        if (titlebar) {
            // 根据平台设置不同的样式类
            const platform = navigator.platform.toLowerCase();
            
            if (platform.includes('mac')) {
                titlebar.classList.add('platform-darwin', 'macos');
            } else if (platform.includes('win')) {
                titlebar.classList.add('platform-win32');
            } else {
                titlebar.classList.add('platform-linux');
            }
        }
    }

    // 添加自定义按钮
    addCustomButton(config) {
        const { id, icon, title, position = 'before-close', onClick } = config;
        
        const button = document.createElement('button');
        button.id = id;
        button.className = 'titlebar-button custom';
        button.title = title;
        button.innerHTML = icon;
        button.addEventListener('click', onClick);

        const controls = document.querySelector('.titlebar-controls');
        if (controls) {
            if (position === 'before-close') {
                controls.insertBefore(button, this.closeBtn);
            } else {
                controls.appendChild(button);
            }
        }

        return button;
    }

    // 移除自定义按钮
    removeCustomButton(id) {
        const button = document.getElementById(id);
        if (button && button.classList.contains('custom')) {
            button.remove();
        }
    }

    // 获取标题栏高度
    getHeight() {
        const titlebar = document.querySelector('.titlebar');
        return titlebar ? titlebar.offsetHeight : 32;
    }

    // 销毁标题栏
    destroy() {
        // 移除事件监听器
        if (this.minimizeBtn) {
            this.minimizeBtn.removeEventListener('click', this.minimizeWindow);
        }
        if (this.maximizeBtn) {
            this.maximizeBtn.removeEventListener('click', this.maximizeWindow);
        }
        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.closeWindow);
        }

        const dragRegion = document.querySelector('.titlebar-drag-region');
        if (dragRegion) {
            dragRegion.removeEventListener('dblclick', this.maximizeWindow);
        }

        // 清理透明度相关事件监听器
        if (this.opacityBtn) {
            this.opacityBtn.removeEventListener('mouseenter', () => {
                this.isHoveringOpacityBtn = true;
            });
            this.opacityBtn.removeEventListener('mouseleave', () => {
                this.isHoveringOpacityBtn = false;
            });
        }

        // 移除全局滚轮事件监听器
        window.removeEventListener('wheel', this.handleWheelEvent);

        // 清理定时器
        if (this.opacityNotificationTimer) {
            clearTimeout(this.opacityNotificationTimer);
        }

        // 清理通知元素
        const notification = document.getElementById('opacity-notification');
        if (notification) {
            notification.remove();
        }

        // 清理主题监听器
        if (window.electronAPI.removeAllListeners) {
            window.electronAPI.removeAllListeners('theme-changed');
        }
    }

    // 切换主题
    async toggleTheme() {
        try {
            console.log('开始切换主题...');
            
            // 调用主进程的主题切换API
            const result = await window.electronAPI.toggleTheme();
            
            if (result.success) {
                console.log('主题切换成功:', result.theme, '当前是否深色:', result.isDark);
                
                // 更新UI状态
                this.updateTheme(result.isDark);
                this.updateThemeButton(result.isDark);
                
                // 保存主题设置
                if (window.globalSettings) {
                    await window.globalSettings.set('appearance.theme', result.theme);
                }
            } else {
                console.error('主题切换失败:', result.error);
            }
            
        } catch (error) {
            console.error('切换主题时出错:', error);
        }
    }

    // 更新主题按钮状态
    async updateThemeButton(isDark = null) {
        try {
            if (isDark === null) {
                isDark = await window.electronAPI.getTheme();
            }

            if (this.themeToggleBtn) {
                const lightIcon = this.themeToggleBtn.querySelector('.theme-icon-light');
                const darkIcon = this.themeToggleBtn.querySelector('.theme-icon-dark');
                
                if (isDark) {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'block';
                    this.themeToggleBtn.title = '切换到浅色主题';
                } else {
                    lightIcon.style.display = 'block';
                    darkIcon.style.display = 'none';
                    this.themeToggleBtn.title = '切换到深色主题';
                }
            }
        } catch (error) {
            console.error('更新主题按钮状态失败:', error);
        }
    }

    // 切换透明度
    async toggleOpacity() {
        try {
            console.log('切换透明度状态...');
            
            this.isOpacityEnabled = !this.isOpacityEnabled;
            const targetOpacity = this.isOpacityEnabled ? this.lowOpacity : this.normalOpacity;
            
            const result = await window.electronAPI.setWindowOpacity(targetOpacity);
            
            if (result.success) {
                console.log('透明度切换成功:', result.opacity + '%');
                this.updateOpacityButton(this.isOpacityEnabled);
                
                // 保存透明度设置
                if (window.globalSettings) {
                    await window.globalSettings.set('appearance.opacityEnabled', this.isOpacityEnabled);
                    await window.globalSettings.set('appearance.windowOpacity', targetOpacity);
                }
            } else {
                console.error('透明度切换失败:', result.error);
                // 回滚状态
                this.isOpacityEnabled = !this.isOpacityEnabled;
            }
            
        } catch (error) {
            console.error('切换透明度时出错:', error);
            // 回滚状态
            this.isOpacityEnabled = !this.isOpacityEnabled;
        }
    }

    // 更新透明度按钮状态
    async updateOpacityButton(isEnabled = null) {
        try {
            // 如果没有传入状态，尝试从当前透明度推断
            if (isEnabled === null) {
                const result = await window.electronAPI.getWindowOpacity();
                if (result.success) {
                    // 如果透明度小于100%，认为是启用状态
                    this.isOpacityEnabled = result.opacity < 100;
                    isEnabled = this.isOpacityEnabled;
                } else {
                    isEnabled = this.isOpacityEnabled;
                }
            }

            if (this.opacityBtn) {
                if (isEnabled) {
                    this.opacityBtn.classList.add('active');
                    this.opacityBtn.title = '取消透明度';
                } else {
                    this.opacityBtn.classList.remove('active');
                    this.opacityBtn.title = '透明度开关';
                }
            }
        } catch (error) {
            console.error('更新透明度按钮状态失败:', error);
            // 降级到基本状态更新
            if (this.opacityBtn) {
                if (isEnabled) {
                    this.opacityBtn.classList.add('active');
                    this.opacityBtn.title = '取消透明度';
                } else {
                    this.opacityBtn.classList.remove('active');
                    this.opacityBtn.title = '透明度开关';
                }
            }
        }
    }

    // 切换置顶
    async togglePin() {
        try {
            console.log('切换窗口置顶状态...');
            
            const isOnTop = await window.electronAPI.toggleAlwaysOnTop();
            console.log('置顶状态切换成功:', isOnTop);
            
            this.updatePinButton(isOnTop);
            
            // 保存置顶设置
            if (window.globalSettings) {
                await window.globalSettings.set('general.alwaysOnTop', isOnTop);
            }
            
        } catch (error) {
            console.error('切换窗口置顶状态时出错:', error);
        }
    }

    // 更新置顶按钮状态
    async updatePinButton(isOnTop = null) {
        try {
            if (isOnTop === null) {
                isOnTop = await window.electronAPI.getAlwaysOnTop();
            }

            if (this.pinBtn) {
                if (isOnTop) {
                    this.pinBtn.classList.add('active');
                    this.pinBtn.title = '取消置顶';
                } else {
                    this.pinBtn.classList.remove('active');
                    this.pinBtn.title = '置顶显示';
                }
            }
        } catch (error) {
            console.error('更新置顶按钮状态失败:', error);
        }
    }

    // 打开设置
    async openSettings() {
        try {
            console.log('打开设置窗口...');
            await window.electronAPI.openSettings();
        } catch (error) {
            console.error('打开设置窗口失败:', error);
        }
    }

    // 处理滚轮事件（透明度调节）
    async handleWheelEvent(event) {
        try {
            // 检查是否启用了透明度功能
            if (!this.isOpacityEnabled) return;
            
            // 检查是否满足透明度调节条件
            const isHoveringOpacity = this.isHoveringOpacityBtn;
            const isAltPressed = event.altKey;
            
            // 两种调节方式：1) 悬停透明度按钮 2) 按住Alt键
            if (!isHoveringOpacity && !isAltPressed) return;

            event.preventDefault();
            
            // 获取当前透明度
            const currentResult = await window.electronAPI.getWindowOpacity();
            if (!currentResult.success) return;
            
            const currentOpacity = currentResult.opacity;
            
            // 根据调节方式确定步长
            let stepSize;
            let adjustmentType;
            
            if (isAltPressed) {
                // Alt+滚轮：精细调节，步长1%
                stepSize = 1;
                adjustmentType = 'fine';
            } else {
                // 悬停按钮+滚轮：常规调节，步长5%
                stepSize = 5;
                adjustmentType = 'normal';
            }
            
            // 向下滚动减少透明度，向上滚动增加透明度
            const delta = event.deltaY > 0 ? -stepSize : stepSize;
            const newOpacity = Math.max(10, Math.min(100, currentOpacity + delta));
            
            if (newOpacity !== currentOpacity) {
                // 应用新的透明度
                const result = await window.electronAPI.setWindowOpacity(newOpacity);
                
                if (result.success) {
                    console.log(`透明度调节成功: ${currentOpacity}% → ${newOpacity}% (${adjustmentType})`);
                    
                    // 显示透明度提示
                    this.showOpacityNotification(newOpacity, adjustmentType);
                    
                    // 保存透明度设置
                    if (window.globalSettings) {
                        window.globalSettings.debouncedSave(500); // 延迟保存，避免频繁写入
                        await window.globalSettings.set('appearance.windowOpacity', newOpacity, false);
                    }
                } else {
                    console.error('透明度调节失败:', result.error);
                }
            }
        } catch (error) {
            console.error('处理滚轮事件失败:', error);
        }
    }

    // 显示透明度调节通知
    showOpacityNotification(opacity, adjustmentType) {
        try {
            // 创建或更新通知元素
            let notification = document.getElementById('opacity-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'opacity-notification';
                notification.className = 'opacity-notification';
                document.body.appendChild(notification);
            }

            // 设置通知内容
            const message = adjustmentType === 'fine' 
                ? `透明度: ${opacity}% (精细调节)`
                : `透明度: ${opacity}%`;
            
            notification.textContent = message;
            notification.classList.remove('fade-out');
            notification.classList.add('show');

            // 清除之前的定时器
            if (this.opacityNotificationTimer) {
                clearTimeout(this.opacityNotificationTimer);
            }

            // 设置自动隐藏
            const hideDelay = adjustmentType === 'fine' ? 1000 : 800;
            this.opacityNotificationTimer = setTimeout(() => {
                notification.classList.remove('show');
                notification.classList.add('fade-out');
            }, hideDelay);
        } catch (error) {
            console.error('显示透明度通知失败:', error);
        }
    }
}

// 全局标题栏实例
let titleBar;

// DOM加载完成后初始化标题栏
document.addEventListener('DOMContentLoaded', async () => {
    titleBar = new TitleBar();
    
    // 设置平台特定样式
    titleBar.setPlatformStyle();
    
    // 初始化设置状态（这会恢复所有保存的状态）
    await titleBar.initializeSettings();
    
    // 备用：如果设置管理器初始化失败，使用基本主题初始化
    if (!window.globalSettings || !window.globalSettings.initialized) {
        console.warn('使用基本主题初始化');
        if (window.electronAPI && window.electronAPI.getTheme) {
            window.electronAPI.getTheme().then((isDark) => {
                titleBar.updateTheme(isDark);
                titleBar.updateThemeButton(isDark);
            }).catch(console.error);
        }
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (titleBar) {
        titleBar.destroy();
    }
});

// 导出标题栏实例供其他脚本使用
window.titleBar = titleBar;