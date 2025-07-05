# 聊天记录查询与AI分析系统

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.7.0-orange.svg)](项目说明.md)

> 一个基于Node.js和Express的中文聊天记录查询与AI智能分析系统，提供便捷的聊天数据检索、可视化分析和AI驱动的深度洞察功能。

## ✨ 特性

🔍 **智能查询** - 多维度聊天记录搜索，支持时间、联系人、关键词等条件筛选

🤖 **AI分析** - 集成DeepSeek和Gemini模型，提供智能内容分析和洞察

📊 **数据可视化** - 丰富的图表展示和统计分析功能

⏰ **定时任务** - 支持定时自动分析，生成周期性报告

🎨 **现代界面** - 响应式设计，优雅的用户体验

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-username/chatlog-analysis-system.git
cd chatlog-analysis-system
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境
```bash
# 复制环境配置模板
cp 环境配置模板.txt .env
# 然后编辑 .env 文件，填入你的API Key
```

### 4. 启动服务
```bash
npm start
```

### 5. 访问系统
打开浏览器访问：http://localhost:3000

## 📖 详细文档

- 📋 **[启动说明](启动说明.md)** - 详细的安装配置和使用指南
- 📚 **[项目说明](项目说明.md)** - 完整的功能介绍和技术文档
- ⚙️ **[环境配置模板](环境配置模板.txt)** - 环境变量配置参考

## 🎯 主要功能

### 聊天记录查询
- 按时间范围、联系人、群聊筛选
- 关键词搜索和内容匹配
- 支持大数据量查询（无限制选项）

### AI智能分析
- **预设模板**：编程技术、科学学习、阅读讨论分析
- **自定义分析**：支持自定义提示词
- **批量分析**：一键分析多个群聊
- **多模型支持**：DeepSeek、Gemini模型任选

### 可视化报告
- 生成HTML分析报告
- 统计图表和趋势分析
- 关键词云和活跃度分析

## 🔧 系统要求

- **Node.js**: 18.0.0+
- **npm**: 8.0.0+
- **系统**: Windows / macOS / Linux
- **网络**: 需要访问AI服务API

## 🤖 支持的AI模型

### DeepSeek（推荐）
- `deepseek-chat` - 通用对话模型
- `deepseek-reasoner` - 推理增强模型

### Google Gemini
- `gemini-2.5-pro` - 最新Pro模型（推荐）
- `gemini-pro` - 标准Pro模型
- `gemini-pro-vision` - 多模态模型

## 🛠️ 开发

### 项目结构
```
chatlog-analysis-system/
├── public/              # 静态资源
├── views/               # 页面模板
├── routes/              # API路由
├── utils/               # 工具函数
├── config/              # 配置文件
├── 启动说明.md          # 使用指南
├── 项目说明.md          # 技术文档
├── 环境配置模板.txt      # 环境配置
├── package.json         # 项目依赖
└── app.js              # 应用入口
```

### 启动开发环境
```bash
npm run dev
```

## 📝 更新日志

### v2.7.0 (2025-01-21)
- 🎯 工具提示功能全新升级，配置的分析项默认隐藏
- ✨ 新增优雅的显示/隐藏动画效果
- 🎨 智能关闭机制和美观的工具提示设计
- 📱 响应式设计优化，适配不同屏幕尺寸

### v2.6.1 (2025-01-20)
- 🔄 Chatlog服务连接机制全面优化
- 🔧 新增智能重试机制和定期自动检测
- ⏰ 增加超时管理和页面可见性检测
- 🛡️ 详细错误诊断和优雅的视觉反馈

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 📞 支持

如果您在使用过程中遇到问题：

1. 查看 [启动说明](启动说明.md) 中的常见问题
2. 搜索已有的 [Issues](../../issues)
3. 提交新的 Issue 并提供详细信息

---

⭐ 如果这个项目对您有帮助，请给它一个 Star！