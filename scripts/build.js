#!/usr/bin/env node

/**
 * 构建脚本 - 用于构建生产版本
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class Builder {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.serverDir = path.join(this.projectRoot, 'server');
        this.srcDir = path.join(this.projectRoot, 'src');
        this.configDir = path.join(this.projectRoot, 'config');
        this.distDir = path.join(this.projectRoot, 'dist');
        
        this.platform = process.platform;
        this.arch = process.arch;
        
        console.log('🚀 开始构建过程...');
        console.log(`平台: ${this.platform}, 架构: ${this.arch}`);
    }

    async build() {
        try {
            await this.checkDependencies();
            await this.cleanDist();
            await this.buildServer();
            await this.buildClient();
            await this.copyResources();
            
            console.log('✅ 构建完成!');
            console.log(`📦 输出目录: ${this.distDir}`);
            
        } catch (error) {
            console.error('❌ 构建失败:', error.message);
            process.exit(1);
        }
    }

    async checkDependencies() {
        console.log('🔍 检查依赖...');
        
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
        
        // 检查项目依赖
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('项目 package.json 未找到');
        }
        
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('📦 安装项目依赖...');
            await this.execCommand('npm install', { cwd: this.projectRoot });
        }
    }

    async cleanDist() {
        console.log('🧹 清理输出目录...');
        
        if (fs.existsSync(this.distDir)) {
            // 跨平台删除目录
            if (process.platform === 'win32') {
                await this.execCommand(`rmdir /s /q "${this.distDir}"`, { shell: true });
            } else {
                await this.execCommand(`rm -rf "${this.distDir}"`, { shell: true });
            }
        }
        
        fs.mkdirSync(this.distDir, { recursive: true });
    }

    async buildServer() {
        console.log('🔨 构建 Go 服务器...');
        
        const serverExecutable = this.platform === 'win32' ? 'app-server.exe' : 'app-server';
        const outputPath = path.join(this.serverDir, serverExecutable);
        
        // 设置环境变量
        const env = {
            ...process.env,
            CGO_ENABLED: '0',
            GOOS: this.platform === 'win32' ? 'windows' : this.platform,
            GOARCH: this.arch === 'x64' ? 'amd64' : this.arch
        };
        
        // 构建命令
        const buildCmd = `go build -ldflags="-s -w" -o "${outputPath}" main.go`;
        
        await this.execCommand(buildCmd, { 
            cwd: this.serverDir,
            env 
        });
        
        if (fs.existsSync(outputPath)) {
            console.log(`✅ 服务器构建完成: ${outputPath}`);
        } else {
            throw new Error('服务器构建失败');
        }
    }

    async buildClient() {
        console.log('🔨 构建 Electron 客户端...');
        
        // 使用 electron-builder 构建
        const builderConfig = this.loadBuildConfig();
        
        // 根据平台选择构建目标
        let buildCommand = 'npx electron-builder';
        
        switch (this.platform) {
            case 'win32':
                buildCommand += ' --win';
                break;
            case 'darwin':
                buildCommand += ' --mac';
                break;
            case 'linux':
                buildCommand += ' --linux';
                break;
        }
        
        // 添加架构参数
        if (this.arch === 'arm64') {
            buildCommand += ' --arm64';
        } else {
            buildCommand += ' --x64';
        }
        
        await this.execCommand(buildCommand, { 
            cwd: this.projectRoot,
            env: {
                ...process.env,
                NODE_ENV: 'production'
            }
        });
        
        console.log('✅ 客户端构建完成');
    }

    async copyResources() {
        console.log('📋 复制资源文件...');
        
        // 复制配置文件
        const configSource = path.join(this.configDir, 'production.json');
        const configDest = path.join(this.distDir, 'config.json');
        
        if (fs.existsSync(configSource)) {
            fs.copyFileSync(configSource, configDest);
            console.log('✅ 配置文件已复制');
        }
        
        // 复制其他必要文件
        const filesToCopy = [
            'README.md',
            'LICENSE'
        ];
        
        filesToCopy.forEach(file => {
            const source = path.join(this.projectRoot, file);
            const dest = path.join(this.distDir, file);
            
            if (fs.existsSync(source)) {
                fs.copyFileSync(source, dest);
                console.log(`✅ ${file} 已复制`);
            }
        });
    }

    loadBuildConfig() {
        try {
            const configPath = path.join(this.configDir, 'build.json');
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (error) {
            console.warn('⚠️ 无法加载构建配置，使用默认配置');
            return {};
        }
    }

    execCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`🔧 执行: ${command}`);
            
            exec(command, {
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                ...options
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`错误: ${error.message}`);
                    if (stderr) console.error(`stderr: ${stderr}`);
                    reject(error);
                } else {
                    if (stdout) console.log(stdout);
                    resolve(stdout);
                }
            });
        });
    }

    // 获取构建信息
    getBuildInfo() {
        return {
            timestamp: new Date().toISOString(),
            platform: this.platform,
            arch: this.arch,
            nodeVersion: process.version,
            commit: this.getGitCommit()
        };
    }

    getGitCommit() {
        try {
            return require('child_process')
                .execSync('git rev-parse --short HEAD', { encoding: 'utf8' })
                .trim();
        } catch (error) {
            return 'unknown';
        }
    }
}

// 脚本入口
if (require.main === module) {
    const builder = new Builder();
    
    // 处理命令行参数
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
使用方法: node build.js [选项]

选项:
  --help, -h     显示帮助信息
  --clean        只清理输出目录
  --server-only  只构建服务器
  --client-only  只构建客户端

示例:
  node build.js                构建完整应用
  node build.js --server-only  只构建服务器
  node build.js --client-only  只构建客户端
        `);
        process.exit(0);
    }
    
    if (args.includes('--clean')) {
        builder.cleanDist().then(() => {
            console.log('✅ 清理完成');
        }).catch(console.error);
    } else if (args.includes('--server-only')) {
        builder.buildServer().catch(console.error);
    } else if (args.includes('--client-only')) {
        builder.buildClient().catch(console.error);
    } else {
        builder.build();
    }
}

module.exports = Builder;