require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CHATLOG_API_BASE = 'http://127.0.0.1:5030/api/v1';

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key-here';
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

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
    const { time, talker, limit = 50, offset = 0, format = 'json' } = req.query;
    
    const params = new URLSearchParams();
    if (time) params.append('time', time);
    if (talker) params.append('talker', talker);
    if (limit) params.append('limit', limit);
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

async function callDeepSeekAPI(prompt, systemPrompt) {
  try {
    console.log('发送到AI的提示词长度:', prompt.length);
    
    const response = await axios.post(`${DEEPSEEK_API_BASE}/chat/completions`, {
      model: 'deepseek-chat',  // 使用更稳定的chat模型
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
      temperature: 0.7,
      max_tokens: 8000,  // 增加输出长度
      stream: false      // 禁用流式输出确保稳定性
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 增加到120秒超时
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.status, error.response.data);
    }
    throw error;
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

    // 调用DeepSeek API
    const htmlResult = await callDeepSeekAPI(prompt, systemPrompt);
    
    // 保存到历史记录
    const metadata = {
      groupName,
      analysisType,
      timeRange,
      messageCount: chatData.length,
      timestamp: new Date().toISOString(),
      title: `${groupName} - ${getAnalysisTitle(analysisType)}`
    };
    
    const historyId = saveAnalysisHistory(metadata, htmlResult);
    
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
    
    // 直接返回HTML内容
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(record.content);
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

app.listen(PORT, () => {
  console.log(`\n🚀 聊天记录查询网站已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`🔗 请确保Chatlog HTTP服务已在端口5030启动\n`);
}); 