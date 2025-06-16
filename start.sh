#!/bin/bash

echo "======================================"
echo "   聊天记录查询网站启动脚本"
echo "======================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js 16.x 或更高版本"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接或npm配置"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

echo ""
echo "🚀 正在启动聊天记录查询网站..."
echo "📱 访问地址: http://localhost:3000"
echo "⚠️  请确保 Chatlog HTTP 服务已在端口 5030 启动"
echo ""
echo "💡 提示:"
echo "   - 按 Ctrl+C 停止服务"
echo "   - 请先运行 'chatlog server' 启动 Chatlog HTTP 服务"
echo ""

# 启动服务
npm start 