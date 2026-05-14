/**
 * Web服务器 - 提供REST API和静态文件服务
 */

import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class SmartFeedServer {
    constructor(feedManager, db) {
        this.feedManager = feedManager;
        this.db = db;
        this.app = express();
        this.server = null;

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // 静态文件服务
        this.app.use(express.static(join(__dirname, '../public')));
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        // API路由前缀
        const apiRouter = express.Router();

        // ==================== 统计信息 ====================
        apiRouter.get('/stats', (req, res) => {
            try {
                const stats = this.db.getStats();
                res.json({ success: true, data: stats });
            } catch (error) {
                logger.error('获取统计信息失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ==================== Feed管理 ====================

        // 获取所有Feed
        apiRouter.get('/feeds', (req, res) => {
            try {
                const feeds = this.db.getAllFeeds();
                res.json({ success: true, data: feeds });
            } catch (error) {
                logger.error('获取Feed列表失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 添加Feed
        apiRouter.post('/feeds', async (req, res) => {
            try {
                const { url, category } = req.body;
                if (!url) {
                    return res.status(400).json({ success: false, error: 'URL不能为空' });
                }

                const result = await this.feedManager.addFeed(url, category);
                if (result.success) {
                    res.status(201).json(result);
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                logger.error('添加Feed失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 删除Feed
        apiRouter.delete('/feeds/:id', (req, res) => {
            try {
                const { id } = req.params;
                const result = this.feedManager.deleteFeed(parseInt(id, 10));
                if (result.success) {
                    res.json({ success: true, message: 'Feed已删除' });
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                logger.error('删除Feed失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 刷新Feed
        apiRouter.post('/feeds/:id/refresh', async (req, res) => {
            try {
                const { id } = req.params;
                const feed = this.db.queryOne('SELECT url FROM feeds WHERE id = ?', [id]);

                if (!feed) {
                    return res.status(404).json({ success: false, error: 'Feed不存在' });
                }

                const result = await this.feedManager.fetchFeedItems(feed.url);
                res.json(result);
            } catch (error) {
                logger.error('刷新Feed失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ==================== 文章管理 ====================

        // 获取文章列表
        apiRouter.get('/items', (req, res) => {
            try {
                const {
                    feedId,
                    isRead,
                    isStarred,
                    limit = 50,
                    offset = 0,
                    search
                } = req.query;

                const options = {
                    feedId: feedId ? parseInt(feedId, 10) : undefined,
                    isRead: isRead !== undefined ? isRead === 'true' : undefined,
                    isStarred: isStarred !== undefined ? isStarred === 'true' : undefined,
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    search
                };

                const items = this.db.getItems(options);
                res.json({ success: true, data: items });
            } catch (error) {
                logger.error('获取文章列表失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取文章详情
        apiRouter.get('/items/:id', (req, res) => {
            try {
                const { id } = req.params;
                const item = this.db.getItemById(parseInt(id, 10));

                if (!item) {
                    return res.status(404).json({ success: false, error: '文章不存在' });
                }

                // 标记为已读
                this.db.markItemAsRead(parseInt(id, 10));

                res.json({ success: true, data: item });
            } catch (error) {
                logger.error('获取文章详情失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 标记文章为已读
        apiRouter.post('/items/:id/read', (req, res) => {
            try {
                const { id } = req.params;
                this.db.markItemAsRead(parseInt(id, 10));
                res.json({ success: true, message: '已标记为已读' });
            } catch (error) {
                logger.error('标记已读失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 切换文章收藏状态
        apiRouter.post('/items/:id/star', (req, res) => {
            try {
                const { id } = req.params;
                this.db.toggleItemStar(parseInt(id, 10));
                res.json({ success: true, message: '收藏状态已切换' });
            } catch (error) {
                logger.error('切换收藏状态失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 批量标记已读
        apiRouter.post('/items/mark-all-read', (req, res) => {
            try {
                const { feedId } = req.body;
                let sql = 'UPDATE items SET isRead = 1';
                const params = [];

                if (feedId) {
                    sql += ' WHERE feedId = ?';
                    params.push(feedId);
                }

                this.db.run(sql, params);
                res.json({ success: true, message: '全部标记为已读' });
            } catch (error) {
                logger.error('批量标记已读失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ==================== 标签管理 ====================

        // 获取所有标签
        apiRouter.get('/tags', (req, res) => {
            try {
                const tags = this.db.getAllTags();
                res.json({ success: true, data: tags });
            } catch (error) {
                logger.error('获取标签列表失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 创建标签
        apiRouter.post('/tags', (req, res) => {
            try {
                const { name, color } = req.body;
                if (!name) {
                    return res.status(400).json({ success: false, error: '标签名称不能为空' });
                }

                const result = this.db.createTag(name, color);
                res.status(201).json({ success: true, tagId: result.lastInsertRowid });
            } catch (error) {
                logger.error('创建标签失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 为文章添加标签
        apiRouter.post('/items/:id/tags', (req, res) => {
            try {
                const { id } = req.params;
                const { tagId } = req.body;

                this.db.addTagToItem(parseInt(id, 10), parseInt(tagId, 10));
                res.json({ success: true, message: '标签已添加' });
            } catch (error) {
                logger.error('添加标签失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ==================== 知识图谱 ====================

        // 获取知识图谱数据
        apiRouter.get('/knowledge/graph', (req, res) => {
            try {
                const graph = this.db.getKnowledgeGraph();
                res.json({ success: true, data: graph });
            } catch (error) {
                logger.error('获取知识图谱失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取知识节点列表
        apiRouter.get('/knowledge/nodes', (req, res) => {
            try {
                const nodes = this.db.getAllKnowledgeNodes();
                res.json({ success: true, data: nodes });
            } catch (error) {
                logger.error('获取知识节点失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 创建知识节点
        apiRouter.post('/knowledge/nodes', (req, res) => {
            try {
                const { name, type, description } = req.body;
                if (!name) {
                    return res.status(400).json({ success: false, error: '节点名称不能为空' });
                }

                const result = this.db.createKnowledgeNode(name, type, description);
                res.status(201).json({ success: true, nodeId: result.lastInsertRowid });
            } catch (error) {
                logger.error('创建知识节点失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ==================== 系统操作 ====================

        // 刷新所有Feed
        apiRouter.post('/system/refresh-all', async (req, res) => {
            try {
                const results = await this.feedManager.updateAllFeeds();
                res.json({ success: true, data: results });
            } catch (error) {
                logger.error('刷新所有Feed失败:', error.message);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取系统信息
        apiRouter.get('/system/info', (req, res) => {
            res.json({
                success: true,
                data: {
                    name: config.appName,
                    version: config.appVersion,
                    description: config.appDescription
                }
            });
        });

        // 注册API路由
        this.app.use('/api', apiRouter);

        // 前端路由处理 - 返回index.html
        this.app.get('*', (req, res) => {
            res.sendFile(join(__dirname, '../public/index.html'));
        });

        // 错误处理
        this.app.use((err, req, res, next) => {
            logger.error('服务器错误:', err.message);
            res.status(500).json({ success: false, error: '服务器内部错误' });
        });
    }

    /**
     * 启动服务器
     */
    async start(port, host) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, host, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 停止服务器
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('服务器已停止');
                    resolve();
                });
            });
        }
    }
}