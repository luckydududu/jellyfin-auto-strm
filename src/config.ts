import {existsSync, readFileSync, statSync} from 'fs';
import yaml from 'js-yaml';
import {Config, NamingRule, NfoProviderConfig, OutputConfig, RulesConfig, SourceConfig, TaskConfig} from "./types";
import logger from './logging'; // 导入 logger

export class ConfigManager {
  private config?: Config;
  private rulesConfig?: RulesConfig;

  static readonly CONFIG_ITEMS = {
    CONFIG_PATH: {
      env: "CONFIG_PATH",
      default: "/auto-strm/config/config.yaml",
    },
    RULES_PATH: {
      env: "RULES_PATH",
      default: "/auto-strm/config/rules.yaml",
    },
    BASE_OUTPUT_DIR: {
      env: "BASE_OUTPUT_DIR",
      default: "/auto-strm/strm/",
    },
  };

  constructor() {
    this.config = this.loadConfig();
    this.rulesConfig = this.loadRulesConfig();
  }

  private getEnv(key: keyof typeof ConfigManager.CONFIG_ITEMS): string {
    return (
      process.env[ConfigManager.CONFIG_ITEMS[key].env] ||
      ConfigManager.CONFIG_ITEMS[key].default
    );
  }

  private loadYaml(filePath: string): any {
    logger.info(`尝试加载 YAML 文件: ${filePath}`);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      logger.info(
        `文件存在。大小: ${stats.size} 字节，最后修改时间: ${stats.mtime}`
      );
      try {
        const content = readFileSync(filePath, "utf8");
        logger.debug(`文件内容: ${content}`); // 添加这行来输出文件内容
        const config = yaml.load(content);
        logger.info(`成功加载 YAML 文件: ${filePath}`);
        logger.debug(`解析后的配置: ${JSON.stringify(config, null, 2)}`); // 添加这行来输出解析后的配置
        return config;
      } catch (e: any) {
        logger.error(`加载 YAML 文件时出错: ${e.message}`);
        logger.error(`错误堆栈: ${e.stack}`);
      }
    } else {
      logger.warn(`YAML 文件未在 ${filePath} 找到，使用空的默认值。`);
      return {};
    }
  }

  public loadConfig(forceReload: boolean = false): Config {
    if (this.config === undefined || forceReload) {
      const configPath = this.getEnv("CONFIG_PATH");
      const yamlConfig = this.loadYaml(configPath);
      this.config = this.validateConfig(yamlConfig);
      logger.info(forceReload ? "配置已强制重新加载" : "配置已加载");
    } else {
      logger.debug("使用已缓存的配置");
    }
    return this.config;
  }

  public loadRulesConfig(forceReload: boolean = false): RulesConfig {
    if (this.rulesConfig === undefined || forceReload) {
      const configPath = this.getEnv("RULES_PATH");
      const yamlConfig = this.loadYaml(configPath);
      this.rulesConfig = this.validateRulesConfig(yamlConfig);
      logger.info(forceReload ? "配置已强制重新加载" : "配置已加载");
    } else {
      logger.debug("使用已缓存的配置");
    }
    return this.rulesConfig;
  }

  private validateRulesConfig(yamlConfig: RulesConfig): RulesConfig {
    for (const thisKey in yamlConfig.naming_rules) {
      const thisConfig = yamlConfig.naming_rules[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
      }
    }
    return yamlConfig;
  }

  private validateConfig(yamlConfig: Config): Config {
    logger.debug(`完整的配置对象: ${JSON.stringify(yamlConfig, null, 2)}`);

    if (typeof yamlConfig !== "object" || yamlConfig === null) {
      throw new Error("配置必须是一个对象");
    }

    for (const thisKey in yamlConfig.sources) {
      const thisConfig = yamlConfig.sources[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
      }
    }
    for (const thisKey in yamlConfig.tasks) {
      const thisConfig = yamlConfig.tasks[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
        thisConfig.language = thisConfig.language ?? yamlConfig.language ?? 'en';
      }
    }
    for (const thisKey in yamlConfig.nfo_providers) {
      const thisConfig = yamlConfig.nfo_providers[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
      }
    }
    for (const thisKey in yamlConfig.naming_rules) {
      const thisConfig = yamlConfig.naming_rules[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
      }
    }
    for (const thisKey in yamlConfig.outputs) {
      const thisConfig = yamlConfig.outputs[thisKey];
      if (thisConfig !== undefined) {
        thisConfig.name = thisKey;
      }
    }
    return yamlConfig;
  }

  public loadSourceConfig(sourceName: string): SourceConfig | undefined {
    const config = this.loadConfig();
    return config.sources[sourceName];
  }

  public loadOutputConfig(outputName: string): OutputConfig | undefined {
    const config = this.loadConfig();
    return config.outputs[outputName];
  }

  public loadNfoProviderConfig(
    nfoProviderName: string
  ): NfoProviderConfig | undefined {
    const config = this.loadConfig();
    return config.nfo_providers[nfoProviderName];
  }

  public loadTaskConfig(taskName: string): TaskConfig | undefined {
    const config = this.loadConfig();
    return config.tasks[taskName];
  }

  public loadAndMergeRules(): NamingRule[] {
    const config = this.loadConfig();
    const rulesConfig = this.loadRulesConfig();
    const allNamingRules = {
      ...rulesConfig.naming_rules,
      ...config.naming_rules,
    };
    return Object.values(allNamingRules);
  }

  public getBaseOutputDir(): string {
    return this.getEnv("BASE_OUTPUT_DIR");
  }

  public loadNamingRulesOfTask(taskName: string): NamingRule[] {
    const taskConfig = this.loadTaskConfig(taskName);
    if (!taskConfig) {
      logger.error(`未找到任务配置: ${taskName}`);
      return [];
    }

    const allRules = this.loadAndMergeRules();

    if (taskConfig.naming_rules && Array.isArray(taskConfig.naming_rules)) {
      logger.info(`使用任务 ${taskName} 的自定义命名规则: ${taskConfig.naming_rules.join('、')}`);
      return allRules.filter((rule) =>
        taskConfig.naming_rules.includes(rule.name)
      );
    }

    logger.info(`任务 ${taskName} 使用全局命名规则`);
    return allRules;
  }
}

export const configManager = new ConfigManager();
