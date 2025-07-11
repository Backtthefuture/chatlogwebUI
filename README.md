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

# 🚀 快速开始指南

## 一键启动

### macOS / Linux 用户
```bash
./start.sh
```

### Windows 用户
双击运行 `start.bat` 文件

## 手动启动

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动服务**
   ```bash
   npm start
   ```

3. **访问网站**
   
   浏览器打开：http://localhost:3000

## 前置条件

⚠️ **重要：在使用本网站前，请确保已完成以下步骤**

### 1. 安装 Chatlog
从 [Chatlog 官方仓库](https://github.com/sjzar/chatlog) 下载并安装

### 2. 解密聊天数据
```bash
# 获取微信密钥
chatlog key

# 解密聊天数据
chatlog decrypt
```

### 3. 启动 Chatlog HTTP 服务
```bash
chatlog server
```
该命令会在端口 5030 启动 HTTP 服务

### 4. 启动本网站
执行上方的启动命令

## 使用步骤

1. **打开网站**：访问 http://localhost:3000
2. **检查连接**：右上角显示"已连接 Chatlog 服务"
3. **加载数据**：点击"加载联系人"或"加载群聊"
4. **设置筛选**：选择时间范围和聊天对象
5. **查询记录**：点击"查询聊天记录"
6. **浏览消息**：在聊天区域查看消息
7. **导出数据**：可导出为文本文件

## 常见问题

### Q: 显示"Chatlog 服务未连接"
**A:** 请确保已运行 `chatlog server` 命令启动 HTTP 服务

### Q: 查询不到聊天记录
**A:** 请确认：
- Chatlog 数据已正确解密
- 选择了正确的聊天对象
- 时间范围设置正确

### Q: 图片无法显示
**A:** 请确保 Chatlog 媒体文件路径正确且文件存在

### Q: 端口被占用
**A:** 可以通过环境变量修改端口：
```bash
PORT=8080 npm start
```

## 功能特性

- ✅ 智能时间筛选（今天、昨天、最近一周等）
- ✅ 支持联系人和群聊记录查询
- ✅ 仿微信聊天界面显示
- ✅ 图片点击放大查看
- ✅ 语音和文件消息支持
- ✅ 分页浏览大量数据
- ✅ 一键导出聊天记录
- ✅ 响应式设计，支持移动端

## 技术支持

如需帮助，请查看：
- [项目说明.md](./项目说明.md) - 详细文档
- [Chatlog 官方文档](https://github.com/sjzar/chatlog) - 后端服务文档

---

**享受探索您的聊天记录之旅！** 🎉

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