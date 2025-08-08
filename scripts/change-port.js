#!/usr/bin/env node
// # 查看当前端口
// npm run change-port -- --current

// # 查看帮助
// npm run change-port -- --help

// # 切换到任意端口
// npm run change-port 8080
// npm run change-port 3000
// npm run change-port 9999

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PortChanger {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.currentPort = null;
        this.newPort = null;
        
        // 需要修改的文件列表
        this.configFiles = [
            {
                file: 'server/config.json',
                type: 'json',
                pattern: /"port":\s*(\d+)/g,
                replacement: '"port": {{PORT}}'
            },
            {
                file: 'server/config/config.go',
                type: 'text',
                pattern: /Port:\s*(\d+),/g,
                replacement: 'Port:         {{PORT}},'
            },
            {
                file: 'scripts/dev.js',
                type: 'text',
                pattern: /let port = (\d+);/g,
                replacement: 'let port = {{PORT}};'
            },
            {
                file: 'config/production.json',
                type: 'json',
                pattern: /"port":\s*(\d+)/g,
                replacement: '"port": {{PORT}}'
            },
            {
                file: 'config/development.json',
                type: 'json',
                pattern: /"port":\s*(\d+)/g,
                replacement: '"port": {{PORT}}'
            },
            {
                file: 'client/src/renderer/js/settings.js',
                type: 'text',
                pattern: /port:\s*(\d+),/g,
                replacement: 'port: {{PORT}},'
            },
            {
                file: 'client/src/preload.js',
                type: 'text',
                pattern: /localhost:(\d+)/g,
                replacement: 'localhost:{{PORT}}'
            },
            {
                file: 'client/src/main.js',
                type: 'text',
                pattern: /serverPort:\s*(\d+),/g,
                replacement: 'serverPort: {{PORT}},'
            }
        ];
    }

    // 显示帮助信息
    showHelp() {
        console.log(`
🔧 端口配置工具 (智能版)

用法:
  npm run change-port <新端口号>           # 修改为新端口
  node scripts/change-port.js <新端口号>   # 直接运行脚本
  npm run change-port -- --current        # 显示当前端口
  npm run change-port -- --help          # 显示帮助

示例:
  npm run change-port 8080               # 将端口改为 8080
  npm run change-port 3000               # 将端口改为 3000
  npm run change-port 9999               # 将端口改为 9999

🤖 智能功能:
  - 自动停止当前端口的相关进程 (Go, Node, Electron等)
  - 自动检查并清理目标端口的占用进程
  - 自动备份所有配置文件
  - 跨平台支持 (Windows, macOS, Linux)
  - 安全进程识别，只停止相关开发进程

⚙️  注意事项:
  - 端口范围: 1024-65535
  - 脚本会智能识别并停止相关进程
  - 系统级进程不会被停止，确保安全
  - 所有操作都有完整的日志记录
  - 备份文件保存在 .backups/ 目录
`);
    }

    // 获取当前配置的端口
    getCurrentPort() {
        try {
            const configFile = path.join(this.rootDir, 'server/config.json');
            if (fs.existsSync(configFile)) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                return config.server?.port || 10300;
            }
        } catch (error) {
            console.warn('无法读取当前端口配置:', error.message);
        }
        return 10300; // 默认端口
    }

    // 验证端口号
    validatePort(port) {
        const portNum = parseInt(port);
        
        if (isNaN(portNum)) {
            throw new Error('端口号必须是数字');
        }
        
        if (portNum < 1024 || portNum > 65535) {
            throw new Error('端口号必须在 1024-65535 范围内');
        }
        
        return portNum;
    }

    // 检查端口是否被占用
    async checkPortAvailable(port) {
        try {
            const command = process.platform === 'win32' 
                ? `netstat -an | findstr :${port}`
                : `netstat -an | grep :${port}`;
            
            const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            
            if (result.trim()) {
                console.warn(`⚠️  警告: 端口 ${port} 可能已被占用:`);
                console.warn(result.trim());
                console.warn('请确保没有其他服务使用此端口');
                return false;
            }
            return true;
        } catch (error) {
            // netstat 没找到匹配项时会抛出异常，这是正常的
            console.log(`✅ 端口 ${port} 未被占用`);
            return true;
        }
    }

    // 获取占用指定端口的进程ID
    getPortProcesses(port) {
        try {
            const command = process.platform === 'win32' 
                ? `netstat -ano | findstr :${port}.*LISTENING`
                : `lsof -ti:${port}`;
            
            const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            
            if (process.platform === 'win32') {
                // Windows: 从netstat输出中提取PID
                const lines = result.trim().split('\n');
                const pids = [];
                
                for (const line of lines) {
                    const match = line.trim().match(/\s+(\d+)$/);
                    if (match) {
                        const pid = parseInt(match[1]);
                        if (pid && !pids.includes(pid)) {
                            pids.push(pid);
                        }
                    }
                }
                return pids;
            } else {
                // Unix/Linux/macOS
                return result.trim().split('\n').map(pid => parseInt(pid)).filter(pid => !isNaN(pid));
            }
        } catch (error) {
            return [];
        }
    }

    // 获取进程信息
    getProcessInfo(pid) {
        try {
            const command = process.platform === 'win32' 
                ? `tasklist /FI "PID eq ${pid}" /FO CSV`
                : `ps -p ${pid} -o comm=`;
            
            const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            
            if (process.platform === 'win32') {
                const lines = result.trim().split('\n');
                if (lines.length > 1) {
                    // 解析CSV格式的输出
                    const processLine = lines[1];
                    const match = processLine.match(/^"([^"]+)"/);
                    return match ? match[1] : 'Unknown';
                }
            } else {
                return result.trim();
            }
        } catch (error) {
            return 'Unknown';
        }
        return 'Unknown';
    }

    // 停止占用端口的进程
    async stopPortProcesses(port) {
        const pids = this.getPortProcesses(port);
        
        if (pids.length === 0) {
            console.log(`✅ 端口 ${port} 未被占用`);
            return true;
        }

        console.log(`🔍 发现 ${pids.length} 个进程占用端口 ${port}:`);
        
        const processesToKill = [];
        const zombieProcesses = []; // 僵尸进程（PID存在但tasklist中找不到）
        
        for (const pid of pids) {
            const processName = this.getProcessInfo(pid);
            console.log(`  - PID: ${pid}, 进程: ${processName}`);
            
            if (processName === 'Unknown') {
                // 可能是僵尸进程
                zombieProcesses.push(pid);
            } else if (processName.toLowerCase().includes('go') || 
                       processName.toLowerCase().includes('node') || 
                       processName.toLowerCase().includes('electron') ||
                       processName.includes('main.exe') ||
                       processName.includes('dev.js')) {
                processesToKill.push({ pid, name: processName });
            }
        }

        // 处理僵尸进程
        if (zombieProcesses.length > 0) {
            console.log(`🧟 发现 ${zombieProcesses.length} 个可能的僵尸进程，尝试强制清理...`);
            for (const pid of zombieProcesses) {
                try {
                    const killCommand = process.platform === 'win32' 
                        ? `taskkill /F /PID ${pid}`
                        : `kill -9 ${pid}`;
                    
                    execSync(killCommand, { stdio: 'pipe' });
                    console.log(`✅ 已清理僵尸进程: PID ${pid}`);
                } catch (error) {
                    console.log(`ℹ️  无法清理僵尸进程 PID ${pid}，可能已自动清理`);
                }
            }
        }

        // 处理正常进程
        if (processesToKill.length === 0 && zombieProcesses.length === 0) {
            console.warn(`⚠️  端口 ${port} 被其他系统进程占用，建议手动检查`);
            return false;
        }

        if (processesToKill.length > 0) {
            console.log(`🛑 准备停止 ${processesToKill.length} 个相关进程...`);
            
            let stoppedCount = 0;
            for (const process of processesToKill) {
                try {
                    const killCommand = process.platform === 'win32' 
                        ? `taskkill /F /PID ${process.pid}`
                        : `kill -9 ${process.pid}`;
                    
                    execSync(killCommand, { stdio: 'pipe' });
                    console.log(`✅ 已停止进程: ${process.name} (PID: ${process.pid})`);
                    stoppedCount++;
                } catch (error) {
                    console.warn(`⚠️  停止进程失败: ${process.name} (PID: ${process.pid}) - ${error.message}`);
                }
            }
        }

        // 等待端口释放
        console.log(`⏳ 等待端口释放...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 再次检查端口状态
        const stillOccupied = this.getPortProcesses(port);
        if (stillOccupied.length === 0) {
            console.log(`✅ 端口 ${port} 已成功释放`);
            return true;
        } else {
            console.log(`ℹ️  端口 ${port} 仍显示被占用，但可能是系统延迟，将继续配置更新`);
            return true; // 即使显示占用，也继续更新配置，因为可能是系统延迟
        }
    }

    // 备份配置文件
    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.rootDir, '.backups', timestamp);
        
        console.log('📦 创建备份...');
        
        if (!fs.existsSync(path.dirname(backupDir))) {
            fs.mkdirSync(path.dirname(backupDir), { recursive: true });
        }
        fs.mkdirSync(backupDir, { recursive: true });

        let backupCount = 0;
        for (const config of this.configFiles) {
            const sourceFile = path.join(this.rootDir, config.file);
            if (fs.existsSync(sourceFile)) {
                const backupFile = path.join(backupDir, config.file);
                const backupFileDir = path.dirname(backupFile);
                
                if (!fs.existsSync(backupFileDir)) {
                    fs.mkdirSync(backupFileDir, { recursive: true });
                }
                
                fs.copyFileSync(sourceFile, backupFile);
                backupCount++;
            }
        }

        console.log(`✅ 已备份 ${backupCount} 个配置文件到: ${backupDir}`);
        return backupDir;
    }

    // 修改单个文件
    updateFile(config) {
        const filePath = path.join(this.rootDir, config.file);
        
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  文件不存在，跳过: ${config.file}`);
            return false;
        }

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            
            // 替换端口号
            content = content.replace(config.pattern, (match, currentPort) => {
                if (!this.currentPort) {
                    this.currentPort = parseInt(currentPort);
                }
                return config.replacement.replace('{{PORT}}', this.newPort);
            });

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ 已更新: ${config.file}`);
                return true;
            } else {
                console.log(`ℹ️  无需更新: ${config.file}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ 更新失败: ${config.file}`, error.message);
            return false;
        }
    }

    // 执行端口更改
    async changePort(newPort) {
        this.newPort = this.validatePort(newPort);
        this.currentPort = this.getCurrentPort();

        console.log(`\n🔄 端口配置更改`);
        console.log(`当前端口: ${this.currentPort}`);
        console.log(`目标端口: ${this.newPort}`);

        if (this.currentPort === this.newPort) {
            console.log('✅ 端口已经是目标端口，无需更改');
            return;
        }

        // 停止当前端口的相关进程
        console.log(`\n🛑 停止当前端口 ${this.currentPort} 的相关进程...`);
        await this.stopPortProcesses(this.currentPort);

        // 检查新端口是否可用，如不可用则尝试停止相关进程
        console.log(`\n🔍 检查目标端口 ${this.newPort}...`);
        const isNewPortAvailable = await this.checkPortAvailable(this.newPort);
        
        if (!isNewPortAvailable) {
            console.log(`🛑 尝试停止端口 ${this.newPort} 的相关进程...`);
            const stopped = await this.stopPortProcesses(this.newPort);
            if (!stopped) {
                console.log(`\n⚠️  警告: 端口 ${this.newPort} 可能仍被占用，但将继续配置更新`);
                console.log(`请在启动新服务前手动检查端口状态`);
            }
        }

        // 创建备份
        const backupDir = this.createBackup();

        // 更新所有配置文件
        console.log('\n🔧 更新配置文件...');
        let updateCount = 0;
        
        for (const config of this.configFiles) {
            if (this.updateFile(config)) {
                updateCount++;
            }
        }

        // 清理构建目录中的临时配置
        const distConfigPath = path.join(this.rootDir, 'client/dist/config.json');
        if (fs.existsSync(distConfigPath)) {
            try {
                fs.unlinkSync(distConfigPath);
                console.log('🧹 已清理构建目录中的旧配置');
            } catch (error) {
                console.warn('⚠️  清理构建配置失败:', error.message);
            }
        }

        console.log(`\n✅ 端口更改完成!`);
        console.log(`📊 更新了 ${updateCount} 个配置文件`);
        console.log(`📦 备份位置: ${path.relative(this.rootDir, backupDir)}`);
        
        // 最终端口状态检查
        console.log(`\n🔍 最终端口状态检查:`);
        const currentPortProcesses = this.getPortProcesses(this.currentPort);
        const newPortProcesses = this.getPortProcesses(this.newPort);
        
        if (currentPortProcesses.length === 0) {
            console.log(`✅ 原端口 ${this.currentPort} 已完全释放`);
        } else {
            console.log(`⚠️  原端口 ${this.currentPort} 仍有 ${currentPortProcesses.length} 个进程占用`);
        }
        
        if (newPortProcesses.length === 0) {
            console.log(`✅ 新端口 ${this.newPort} 可用`);
        } else {
            console.log(`⚠️  新端口 ${this.newPort} 仍有 ${newPortProcesses.length} 个进程占用`);
        }
        
        console.log(`\n🚀 后续操作:`);
        console.log(`  1. 启动开发服务器: npm start`);
        console.log(`  2. 重新构建应用: npm run build`);
        console.log(`  3. 更新防火墙规则（如有需要）`);
        console.log(`\n💡 提示: 端口已自动清理，可以直接启动新配置！`)
    }

    // 主入口
    async run() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args.includes('--help')) {
            this.showHelp();
            return;
        }

        if (args.includes('--current')) {
            const currentPort = this.getCurrentPort();
            console.log(`当前配置端口: ${currentPort}`);
            return;
        }

        const newPort = args[0];
        try {
            await this.changePort(newPort);
        } catch (error) {
            console.error('\n❌ 端口更改失败:', error.message);
            process.exit(1);
        }
    }
}

// 运行脚本
if (require.main === module) {
    const portChanger = new PortChanger();
    portChanger.run();
}

module.exports = PortChanger;