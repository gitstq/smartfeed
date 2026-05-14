#!/usr/bin/env node

/**
 * SmartFeed - AI驱动的智能信息聚合与知识管理工具
 * 主入口文件
 */

import { SmartFeedServer } from './server.js';
import { FeedManager } from './core/FeedManager.js';
import { Database } from './core/Database.js';
import { Scheduler } from './core/Scheduler.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

async function main() {
    try {
        logger.info('🚀 SmartFeed 正在启动...');

        // 初始化数据库
        const db = new Database(config.dbPath);
        await db.init();
        logger.info('✅ 数据库初始化完成');

        // 初始化Feed管理器
        const feedManager = new FeedManager(db);
        logger.info('✅ Feed管理器初始化完成');

        // 初始化调度器
        const scheduler = new Scheduler(feedManager, config.updateCron);
        scheduler.start();
        logger.info('✅ 调度器已启动');

        // 启动Web服务器
        const server = new SmartFeedServer(feedManager, db);
        await server.start(config.port, config.host);
        logger.info(`✅ 服务器已启动: http://${config.host}:${config.port}`);

        // 优雅关闭
        process.on('SIGINT', async () => {
            logger.info('\n🛑 正在关闭 SmartFeed...');
            scheduler.stop();
            await server.stop();
            db.close();
            logger.info('👋 SmartFeed 已安全关闭');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('\n🛑 正在关闭 SmartFeed...');
            scheduler.stop();
            await server.stop();
            db.close();
            logger.info('👋 SmartFeed 已安全关闭');
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ 启动失败:', error.message);
        process.exit(1);
    }
}

main();
