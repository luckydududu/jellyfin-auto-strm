import {MediaType, NfoProviderConfig, OutputConfig, SourceConfig} from './types';
import {NfoInfo} from './nfo_provider';
import {TitleDiscernResult} from './title_discern';
import {JellyfinOutputProvider} from "./outputs/jellyfin";

export interface OutputProvider {
  outputStrmFile(basePath: string, title: string, year: string, fileName: string, remoteFullUrl: string): void;
  outputNfoFile(basePath: string, title: string, year: string, mediaType: MediaType, language: string, infoMap: any): void;
  nfoFileExists(basePath: string, title: string, year: string, mediaType: MediaType): boolean;
  outputRecordInfo(basePath: string, title: string, year: string, info: RecordInfo): void;
}

export interface RecordInfo {
  parsedResult: TitleDiscernResult;
  nfoInfo: NfoInfo | undefined;
  sourceConfig: SourceConfig | undefined;
  startTime: string;
  nfoProvider: NfoProviderConfig;
  outputConfig: OutputConfig;
}

export function createOutputProvider(config: OutputConfig): OutputProvider {
  if (config.type !== 'jellyfin') {
    throw new Error(`不支持的输出提供者类型: ${config.type}`);
  }
  return new JellyfinOutputProvider(config);
}


