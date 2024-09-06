import {GetFilesResult, SourceProvider} from "../source_provider";
import {createClient, FileStat, WebDAVClient} from "webdav";
import {SourceConfig} from "../types";
import logger from "../logging";
import {basename} from "path";

export class WebDAVSourceProvider implements SourceProvider {
  private client: WebDAVClient;
  private readonly config: SourceConfig;
  private cachedFiles: FileStat[] | null = null;

  constructor(config: SourceConfig) {
    this.client = createClient(config.server_address!, {
      username: config.username!,
      password: config.password!,
    });
    this.config = config;
  }

  supportsPagination(): boolean {
    return false;
  }

  async getFiles(page?: number): Promise<GetFilesResult> {
    try {
      if (!this.cachedFiles) {
        this.cachedFiles = await this.getDirectoryContentsRecursive(
          this.config.path
        );
      }

      if (!this.supportsPagination() || page === undefined) {
        logger.info(
          `从 WebDAV 服务器获取所有文件,共 ${this.cachedFiles.length} 个文件`
        );
        return {
          files: this.cachedFiles.map((file) => ({
            filePath: file.filename,
            filename: basename(file.filename),
            visitUrl: this.convertToVisitUrl(file.filename),
            source: this.config,
          })),
          hasMore: false,
          total: this.cachedFiles.length,
        };
      } else {
        const pageSize = this.config.pageSize || 1000;
        const startIndex = (page - 1) * pageSize;
        const pageFiles = this.cachedFiles.slice(
          startIndex,
          startIndex + pageSize
        );
        const hasMore = startIndex + pageSize < this.cachedFiles.length;

        logger.info(
          `从 WebDAV 服务器成功获取第 ${page} 页文件,共 ${pageFiles.length} 个文件`
        );
        return {
          files: pageFiles.map((file) => ({
            filePath: file.filename,
            filename: basename(file.filename),
            visitUrl: this.convertToVisitUrl(file.filename),
            source:this.config,
          })),
          hasMore,
          total: this.cachedFiles.length,
        };
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(
          `从源 ${this.config.type} 获取文件时出错: ${error.message}`
        );
      } else {
        logger.error(
          `从源 ${this.config.type} 获取文件时出错: ${String(error)}`
        );
      }
      // 添加默认返回值
      return { files: [], hasMore: false, total: 0 };
    }
  }

  async getTotalFiles(): Promise<number> {
    if (!this.cachedFiles) {
      this.cachedFiles = await this.getDirectoryContentsRecursive(
        this.config.path
      );
    }
    return this.cachedFiles.length;
  }

  async getPageCount(): Promise<number> {
    if (!this.supportsPagination()) {
      return 1;
    }
    const totalFiles = await this.getTotalFiles();
    const pageSize = this.config.pageSize || 1000;
    return Math.ceil(totalFiles / pageSize);
  }

  private async getDirectoryContentsRecursive(
    path: string
  ): Promise<FileStat[]> {
    logger.debug(`getDirectoryContentsRecursive, ${path}`);
    const response = await this.client.getDirectoryContents(path);
    const contents = Array.isArray(response) ? response : response.data;
    let files: FileStat[] = [];

    for (const item of contents) {
      logger.debug(`getDirectoryContentsRecursive, ${item.filename}`);
      if (item.type === "directory") {
        const subFiles = await this.getDirectoryContentsRecursive(
          item.filename
        );
        files = files.concat(subFiles);
      } else {
        files.push(item);
      }
    }

    return files;
  }

  private convertToVisitUrl(filename: string): string {
    const relativePath = filename.replace(this.config.path, "");
    return `${this.config.visit_url_prefix}${encodeURIComponent(relativePath)}`;
  }
}
