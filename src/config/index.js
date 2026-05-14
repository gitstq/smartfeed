/**
 * SmartFeed 配置管理
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 加载环境变量
dotenvConfig({ path: resolve(__dirname, '../../.env') });

export const config = {
    // 服务器配置
    port: parseInt(process.env.PORT, 10) || 3456,
    host: process.env.HOST || '127.0.0.1',

    // 数据库配置
    dbPath: process.env.DB_PATH || './data/smartfeed.db',

    // 调度器配置
    updateCron: process.env.UPDATE_CRON || '*/30 * * * *',

    // AI配置
    enableAiSummary: process.env.ENABLE_AI_SUMMARY === 'true',
    aiApiKey: process.env.AI_API_KEY,
    aiApiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
    aiModel: process.env.AI_MODEL || 'gpt-3.5-turbo',

    // Feed配置
    maxItemsPerFeed: parseInt(process.env.MAX_ITEMS_PER_FEED, 10) || 100,
    fetchTimeout: parseInt(process.env.FETCH_TIMEOUT, 10) || 10000,
    userAgent: process.env.USER_AGENT || 'SmartFeed/1.0',

    // 应用信息
    appName: 'SmartFeed',
    appVersion: '1.0.0',
    appDescription: 'AI驱动的智能信息聚合与知识管理工具'
};
