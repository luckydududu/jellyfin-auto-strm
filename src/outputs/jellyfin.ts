import {MediaType, OutputConfig} from "../types";
import path from "path";
import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from "fs";
import logger from "../logging";
import {OutputProvider, RecordInfo} from "../output_provider";

export class JellyfinOutputProvider implements OutputProvider {
    private outputDir: string;
    private serverUrl?: string;
    private libraryName?: string;

    constructor(config: OutputConfig) {
        this.outputDir = config.output_dir;
        this.libraryName = config.library_name;
    }

    private getFileDir(basePath: string, title: string, year: string): string {
        const fileDir = path.join(basePath, year ? `${title} (${year})` : title);
        mkdirSync(fileDir, { recursive: true });
        return fileDir;
    }

    outputStrmFile(basePath: string, title: string, year: string, fileName: string, remoteFullUrl: string) {
        const fileDir = this.getFileDir(basePath, title, year);
        const strmFilePath = path.join(fileDir, `${fileName}.strm`);

        if (existsSync(strmFilePath)) {
            const existingContent = readFileSync(strmFilePath, 'utf-8').trim();
            if (existingContent === remoteFullUrl) {
                logger.debug(`STRM 文件 '${strmFilePath}' 已存在且内容匹配。跳过写入。`);
                return;
            }
        }

        writeFileSync(strmFilePath, remoteFullUrl, 'utf-8');
        logger.info(`创建或更新了 STRM 文件: ${strmFilePath}`);
    }

    outputNfoFile(basePath: string, title: string, year: string, mediaType: MediaType, language: string, infoMap: any) {
        const fileDir = this.getFileDir(basePath, title, year);
        const nfoFilePath = path.join(fileDir, `${this.getNfoFileName(mediaType)}`);

        const fields: Record<MediaType, string[]> = {
            movie: ["title", "originaltitle", "year", "releasedate", "rating", "plot", "tmdbid", "mpaa", "poster"],
            tvshow: ["title", "originaltitle", "year", "rating", "plot", "id", "mpaa", "poster"],
            episodedetails: ["title", "season", "episode", "aired", "plot", "id"],
            album: ["title", "artist", "year", "genre", "rating", "plot", "id", "poster"]
        };

        const nfoContent = [`<${mediaType}>`];
        fields[mediaType].forEach(field => {
            const value = infoMap[field] || '';
            nfoContent.push(`  <${field}>${value}</${field}>`);
        });
        nfoContent.push(`</${mediaType}>`);

        writeFileSync(nfoFilePath, nfoContent.join('\n'), 'utf-8');
        logger.info(`成功输出 NFO 文件: ${nfoFilePath}`);
    }

    nfoFileExists(basePath: string, title: string, year: string, mediaType: MediaType): boolean {
        const fileDir = this.getFileDir(basePath, title, year);
        const nfoFilePath = path.join(fileDir, this.getNfoFileName(mediaType));
        return existsSync(nfoFilePath);
    }

    outputRecordInfo(basePath: string, title: string, year: string, info: RecordInfo) {
        const recordFilePath = path.join(basePath, "record_info.txt");
        const nowTime = new Date().toISOString();

        const logEntry = `
----------------------------------------
执行时间: ${nowTime}
任务开始时间: ${info.startTime}

来源信息:
  源服务器名称: ${info.sourceConfig?.name}
  相对路径: ${info.sourceConfig?.path}
  内部完整路径: ${info.parsedResult.fromFileInfo.visitUrl}
  外部访问完整路径: ${info.parsedResult.fromFileInfo.visitUrl}

文件名匹配信息:
  标题: ${title}
  年份: ${year ?? "N/A"}
  匹配的命名规则名称: ${info.parsedResult.namingRule?.name ?? "N/A"}
  匹配的正则表达式: ${info.parsedResult.namingRule?.regex ?? "N/A"}
  字幕: ${info.parsedResult.subtitle ?? "N/A"}
  非英语标题: ${info.parsedResult.nonengtitle ?? "N/A"}

NFO 获取信息:
  NFO 提供者: ${info.nfoProvider.name}
  TMDb ID: ${info.nfoInfo?.tmdbid ?? "N/A"}
  TMDb 标题: ${info.nfoInfo?.title ?? "N/A"}
  TMDb 原始标题: ${info.nfoInfo?.originaltitle ?? "N/A"}
  TMDb 发布日期: ${info.nfoInfo?.releasedate ?? "N/A"}
  TMDb 评分: ${info.nfoInfo?.rating ?? "N/A"}

输出信息:
  输出类型: ${info.outputConfig.type}
  输出目录: ${info.outputConfig.output_dir}
  Jellyfin 库名称: ${info.outputConfig.library_name}
`;

        this.getFileDir(basePath, title, year); // 确保目录存在
        appendFileSync(recordFilePath, logEntry, 'utf-8');
        logger.info(`输出记录信息到 ${recordFilePath}`);
    }

    private getNfoFileName(mediaType: MediaType): string {
        switch (mediaType) {
            case 'movie':
                return 'movie.nfo';
            case 'tvshow':
                return 'tvshow.nfo';
            case 'episodedetails':
                return 'episode.nfo';
            case 'album':
                return 'album.nfo';
            default:
                throw new Error(`不支持的媒体类型: ${mediaType}`);
        }
    }
}