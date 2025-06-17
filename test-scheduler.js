#!/usr/bin/env node

/**
 * 定时任务功能测试脚本
 * 用于验证定时分析功能是否正常工作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testScheduledAnalysis() {
    console.log('🧪 开始测试定时分析功能...\n');
    
    try {
        // 1. 测试状态API
        console.log('1️⃣ 测试定时任务状态API...');
        const statusResponse = await axios.get(`${BASE_URL}/api/scheduled-analysis-status`);
        console.log('✅ 状态API响应:', {
            enabled: statusResponse.data.enabled,
            cronTime: statusResponse.data.cronTime,
            itemCount: statusResponse.data.analysisItems.length
        });
        
        // 2. 测试手动触发API
        console.log('\n2️⃣ 测试手动触发API...');
        const triggerResponse = await axios.post(`${BASE_URL}/api/trigger-scheduled-analysis`);
        console.log('✅ 触发API响应:', triggerResponse.data.message);
        
        // 3. 等待几秒后检查分析历史
        console.log('\n3️⃣ 等待5秒后检查分析历史...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const historyResponse = await axios.get(`${BASE_URL}/api/analysis-history`);
        const recentAnalysis = historyResponse.data.history
            .filter(item => item.title.includes('[定时]'))
            .slice(0, 3);
            
        if (recentAnalysis.length > 0) {
            console.log('✅ 找到定时分析记录:');
            recentAnalysis.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.title} (${item.timestamp})`);
            });
        } else {
            console.log('⚠️  暂未找到定时分析记录（可能是因为没有配置分析项或昨天无聊天数据）');
        }
        
        // 4. 显示使用建议
        console.log('\n💡 使用建议:');
        console.log('   1. 在Web界面配置AI分析项（设置群聊和提示词）');
        console.log('   2. 在.env文件中设置 ENABLE_SCHEDULED_ANALYSIS=true');
        console.log('   3. 配置执行时间 SCHEDULED_ANALYSIS_TIME');
        console.log('   4. 重启服务即可启用自动定时分析');
        
        console.log('\n🎉 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 请确保服务器正在运行:');
            console.log('   npm start');
        }
    }
}

// 运行测试
testScheduledAnalysis(); 