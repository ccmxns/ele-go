// 导航管理脚本
class Navigation {
    constructor() {
        this.currentPage = 'home';
        this.pages = new Map();
        this.navItems = new Map();
        this.history = [];
        this.maxHistory = 10;
        
        this.initializeNavigation();
        this.bindEvents();
    }

    initializeNavigation() {
        // 注册所有页面
        const pageElements = document.querySelectorAll('.page');
        pageElements.forEach(page => {
            const pageId = page.id.replace('Page', '');
            this.pages.set(pageId, {
                element: page,
                title: this.getPageTitle(pageId),
                loaded: false
            });
        });

        // 注册所有导航项
        const navElements = document.querySelectorAll('.nav-item');
        navElements.forEach(nav => {
            const pageId = nav.dataset.page;
            if (pageId) {
                this.navItems.set(pageId, nav);
            }
        });

        // 设置初始页面
        this.showPage(this.currentPage, false);
    }

    bindEvents() {
        // 导航点击事件
        document.addEventListener('click', (event) => {
            const navItem = event.target.closest('.nav-item');
            if (navItem && navItem.dataset.page) {
                event.preventDefault();
                this.navigateTo(navItem.dataset.page);
            }
        });



        // 键盘导航
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardNavigation(event);
        });

        // 浏览器前进/后退
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.showPage(event.state.page, false);
            }
        });
    }

    navigateTo(pageId, addToHistory = true) {
        if (!this.pages.has(pageId)) {
            console.warn(`页面不存在: ${pageId}`);
            return false;
        }

        if (pageId === this.currentPage) {
            return true;
        }

        const success = this.showPage(pageId, addToHistory);
        if (success) {
            this.updateNavigation(pageId);
            this.updateHistory(pageId);
        }

        return success;
    }

    showPage(pageId, addToHistory = true) {
        const page = this.pages.get(pageId);
        if (!page) {
            return false;
        }

        try {
            // 隐藏当前页面
            this.hideCurrentPage();

            // 显示目标页面
            page.element.classList.add('active');
            this.currentPage = pageId;

            // 更新页面标题
            this.updatePageTitle(page.title);

            // 延迟加载页面内容
            if (!page.loaded) {
                this.loadPageContent(pageId);
                page.loaded = true;
            }

            // 添加到浏览器历史
            if (addToHistory) {
                const url = new URL(window.location);
                url.searchParams.set('page', pageId);
                history.pushState({ page: pageId }, page.title, url.toString());
            }

            // 触发页面显示事件
            this.triggerPageEvent('show', pageId);

            return true;
        } catch (error) {
            console.error(`显示页面失败: ${pageId}`, error);
            return false;
        }
    }

    hideCurrentPage() {
        const currentPageElement = document.querySelector('.page.active');
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
            
            // 触发页面隐藏事件
            const pageId = currentPageElement.id.replace('Page', '');
            this.triggerPageEvent('hide', pageId);
        }
    }

    updateNavigation(pageId) {
        // 移除所有active状态
        this.navItems.forEach(nav => {
            nav.classList.remove('active');
        });

        // 设置当前页面的导航项为active
        const currentNav = this.navItems.get(pageId);
        if (currentNav) {
            currentNav.classList.add('active');
        }
    }

    updateHistory(pageId) {
        // 避免重复添加相同页面
        if (this.history.length === 0 || this.history[this.history.length - 1] !== pageId) {
            this.history.push(pageId);
            
            // 限制历史记录长度
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }
        }
    }

    updatePageTitle(title) {
        if (window.titleBar) {
            window.titleBar.setTitle(title || 'Electron Go App');
        }
    }

    getPageTitle(pageId) {
        const titles = {
            home: 'Electron Go App - 主页',
            about: '关于应用'
        };
        return titles[pageId] || 'Electron Go App';
    }

    loadPageContent(pageId) {
        // 根据页面ID加载特定内容
        switch (pageId) {
            case 'about':
                this.loadAboutInfo();
                break;
            default:
                break;
        }
    }



    loadAboutInfo() {
        // 加载应用信息
        const aboutPage = document.getElementById('aboutPage');
        if (aboutPage && !aboutPage.dataset.loaded) {
            // 这里可以动态加载更多应用信息
            aboutPage.dataset.loaded = 'true';
        }
    }

    handleKeyboardNavigation(event) {
        // Ctrl/Cmd + 数字键切换页面
        if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '9') {
            event.preventDefault();
            const pageIndex = parseInt(event.key) - 1;
            const pageIds = Array.from(this.pages.keys());
            if (pageIndex < pageIds.length) {
                this.navigateTo(pageIds[pageIndex]);
            }
        }

        // Alt + 左箭头返回上一页
        if (event.altKey && event.key === 'ArrowLeft') {
            event.preventDefault();
            this.goBack();
        }

        // Esc键返回主页
        if (event.key === 'Escape') {
            this.navigateTo('home');
        }
    }

    goBack() {
        if (this.history.length > 1) {
            // 移除当前页面
            this.history.pop();
            // 获取上一页
            const previousPage = this.history[this.history.length - 1];
            this.showPage(previousPage, false);
            this.updateNavigation(previousPage);
        }
    }

    goHome() {
        this.navigateTo('home');
    }



    triggerPageEvent(eventType, pageId) {
        const event = new CustomEvent(`page${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: { pageId }
        });
        document.dispatchEvent(event);
    }

    // 添加新页面
    addPage(pageId, pageElement, title, navElement) {
        if (this.pages.has(pageId)) {
            console.warn(`页面已存在: ${pageId}`);
            return false;
        }

        this.pages.set(pageId, {
            element: pageElement,
            title: title,
            loaded: false
        });

        if (navElement) {
            this.navItems.set(pageId, navElement);
        }

        return true;
    }

    // 移除页面
    removePage(pageId) {
        if (!this.pages.has(pageId)) {
            return false;
        }

        // 如果是当前页面，先切换到主页
        if (this.currentPage === pageId) {
            this.navigateTo('home');
        }

        // 移除页面元素
        const page = this.pages.get(pageId);
        if (page.element) {
            page.element.remove();
        }

        // 移除导航项
        const navItem = this.navItems.get(pageId);
        if (navItem) {
            navItem.remove();
        }

        // 从映射中删除
        this.pages.delete(pageId);
        this.navItems.delete(pageId);

        // 从历史中移除
        this.history = this.history.filter(p => p !== pageId);

        return true;
    }

    // 获取当前页面
    getCurrentPage() {
        return this.currentPage;
    }

    // 获取所有页面
    getAllPages() {
        return Array.from(this.pages.keys());
    }

    // 获取历史记录
    getHistory() {
        return [...this.history];
    }

    // 检查页面是否存在
    hasPage(pageId) {
        return this.pages.has(pageId);
    }

    // 刷新当前页面
    refreshCurrentPage() {
        const currentPage = this.pages.get(this.currentPage);
        if (currentPage) {
            currentPage.loaded = false;
            this.loadPageContent(this.currentPage);
        }
    }
}

// 全局导航实例
let navigation;

// DOM加载完成后初始化导航
document.addEventListener('DOMContentLoaded', () => {
    navigation = new Navigation();
    
    // 检查URL中的页面参数
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam && navigation.hasPage(pageParam)) {
        navigation.navigateTo(pageParam, false);
    }
});

// 导出导航实例供其他脚本使用
window.navigation = navigation;