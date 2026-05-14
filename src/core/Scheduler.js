/**
 * 调度器 - 定时更新Feed
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';

export class Scheduler {
    constructor(feedManager, cronExpression) {
        this.feedManager = feedManager;
        this.cronExpression = cronExpression;
        this.task = null;
    }

    /**
     * 启动调度器
     */
    start() {
        if (this.task) {
            logger.warn('调度器已在运行');
            return;
        }

        // 验证cron表达式
        if (!cron.validate(this.cronExpression)) {
            logger.error('无效的cron表达式:', this.cronExpression);
            return;
        }

        // 创建定时任务
        this.task = cron.schedule(this.cronExpression, async () => {
            logger.info('⏰ 执行定时Feed更新...');
            try {
                const results = await this.feedManager.updateAllFeeds();
                const successCount = results.filter(r => r.success).length;
                const failCount = results.length - successCount;
                logger.info(`✅ 定时更新完成: ${successCount} 成功, ${failCount} 失败`);
            } catch (error) {
                logger.error('❌ 定时更新失败:', error.message);
            }
        });

        logger.info(`✅ 调度器已启动，执行计划: ${this.cronExpression}`);

        // 立即执行一次
        this.runImmediately();
    }

    /**
     * 停止调度器
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            logger.info('调度器已停止');
        }
    }

    /**
     * 立即执行一次更新
     */
    async runImmediately() {
        logger.info('🚀 立即执行Feed更新...');
        try {
            const results = await this.feedManager.updateAllFeeds();
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            const totalAdded = results.reduce((sum, r) => sum + (r.addedCount || 0), 0);
            logger.info(`✅ 立即更新完成: ${successCount} 成功, ${failCount} 失败, 新增 ${totalAdded} 篇文章`);
            return results;
        } catch (error) {
            logger.error('❌ 立即更新失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取调度器状态
     */
    getStatus() {
        return {
            running: !!this.task,
            cronExpression: this.cronExpression,
            nextRun: this.task ? this.task.nextDate() : null
        };
    }
}