#!/usr/bin/env node

/**
 * 开发脚本 - 用于启动开发环境
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec, execSync } = require('child_process');
// Node.js 18+ 内置 fetch API，无需额外安装包

class DevServer {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.serverDir = path.join(this.projectRoot, 'server');
        this.srcDir = path.join(this.projectRoot, 'src');
        this.configDir = path.join(this.projectRoot, 'config');
        
        this.serverProcess = null;
        this.clientProcess = null;
        this.isShuttingDown = false;
        
        // 读取配置以获取端口
        this.serverPort = this.getServerPort();
        
        console.log('🚀 启动开发环境...');
        
        // 处理进程退出
        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('exit', this.shutdown.bind(this));
    }

    async start() {
        try {
            await this.checkDependencies();
            await this.setupEnvironment();
            await this.startServer();
            await this.startClient();
            
            console.log('✅ 开发环境启动完成!');
            console.log('📝 提示:');
            console.log('  - 按 Ctrl+C 停止开发服务器');
            console.log(`  - 服务器: http://localhost:${this.serverPort}`);
            console.log('  - 客户端将自动启动');
            
            // 保持进程运行
            this.keepAlive();
            
        } catch (error) {
            console.error('❌ 启动失败:', error.message);
            await this.shutdown();
            process.exit(1);
        }
    }

    async checkDependencies() {
        console.log('🔍 检查开发依赖...');
        
        // 检查 Go
        try {
            await this.execCommand('go version');
            console.log('✅ Go 环境检查通过');
        } catch (error) {
            throw new Error('Go 环境未找到，请安装 Go 语言环境');
        }
        
        // 检查 Node.js
        try {
            await this.execCommand('node --version');
            console.log('✅ Node.js 环境检查通过');
        } catch (error) {
            throw new Error('Node.js 环境未找到');
        }
        
        // 检查并安装项目依赖
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('📦 安装项目依赖...');
            await this.execCommand('npm install', { cwd: this.projectRoot });
        }
        
        // 检查 Go 模块
        const goModPath = path.join(this.serverDir, 'go.mod');
        if (fs.existsSync(goModPath)) {
            console.log('📦 检查 Go 依赖...');
            await this.execCommand('go mod tidy', { cwd: this.serverDir });
        }
    }

    async setupEnvironment() {
        console.log('⚙️ 设置开发环境...');
        
        // 设置环境变量
        process.env.NODE_ENV = 'development';
        process.env.APP_MODE = 'development';
        
        // 复制开发配置
        const devConfigPath = path.join(this.configDir, 'development.json');
        const configPath = path.join(this.serverDir, 'config.json');
        
        if (fs.existsSync(devConfigPath)) {
            fs.copyFileSync(devConfigPath, configPath);
            console.log('✅ 开发配置已设置');
        }
    }

    async startServer() {
        console.log('🔧 启动 Go 服务器...');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('go', ['run', 'main.go'], {
                cwd: this.serverDir,
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            let serverStarted = false;
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[服务器] ${output.trim()}`);
                
                // 检查服务器是否启动成功
                if (!serverStarted && (
                    output.includes('监听端口') || 
                    output.includes('listening') ||
                    output.includes('启动')
                )) {
                    serverStarted = true;
                    resolve();
                }
            });
            
            this.serverProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.error(`[服务器错误] ${output.trim()}`);
                
                // 检查服务器是否启动成功（有些信息可能通过stderr输出）
                if (!serverStarted && (
                    output.includes('监听端口') || 
                    output.includes('listening') ||
                    output.includes('启动')
                )) {
                    serverStarted = true;
                    resolve();
                }
            });
            
            this.serverProcess.on('error', (error) => {
                console.error('服务器启动失败:', error);
                if (!serverStarted) {
                    reject(error);
                }
            });
            
            this.serverProcess.on('exit', (code) => {
                console.log(`服务器进程退出，代码: ${code}`);
                if (!this.isShuttingDown && code !== 0) {
                    // 只有非正常退出才重启，并添加延迟避免端口冲突
                    console.log('服务器异常退出，5秒后重启...');
                    setTimeout(() => {
                        if (!this.isShuttingDown) {
                            this.restartServer();
                        }
                    }, 5000);
                }
            });
            
            // 超时检查
            setTimeout(() => {
                if (!serverStarted) {
                    reject(new Error('服务器启动超时'));
                }
            }, 10000);
        });
    }

    async startClient() {
        console.log('🖥️ 启动 Electron 客户端...');
        
        return new Promise(async (resolve, reject) => {
            // 等待服务器健康检查通过
            console.log('等待服务器启动完成...');
            let serverReady = false;
            let attempts = 0;
            const maxAttempts = 30; // 最多等待30秒
            
            while (!serverReady && attempts < maxAttempts) {
                try {
                    const response = await fetch(`http://127.0.0.1:${this.serverPort}/health`);
                    if (response.ok) {
                        serverReady = true;
                        console.log('✅ 服务器健康检查通过，启动客户端');
                        break;
                    }
                } catch (error) {
                    // 服务器还未准备好
                }
                
                attempts++;
                console.log(`服务器启动检查 ${attempts}/${maxAttempts}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (!serverReady) {
                console.warn('⚠️ 服务器健康检查超时，仍尝试启动客户端');
            }
            
            // 启动客户端
            // 直接启动Electron而不是运行dev脚本（避免重复启动服务器）
            const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            this.clientProcess = spawn(npmCommand, ['run', 'electron-dev'], {
                cwd: this.projectRoot,
                stdio: ['inherit', 'pipe', 'pipe'],
                shell: process.platform === 'win32'
            });
            
            let clientStarted = false;
            
            this.clientProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[客户端] ${output.trim()}`);
                
                if (!clientStarted && output.includes('ready')) {
                    clientStarted = true;
                    resolve();
                }
            });
            
            this.clientProcess.stderr.on('data', (data) => {
                const error = data.toString();
                // Electron 的一些警告是正常的，只输出而不视为错误
                console.log(`[客户端] ${error.trim()}`);
            });
            
            this.clientProcess.on('error', (error) => {
                console.error('客户端启动失败:', error);
                if (!clientStarted) {
                    reject(error);
                }
            });
            
            this.clientProcess.on('exit', (code) => {
                console.log(`客户端进程退出，代码: ${code}`);
                if (this.isShuttingDown) return;

                if (code === 0) {
                    // 正常退出：直接关闭整个开发环境
                    console.log('🛑 客户端正常退出，关闭开发环境...');
                    this.shutdown();
                } else {
                    // 异常退出：尝试重启客户端
                    console.log('客户端异常退出，准备重启...');
                    setTimeout(() => {
                        this.restartClient();
                    }, 2000);
                }
            });
            
            // 超时检查
            setTimeout(() => {
                if (!clientStarted) {
                    console.log('客户端启动可能需要更长时间...');
                    resolve(); // 不视为错误，允许继续
                }
            }, 15000);
                
            // 不再需要固定等待时间
        });
    }

    async restartServer() {
        if (this.isShuttingDown) return;
        
        console.log('🔄 重启服务器...');
        
        // 先停止现有的服务器进程
        await this.killServer();
        
        try {
            await this.startServer();
            console.log('✅ 服务器重启成功');
        } catch (error) {
            console.error('❌ 服务器重启失败:', error);
            // 限制重启次数，避免无限循环
            if (!this.restartCount) this.restartCount = 0;
            this.restartCount++;
            
            if (this.restartCount < 3) {
                console.log(`${5}秒后进行第${this.restartCount + 1}次重启尝试...`);
                setTimeout(() => {
                    this.restartServer();
                }, 5000);
            } else {
                console.error('❌ 服务器重启失败次数过多，停止重启');
                this.restartCount = 0;
            }
        }
    }

    async restartClient() {
        if (this.isShuttingDown) return;
        
        console.log('🔄 重启客户端...');
        
        try {
            await this.startClient();
            console.log('✅ 客户端重启成功');
        } catch (error) {
            console.error('❌ 客户端重启失败:', error);
        }
    }

    keepAlive() {
        // 监听文件变化（简单实现）
        this.watchFiles();
        
        // 提供开发命令
        this.setupCommands();
    }

    watchFiles() {
        // 监听服务器文件变化
        const serverFiles = path.join(this.serverDir, '**/*.go');
        
        try {
            const chokidar = require('chokidar');
            
            chokidar.watch(serverFiles, { 
                ignored: /node_modules/,
                persistent: true 
            }).on('change', (filePath) => {
                console.log(`📝 检测到服务器文件变化: ${path.relative(this.serverDir, filePath)}`);
                this.debounceRestart('server');
            });
            
            console.log('👀 文件监听已启动');
        } catch (error) {
            console.log('📝 文件监听不可用 (可安装 chokidar 以启用自动重启)');
        }
    }

    debounceRestart(type) {
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
            if (type === 'server') {
                this.killServer();
                setTimeout(() => {
                    this.restartServer();
                }, 1000);
            }
        }, 1000);
    }

    setupCommands() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('\n📋 可用命令:');
        console.log('  rs - 重启服务器');
        console.log('  rc - 重启客户端');
        console.log('  quit - 退出开发环境');
        console.log('');
        
        rl.on('line', (input) => {
            const command = input.trim().toLowerCase();
            
            switch (command) {
                case 'rs':
                case 'restart-server':
                    this.killServer();
                    setTimeout(() => {
                        this.restartServer();
                    }, 1000);
                    break;
                    
                case 'rc':
                case 'restart-client':
                    this.killClient();
                    setTimeout(() => {
                        this.restartClient();
                    }, 1000);
                    break;
                    
                case 'quit':
                case 'exit':
                case 'q':
                    this.shutdown();
                    break;
                    
                default:
                    if (command) {
                        console.log(`未知命令: ${command}`);
                    }
                    break;
            }
        });
    }

    async killServer() {
        if (this.serverProcess && !this.serverProcess.killed) {
            console.log('🛑 停止服务器...');
            
            try {
                // 首先尝试优雅关闭
                this.serverProcess.kill('SIGTERM');
                
                // 等待进程退出
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        // 如果2秒内没有退出，强制终止
                        if (this.serverProcess && !this.serverProcess.killed) {
                            console.log('⚠️  服务器未响应SIGTERM，强制终止...');
                            if (process.platform === 'win32') {
                                // Windows: 强制终止进程树
                                try {
                                    execSync(`taskkill /F /T /PID ${this.serverProcess.pid}`, { stdio: 'pipe' });
                                } catch (error) {
                                    console.warn('强制终止服务器进程失败:', error.message);
                                }
                            } else {
                                // Unix: 使用SIGKILL
                                this.serverProcess.kill('SIGKILL');
                            }
                        }
                        resolve();
                    }, 2000);
                    
                    if (this.serverProcess) {
                        this.serverProcess.on('exit', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    } else {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
                
            } catch (error) {
                console.warn('停止服务器过程中出错:', error.message);
            }
            
            this.serverProcess = null;
        }
    }

    async killClient() {
        if (this.clientProcess && !this.clientProcess.killed) {
            console.log('🛑 停止客户端...');
            
            try {
                // 首先尝试优雅关闭
                this.clientProcess.kill('SIGTERM');
                
                // 等待进程退出
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        // 如果2秒内没有退出，强制终止
                        if (this.clientProcess && !this.clientProcess.killed) {
                            console.log('⚠️  客户端未响应SIGTERM，强制终止...');
                            if (process.platform === 'win32') {
                                // Windows: 强制终止进程树
                                try {
                                    execSync(`taskkill /F /T /PID ${this.clientProcess.pid}`, { stdio: 'pipe' });
                                } catch (error) {
                                    console.warn('强制终止客户端进程失败:', error.message);
                                }
                            } else {
                                // Unix: 使用SIGKILL
                                this.clientProcess.kill('SIGKILL');
                            }
                        }
                        resolve();
                    }, 2000);
                    
                    if (this.clientProcess) {
                        this.clientProcess.on('exit', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    } else {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
                
            } catch (error) {
                console.warn('停止客户端过程中出错:', error.message);
            }
            
            this.clientProcess = null;
        }
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log('\n🛑 正在关闭开发环境...');
        
        // 清理定时器
        clearTimeout(this.restartTimer);
        
        // 停止进程 - 等待异步完成
        await this.killServer();
        await this.killClient();
        
        // 额外的端口清理 - 处理僵尸进程
        await this.cleanupPort();
        
        console.log('✅ 开发环境已关闭');
        process.exit(0);
    }

    // 清理端口占用（处理僵尸进程）
    async cleanupPort() {
        const port = this.getServerPort();
        
        try {
            // 检查端口是否仍被占用
            const command = process.platform === 'win32' 
                ? `netstat -ano | findstr :${port}.*LISTENING`
                : `lsof -ti:${port}`;
            
            const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            
            if (result.trim()) {
                console.log(`🧹 检测到端口 ${port} 仍被占用，执行深度清理...`);
                
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
                    
                    // 尝试清理每个PID（只清理开发相关进程）
                    for (const pid of pids) {
                        try {
                            // 检查进程信息，只清理开发相关的进程
                            const processInfo = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8', stdio: 'pipe' });
                            const lines = processInfo.trim().split('\n');
                            
                            let shouldKill = false;
                            if (lines.length > 1) {
                                const processLine = lines[1];
                                const match = processLine.match(/^"([^"]+)"/);
                                const processName = match ? match[1].toLowerCase() : '';
                                
                                // 只清理开发相关的进程
                                if (processName.includes('go') || 
                                    processName.includes('node') || 
                                    processName.includes('electron') ||
                                    processName.includes('main.exe')) {
                                    shouldKill = true;
                                }
                            } else {
                                // 如果找不到进程信息，可能是僵尸进程，也清理
                                shouldKill = true;
                            }
                            
                            if (shouldKill) {
                                execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                                console.log(`✅ 已清理端口占用进程: PID ${pid}`);
                            } else {
                                console.log(`ℹ️  跳过系统进程: PID ${pid}（非开发相关进程）`);
                            }
                        } catch (error) {
                            console.log(`ℹ️  清理进程 PID ${pid} 失败，可能已自动清理`);
                        }
                    }
                } else {
                    // Unix/Linux/macOS
                    const pids = result.trim().split('\n').map(pid => parseInt(pid)).filter(pid => !isNaN(pid));
                    
                    for (const pid of pids) {
                        try {
                            execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
                            console.log(`✅ 已清理端口占用进程: PID ${pid}`);
                        } catch (error) {
                            console.log(`ℹ️  清理进程 PID ${pid} 失败，可能已自动清理`);
                        }
                    }
                }
                
                // 等待端口释放
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(`✅ 端口 ${port} 清理完成`);
            }
        } catch (error) {
            // 没有找到占用的进程，这是正常的
        }
    }

    getServerPort() {
        // 默认端口
        let port = 1313;
        
        try {
            // 尝试读取开发配置
            const devConfigPath = path.join(this.configDir, 'development.json');
            if (fs.existsSync(devConfigPath)) {
                const config = JSON.parse(fs.readFileSync(devConfigPath, 'utf8'));
                if (config.server && config.server.port) {
                    port = config.server.port;
                }
            }
        } catch (error) {
            console.warn('读取配置文件失败，使用默认端口:', port);
        }
        
        return port;
    }

    execCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            exec(command, {
                maxBuffer: 1024 * 1024 * 5, // 5MB buffer
                ...options
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}

// 检测端口参数并自动更改端口
async function handlePortChange(args) {
    // 查找数字参数作为端口号
    const portArg = args.find(arg => /^\d+$/.test(arg));
    
    if (portArg) {
        const newPort = parseInt(portArg);
        console.log(`🔄 检测到端口参数: ${newPort}`);
        console.log('📝 正在自动更改端口配置...\n');
        
        try {
            // 调用端口更改脚本
            const PortChanger = require('./change-port.js');
            const portChanger = new PortChanger();
            await portChanger.changePort(newPort);
            
            console.log('\n🚀 端口更改完成，即将启动开发环境...\n');
            // 等待一下让用户看到端口更改的结果
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        } catch (error) {
            console.error('\n❌ 端口更改失败:', error.message);
            console.log('⚠️  将使用当前配置启动开发环境...\n');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return false;
}

// 脚本入口
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
使用方法: npm start [端口号] [选项]

端口号:
  <数字>           自动更改为指定端口并启动 (如: npm start 8080)

选项:
  --help, -h       显示帮助信息
  --server-only    只启动服务器
  --client-only    只启动客户端

示例:
  npm start                  启动完整开发环境
  npm start 8080            更改端口为8080并启动
  npm start 3000            更改端口为3000并启动
  npm start --server-only   只启动服务器
  npm start --client-only   只启动客户端
  
🚀 快速端口切换:
  npm start 8080            一键切换到端口8080并启动
  npm start 3000            一键切换到端口3000并启动
  npm start 9999            一键切换到端口9999并启动
        `);
        process.exit(0);
    }
    
    // 异步启动函数
    async function startDev() {
        // 处理端口更改
        await handlePortChange(args);
        
        const devServer = new DevServer();
        
        if (args.includes('--server-only')) {
            devServer.checkDependencies()
                .then(() => devServer.setupEnvironment())
                .then(() => devServer.startServer())
                .then(() => {
                    console.log('✅ 服务器启动完成!');
                    devServer.keepAlive();
                })
                .catch(console.error);
        } else if (args.includes('--client-only')) {
            devServer.checkDependencies()
                .then(() => devServer.startClient())
                .then(() => {
                    console.log('✅ 客户端启动完成!');
                    devServer.keepAlive();
                })
                .catch(console.error);
        } else {
            devServer.start();
        }
    }
    
    // 启动开发环境
    startDev().catch(console.error);
}

module.exports = DevServer;