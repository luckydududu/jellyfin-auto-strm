import { ConfigManager } from "../src/config";
import { createSourceProvider, getAllFiles } from "../src/source_provider";
import { Config, SourceConfig } from "../src/types";
import fs from "fs";
import path from "path";

// 模拟 fs 和 path 模块
jest.mock("fs");
jest.mock("path");

describe("配置加载和源文件获取测试", () => {
  let configManager: ConfigManager;
  let mockConfig: Config;

  beforeEach(() => {
    // 重置所有的模拟
    jest.resetAllMocks();

    // 创建一个模拟的配置对象
    mockConfig = {
      language: "zh-CN",
      sources: {
        testSource: {
          type: "webdav",
          name: "Test WebDAV",
          server_address: "http://test-webdav.com",
          path: "/test/path",
          visit_url_prefix: "http://test-webdav.com/visit",
          username: "testuser",
          password: "testpass",
        },
      },
      nfo_providers: {},
      naming_rules: {},
      tasks: {},
      outputs: {},
    };

    // 模拟 fs.readFileSync 返回 JSON 字符串
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

    // 模拟 path.join 返回一个假路径
    (path.join as jest.Mock).mockReturnValue("/fake/path/config.json");

    // 创建 ConfigManager 实例
    configManager = new ConfigManager();
  });

  test("配置加载测试", () => {
    const loadedConfig = configManager.loadConfig();
    expect(loadedConfig).toEqual(mockConfig);
    expect(fs.readFileSync).toHaveBeenCalledWith(
      "/fake/path/config.json",
      "utf8"
    );
  });

  test("源配置加载测试", () => {
    const sourceConfig = configManager.loadSourceConfig("testSource");
    expect(sourceConfig).toEqual(mockConfig.sources.testSource);
  });

  test("获取所有文件测试", async () => {
    // 模拟 WebDAVSourceProvider 的 getFiles 方法
    const mockGetFiles = jest.fn().mockResolvedValue({
      files: [
        {
          filename: "file1.mp4",
          visitUrl: "http://test-webdav.com/visit/file1.mp4",
        },
        {
          filename: "file2.mp4",
          visitUrl: "http://test-webdav.com/visit/file2.mp4",
        },
      ],
      hasMore: false,
      total: 2,
    });

    jest.mock("../source", () => ({
      ...jest.requireActual("../source"),
      createSourceProvider: jest.fn().mockReturnValue({
        supportsPagination: () => false,
        getFiles: mockGetFiles,
      }),
    }));

    const allFiles = await getAllFiles([mockConfig.sources.testSource]);

    expect(allFiles).toHaveLength(2);
    expect(allFiles[0].filename).toBe("file1.mp4");
    expect(allFiles[1].filename).toBe("file2.mp4");
  });
});
