import {GetFilesResult, SourceProvider} from "source_provider";
import {SourceConfig} from "types";

export class LocalFolderSourceProvider implements SourceProvider {
  private config: SourceConfig;

  constructor(config: SourceConfig) {
    this.config = config;
  }

  supportsPagination(): boolean {
    return false;
  }

  async getFiles(page?: number): Promise<GetFilesResult> {
    return {
      files:[],
      hasMore: false,
      total:0,
    };
  }

  async getTotalFiles(): Promise<number> {
    return 0;
  }

  async getPageCount(): Promise<number> {
    return 1;
  }
}
