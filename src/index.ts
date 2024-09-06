import {configManager} from './config';
import {Config} from './types'; // 添加这行
import logger from './logging'; // 添加这行
import {processTask} from './task_processor'; // 添加这行
import fs from 'fs';

export function main() {
  const startTime = new Date().toISOString();
  logger.info(`开始处理，时间: ${startTime}`);

  const config: Config = configManager.loadConfig();
  const baseOutputDir = configManager.getBaseOutputDir();

  // 检查基础输出目录是否存在
  if (!fs.existsSync(baseOutputDir)) {
    logger.error(`基础输出目录不存在: ${baseOutputDir}`);
    return; // 直接退出函数
  }

  for (const taskKey in config.tasks) {
    const taskConfig = config.tasks[taskKey];
    processTask(taskConfig, baseOutputDir, startTime);
  }

  const endTime = new Date().toISOString();
  const duration = new Date().getTime() - new Date(startTime).getTime();
  logger.info(`处理成功完成。`);
  logger.info(
    `开始时间: ${startTime}, 结束时间: ${endTime}, 持续时间: ${duration}ms`
  );
}

main();
