<div align="center">

# 🚀 SmartFeed

**AI驱动的智能信息聚合与知识管理工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://sqlite.org/)

[简体中文](#简体中文) | [繁體中文](#繁體中文) | [English](#english)

</div>

---

## 简体中文

### 🎉 项目介绍

**SmartFeed** 是一款专为信息时代设计的智能RSS聚合工具。在信息爆炸的今天，我们每天都要面对海量的新闻、博客和资讯，SmartFeed 帮助您：

- 📡 **聚合信息**：一站式订阅和管理所有RSS源
- 🧠 **智能整理**：自动分类、标签管理、全文搜索
- 🔒 **本地优先**：数据存储在本地，保护您的隐私
- ⚡ **高效阅读**：简洁的界面，专注阅读体验

**灵感来源**：受到传统RSS阅读器和现代AI信息处理工具的启发，SmartFeed 致力于在隐私保护和功能丰富之间找到完美平衡。

### ✨ 核心特性

| 特性 | 描述 |
|------|------|
| 📰 **RSS/Atom 支持** | 兼容主流RSS和Atom订阅格式 |
| 🔄 **自动更新** | 定时自动抓取最新文章，无需手动刷新 |
| ⭐ **收藏管理** | 收藏重要文章，随时回顾 |
| 🏷️ **标签系统** | 为文章添加标签，灵活分类 |
| 🔍 **全文搜索** | 快速搜索标题和内容 |
| 📊 **阅读统计** | 实时统计订阅源和文章数量 |
| 🌐 **Web界面** | 现代化的响应式Web界面 |
| 🗄️ **本地存储** | SQLite数据库，数据完全本地保存 |
| 🕸️ **知识图谱** | 构建个人知识网络（开发中） |
| 🤖 **AI摘要** | 智能文章摘要（可选配置） |

### 🚀 快速开始

#### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/gitstq/smartfeed.git
cd smartfeed

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，根据需要修改配置

# 启动应用
npm start
```

#### 访问应用

打开浏览器访问：`http://localhost:3456`

### 📖 详细使用指南

#### 添加订阅源

1. 点击左侧边栏的 **+** 按钮
2. 输入RSS订阅地址（如 `https://example.com/feed.xml`）
3. 选择分类（可选）
4. 点击"添加"

#### 管理文章

- **阅读文章**：点击文章卡片查看详情
- **标记已读**：点击文章卡片自动标记，或点击 ✓ 按钮
- **收藏文章**：点击 ☆ 按钮收藏重要文章
- **全部已读**：点击工具栏的"全部已读"按钮

#### 搜索功能

在顶部搜索框输入关键词，即可搜索文章标题和内容。

#### 标签管理

1. 点击左侧"标签"区域的 **+** 按钮创建标签
2. 为文章添加标签进行分类

### 💡 设计思路与迭代规划

#### 技术选型

- **后端**：Node.js + Express - 轻量高效
- **数据库**：SQLite - 零配置，本地优先
- **前端**：原生JavaScript + CSS - 简洁快速
- **RSS解析**：rss-parser - 稳定可靠
- **定时任务**：node-cron - 灵活调度

#### 迭代计划

- [x] v1.0.0 - 基础RSS订阅和阅读功能
- [ ] v1.1.0 - AI智能摘要和分类
- [ ] v1.2.0 - 知识图谱可视化
- [ ] v1.3.0 - 移动端适配优化
- [ ] v2.0.0 - 插件系统和主题支持

### 📦 打包与部署

#### 开发模式

```bash
npm run dev
```

#### 构建可执行文件

```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

#### Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3456
CMD ["npm", "start"]
```

### 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

---

## 繁體中文

### 🎉 專案介紹

**SmartFeed** 是一款專為資訊時代設計的智慧RSS聚合工具。在資訊爆炸的今天，我們每天都要面對海量的新聞、部落格和資訊，SmartFeed 幫助您：

- 📡 **聚合資訊**：一站式訂閱和管理所有RSS源
- 🧠 **智慧整理**：自動分類、標籤管理、全文搜尋
- 🔒 **本地優先**：資料儲存在本地，保護您的隱私
- ⚡ **高效閱讀**：簡潔的介面，專注閱讀體驗

### ✨ 核心特性

| 特性 | 描述 |
|------|------|
| 📰 **RSS/Atom 支援** | 相容主流RSS和Atom訂閱格式 |
| 🔄 **自動更新** | 定時自動抓取最新文章 |
| ⭐ **收藏管理** | 收藏重要文章，隨時回顧 |
| 🏷️ **標籤系統** | 為文章新增標籤，靈活分類 |
| 🔍 **全文搜尋** | 快速搜尋標題和內容 |
| 📊 **閱讀統計** | 即時統計訂閱源和文章數量 |
| 🌐 **Web介面** | 現代化的響應式Web介面 |
| 🗄️ **本地儲存** | SQLite資料庫，資料完全本地儲存 |

### 🚀 快速開始

```bash
git clone https://github.com/gitstq/smartfeed.git
cd smartfeed
npm install
cp .env.example .env
npm start
```

訪問：`http://localhost:3456`

---

## English

### 🎉 Introduction

**SmartFeed** is an AI-powered intelligent RSS aggregator and knowledge management tool designed for the information age. In today's world of information overload, SmartFeed helps you:

- 📡 **Aggregate Information**: Subscribe and manage all your RSS feeds in one place
- 🧠 **Smart Organization**: Automatic categorization, tag management, and full-text search
- 🔒 **Local-First**: Data stored locally to protect your privacy
- ⚡ **Efficient Reading**: Clean interface for focused reading experience

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📰 **RSS/Atom Support** | Compatible with mainstream RSS and Atom feed formats |
| 🔄 **Auto Update** | Scheduled automatic fetching of latest articles |
| ⭐ **Bookmark Management** | Save important articles for later review |
| 🏷️ **Tag System** | Add tags to articles for flexible categorization |
| 🔍 **Full-Text Search** | Quickly search titles and content |
| 📊 **Reading Statistics** | Real-time statistics of feeds and articles |
| 🌐 **Web Interface** | Modern responsive web interface |
| 🗄️ **Local Storage** | SQLite database, data stored entirely locally |

### 🚀 Quick Start

```bash
git clone https://github.com/gitstq/smartfeed.git
cd smartfeed
npm install
cp .env.example .env
npm start
```

Visit: `http://localhost:3456`

### 📄 License

This project is licensed under the [MIT](LICENSE) License.

---

<div align="center">

Made with ❤️ by gitstq

</div>
