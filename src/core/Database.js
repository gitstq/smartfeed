/**
 * 数据库管理模块 - 使用 SQLite
 */

import DatabaseBetter from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';

export class Database {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        // 确保数据目录存在
        const dir = dirname(this.dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // 连接数据库
        this.db = new DatabaseBetter(this.dbPath);

        // 创建表结构
        this.createTables();

        logger.info('数据库连接成功:', this.dbPath);
    }

    /**
     * 创建数据库表
     */
    createTables() {
        // Feed源表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT,
                description TEXT,
                link TEXT,
                language TEXT,
                lastBuildDate TEXT,
                lastFetchedAt DATETIME,
                fetchStatus TEXT DEFAULT 'pending',
                errorCount INTEGER DEFAULT 0,
                category TEXT DEFAULT 'default',
                isActive INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 文章条目表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feedId INTEGER NOT NULL,
                guid TEXT UNIQUE NOT NULL,
                title TEXT,
                link TEXT,
                description TEXT,
                content TEXT,
                author TEXT,
                pubDate DATETIME,
                categories TEXT,
                isRead INTEGER DEFAULT 0,
                isStarred INTEGER DEFAULT 0,
                isHidden INTEGER DEFAULT 0,
                aiSummary TEXT,
                sentimentScore REAL,
                keywords TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (feedId) REFERENCES feeds(id) ON DELETE CASCADE
            )
        `);

        // 标签表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                color TEXT DEFAULT '#3498db',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 文章标签关联表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS item_tags (
                itemId INTEGER NOT NULL,
                tagId INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (itemId, tagId),
                FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
            )
        `);

        // 知识图谱节点表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                type TEXT DEFAULT 'topic',
                description TEXT,
                relatedItemCount INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 知识图谱关系表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sourceId INTEGER NOT NULL,
                targetId INTEGER NOT NULL,
                relationType TEXT DEFAULT 'related',
                strength REAL DEFAULT 1.0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sourceId) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (targetId) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
                UNIQUE(sourceId, targetId, relationType)
            )
        `);

        // 文章与知识节点关联表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS item_knowledge (
                itemId INTEGER NOT NULL,
                nodeId INTEGER NOT NULL,
                relevanceScore REAL DEFAULT 1.0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (itemId, nodeId),
                FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY (nodeId) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
            )
        `);

        // 创建索引
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_feedId ON items(feedId)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_pubDate ON items(pubDate)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_isRead ON items(isRead)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_isStarred ON items(isStarred)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_createdAt ON items(createdAt)`);

        logger.info('数据库表结构创建完成');
    }

    /**
     * 执行查询（返回多条记录）
     */
    query(sql, params = []) {
        return this.db.prepare(sql).all(...params);
    }

    /**
     * 执行查询（返回单条记录）
     */
    queryOne(sql, params = []) {
        return this.db.prepare(sql).get(...params);
    }

    /**
     * 执行SQL语句
     */
    run(sql, params = []) {
        return this.db.prepare(sql).run(...params);
    }

    /**
     * 执行事务
     */
    transaction(fn) {
        return this.db.transaction(fn)();
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            logger.info('数据库连接已关闭');
        }
    }

    // ==================== Feed 操作 ====================

    /**
     * 添加Feed
     */
    addFeed(feed) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO feeds (url, title, description, link, category)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(feed.url, feed.title || null, feed.description || null, feed.link || null, feed.category || 'default');
    }

    /**
     * 获取所有Feed
     */
    getAllFeeds() {
        return this.db.prepare('SELECT * FROM feeds ORDER BY createdAt DESC').all();
    }

    /**
     * 获取活跃的Feed
     */
    getActiveFeeds() {
        return this.db.prepare('SELECT * FROM feeds WHERE isActive = 1').all();
    }

    /**
     * 更新Feed信息
     */
    updateFeed(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        return this.db.prepare(`UPDATE feeds SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    }

    /**
     * 删除Feed
     */
    deleteFeed(id) {
        return this.db.prepare('DELETE FROM feeds WHERE id = ?').run(id);
    }

    // ==================== Item 操作 ====================

    /**
     * 添加文章条目
     */
    addItem(item) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO items 
            (feedId, guid, title, link, description, content, author, pubDate, categories)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            item.feedId,
            item.guid,
            item.title || null,
            item.link || null,
            item.description || null,
            item.content || null,
            item.author || null,
            item.pubDate || null,
            item.categories ? JSON.stringify(item.categories) : null
        );
    }

    /**
     * 获取文章列表
     */
    getItems(options = {}) {
        const { feedId, isRead, isStarred, limit = 50, offset = 0, search } = options;
        let sql = `
            SELECT i.*, f.title as feedTitle, f.url as feedUrl
            FROM items i
            JOIN feeds f ON i.feedId = f.id
            WHERE i.isHidden = 0
        `;
        const params = [];

        if (feedId) {
            sql += ' AND i.feedId = ?';
            params.push(feedId);
        }
        if (isRead !== undefined) {
            sql += ' AND i.isRead = ?';
            params.push(isRead ? 1 : 0);
        }
        if (isStarred !== undefined) {
            sql += ' AND i.isStarred = ?';
            params.push(isStarred ? 1 : 0);
        }
        if (search) {
            sql += ' AND (i.title LIKE ? OR i.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY i.pubDate DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return this.db.prepare(sql).all(...params);
    }

    /**
     * 获取文章详情
     */
    getItemById(id) {
        return this.db.prepare(`
            SELECT i.*, f.title as feedTitle, f.url as feedUrl
            FROM items i
            JOIN feeds f ON i.feedId = f.id
            WHERE i.id = ?
        `).get(id);
    }

    /**
     * 更新文章
     */
    updateItem(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        return this.db.prepare(`UPDATE items SET ${fields} WHERE id = ?`).run(...values);
    }

    /**
     * 标记文章为已读
     */
    markItemAsRead(id) {
        return this.db.prepare('UPDATE items SET isRead = 1 WHERE id = ?').run(id);
    }

    /**
     * 切换文章收藏状态
     */
    toggleItemStar(id) {
        return this.db.prepare('UPDATE items SET isStarred = NOT isStarred WHERE id = ?').run(id);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const feedCount = this.db.prepare('SELECT COUNT(*) as count FROM feeds').get();
        const itemCount = this.db.prepare('SELECT COUNT(*) as count FROM items').get();
        const unreadCount = this.db.prepare('SELECT COUNT(*) as count FROM items WHERE isRead = 0').get();
        const starredCount = this.db.prepare('SELECT COUNT(*) as count FROM items WHERE isStarred = 1').get();
        const todayCount = this.db.prepare(`
            SELECT COUNT(*) as count FROM items 
            WHERE date(createdAt) = date('now')
        `).get();

        return {
            feedCount: feedCount.count,
            itemCount: itemCount.count,
            unreadCount: unreadCount.count,
            starredCount: starredCount.count,
            todayCount: todayCount.count
        };
    }

    // ==================== 标签操作 ====================

    /**
     * 创建标签
     */
    createTag(name, color = '#3498db') {
        return this.db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)').run(name, color);
    }

    /**
     * 获取所有标签
     */
    getAllTags() {
        return this.db.prepare('SELECT * FROM tags ORDER BY name').all();
    }

    /**
     * 为文章添加标签
     */
    addTagToItem(itemId, tagId) {
        return this.db.prepare('INSERT OR IGNORE INTO item_tags (itemId, tagId) VALUES (?, ?)').run(itemId, tagId);
    }

    /**
     * 获取文章的标签
     */
    getItemTags(itemId) {
        return this.db.prepare(`
            SELECT t.* FROM tags t
            JOIN item_tags it ON t.id = it.tagId
            WHERE it.itemId = ?
        `).all(itemId);
    }

    // ==================== 知识图谱操作 ====================

    /**
     * 创建知识节点
     */
    createKnowledgeNode(name, type = 'topic', description = null) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO knowledge_nodes (name, type, description)
            VALUES (?, ?, ?)
        `);
        return stmt.run(name, type, description);
    }

    /**
     * 获取所有知识节点
     */
    getAllKnowledgeNodes() {
        return this.db.prepare('SELECT * FROM knowledge_nodes ORDER BY relatedItemCount DESC').all();
    }

    /**
     * 创建知识关系
     */
    createKnowledgeEdge(sourceId, targetId, relationType = 'related', strength = 1.0) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO knowledge_edges (sourceId, targetId, relationType, strength)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(sourceId, targetId, relationType, strength);
    }

    /**
     * 获取知识图谱数据
     */
    getKnowledgeGraph() {
        const nodes = this.db.prepare('SELECT * FROM knowledge_nodes').all();
        const edges = this.db.prepare('SELECT * FROM knowledge_edges').all();
        return { nodes, edges };
    }

    /**
     * 关联文章与知识节点
     */
    linkItemToKnowledge(itemId, nodeId, relevanceScore = 1.0) {
        return this.db.prepare(`
            INSERT OR REPLACE INTO item_knowledge (itemId, nodeId, relevanceScore)
            VALUES (?, ?, ?)
        `).run(itemId, nodeId, relevanceScore);
    }
}