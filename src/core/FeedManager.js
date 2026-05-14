/**
 * Feed管理器 - 处理RSS/Atom订阅源的获取和解析
 */

import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class FeedManager {
    constructor(db) {
        this.db = db;
        this.parser = new Parser({
            timeout: config.fetchTimeout,
            headers: {
                'User-Agent': config.userAgent
            }
        });
    }

    /**
     * 添加新的Feed源
     */
    async addFeed(url, category = 'default') {
        try {
            // 验证URL
            new URL(url);

            // 检查是否已存在
            const existing = this.db.queryOne('SELECT id FROM feeds WHERE url = ?', [url]);
            if (existing) {
                return { success: false, error: 'Feed已存在' };
            }

            // 获取Feed信息
            const feedInfo = await this.fetchFeedInfo(url);
            if (!feedInfo) {
                return { success: false, error: '无法解析Feed' };
            }

            // 保存到数据库
            const result = this.db.addFeed({
                url,
                title: feedInfo.title,
                description: feedInfo.description,
                link: feedInfo.link,
                category
            });

            // 立即获取一次文章
            await this.fetchFeedItems(url);

            return {
                success: true,
                feedId: result.lastInsertRowid,
                title: feedInfo.title
            };
        } catch (error) {
            logger.error('添加Feed失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取Feed基本信息
     */
    async fetchFeedInfo(url) {
        try {
            const feed = await this.parser.parseURL(url);
            return {
                title: feed.title,
                description: feed.description,
                link: feed.link,
                language: feed.language,
                lastBuildDate: feed.lastBuildDate
            };
        } catch (error) {
            logger.error('获取Feed信息失败:', url, error.message);
            return null;
        }
    }

    /**
     * 获取Feed的文章条目
     */
    async fetchFeedItems(url) {
        try {
            const feed = await this.parser.parseURL(url);
            const feedRecord = this.db.queryOne('SELECT id FROM feeds WHERE url = ?', [url]);

            if (!feedRecord) {
                logger.error('Feed不存在:', url);
                return { success: false, error: 'Feed不存在' };
            }

            const feedId = feedRecord.id;
            let addedCount = 0;

            // 使用事务批量插入
            this.db.transaction(() => {
                for (const item of feed.items) {
                    // 生成唯一标识
                    const guid = item.guid || item.id || item.link || `${item.title}-${item.isoDate}`;

                    const itemData = {
                        feedId,
                        guid,
                        title: this.cleanText(item.title),
                        link: item.link,
                        description: this.cleanText(item.contentSnippet || item.description),
                        content: item['content:encoded'] || item.content || item.description,
                        author: item.creator || item.author,
                        pubDate: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
                        categories: item.categories || []
                    };

                    const result = this.db.addItem(itemData);
                    if (result.changes > 0) {
                        addedCount++;
                    }
                }
            })();

            // 更新Feed的最后获取时间
            this.db.updateFeed(feedId, {
                lastFetchedAt: new Date().toISOString(),
                fetchStatus: 'success',
                errorCount: 0
            });

            logger.info(`Feed [${feed.title}] 获取完成，新增 ${addedCount} 篇文章`);

            // 清理旧文章
            this.cleanupOldItems(feedId);

            return { success: true, addedCount };
        } catch (error) {
            logger.error('获取Feed文章失败:', url, error.message);

            // 更新错误计数
            const feedRecord = this.db.queryOne('SELECT id, errorCount FROM feeds WHERE url = ?', [url]);
            if (feedRecord) {
                this.db.updateFeed(feedRecord.id, {
                    fetchStatus: 'error',
                    errorCount: feedRecord.errorCount + 1
                });
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * 更新所有活跃的Feed
     */
    async updateAllFeeds() {
        const feeds = this.db.getActiveFeeds();
        logger.info(`开始更新 ${feeds.length} 个Feed...`);

        const results = [];
        for (const feed of feeds) {
            const result = await this.fetchFeedItems(feed.url);
            results.push({
                feedId: feed.id,
                title: feed.title,
                ...result
            });

            // 添加延迟，避免请求过快
            await this.delay(1000);
        }

        return results;
    }

    /**
     * 清理旧文章
     */
    cleanupOldItems(feedId) {
        const maxItems = config.maxItemsPerFeed;
        const items = this.db.query(
            'SELECT id FROM items WHERE feedId = ? ORDER BY pubDate DESC LIMIT -1 OFFSET ?',
            [feedId, maxItems]
        );

        if (items.length > 0) {
            const ids = items.map(i => i.id).join(',');
            this.db.run(`DELETE FROM items WHERE id IN (${ids})`);
            logger.info(`清理了 ${items.length} 篇旧文章`);
        }
    }

    /**
     * 获取文章内容（用于全文抓取）
     */
    async fetchArticleContent(url) {
        try {
            const response = await axios.get(url, {
                timeout: config.fetchTimeout,
                headers: {
                    'User-Agent': config.userAgent
                }
            });

            const $ = cheerio.load(response.data);

            // 移除不需要的元素
            $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

            // 尝试提取文章内容
            const articleSelectors = [
                'article',
                '[role="main"]',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.content',
                'main',
                '#content'
            ];

            let content = '';
            for (const selector of articleSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    content = element.text().trim();
                    break;
                }
            }

            // 如果没有找到，使用body
            if (!content) {
                content = $('body').text().trim();
            }

            // 清理文本
            content = content
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, '\n')
                .substring(0, 10000); // 限制长度

            return content;
        } catch (error) {
            logger.error('获取文章内容失败:', url, error.message);
            return null;
        }
    }

    /**
     * 删除Feed
     */
    deleteFeed(feedId) {
        try {
            this.db.deleteFeed(feedId);
            return { success: true };
        } catch (error) {
            logger.error('删除Feed失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取Feed统计
     */
    getFeedStats(feedId) {
        return this.db.queryOne(`
            SELECT 
                f.*,
                COUNT(i.id) as itemCount,
                SUM(CASE WHEN i.isRead = 0 THEN 1 ELSE 0 END) as unreadCount
            FROM feeds f
            LEFT JOIN items i ON f.id = i.feedId
            WHERE f.id = ?
            GROUP BY f.id
        `, [feedId]);
    }

    /**
     * 工具函数：清理文本
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/<[^>]*>/g, '') // 移除HTML标签
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    /**
     * 工具函数：延迟
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}