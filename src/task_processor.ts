import {configManager} from './config';
import {FileInfo} from './source_provider';
import {createProvider, NfoInfo, NfoProvider} from './nfo_provider';
import {createOutputProvider, OutputProvider, RecordInfo,} from "./output_provider";
import logger from "./logging";
import {createSourceProvider, SourceProvider} from './source_provider';

import path from 'path';
import {discernTitle, TitleDiscernResult} from "./title_discern";
import {MediaType, TaskConfig} from './types';

interface ProcessResult {
  success: boolean;
  nfoExists: boolean;
  nfoInfo: NfoInfo | undefined;
}

async function processFile(
  fileInfo: FileInfo,
  baseOutputDir: string,
  startTime: string,
  taskConfig: TaskConfig
): Promise<boolean> {
  logger.info(`处理文件: ${fileInfo.filename}`);

  const namingRules = configManager.loadNamingRulesOfTask(taskConfig.name);

  const mediaType = taskConfig.media_type;
  const results = discernTitle(fileInfo, namingRules, mediaType);
  const matchedResults = results.filter(r => r.match);

  if (matchedResults.length === 0) {
    logger.debug(`未找到正确的匹配规则，文件名: ${fileInfo.filename}`);
    return false;
  }

  const outputConfig = configManager.loadOutputConfig(taskConfig.output);
  const nfoProviderConfig = configManager.loadNfoProviderConfig(taskConfig.nfo_provider);

  if (!outputConfig || !nfoProviderConfig) {
    logger.error(`无法加载输出配置或NFO提供者配置`);
    return false;
  }

  const outputDir = path.join(baseOutputDir, outputConfig.output_dir);
  const outputProvider = createOutputProvider(outputConfig);
  const nfoProvider = createProvider(nfoProviderConfig);

  for (const result of matchedResults) {
    const processResult = await processFileWithNfo(
      result,
      outputDir,
      outputProvider,
      nfoProvider,
      mediaType,
      taskConfig.language
    );

    if (processResult.success) {
      const recordInfo: RecordInfo = {
        parsedResult: result,
        nfoInfo: processResult.nfoInfo,
        sourceConfig: configManager.loadSourceConfig(taskConfig.source),
        startTime,
        nfoProvider: nfoProviderConfig,
        outputConfig: outputConfig,
      };

      outputProvider.outputRecordInfo(
        outputDir,
        result.title ?? "",
        result.year ?? "",
        recordInfo
      );

      return true;
    }
  }

  logger.warn(`跳过处理，文件未匹配任何命名规则: ${fileInfo.filename}`);
  return false;
}

async function processFileWithNfo(
    parsedResult: TitleDiscernResult,
    outputDir: string,
    outputProvider: OutputProvider,
    nfoProvider: NfoProvider,
    mediaType: MediaType,
    language: string
): Promise<ProcessResult> {
    logger.info(`处理文件。标题: ${parsedResult.title}, 年份: ${parsedResult.year || '未知'}`);

    const result: ProcessResult = {
        success: false,
        nfoExists: false,
        nfoInfo: undefined
    };

    if (!parsedResult.title) {
        logger.error(`无法处理文件：标题不存在`);
        return result;
    }

    let year = parsedResult.year || '';
    let nfoInfo = undefined;

    if (!year) {
        nfoInfo = await nfoProvider.fetchNfoInfo(parsedResult);
        if (nfoInfo && nfoInfo.year) {
            year = nfoInfo.year;
        }
    }

    if (outputProvider.nfoFileExists(outputDir, parsedResult.title, year, mediaType)) {
        logger.info(`NFO 文件已存在且完整: ${outputDir}`);
        result.nfoExists = true;
    } else {
        if (!nfoInfo) {
            nfoInfo = await nfoProvider.fetchNfoInfo(parsedResult);
        }
        if (!nfoInfo) {
            logger.error(`无法获取媒体信息，标题: ${parsedResult.title}`);
            return result;
        }
        outputProvider.outputNfoFile(outputDir, parsedResult.title, year, mediaType, language, nfoInfo);
    }

    outputProvider.outputStrmFile(outputDir, parsedResult.title, year, parsedResult.fromFileInfo.filename, parsedResult.fromFileInfo.visitUrl);

    result.success = true;
    result.nfoInfo = nfoInfo;
    logger.info(`成功处理文件: ${parsedResult.fromFileInfo.filename}`);
    return result;
}

export async function processTask(taskConfig: TaskConfig, baseOutputDir: string, startTime: string): Promise<void> {
    logger.info(`处理任务: ${taskConfig.name}`);
    
    const sourceConfig = configManager.loadSourceConfig(taskConfig.source);
    if (!sourceConfig) {
        logger.error(`任务 '${taskConfig.name}' 的源 '${taskConfig.source}' 配置未找到`);
        return;
    }

    let sourceProvider: SourceProvider;
    try {
        sourceProvider = createSourceProvider(sourceConfig);
    } catch (error) {
        logger.error(`创建源提供者失败: ${error}`);
        return;
    }

    try {
        const filesResult = await sourceProvider.getFiles();
        logger.info(`filter file, task:${taskConfig.name}, file_patterns: ${taskConfig.file_patterns}`)
        for (const file of filesResult.files) {
            if (isFileMatchPattern(file.filename, taskConfig.file_patterns)) {
                await processFile(
                    file,
                    baseOutputDir,
                    startTime,
                    taskConfig
                );
            }
        }
    } catch (err) {
        logger.error(`处理源 '${sourceConfig.name}' 失败: ${err}`);
    }
}

function isFileMatchPattern(filename: string, patterns: string[]): boolean {
    return patterns.some(pattern => new RegExp(pattern).test(filename));
}


