import winston, { createLogger, format } from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../../config';
import path from "path";
const { combine, timestamp, errors, colorize, printf, json } = format;
const devFormat = combine(colorize({ all: true }), timestamp(), errors({ stack: true }), printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack ?? message}${metaStr}`;
}));
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.metadata(), json());
const transports = [
    new winston.transports.Console({
        format: config.app.isProd ? prodFormat : devFormat
    })
];
if (config.app.isProd) {
    transports.push(new DailyRotateFile({
        filename: path.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '30d',
        maxSize: '20m',
        zippedArchive: true,
        format: prodFormat
    }), new DailyRotateFile({
        filename: path.join('logs', 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '50m',
        zippedArchive: true,
        format: prodFormat
    }));
}
export const logger = createLogger({
    level: config.app.isProd ? 'info' : 'debug',
    transports,
    exceptionHandlers: [
        new winston.transports.Console({ format: prodFormat })
    ],
    rejectionHandlers: [
        new winston.transports.Console({
            format: prodFormat,
        }),
    ],
    exitOnError: false,
});
//# sourceMappingURL=logger.js.map