import fs from 'fs';
import yaml from 'js-yaml';
import {createLogger, format, LoggerOptions, transports} from 'winston';
import 'winston-daily-rotate-file';

function getLoggerConfig(): any {
  const configPath = process.env.LOGGER_CONFIG || '/auto-strm/config/logger.yaml';
  try {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn(`日志配置文件未在 ${configPath} 找到，使用默认配置。`);
    return {};
  }
}

const config = getLoggerConfig();

// 设置日志格式
const logFormat = format.printf(({level, message, timestamp}) => {
    return `${timestamp} [${level}]: ${message}`;
});

// 初始化日志记录器配置
const loggerOptions: LoggerOptions = {
    level: config.level || 'info',
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.splat(),
        logFormat
    ),
    transports: config.transports.map((transportConfig: any) => {
        if (transportConfig.type === 'Console') {
            return new transports.Console({
                format: format.combine(
                    format.colorize(), // 彩色输出
                    logFormat
                ),
            });
        }

        if (transportConfig.type === 'DailyRotateFile') {
            return new transports.DailyRotateFile({
                filename: transportConfig.filename,
                dirname: config.logDir || 'logs',
                datePattern: transportConfig.datePattern || 'YYYY-MM-DD',
                maxFiles: transportConfig.maxFiles || '14d',
                zippedArchive: transportConfig.zippedArchive || true,
            });
        }

        if (transportConfig.type === 'File') {
            return new transports.File({
                filename: transportConfig.filename,
                level: transportConfig.level || 'info',
            });
        }

        // 如果需要支持更多传输器类型，可以在这里添加更多的 if 条件
        throw new Error(`Unsupported transport type: ${transportConfig.type}`);
    })
};

// 创建并导出 logger 实例
const logger = createLogger(loggerOptions);

export default logger;
