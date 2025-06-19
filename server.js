require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const CHATLOG_API_BASE = 'http://127.0.0.1:5030/api/v1';

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key-here';
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

// 定时任务配置 - 使用动态变量
let SCHEDULED_ANALYSIS_TIME = process.env.SCHEDULED_ANALYSIS_TIME || '0 0 8 * * *'; // 默认每天早上8点
let ENABLE_SCHEDULED_ANALYSIS = process.env.ENABLE_SCHEDULED_ANALYSIS === 'true';
let currentCronJob = null; // 保存当前的定时任务实例

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 配置moment中文支持
moment.locale('zh-cn');

// CSV解析工具函数
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];
  
  const headers = lines[0].split(',');
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index].trim();
      });
      // 过滤掉空行或无效数据
      if (obj.UserName || obj.Name || obj.NickName) {
        result.push(obj);
      }
    }
  }
  
  return result;
}

// 转换联系人数据格式
function formatContactData(contacts) {
  return contacts.map(contact => ({
    wxid: contact.UserName || '',
    displayName: contact.Remark || contact.NickName || contact.Alias || contact.UserName || '未知联系人',
    nickname: contact.NickName || '',
    remark: contact.Remark || '',
    alias: contact.Alias || ''
  })).filter(contact => contact.wxid); // 过滤掉没有wxid的数据
}

// 转换群聊数据格式
function formatChatroomData(chatrooms) {
  return chatrooms.map(chatroom => ({
    wxid: chatroom.Name || '',
    displayName: chatroom.Remark || chatroom.NickName || chatroom.Name || '未知群聊',
    nickname: chatroom.NickName || '',
    remark: chatroom.Remark || '',
    owner: chatroom.Owner || '',
    userCount: chatroom.UserCount || '0'
  })).filter(chatroom => chatroom.wxid); // 过滤掉没有wxid的数据
}

// 首页路由
app.get('/', (req, res) => {
  res.render('index');
});

