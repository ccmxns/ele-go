#!/usr/bin/env node

/**
 * 清理脚本 - 用于清理构建产物和临时文件
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class Cleaner {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.serverDir = path.join(this.projectRoot, 'server');
        this.clientDir = path.join(this.projectRoot, 'client');
        
        console.log('🧹 开始清理项目...');
    }

    async clean() {
        try {
            await this.cleanServer();
            await this.cleanClient();
            await this.cleanLogs();
            await this.cleanTemp();
            
            console.log('✅ 清理完成!');
            
        } catch (error) {
            console.error('❌ 清理失败:', error.message);
            process.exit(1);
        }
    }

    async cleanServer() {
        console.log('🔧 清理服务器构建产物...');
        
        const filesToDelete = [
            'app-server',
            'app-server.exe',
            'main',
            'main.exe',
            'config.json'
        ];
        
        let deletedCount = 0;
        
        filesToDelete.forEach(file => {
            const filePath = path.join(this.serverDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ 删除: ${file}`);
                deletedCount++;
            }
        });
        
        // 清理 Go 构建缓存
        try {
            await this.execCommand('go clean -cache -modcache', { cwd: this.serverDir });
            console.log('🗑️ 清理 Go 缓存');
        } catch (error) {
            console.warn('⚠️ 清理 Go 缓存失败:', error.message);
        }
        
        if (deletedCount === 0) {
            console.log('✨ 服务器目录已经是干净的');
        } else {
            console.log(`✅ 服务器清理完成，删除了 ${deletedCount} 个文件`);
        }
    }

    async cleanClient() {
        console.log('🖥️ 清理客户端构建产物...');
        
        const dirsToDelete = [
            'dist',
            'build',
            '.electron-builder-cache'
        ];
        
        const filesToDelete = [
            '.DS_Store',
            'Thumbs.db',
            'desktop.ini'
        ];
        
        let deletedCount = 0;
        
        // 删除目录
        dirsToDelete.forEach(dir => {
            const dirPath = path.join(this.clientDir, dir);
            if (fs.existsSync(dirPath)) {
                this.removeDir(dirPath);
                console.log(`🗑️ 删除目录: ${dir}`);
                deletedCount++;
            }
        });
        
        // 删除文件
        filesToDelete.forEach(file => {
            const filePath = path.join(this.clientDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ 删除: ${file}`);
                deletedCount++;
            }
        });
        
        // 清理 npm 缓存（可选）
        const args = process.argv.slice(2);
        if (args.includes('--deep') || args.includes('--node-modules')) {
            const nodeModulesPath = path.join(this.clientDir, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                console.log('🗑️ 删除 node_modules (这可能需要一些时间)...');
                this.removeDir(nodeModulesPath);
                console.log('🗑️ 删除: node_modules');
                deletedCount++;
            }
            
            const packageLockPath = path.join(this.clientDir, 'package-lock.json');
            if (fs.existsSync(packageLockPath)) {
                fs.unlinkSync(packageLockPath);
                console.log('🗑️ 删除: package-lock.json');
                deletedCount++;
            }
        }
        
        if (deletedCount === 0) {
            console.log('✨ 客户端目录已经是干净的');
        } else {
            console.log(`✅ 客户端清理完成，删除了 ${deletedCount} 个项目`);
        }
    }

    async cleanLogs() {
        console.log('📄 清理日志文件...');
        
        const logDirs = [
            path.join(this.projectRoot, 'logs'),
            path.join(this.serverDir, 'logs'),
            path.join(this.clientDir, 'logs')
        ];
        
        const logFiles = [
            '*.log',
            '*.log.*',
            'crash.dump',
            'error.dump'
        ];
        
        let deletedCount = 0;
        
        logDirs.forEach(logDir => {
            if (fs.existsSync(logDir)) {
                const files = fs.readdirSync(logDir);
                files.forEach(file => {
                    if (file.endsWith('.log') || file.includes('dump')) {
                        const filePath = path.join(logDir, file);
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ 删除日志: ${file}`);
                        deletedCount++;
                    }
                });
                
                // 如果目录为空，删除目录
                const remainingFiles = fs.readdirSync(logDir);
                if (remainingFiles.length === 0) {
                    fs.rmdirSync(logDir);
                    console.log(`🗑️ 删除空日志目录: ${path.basename(logDir)}`);
                }
            }
        });
        
        if (deletedCount === 0) {
            console.log('✨ 没有找到日志文件');
        } else {
            console.log(`✅ 日志清理完成，删除了 ${deletedCount} 个文件`);
        }
    }

    async cleanTemp() {
        console.log('🗂️ 清理临时文件...');
        
        const tempPatterns = [
            '**/.DS_Store',
            '**/Thumbs.db',
            '**/desktop.ini',
            '**/*.tmp',
            '**/*.temp',
            '**/*~',
            '**/.*.swp',
            '**/.*.swo'
        ];
        
        let deletedCount = 0;
        
        // 递归查找并删除临时文件
        this.findAndDeleteFiles(this.projectRoot, [
            '.DS_Store',
            'Thumbs.db',
            'desktop.ini'
        ], (file) => {
            console.log(`🗑️ 删除临时文件: ${path.relative(this.projectRoot, file)}`);
            deletedCount++;
        });
        
        if (deletedCount === 0) {
            console.log('✨ 没有找到临时文件');
        } else {
            console.log(`✅ 临时文件清理完成，删除了 ${deletedCount} 个文件`);
        }
    }

    removeDir(dirPath) {
        if (!fs.existsSync(dirPath)) return;
        
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                this.removeDir(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        
        fs.rmdirSync(dirPath);
    }

    findAndDeleteFiles(dir, patterns, callback) {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // 跳过特殊目录
                if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                    this.findAndDeleteFiles(filePath, patterns, callback);
                }
            } else {
                // 检查文件是否匹配模式
                if (patterns.some(pattern => file === pattern || file.endsWith(pattern))) {
                    fs.unlinkSync(filePath);
                    callback(filePath);
                }
            }
        });
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

    // 获取项目大小信息
    async getProjectSize() {
        console.log('📊 计算项目大小...');
        
        const sizes = {
            server: this.getDirSize(this.serverDir),
            client: this.getDirSize(this.clientDir),
            total: 0
        };
        
        sizes.total = sizes.server + sizes.client;
        
        console.log(`服务器目录: ${this.formatSize(sizes.server)}`);
        console.log(`客户端目录: ${this.formatSize(sizes.client)}`);
        console.log(`总大小: ${this.formatSize(sizes.total)}`);
        
        return sizes;
    }

    getDirSize(dirPath) {
        if (!fs.existsSync(dirPath)) return 0;
        
        let size = 0;
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                size += this.getDirSize(filePath);
            } else {
                size += stat.size;
            }
        });
        
        return size;
    }

    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// 脚本入口
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
使用方法: node clean.js [选项]

选项:
  --help, -h       显示帮助信息
  --deep           深度清理，包括 node_modules
  --node-modules   删除 node_modules 目录
  --server-only    只清理服务器
  --client-only    只清理客户端
  --size           显示项目大小信息

示例:
  node clean.js                清理所有构建产物
  node clean.js --deep         深度清理（包括依赖）
  node clean.js --server-only  只清理服务器
  node clean.js --size         显示项目大小
        `);
        process.exit(0);
    }
    
    const cleaner = new Cleaner();
    
    if (args.includes('--size')) {
        cleaner.getProjectSize().catch(console.error);
    } else if (args.includes('--server-only')) {
        cleaner.cleanServer().catch(console.error);
    } else if (args.includes('--client-only')) {
        cleaner.cleanClient().catch(console.error);
    } else {
        cleaner.clean();
    }
}

module.exports = Cleaner;