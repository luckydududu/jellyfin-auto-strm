export type MediaType = "movie" | "tvshow" | "album" | "episodedetails";

export interface SourceConfig {
  type: string;
  server_address?: string;
  path: string;
  visit_url_prefix?: string;
  username?: string;
  password?: string;
  name: string;
  usePagination?: boolean;
  pageSize?: number;
}

export interface NfoProviderConfig {
  name: string;
  type: string;
  api_key: string;
}

export interface NamingRule {
  name: string; // 新增的 name 属性
  regex: string;
  supported_media_types: MediaType[];
  example: string;
}

export interface TaskConfig {
  name: string;
  source: string;
  nfo_provider: string;
  media_type: MediaType;
  file_patterns: string[];
  naming_rules: string[];
  output: string;
  language: string; // 新增的可选 language 属性
}

export interface OutputConfig {
  type: string;
  name: string;
  library_name: string;
  output_dir: string;
}

export interface Config {
  language: string;
  sources: Record<string, SourceConfig>;
  nfo_providers: Record<string, NfoProviderConfig>;
  naming_rules: Record<string, NamingRule>;
  tasks: Record<string, TaskConfig>;
  outputs: Record<string, OutputConfig>;
}

export interface RulesConfig {
  naming_rules: Record<string, NamingRule>;
}



