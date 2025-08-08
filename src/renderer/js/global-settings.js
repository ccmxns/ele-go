// 全局设置管理器
class GlobalSettingsManager {
    constructor() {
        this.settings = null;
        this.initialized = false;
        this.saveTimer = null;
    }

    async initialize() {
        try {
            console.log('初始化全局设置管理器...');
            const result = await window.electronAPI.loadSettings();
            
            if (result.success) {
                this.settings = result.settings;
                console.log('设置加载成功:', this.settings);
                this.initialized = true;
                return true;
            } else {
                console.error('加载设置失败');
                return false;
            }
        } catch (error) {
            console.error('初始化设置管理器失败:', error);
            return false;
        }
    }

    // 获取设置值
    get(path, defaultValue = null) {
        if (!this.initialized || !this.settings) {
            return defaultValue;
        }

        const keys = path.split('.');
        let value = this.settings;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    // 设置值
    async set(path, value, autoSave = true) {
        if (!this.initialized || !this.settings) {
            console.warn('设置管理器未初始化');
            return false;
        }

        const keys = path.split('.');
        let target = this.settings;
        
        // 导航到目标位置
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        // 设置值
        const lastKey = keys[keys.length - 1];
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        console.log(`设置更新: ${path} = ${value} (旧值: ${oldValue})`);
        
        // 自动保存
        if (autoSave) {
            return await this.save();
        }
        
        return true;
    }

    // 保存设置到磁盘
    async save() {
        try {
            const result = await window.electronAPI.saveSettings(this.settings);
            if (result.success) {
                console.log('设置保存成功');
                return true;
            } else {
                console.error('设置保存失败:', result.error);
                return false;
            }
        } catch (error) {
            console.error('保存设置时出错:', error);
            return false;
        }
    }

    // 延迟保存（防止频繁写入）
    debouncedSave(delay = 1000) {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        this.saveTimer = setTimeout(() => {
            this.save();
        }, delay);
    }

    // 获取所有设置
    getAll() {
        return this.settings;
    }

    // 监听设置变化
    onChange(callback) {
        // 这里可以实现设置变化监听
        // 暂时简单实现
        this._changeCallbacks = this._changeCallbacks || [];
        this._changeCallbacks.push(callback);
    }

    // 触发变化回调
    _notifyChange(path, newValue, oldValue) {
        if (this._changeCallbacks) {
            this._changeCallbacks.forEach(callback => {
                try {
                    callback(path, newValue, oldValue);
                } catch (error) {
                    console.error('设置变化回调出错:', error);
                }
            });
        }
    }
}

// 创建全局实例
window.globalSettings = new GlobalSettingsManager();

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalSettingsManager;
}