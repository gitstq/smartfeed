/**
 * 简单的日志工具
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    info: (...args) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO]`, ...args);
    },

    error: (...args) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [ERROR]`, ...args);
    },

    warn: (...args) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WARN]`, ...args);
    },

    debug: (...args) => {
        if (isDev) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [DEBUG]`, ...args);
        }
    }
};
