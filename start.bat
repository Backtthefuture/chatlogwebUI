@echo off
chcp 65001 >nul
echo ======================================
echo    聊天记录查询网站启动脚本
echo ======================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js 16.x 或更高版本
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
for /f "delims=" %%i in ('node --version') do echo    版本: %%i

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败，请检查网络连接或npm配置
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)

echo.
echo 🚀 正在启动聊天记录查询网站...
echo 📱 访问地址: http://localhost:3000
echo ⚠️  请确保 Chatlog HTTP 服务已在端口 5030 启动
echo.
echo 💡 提示:
echo    - 按 Ctrl+C 停止服务
echo    - 请先运行 'chatlog server' 启动 Chatlog HTTP 服务
echo.

REM 启动服务
npm start 