// API代理路由
// 获取聊天记录
app.get('/api/chatlog', async (req, res) => {
  try {
    const { time, talker, limit, offset = 0, format = 'json' } = req.query;
    
    const params = new URLSearchParams();
    if (time) params.append('time', time);
    if (talker) params.append('talker', talker);
    
    // 只有当明确指定limit时才添加该参数（支持不限制查询）
    if (limit !== undefined && limit !== '') {
      params.append('limit', limit);
    }
    
    if (offset) params.append('offset', offset);
    if (format) params.append('format', format);

    console.log('请求聊天记录 API:', `${CHATLOG_API_BASE}/chatlog?${params}`);
    
    const response = await axios.get(`${CHATLOG_API_BASE}/chatlog?${params}`);
    
    // 调试：记录原始响应的前几条数据
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('聊天记录原始数据示例:', JSON.stringify(response.data[0], null, 2));
      console.log('数据字段:', Object.keys(response.data[0]));
    } else {
      console.log('返回数据格式:', typeof response.data, response.data);
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('获取聊天记录失败:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.status, error.response.data);
    }
    res.status(500).json({ 
      error: '获取聊天记录失败', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// 获取联系人列表
app.get('/api/contacts', async (req, res) => {
  try {
    const response = await axios.get(`${CHATLOG_API_BASE}/contact`);
    const csvData = response.data;
    const parsedData = parseCSV(csvData);
    const formattedData = formatContactData(parsedData);
    
    console.log(`获取到 ${formattedData.length} 个联系人`);
    res.json(formattedData);
  } catch (error) {
    console.error('获取联系人列表失败:', error.message);
    res.status(500).json({ 
      error: '获取联系人列表失败', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// 获取群聊列表
app.get('/api/chatrooms', async (req, res) => {
  try {
    const response = await axios.get(`${CHATLOG_API_BASE}/chatroom`);
    const csvData = response.data;
    const parsedData = parseCSV(csvData);
    const formattedData = formatChatroomData(parsedData);
    
    console.log(`获取到 ${formattedData.length} 个群聊`);
    res.json(formattedData);
  } catch (error) {
    console.error('获取群聊列表失败:', error.message);
    res.status(500).json({ 
      error: '获取群聊列表失败', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// 获取会话列表
app.get('/api/sessions', async (req, res) => {
  try {
    const response = await axios.get(`${CHATLOG_API_BASE}/session`);
    res.json(response.data);
  } catch (error) {
    console.error('获取会话列表失败:', error.message);
    res.status(500).json({ 
      error: '获取会话列表失败', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// 获取多媒体内容
app.get('/api/media', async (req, res) => {
  try {
    const { msgid } = req.query;
    if (!msgid) {
      return res.status(400).json({ error: '缺少消息ID参数' });
    }

    const response = await axios.get(`${CHATLOG_API_BASE}/media?msgid=${msgid}`, {
      responseType: 'stream'
    });
    
    // 设置响应头
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }
    
    response.data.pipe(res);
  } catch (error) {
    console.error('获取多媒体内容失败:', error.message);
    res.status(500).json({ 
      error: '获取多媒体内容失败', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// 历史记录管理
const HISTORY_DIR = path.join(__dirname, 'ai_analysis_history');
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// 保存分析历史记录
function saveAnalysisHistory(metadata, analysisContent) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${metadata.groupName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_${metadata.timeRange.replace(/[^0-9-]/g, '_')}_${timestamp}.json`;
  const filepath = path.join(HISTORY_DIR, filename);
  
  const historyRecord = {
    ...metadata,
    content: analysisContent,
    savedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(filepath, JSON.stringify(historyRecord, null, 2), 'utf8');
  return filename.replace('.json', '');
}

// 获取分析历史记录列表
function getAnalysisHistory() {
  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(HISTORY_DIR, file);
        const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return {
          id: file.replace('.json', ''),
          title: `${content.groupName} - ${content.timeRange}`,
          timestamp: content.savedAt,
          analysisType: content.analysisType,
          messageCount: content.messageCount,
          groupName: content.groupName,
          timeRange: content.timeRange
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return files;
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

// AI分析相关函数
async function getChatData(talker, timeRange = '2024-01-01~2025-12-31') {
  try {
    const params = new URLSearchParams();
    params.append('time', timeRange);
    params.append('talker', talker);
    params.append('limit', '500'); // 获取更多数据用于分析
    params.append('format', 'json');

    const response = await axios.get(`${CHATLOG_API_BASE}/chatlog?${params}`);
    return response.data;
  } catch (error) {
    console.error('获取聊天数据失败:', error.message);
    throw error;
  }
}

// 通用AI调用函数
async function callAI(prompt, systemPrompt) {
  try {
    console.log('发送到AI的提示词长度:', prompt.length);
    
    // 读取模型设置
    const modelConfig = await getModelConfig();
    const provider = modelConfig.provider;
    const config = modelConfig.config;

    let response;

    if (provider === 'DeepSeek') {
      response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1.0,
        max_tokens: 64000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });
      
      return response.data.choices[0].message.content;
      
    } else if (provider === 'Gemini') {
      response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 32768
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });
      
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('不支持的AI提供商');
    
  } catch (error) {
    console.error('AI API调用失败:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// 向后兼容的DeepSeek API调用函数
async function callDeepSeekAPI(prompt, systemPrompt) {
  return await callAI(prompt, systemPrompt);
}

// 获取当前模型配置
async function getModelConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    const modelSettingsPath = path.join(__dirname, 'model-settings.json');
    
    if (fs.existsSync(modelSettingsPath)) {
      const settings = JSON.parse(fs.readFileSync(modelSettingsPath, 'utf8'));
      const provider = settings.modelProvider;
      
      return {
        provider: provider,
        config: settings[provider.toLowerCase()]
      };
    } else {
      // 返回默认配置（使用环境变量中的DeepSeek配置）
      return {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: DEEPSEEK_API_KEY
        }
      };
    }
  } catch (error) {
    console.error('读取模型配置失败:', error);
    // 返回默认配置
    return {
      provider: 'DeepSeek',
      config: {
        model: 'deepseek-reasoner',
        apiKey: DEEPSEEK_API_KEY
      }
    };
  }
}

function generatePromptTemplate(analysisType, chatData, customPrompt = '') {
  // 不做任何限制，保留完整数据
  const validMessages = chatData.filter(msg => msg.content && msg.content.trim().length > 0);
  const userStats = {};
  
  // 统计用户发言次数
  validMessages.forEach(msg => {
    if (msg.senderName) {
      userStats[msg.senderName] = (userStats[msg.senderName] || 0) + 1;
    }
  });
  
  const basicInfo = `
聊天数据概况：
- 群聊名称: ${chatData[0]?.talkerName || '未知群聊'}
- 消息总数: ${chatData.length} (有效文本消息: ${validMessages.length})
- 时间范围: ${chatData[0]?.time} 到 ${chatData[chatData.length-1]?.time}
- 活跃用户数: ${Object.keys(userStats).length}
- 主要发言用户: ${Object.entries(userStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `${name}(${count}条)`).join(', ')}

完整聊天数据：
${validMessages.map(msg => `${msg.time} [${msg.senderName}]: ${msg.content}`).join('\n')}
`;

  // 如果有自定义提示词，直接使用
  if (customPrompt && customPrompt.trim()) {
    return `${basicInfo}

${customPrompt}`;
  }

  // 如果没有自定义提示词，返回基础信息
  return `${basicInfo}

请基于以上聊天数据进行分析。`;
}

// AI分析接口（修改为返回historyId）
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { groupName, analysisType, customPrompt, timeRange } = req.body;
    
    console.log('AI分析请求:', { groupName, analysisType, customPrompt, timeRange });

    if (!groupName) {
      return res.status(400).json({ error: '请指定群聊名称' });
    }

    // 获取聊天数据
    const chatData = await getChatData(groupName, timeRange || '2024-01-01~2025-12-31');
    
    if (!chatData || chatData.length === 0) {
      return res.json({ 
        success: false, 
        error: '未找到聊天数据，请检查时间范围和群聊名称是否正确' 
      });
    }

    // 生成提示词
    const prompt = generatePromptTemplate(analysisType, chatData, customPrompt);
    const systemPrompt = `你是一个专业的数据分析师和前端开发工程师。请根据提供的聊天数据，生成一个完整的、可直接运行的HTML页面。

要求：
1. HTML页面必须完整，包含DOCTYPE、html、head、body等标签
2. CSS样式直接写在<style>标签内
3. JavaScript代码直接写在<script>标签内
4. 使用CDN引入必要的图表库（如Chart.js、D3.js等）
5. 页面要美观、专业、响应式
6. 包含真实的数据分析和可视化
7. 不要使用任何外部文件引用
8. 使用暖色系设计风格

直接返回完整的HTML代码，不要有任何其他说明文字。`;

    // 调用AI分析
    const analysisResult = await callAI(prompt, systemPrompt);
    
    // 保存到历史记录
    const metadata = {
      groupName,
      analysisType,
      timeRange,
      messageCount: chatData.length,
      timestamp: new Date().toISOString(),
      title: `${groupName} - ${getAnalysisTitle(analysisType)}`
    };
    
    const historyId = saveAnalysisHistory(metadata, analysisResult);
    
    res.json({ 
      success: true, 
      historyId: historyId,
      title: metadata.title,
      metadata: metadata
    });

  } catch (error) {
    console.error('AI分析失败:', error.message);
    if (error.code === 'ECONNABORTED') {
      res.json({ success: false, error: '分析超时，请稍后重试' });
    } else if (error.response?.status === 429) {
      res.json({ success: false, error: 'API调用频率过高，请稍后重试' });
    } else {
      res.json({ success: false, error: '分析失败: ' + error.message });
    }
  }
});

function getAnalysisTitle(analysisType) {
  const titles = {
    'programming': '编程技术分析',
    'science': '科学学习分析', 
    'reading': '阅读讨论分析',
    'custom': '自定义分析'
  };
  return titles[analysisType] || '聊天数据分析';
}

// 获取分析历史记录接口
app.get('/api/analysis-history', (req, res) => {
  try {
    const history = getAnalysisHistory();
    res.json({ success: true, history });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.json({ success: false, error: '获取历史记录失败' });
  }
});

// 获取特定分析记录接口
app.get('/api/analysis-history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(HISTORY_DIR, `${id}.json`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: '分析记录不存在' });
    }
    
    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('获取分析记录失败:', error);
    res.status(500).json({ success: false, error: '获取分析记录失败' });
  }
});

// 删除分析记录接口
app.delete('/api/analysis-history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(HISTORY_DIR, `${id}.json`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: '分析记录不存在' });
    }
    
    // 删除文件
    fs.unlinkSync(filepath);
    console.log(`删除分析记录: ${id}`);
    
    res.json({ success: true, message: '分析记录已删除' });
  } catch (error) {
    console.error('删除分析记录失败:', error);
    res.status(500).json({ success: false, error: '删除分析记录失败' });
  }
});

// 获取分析记录的原始聊天数据（用于导出聊天记录）
app.get('/api/analysis-chatlog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(HISTORY_DIR, `${id}.json`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: '分析记录不存在' });
    }
    
    const record = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    // 从记录中获取群组名称和时间范围，重新查询聊天数据
    const groupName = record.groupName || record.metadata?.groupName;
    const timeRange = record.timeRange || record.metadata?.timeRange;
    
    if (!groupName) {
      return res.status(400).json({ success: false, error: '分析记录中缺少群组信息' });
    }
    
    try {
      // 重新获取聊天数据
      const chatData = await getChatData(groupName, timeRange);
      res.json({ success: true, data: chatData });
    } catch (error) {
      console.error('获取聊天数据失败:', error);
      res.status(500).json({ success: false, error: '获取聊天数据失败: ' + error.message });
    }
    
  } catch (error) {
    console.error('获取分析聊天记录失败:', error);
    res.status(500).json({ success: false, error: '获取分析聊天记录失败' });
  }
});

// 获取分析记录的HTML内容（用于导出分析报告）
app.get('/api/analysis-content/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(HISTORY_DIR, `${id}.json`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: '分析记录不存在' });
    }
    
    const record = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    let content = record.content || '';
    
    // 检查内容是否被markdown代码块包装
    if (content.trim().startsWith('```html') && content.trim().endsWith('```')) {
      // 移除markdown代码块包装
      content = content.trim().slice(7, -3).trim();
    }
    
    // 如果内容不是完整的HTML页面，需要包装
    if (!content.trim().toLowerCase().startsWith('<!doctype html') && 
        !content.trim().toLowerCase().startsWith('<html')) {
      
      // 简单的Markdown到HTML转换（复用现有逻辑）
      let htmlContent = content
        .replace(/\n/g, '<br>')
        .replace(/#{6}\s*(.*?)(<br>|$)/g, '<h6>$1</h6>')
        .replace(/#{5}\s*(.*?)(<br>|$)/g, '<h5>$1</h5>')
        .replace(/#{4}\s*(.*?)(<br>|$)/g, '<h4>$1</h4>')
        .replace(/#{3}\s*(.*?)(<br>|$)/g, '<h3>$1</h3>')
        .replace(/#{2}\s*(.*?)(<br>|$)/g, '<h2>$1</h2>')
        .replace(/#{1}\s*(.*?)(<br>|$)/g, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
      
      // 包装为完整的HTML页面
      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${record.title || 'AI分析结果'}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 30px; }
            h3 { color: #7f8c8d; margin-top: 25px; }
            h4, h5, h6 { color: #95a5a6; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;
    }
    
    res.json({ success: true, content: content });
    
  } catch (error) {
    console.error('获取分析内容失败:', error);
    res.status(500).json({ success: false, error: '获取分析内容失败' });
  }
});

// 新页面展示分析结果
app.get('/analysis/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(HISTORY_DIR, `${id}.json`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>分析记录不存在</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ 分析记录不存在</h1>
          <p>请检查链接是否正确</p>
          <button onclick="window.close()">关闭窗口</button>
        </body>
        </html>
      `);
    }
    
    const record = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    let content = record.content || '';
    
    // 检查内容是否被markdown代码块包装
    if (content.trim().startsWith('```html') && content.trim().endsWith('```')) {
      // 移除markdown代码块包装
      content = content.trim().slice(7, -3).trim(); // 移除开头的```html和结尾的```
    }
    
    // 检查内容是否已经是完整的HTML页面
    if (content.trim().toLowerCase().startsWith('<!doctype html') || 
        content.trim().toLowerCase().startsWith('<html')) {
      // 如果是完整的HTML页面，直接返回
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(content);
    }
    
    // 否则，将Markdown内容转换为HTML并包装在完整的HTML页面中
    const markdownContent = content;
    
    // 简单的Markdown到HTML转换
    let htmlContent = markdownContent
      .replace(/\n/g, '<br>')
      .replace(/#{6}\s*(.*?)(<br>|$)/g, '<h6>$1</h6>')
      .replace(/#{5}\s*(.*?)(<br>|$)/g, '<h5>$1</h5>')
      .replace(/#{4}\s*(.*?)(<br>|$)/g, '<h4>$1</h4>')
      .replace(/#{3}\s*(.*?)(<br>|$)/g, '<h3>$1</h3>')
      .replace(/#{2}\s*(.*?)(<br>|$)/g, '<h2>$1</h2>')
      .replace(/#{1}\s*(.*?)(<br>|$)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/>\s*(.*?)(<br>|$)/g, '<blockquote>$1</blockquote>')
      .replace(/\|(.+?)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      });
    
    // 包装表格
    htmlContent = htmlContent.replace(/(<tr>.*?<\/tr>)+/g, '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">$&</table>');
    
    // 处理列表项
    htmlContent = htmlContent.replace(/^-\s+(.*?)(<br>|$)/gm, '<li>$1</li>');
    htmlContent = htmlContent.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    
    // 处理数字列表
    htmlContent = htmlContent.replace(/^\d+\.\s+(.*?)(<br>|$)/gm, '<li>$1</li>');
    htmlContent = htmlContent.replace(/(<li>.*?<\/li>)+/g, '<ol>$&</ol>');
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${record.title || 'AI分析结果'}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 30px; }
          h3 { color: #7f8c8d; margin-top: 25px; }
          h4, h5, h6 { color: #95a5a6; margin-top: 20px; }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 15px 0; 
            background: white;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: bold;
            color: #2c3e50;
          }
          blockquote {
            border-left: 4px solid #3498db;
            margin: 15px 0;
            padding: 10px 20px;
            background-color: #f8f9fa;
            font-style: italic;
          }
          code {
            background-color: #f1f2f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
          }
          ul, ol {
            margin: 15px 0;
            padding-left: 30px;
          }
          li {
            margin: 8px 0;
          }
          .header-info {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .close-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          .close-btn:hover {
            background: #c0392b;
          }
          @media print {
            .close-btn { display: none; }
            body { background: white; }
            .container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <button class="close-btn" onclick="window.close()">✕ 关闭</button>
        <div class="container">
          <div class="header-info">
            <strong>分析标题:</strong> ${record.title || '未知'}<br>
            <strong>群聊名称:</strong> ${record.groupName || '未知'}<br>
            <strong>时间范围:</strong> ${record.timeRange || '未知'}<br>
            <strong>消息数量:</strong> ${record.messageCount || 0}条<br>
            <strong>生成时间:</strong> ${record.savedAt ? new Date(record.savedAt).toLocaleString('zh-CN') : '未知'}
          </div>
          <div class="content">
            ${htmlContent}
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fullHtml);
  } catch (error) {
    console.error('展示分析结果失败:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>展示失败</title>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>❌ 展示分析结果失败</h1>
        <p>${error.message}</p>
        <button onclick="window.close()">关闭窗口</button>
      </body>
      </html>
    `);
  }
});

// 测试DeepSeek API密钥的接口
app.get('/api/test-deepseek', async (req, res) => {
  try {
    console.log('测试DeepSeek API密钥...');
    console.log('API密钥前8位:', DEEPSEEK_API_KEY.substring(0, 8) + '****');
    
    const response = await axios.post(`${DEEPSEEK_API_BASE}/chat/completions`, {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'user',
          content: '你好，请回复"连接成功"'
        }
      ],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({ 
      success: true, 
      message: 'DeepSeek API连接成功',
      response: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('DeepSeek API测试失败:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.status, error.response.data);
    }
    res.status(500).json({ 
      success: false,
      error: error.message,
      apiKey: DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 8)}****` : '未设置',
      details: error.response?.data || '无详细信息'
    });
  }
});

// 调试信息接口
app.get('/api/debug-env', (req, res) => {
  res.json({
    hasApiKey: !!DEEPSEEK_API_KEY,
    apiKeyLength: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.length : 0,
    apiKeyPrefix: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 8) + '****' : '未设置',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('DEEPSEEK'))
  });
});

// 检查Chatlog服务状态
app.get('/api/status', async (req, res) => {
  try {
    const response = await axios.get(`${CHATLOG_API_BASE}/session`, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'chatlog-web'
      }
    });
    console.log('Chatlog连接测试成功，状态码:', response.status);
    res.json({ status: 'connected', message: 'Chatlog服务连接正常' });
  } catch (error) {
    console.error('Chatlog连接测试失败:', error.message);
    console.error('错误详情:', error.response?.status, error.response?.data);
    res.status(503).json({ 
      status: 'disconnected', 
      message: 'Chatlog服务未连接，请确保Chatlog HTTP服务已启动（端口5030）' 
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// ============ 定时任务功能 ============

// 获取所有可用的分析项配置
async function getAllAnalysisItemsForSchedule() {
  try {
    // 这里需要读取AI设置配置，模拟前端的逻辑
    const analysisItems = [];
    
    // 默认分析项
    const defaultItems = [
      { id: 'programming', name: '编程群分析' },
      { id: 'science', name: '科学群分析' },
      { id: 'reading', name: '读者群分析' }
    ];
    
    // 从本地存储或配置文件读取设置（这里简化处理）
    // 实际应用中可以从数据库或配置文件读取
    const settingsFile = path.join(__dirname, 'ai-settings.json');
    let settings = {};
    
    if (fs.existsSync(settingsFile)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      } catch (error) {
        console.log('读取AI设置文件失败，使用默认配置');
      }
    }
    
    // 检查每个默认分析项是否有配置
    defaultItems.forEach(item => {
      const itemSettings = settings[item.id];
      if (itemSettings && itemSettings.groupName) {
        analysisItems.push({
          id: item.id,
          name: itemSettings.displayName || item.name,
          groupName: itemSettings.groupName,
          analysisType: item.id,
          timeRange: 'yesterday', // 定时任务默认分析昨天
          customPrompt: itemSettings.prompt || ''
        });
      }
    });
    
    // 添加动态分析项
    if (settings.dynamicAnalysisItems) {
      settings.dynamicAnalysisItems.forEach(item => {
        const itemSettings = settings[item.id];
        if (itemSettings && itemSettings.groupName) {
          analysisItems.push({
            id: item.id,
            name: itemSettings.displayName || item.name,
            groupName: itemSettings.groupName,
            analysisType: 'custom',
            timeRange: 'yesterday',
            customPrompt: itemSettings.prompt || ''
          });
        }
      });
    }
    
    return analysisItems;
  } catch (error) {
    console.error('获取分析项配置失败:', error);
    return [];
  }
}

// 执行单个定时分析
async function executeScheduledAnalysis(analysisItem) {
  try {
    console.log(`🔄 开始执行定时分析: ${analysisItem.name}`);
    
    // 计算昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const timeRange = `${year}-${month}-${day}~${year}-${month}-${day}`;
    
    // 获取聊天数据
    const chatData = await getChatData(analysisItem.groupName, timeRange);
    
    if (!chatData || chatData.length === 0) {
      console.log(`⚠️  ${analysisItem.name}: 昨天无聊天数据，跳过分析`);
      return { success: false, reason: '无聊天数据' };
    }
    
    // 生成分析提示词
    const prompt = generatePromptTemplate(analysisItem.analysisType, chatData, analysisItem.customPrompt);
    
    // 调用AI分析 - 使用与AI智能分析中心相同的SystemPrompt
    const systemPrompt = `你是一个专业的数据分析师和前端开发工程师。请根据提供的聊天数据，生成一个完整的、可直接运行的HTML页面。

要求：
1. HTML页面必须完整，包含DOCTYPE、html、head、body等标签
2. CSS样式直接写在<style>标签内
3. JavaScript代码直接写在<script>标签内
4. 使用CDN引入必要的图表库（如Chart.js、D3.js等）
5. 页面要美观、专业、响应式
6. 包含真实的数据分析和可视化
7. 不要使用任何外部文件引用
8. 使用暖色系设计风格

直接返回完整的HTML代码，不要有任何其他说明文字。`;
    
    const analysisResult = await callAI(prompt, systemPrompt);
    
    // 保存分析结果
    const title = `[定时] ${getAnalysisTitle(analysisItem.analysisType)} - ${analysisItem.name}`;
    const metadata = {
      title,
      groupName: analysisItem.groupName,
      analysisType: analysisItem.analysisType,
      timeRange,
      messageCount: chatData.length,
      isScheduled: true
    };
    
    const historyId = saveAnalysisHistory(metadata, analysisResult);
    
    console.log(`✅ ${analysisItem.name} 定时分析完成，ID: ${historyId}`);
    return { success: true, historyId, title };
    
  } catch (error) {
    console.error(`❌ ${analysisItem.name} 定时分析失败:`, error);
    return { success: false, error: error.message };
  }
}

// 动态更新定时任务配置
function updateScheduledAnalysisConfig(newConfig) {
  try {
    // 更新全局配置变量
    ENABLE_SCHEDULED_ANALYSIS = newConfig.enabled;
    SCHEDULED_ANALYSIS_TIME = newConfig.cronTime;
    
    // 销毁现有的定时任务
    if (currentCronJob) {
      currentCronJob.stop();
      currentCronJob = null;
      console.log('🗑️  已停止现有定时任务');
    }
    
    // 如果启用了定时分析，创建新的定时任务
    if (ENABLE_SCHEDULED_ANALYSIS) {
      if (cron.validate(SCHEDULED_ANALYSIS_TIME)) {
        console.log(`⏰ 正在创建新的定时任务，执行时间: ${SCHEDULED_ANALYSIS_TIME}`);
        
        currentCronJob = cron.schedule(SCHEDULED_ANALYSIS_TIME, () => {
          console.log('\n⏰ 定时任务触发，开始执行批量分析...');
          runScheduledBatchAnalysis().catch(error => {
            console.error('定时分析执行失败:', error);
          });
        }, {
          timezone: "Asia/Shanghai",
          scheduled: false // 先不启动，后面手动启动
        });
        
        // 启动定时任务
        currentCronJob.start();
        console.log(`✅ 定时分析已启用，执行时间: ${SCHEDULED_ANALYSIS_TIME}`);
        console.log(`🌏 时区设置: Asia/Shanghai`);
        
        return { success: true, message: '定时任务配置已更新并生效' };
      } else {
        console.log(`❌ 定时任务配置错误: ${SCHEDULED_ANALYSIS_TIME}`);
        return { success: false, error: `Cron表达式无效: ${SCHEDULED_ANALYSIS_TIME}` };
      }
    } else {
      console.log(`⏸️  定时分析已禁用`);
      return { success: true, message: '定时分析已禁用' };
    }
    
  } catch (error) {
    console.error('更新定时任务配置失败:', error);
    return { success: false, error: error.message };
  }
}

// 执行批量定时分析
async function runScheduledBatchAnalysis() {
  console.log('\n🕐 开始执行定时批量分析...');
  
  try {
    // 获取所有可用的分析项
    const analysisItems = await getAllAnalysisItemsForSchedule();
    
    if (analysisItems.length === 0) {
      console.log('⚠️  没有找到可用的分析项配置，跳过定时分析');
      return;
    }
    
    console.log(`📋 找到 ${analysisItems.length} 个分析项:`);
    analysisItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.groupName})`);
    });
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    // 逐个执行分析（避免API频率限制）
    for (let i = 0; i < analysisItems.length; i++) {
      const item = analysisItems[i];
      
      try {
        const result = await executeScheduledAnalysis(item);
        
        if (result.success) {
          results.success.push({ ...item, ...result });
        } else if (result.reason === '无聊天数据') {
          results.skipped.push({ ...item, reason: result.reason });
        } else {
          results.failed.push({ ...item, error: result.error });
        }
        
        // 分析间隔3秒，避免API频率限制
        if (i < analysisItems.length - 1) {
          console.log('⏳ 等待 3 秒后继续下一个分析...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`执行 ${item.name} 分析时发生异常:`, error);
        results.failed.push({ ...item, error: error.message });
      }
    }
    
    // 输出分析结果汇总
    console.log('\n📊 定时分析完成汇总:');
    console.log(`✅ 成功: ${results.success.length} 个`);
    console.log(`⚠️  跳过: ${results.skipped.length} 个`);
    console.log(`❌ 失败: ${results.failed.length} 个`);
    
    if (results.success.length > 0) {
      console.log('\n✅ 成功的分析:');
      results.success.forEach(item => {
        console.log(`   - ${item.title}`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⚠️  跳过的分析:');
      results.skipped.forEach(item => {
        console.log(`   - ${item.name}: ${item.reason}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ 失败的分析:');
      results.failed.forEach(item => {
        console.log(`   - ${item.name}: ${item.error}`);
      });
    }
    
    console.log('\n🎉 定时批量分析任务完成！\n');
    
  } catch (error) {
    console.error('❌ 定时批量分析执行失败:', error);
  }
}

// 手动触发定时分析的API接口
app.post('/api/trigger-scheduled-analysis', async (req, res) => {
  try {
    console.log('🔄 手动触发定时分析...');
    
    // 异步执行，不阻塞响应
    runScheduledBatchAnalysis().catch(error => {
      console.error('手动触发的定时分析执行失败:', error);
    });
    
    res.json({ 
      success: true, 
      message: '定时分析已开始执行，请查看服务器日志获取进度' 
    });
  } catch (error) {
    console.error('触发定时分析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '触发定时分析失败: ' + error.message 
    });
  }
});

// 将Cron表达式转换为人类可读的时间格式
function cronToHumanReadable(cronExpression) {
  try {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 6) return cronExpression;
    
    const [sec, min, hour, day, month, week] = parts;
    
    // 格式化时间
    const formatTime = (h, m) => {
      const hourNum = parseInt(h);
      const minNum = parseInt(m);
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      const displayMin = minNum.toString().padStart(2, '0');
      return `${period} ${displayHour}:${displayMin}`;
    };
    
    // 判断执行频率
    if (week === '*' && day === '*') {
      return `每天 ${formatTime(hour, min)}`;
    } else if (week === '1-5') {
      return `工作日 ${formatTime(hour, min)}`;
    } else if (week === '0,6') {
      return `周末 ${formatTime(hour, min)}`;
    } else if (/^\d$/.test(week)) {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `${weekDays[parseInt(week)]} ${formatTime(hour, min)}`;
    } else if (hour.includes('/')) {
      const interval = hour.split('/')[1];
      return `每${interval}小时执行`;
    } else if (min.includes('/')) {
      const interval = min.split('/')[1];
      return `每${interval}分钟执行`;
    }
    
    return `${formatTime(hour, min)}`;
  } catch (error) {
    return cronExpression;
  }
}

// 获取定时任务状态的API接口
app.get('/api/scheduled-analysis-status', async (req, res) => {
  try {
    const analysisItems = await getAllAnalysisItemsForSchedule();
    
    res.json({
      success: true,
      enabled: ENABLE_SCHEDULED_ANALYSIS,
      cronTime: SCHEDULED_ANALYSIS_TIME,
      humanReadableTime: cronToHumanReadable(SCHEDULED_ANALYSIS_TIME),
      nextRun: ENABLE_SCHEDULED_ANALYSIS ? cron.validate(SCHEDULED_ANALYSIS_TIME) ? '已配置' : '配置错误' : '未启用',
      analysisItems: analysisItems.map(item => ({
        name: item.name,
        groupName: item.groupName,
        analysisType: item.analysisType
      }))
    });
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取定时任务状态失败: ' + error.message
    });
  }
});

// 保存分析项配置到服务器
app.post('/api/save-analysis-config', (req, res) => {
  try {
    const { analysisConfig } = req.body;
    
    if (!analysisConfig) {
      return res.status(400).json({
        success: false,
        error: '分析配置不能为空'
      });
    }
    
    // 保存到ai-settings.json文件
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.join(__dirname, 'ai-settings.json');
    
    fs.writeFileSync(settingsPath, JSON.stringify(analysisConfig, null, 2));
    
    console.log('✅ 分析项配置已保存到 ai-settings.json 文件');
    
    res.json({
      success: true,
      message: '分析项配置保存成功'
    });
    
  } catch (error) {
    console.error('保存分析项配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取分析项配置
app.get('/api/get-analysis-config', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.join(__dirname, 'ai-settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      res.json({
        success: true,
        config: settings
      });
    } else {
      res.json({
        success: true,
        config: {
          dynamicAnalysisItems: []
        }
      });
    }
  } catch (error) {
    console.error('获取分析项配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 保存定时任务配置
app.post('/api/save-scheduled-config', (req, res) => {
  try {
    const { enabled, cronTime, analysisTimeRange, analysisInterval, skipEmptyData, enableNotification, analysisItems } = req.body;
    
    // 创建环境变量配置
    const envConfig = {
      ENABLE_SCHEDULED_ANALYSIS: enabled ? 'true' : 'false',
      SCHEDULED_ANALYSIS_TIME: cronTime || '0 8 * * *',
      ANALYSIS_TIME_RANGE: analysisTimeRange || 'yesterday',
      ANALYSIS_INTERVAL: analysisInterval || 3,
      SKIP_EMPTY_DATA: skipEmptyData ? 'true' : 'false',
      ENABLE_NOTIFICATION: enableNotification ? 'true' : 'false'
    };
    
    // 读取现有的.env文件
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // 更新环境变量
    Object.keys(envConfig).forEach(key => {
      const value = envConfig[key];
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });
    
    // 写入.env文件
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    console.log('✅ 定时任务配置已保存到 .env 文件');
    
    // 动态更新定时任务配置，无需重启服务器
    const updateResult = updateScheduledAnalysisConfig({
      enabled: enabled,
      cronTime: cronTime || '0 0 8 * * *'
    });
    
    if (updateResult.success) {
      res.json({
        success: true,
        message: '配置保存成功并已立即生效，无需重启服务器'
      });
    } else {
      res.json({
        success: false,
        error: `配置已保存到文件，但动态更新失败: ${updateResult.error}`
      });
    }
    
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 测试Cron表达式
app.post('/api/test-cron-expression', (req, res) => {
  try {
    const { cronExpression } = req.body;
    
    if (!cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'Cron表达式不能为空'
      });
    }
    
    // 验证Cron表达式格式
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Cron表达式应包含6个部分'
      });
    }
    
    // 使用node-cron验证
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({
        success: false,
        error: 'Cron表达式格式无效'
      });
    }
    
    // 计算下次执行时间（简单模拟）
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 简单示例：24小时后
    
    res.json({
      success: true,
      message: 'Cron表达式验证成功',
      nextRun: nextRun.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    });
    
  } catch (error) {
    console.error('测试Cron表达式失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 模型设置API端点

// 保存模型设置
app.post('/api/model-settings', (req, res) => {
  try {
    const { modelProvider, deepseek, gemini } = req.body;
    
    if (!modelProvider) {
      return res.status(400).json({
        success: false,
        error: '请选择模型提供商'
      });
    }
    
    // 验证配置
    const selectedConfig = modelProvider === 'DeepSeek' ? deepseek : gemini;
    if (!selectedConfig || !selectedConfig.apiKey || !selectedConfig.model) {
      return res.status(400).json({
        success: false,
        error: '请填写完整的模型配置信息'
      });
    }
    
    // 保存到环境变量文件
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // 更新模型设置相关的环境变量
    const envUpdates = {
      'MODEL_PROVIDER': modelProvider,
      'DEEPSEEK_API_KEY': deepseek.apiKey,
      'DEEPSEEK_MODEL': deepseek.model,
      'GEMINI_API_KEY': gemini.apiKey,
      'GEMINI_MODEL': gemini.model
    };
    
    Object.keys(envUpdates).forEach(key => {
      const value = envUpdates[key];
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });
    
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    // 同时保存到JSON文件以便前端读取
    const modelSettingsPath = path.join(__dirname, 'model-settings.json');
    const settingsData = {
      modelProvider,
      deepseek,
      gemini,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(modelSettingsPath, JSON.stringify(settingsData, null, 2));
    
    console.log('✅ 模型设置已保存');
    
    res.json({
      success: true,
      message: '模型设置保存成功'
    });
    
  } catch (error) {
    console.error('保存模型设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取模型设置
app.get('/api/model-settings', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const modelSettingsPath = path.join(__dirname, 'model-settings.json');
    
    if (fs.existsSync(modelSettingsPath)) {
      const settings = JSON.parse(fs.readFileSync(modelSettingsPath, 'utf8'));
      
      // 出于安全考虑，不返回完整的API Key
      const safeSettings = {
        ...settings,
        deepseek: {
          ...settings.deepseek,
          apiKey: settings.deepseek.apiKey ? settings.deepseek.apiKey.substring(0, 8) + '...' : ''
        },
        gemini: {
          ...settings.gemini,
          apiKey: settings.gemini.apiKey ? settings.gemini.apiKey.substring(0, 8) + '...' : ''
        }
      };
      
      res.json({
        success: true,
        settings: safeSettings
      });
    } else {
      // 返回默认设置
      res.json({
        success: true,
        settings: {
          modelProvider: 'DeepSeek',
          deepseek: {
            model: 'deepseek-chat',
            apiKey: ''
          },
          gemini: {
            model: 'gemini-pro',
            apiKey: ''
          }
        }
      });
    }
  } catch (error) {
    console.error('获取模型设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 测试模型连接
app.post('/api/model-settings/test', async (req, res) => {
  try {
    const { provider, config } = req.body;
    
    if (!provider || !config || !config.apiKey || !config.model) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的测试配置'
      });
    }
    
    let testResult;
    
    if (provider === 'DeepSeek') {
      testResult = await testDeepSeekConnection(config.apiKey, config.model);
    } else if (provider === 'Gemini') {
      testResult = await testGeminiConnection(config.apiKey, config.model);
    } else {
      return res.status(400).json({
        success: false,
        error: '不支持的模型提供商'
      });
    }
    
    res.json(testResult);
    
  } catch (error) {
    console.error('测试模型连接失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DeepSeek连接测试函数
async function testDeepSeekConnection(apiKey, model) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请回复"连接测试成功"'
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        message: '连接测试成功',
        model: model,
        response: response.data.choices[0].message.content
      };
    } else {
      return {
        success: false,
        error: '模型响应格式异常'
      };
    }
  } catch (error) {
    console.error('DeepSeek连接测试失败:', error.message);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 401) {
        return {
          success: false,
          error: 'API Key 无效，请检查您的密钥'
        };
      } else if (statusCode === 429) {
        return {
          success: false,
          error: 'API 调用频率超限，请稍后重试'
        };
      } else {
        return {
          success: false,
          error: `API 错误 (${statusCode}): ${errorData?.error?.message || '未知错误'}`
        };
      }
    } else {
      return {
        success: false,
        error: error.code === 'ECONNABORTED' ? '连接超时，请检查网络' : error.message
      };
    }
  }
}

// Gemini连接测试函数
async function testGeminiConnection(apiKey, model) {
  try {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      contents: [{
        parts: [{
          text: '你好，请回复"连接测试成功"'
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.candidates && response.data.candidates[0]) {
      return {
        success: true,
        message: '连接测试成功',
        model: model,
        response: response.data.candidates[0].content.parts[0].text
      };
    } else {
      return {
        success: false,
        error: '模型响应格式异常'
      };
    }
  } catch (error) {
    console.error('Gemini连接测试失败:', error.message);
    
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      if (statusCode === 400) {
        return {
          success: false,
          error: 'API Key 无效或请求格式错误'
        };
      } else if (statusCode === 429) {
        return {
          success: false,
          error: 'API 调用频率超限，请稍后重试'
        };
      } else {
        return {
          success: false,
          error: `API 错误 (${statusCode}): ${errorData?.error?.message || '未知错误'}`
        };
      }
    } else {
      return {
        success: false,
        error: error.code === 'ECONNABORTED' ? '连接超时，请检查网络' : error.message
      };
    }
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 聊天记录查询网站已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`🔗 请确保Chatlog HTTP服务已在端口5030启动`);
  
  // 初始化定时任务
  const initResult = updateScheduledAnalysisConfig({
    enabled: ENABLE_SCHEDULED_ANALYSIS,
    cronTime: SCHEDULED_ANALYSIS_TIME
  });
  
  if (!initResult.success && ENABLE_SCHEDULED_ANALYSIS) {
    console.log(`❌ 定时任务初始化失败: ${initResult.error}`);
  }
  
  console.log(`\n💡 手动触发定时分析: POST /api/trigger-scheduled-analysis`);
  console.log(`📊 查看定时任务状态: GET /api/scheduled-analysis-status\n`);
}); 