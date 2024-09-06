import {MediaType, NamingRule} from "./types";
import {basename} from 'path';
import {FileInfo} from './source_provider';
import logger from "./logging";

export interface TitleDiscernResult {
  title?: string;
  nonengtitle?: string;
  subtitle?: string;
  year?: string;
  mediaType: MediaType;
  fromFileInfo: FileInfo;
  namingRule: NamingRule | undefined;
  match?: boolean;
  order: number;
}

export function discernTitleWithRule(fileInfo: FileInfo, rule: NamingRule, mediaType: MediaType): TitleDiscernResult | undefined {
  const fileName = fileInfo.filename;
  const fileNameWithoutExt = basename(fileName, `.${fileName.split('.').pop()}`);
  const filetype = fileName.split('.').pop() || '';

  const result:TitleDiscernResult = {
    fromFileInfo: fileInfo,
    namingRule: rule,
    mediaType,
    order:0,
  };

  if (rule.supported_media_types.includes(mediaType)) {
    logger.debug(`discernTitleWithRule, fileName:${fileName}, fileNameWithoutExt:${fileNameWithoutExt}, filetype:${filetype}, rule.regex:${rule.regex}`);
    let match = undefined;
    try{
      const regex = new RegExp(rule.regex);
      match = fileNameWithoutExt.match(regex);
    }catch (e:any){
      logger.warn(`discernTitleWithRule, match, e:${e}`);
    }

    if (match !== undefined && match !== null) {
      const title = match.groups?.title ? match.groups.title.replace(/\./g, ' ') : undefined;
      const nonengtitle = match.groups?.nonengtitle ? match.groups.nonengtitle.replace(/\./g, ' ') : undefined;

      result.match = true;
      result.title = title;
      result.subtitle = match.groups?.subtitle || undefined;
      result.nonengtitle = nonengtitle;
      result.year = match.groups?.year || undefined;
    }else {
      result.match = false;
      logger.debug(`fileName not match: ${fileNameWithoutExt}`);
    }
  }else{
    logger.warn(`is not supported media types: ${mediaType}`);
  }
  // logger.debug(`解析结果: ${JSON.stringify(result)}`);
  return undefined;
}

export function discernTitle(fileInfo: FileInfo, namingRules: NamingRule[], mediaType: MediaType): TitleDiscernResult[] {
  const results: TitleDiscernResult[] = [];

  for (const rule of namingRules) {
    const result = discernTitleWithRule(fileInfo, rule, mediaType);
    if (result) {
      result.order = namingRules.indexOf(rule);
      results.push(result);
    }
  }
  
  // 如果没有匹配的规则，添加默认结果
  if (results.length === 0) {
    const fileNameWithoutExt = basename(fileInfo.filename, `.${fileInfo.filename.split('.').pop()}`);
    const filetype = fileInfo.filename.split('.').pop() || '';
    results.push({
      title: fileNameWithoutExt,
      nonengtitle: undefined,
      subtitle: undefined,
      year: undefined,
      namingRule: undefined,
      match: false,
      mediaType: mediaType,
      order: 0,
      fromFileInfo: fileInfo,
    });
  }
  
  // 排序逻辑
  results.sort((a, b) => {
    const aHasBoth = a.title && a.year;
    const bHasBoth = b.title && b.year;
    
    if (aHasBoth && bHasBoth) return a.order - b.order;
    if (aHasBoth) return -1;
    if (bHasBoth) return 1;
    
    if (a.title && !b.title) return -1;
    if (!a.title && b.title) return 1;
    
    return a.order - b.order;
  });

  return results;
}

