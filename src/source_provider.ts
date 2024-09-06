import logger from "./logging";
import {SourceConfig} from "./types";
import {WebDAVSourceProvider} from "./sources/webdav";
import {LocalFolderSourceProvider} from "./sources/local_folder";

export interface FileInfo {
  filename: string;
  filePath: string;
  visitUrl: string;
  source: SourceConfig;
}

export interface GetFilesResult {
  files: FileInfo[];
  hasMore: boolean;
  total?: number;
}

export interface SourceProvider {
  supportsPagination(): boolean;
  getFiles(page?: number): Promise<GetFilesResult>;
  getTotalFiles(): Promise<number>;
  getPageCount(): Promise<number>;
}


export function createSourceProvider(config: SourceConfig): SourceProvider {
  switch (config.type) {
    case "webdav":
      return new WebDAVSourceProvider(config);
    case "local_folder":
      return new LocalFolderSourceProvider(config);
    default:
      logger.error(`不支持的源提供者类型: ${config.type}`);
      throw new Error(`不支持的源提供者类型: ${config.type}`);
  }
}

export async function getAllFiles(
  configs: SourceConfig[]
): Promise<FileInfo[]> {
  let allFiles: FileInfo[] = [];

  for (const config of configs) {
    const provider = createSourceProvider(config);
    try {
      if (provider.supportsPagination()) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const result = await provider.getFiles(page);
          allFiles = allFiles.concat(result.files);
          hasMore = result.hasMore;
          page++;
        }
      } else {
        const result = await provider.getFiles();
        allFiles = allFiles.concat(result.files);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`从源 ${config.type} 获取文件时出错: ${error.message}`);
      } else {
        logger.error(`从源 ${config.type} 获取文件时发生未知错误`);
      }
    }
  }

  logger.info(`总共获取到 ${allFiles.length} 个文件`);
  return allFiles;
}
