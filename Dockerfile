# 使用官方的 Node.js 18 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json（如果有）到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目的所有文件到工作目录
COPY . .

# 编译 TypeScript
RUN npm run build

# 定义环境变量，默认定时任务间隔为1小时（3600秒）
ENV CRON_SCHEDULE="0 * * * *"

# 安装cron服务
RUN apk add --no-cache bash curl tzdata && \
    cp /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    echo "Etc/UTC" > /etc/timezone && \
    apk del tzdata

# 创建crontab文件，并将环境变量中的定时任务写入文件
RUN echo "$CRON_SCHEDULE /usr/local/bin/node /usr/src/app/dist/index.js >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# 启动cron服务
CMD ["crond", "-f", "-l", "8"]
