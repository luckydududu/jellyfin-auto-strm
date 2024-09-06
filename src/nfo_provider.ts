import {TitleDiscernResult} from './title_discern';
import {NfoProviderConfig} from './types';
import {TmdbProvider} from "./nfo/tmdb";

export interface NfoInfo {
    title: string;
    originaltitle: string;
    year: string;
    releasedate: string;
    rating: string;
    plot: string;
    tmdbid: string;
    poster: string;
    mpaa: string;
    season?: string;
    episode?: string;
    aired?: string;
    artist?: string;
    genre?: string;
}

export interface  NfoProvider {

  fetchNfoInfo(parsedResult: TitleDiscernResult): Promise<NfoInfo | undefined>;

  getConfig(): NfoProviderConfig;

}

export function createProvider(config: NfoProviderConfig): NfoProvider {
  switch (config.type.toLowerCase()) {
    case 'tmdb':
      return new TmdbProvider(config);
      // 可以添加其他供应商的case
    default:
      throw new Error(`不支持的 NFO 提供者: ${config.type}`);
  }
}
