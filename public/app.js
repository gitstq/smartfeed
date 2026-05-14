/**
 * SmartFeed 前端应用
 */

class SmartFeedApp {
    constructor() {
        this.apiBase = '/api';
        this.currentView = 'all';
        this.currentFeedId = null;
        this.items = [];
        this.feeds = [];
        this.tags = [];
        this.currentItemId = null;

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadStats();
        await this.loadFeeds();
        await this.loadTags();
        await this.loadItems();
    }

    // ==================== API 请求 ====================

    async api(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '请求失败');
        }

        return response.json();
    }

    // ==================== 数据加载 ====================

    async loadStats() {
        try {
            const { data } = await this.api('/stats');
            document.getElementById('unread-count').textContent = data.unreadCount;
            document.getElementById('stats-text').textContent =
                `${data.feedCount} 个订阅源 · ${data.itemCount} 篇文章 · ${data.unreadCount} 篇未读`;
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    async loadFeeds() {
        try {
            const { data } = await this.api('/feeds');
            this.feeds = data;
            this.renderFeeds();
        } catch (error) {
            console.error('加载Feed列表失败:', error);
        }
    }

    async loadTags() {
        try {
            const { data } = await this.api('/tags');
            this.tags = data;
            this.renderTags();
        } catch (error) {
            console.error('加载标签列表失败:', error);
        }
    }

    async loadItems(options = {}) {
        try {
            const params = new URLSearchParams();

            if (this.currentView === 'unread') {
                params.append('isRead', 'false');
            } else if (this.currentView === 'starred') {
                params.append('isStarred', 'true');
            } else if (this.currentFeedId) {
                params.append('feedId', this.currentFeedId);
            }

            if (options.search) {
                params.append('search', options.search);
            }

            params.append('limit', options.limit || 50);

            const { data } = await this.api(`/items?${params}`);
            this.items = data;
            this.renderItems();
        } catch (error) {
            console.error('加载文章列表失败:', error);
            this.showToast('加载文章失败', 'error');
        }
    }

    // ==================== 渲染 ====================

    renderFeeds() {
        const container = document.getElementById('feeds-list');

        if (this.feeds.length === 0) {
            container.innerHTML = '<li class="empty-state"><p>暂无订阅源</p></li>';
            return;
        }

        container.innerHTML = this.feeds.map(feed => `
            <li class="feed-item ${this.currentFeedId === feed.id ? 'active' : ''}"
                data-feed-id="${feed.id}">
                <i class="fas fa-rss"></i>
                <span class="feed-title">${this.escapeHtml(feed.title || feed.url)}</span>
            </li>
        `).join('');

        // 绑定点击事件
        container.querySelectorAll('.feed-item').forEach(item => {
            item.addEventListener('click', () => {
                const feedId = parseInt(item.dataset.feedId, 10);
                this.selectFeed(feedId);
            });
        });
    }

    renderTags() {
        const container = document.getElementById('tags-list');

        if (this.tags.length === 0) {
            container.innerHTML = '<li class="empty-state"><p>暂无标签</p></li>';
            return;
        }

        container.innerHTML = this.tags.map(tag => `
            <li class="tag-item" data-tag-id="${tag.id}">
                <span class="tag-color" style="background: ${tag.color}"></span>
                <span>${this.escapeHtml(tag.name)}</span>
            </li>
        `).join('');
    }

    renderItems() {
        const container = document.getElementById('items-list');

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>暂无文章</h3>
                    <p>添加订阅源开始接收文章</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.items.map(item => `
            <div class="item-card ${item.isRead ? '' : 'unread'} ${item.isStarred ? 'starred' : ''}"
                 data-item-id="${item.id}">
                <div class="item-header">
                    <h3 class="item-title">${this.escapeHtml(item.title || '无标题')}</h3>
                </div>
                <div class="item-meta">
                    <span class="item-feed">${this.escapeHtml(item.feedTitle || '未知来源')}</span>
                    <span class="item-date">${this.formatDate(item.pubDate)}</span>
                </div>
                <p class="item-summary">${this.escapeHtml(item.description || '').substring(0, 200)}...</p>
                <div class="item-actions">
                    <button class="btn-icon btn-mark-read" title="标记已读">
                        <i class="fas ${item.isRead ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="btn-icon btn-star" title="收藏">
                        <i class="${item.isStarred ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // 绑定事件
        container.querySelectorAll('.item-card').forEach(card => {
            const itemId = parseInt(card.dataset.itemId, 10);

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    this.openItem(itemId);
                }
            });

            card.querySelector('.btn-mark-read')?.addEventListener('click', () => {
                this.markItemAsRead(itemId);
            });

            card.querySelector('.btn-star')?.addEventListener('click', () => {
                this.toggleStar(itemId);
            });
        });
    }

    renderItemDetail(item) {
        const container = document.getElementById('detail-content');

        container.innerHTML = `
            <h1>${this.escapeHtml(item.title || '无标题')}</h1>
            <div class="meta">
                <span>${this.escapeHtml(item.feedTitle || '未知来源')}</span>
                <span>·</span>
                <span>${this.formatDate(item.pubDate)}</span>
                ${item.author ? `<span>·</span><span>${this.escapeHtml(item.author)}</span>` : ''}
            </div>
            <div class="content">
                ${item.content || item.description || '<p>暂无内容</p>'}
            </div>
        `;

        // 更新收藏按钮状态
        const starBtn = document.getElementById('btn-star-detail');
        starBtn.innerHTML = `<i class="${item.isStarred ? 'fas' : 'far'} fa-star"></i>`;
        starBtn.classList.toggle('active', item.isStarred);

        // 更新外部链接
        const externalBtn = document.getElementById('btn-open-external');
        externalBtn.onclick = () => {
            if (item.link) {
                window.open(item.link, '_blank');
            }
        };
    }

    // ==================== 事件处理 ====================

    bindEvents() {
        // 导航切换
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);

                // 更新激活状态
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // 添加Feed
        document.getElementById('btn-add-feed').addEventListener('click', () => {
            this.openModal('modal-add-feed');
        });

        document.getElementById('btn-confirm-add-feed').addEventListener('click', () => {
            this.addFeed();
        });

        // 添加标签
        document.getElementById('btn-add-tag').addEventListener('click', () => {
            this.openModal('modal-add-tag');
        });

        document.getElementById('btn-confirm-add-tag').addEventListener('click', () => {
            this.addTag();
        });

        // 关闭弹窗
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // 搜索
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadItems({ search: e.target.value });
            }, 300);
        });

        // 全部已读
        document.getElementById('btn-mark-all-read').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // 刷新
        document.getElementById('btn-refresh').addEventListener('click', () => {
            this.refreshAll();
        });

        // 关闭详情
        document.getElementById('btn-close-detail').addEventListener('click', () => {
            this.closeItemDetail();
        });

        // 详情页收藏
        document.getElementById('btn-star-detail').addEventListener('click', () => {
            if (this.currentItemId) {
                this.toggleStar(this.currentItemId);
            }
        });

        // 知识图谱
        document.getElementById('btn-knowledge-graph').addEventListener('click', () => {
            this.openKnowledgeGraph();
        });

        // 点击弹窗外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
    }

    // ==================== 操作 ====================

    switchView(view) {
        this.currentView = view;
        this.currentFeedId = null;
        this.updatePageTitle();
        this.loadItems();
    }

    selectFeed(feedId) {
        this.currentFeedId = feedId;
        this.currentView = 'feed';
        this.updatePageTitle();
        this.loadItems();
        this.renderFeeds();
    }

    updatePageTitle() {
        const titles = {
            all: '全部文章',
            unread: '未读文章',
            starred: '收藏文章',
            feed: '订阅源文章'
        };

        let title = titles[this.currentView] || '文章列表';

        if (this.currentFeedId) {
            const feed = this.feeds.find(f => f.id === this.currentFeedId);
            if (feed) {
                title = feed.title || feed.url;
            }
        }

        document.getElementById('page-title').textContent = title;
    }

    async openItem(itemId) {
        try {
            const { data } = await this.api(`/items/${itemId}`);
            this.currentItemId = itemId;
            this.renderItemDetail(data);

            const detailPanel = document.getElementById('item-detail');
            detailPanel.classList.remove('hidden');

            // 更新列表中的已读状态
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.isRead = 1;
                this.renderItems();
                this.loadStats();
            }
        } catch (error) {
            console.error('加载文章详情失败:', error);
            this.showToast('加载文章详情失败', 'error');
        }
    }

    closeItemDetail() {
        document.getElementById('item-detail').classList.add('hidden');
        this.currentItemId = null;
    }

    async markItemAsRead(itemId) {
        try {
            await this.api(`/items/${itemId}/read`, { method: 'POST' });

            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.isRead = 1;
                this.renderItems();
                this.loadStats();
            }
        } catch (error) {
            console.error('标记已读失败:', error);
            this.showToast('操作失败', 'error');
        }
    }

    async toggleStar(itemId) {
        try {
            await this.api(`/items/${itemId}/star`, { method: 'POST' });

            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.isStarred = item.isStarred ? 0 : 1;
                this.renderItems();

                // 如果在详情页，更新详情页的收藏按钮
                if (this.currentItemId === itemId) {
                    this.renderItemDetail(item);
                }
            }
        } catch (error) {
            console.error('切换收藏失败:', error);
            this.showToast('操作失败', 'error');
        }
    }

    async markAllAsRead() {
        try {
            await this.api('/items/mark-all-read', {
                method: 'POST',
                body: JSON.stringify({ feedId: this.currentFeedId })
            });

            this.items.forEach(item => item.isRead = 1);
            this.renderItems();
            this.loadStats();
            this.showToast('已全部标记为已读', 'success');
        } catch (error) {
            console.error('标记全部已读失败:', error);
            this.showToast('操作失败', 'error');
        }
    }

    async addFeed() {
        const url = document.getElementById('feed-url').value.trim();
        const category = document.getElementById('feed-category').value.trim();

        if (!url) {
            this.showToast('请输入Feed URL', 'warning');
            return;
        }

        try {
            const result = await this.api('/feeds', {
                method: 'POST',
                body: JSON.stringify({ url, category })
            });

            this.closeAllModals();
            this.showToast(`Feed "${result.title}" 添加成功`, 'success');
            this.loadFeeds();
            this.loadItems();

            // 清空输入
            document.getElementById('feed-url').value = '';
            document.getElementById('feed-category').value = '';
        } catch (error) {
            this.showToast(error.message || '添加失败', 'error');
        }
    }

    async addTag() {
        const name = document.getElementById('tag-name').value.trim();
        const color = document.getElementById('tag-color').value;

        if (!name) {
            this.showToast('请输入标签名称', 'warning');
            return;
        }

        try {
            await this.api('/tags', {
                method: 'POST',
                body: JSON.stringify({ name, color })
            });

            this.closeAllModals();
            this.showToast('标签添加成功', 'success');
            this.loadTags();

            // 清空输入
            document.getElementById('tag-name').value = '';
        } catch (error) {
            this.showToast(error.message || '添加失败', 'error');
        }
    }

    async refreshAll() {
        const btn = document.getElementById('btn-refresh');
        btn.classList.add('loading');

        try {
            await this.api('/system/refresh-all', { method: 'POST' });
            this.showToast('刷新完成', 'success');
            this.loadItems();
            this.loadStats();
        } catch (error) {
            console.error('刷新失败:', error);
            this.showToast('刷新失败', 'error');
        } finally {
            btn.classList.remove('loading');
        }
    }

    async openKnowledgeGraph() {
        this.openModal('modal-knowledge-graph');

        try {
            const { data } = await this.api('/knowledge/graph');
            this.renderKnowledgeGraph(data);
        } catch (error) {
            console.error('加载知识图谱失败:', error);
            document.getElementById('knowledge-graph-container').innerHTML =
                '<div class="empty-state"><p>知识图谱功能开发中...</p></div>';
        }
    }

    renderKnowledgeGraph(data) {
        // 简化的知识图谱展示
        const container = document.getElementById('knowledge-graph-container');

        if (!data.nodes || data.nodes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-project-diagram"></i>
                    <h3>暂无知识节点</h3>
                    <p>系统会自动从文章中提取知识节点</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="knowledge-stats">
                <p>知识节点: ${data.nodes.length} 个</p>
                <p>知识关系: ${data.edges?.length || 0} 条</p>
            </div>
            <div class="knowledge-nodes">
                ${data.nodes.map(node => `
                    <div class="knowledge-node">
                        <span class="node-name">${this.escapeHtml(node.name)}</span>
                        <span class="node-type">${node.type}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ==================== 弹窗控制 ====================

    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // ==================== 工具函数 ====================

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '未知时间';

        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // 小于1小时
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return minutes < 1 ? '刚刚' : `${minutes} 分钟前`;
        }

        // 小于24小时
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} 小时前`;
        }

        // 小于7天
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} 天前`;
        }

        // 默认格式
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SmartFeedApp();
});