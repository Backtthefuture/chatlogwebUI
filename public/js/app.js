class ChatlogApp {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
        this.currentData = [];
        this.selectedTalker = '';
        
        // 批量分析状态管理
        this.batchAnalysisState = {
            isRunning: false,
            isCancelled: false,
            currentIndex: 0,
            totalItems: 0,
            analysisQueue: [],
            results: {
                success: [],
                failed: []
            }
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkStatus();
        this.initDatePickers();
        this.loadAnalysisHistory();
        this.initDynamicAnalysisItems();
    }

    // 绑定事件监听器
    bindEvents() {
        // 表单提交
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchChatlog();
        });

        // 时间范围选择
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.handleTimeRangeChange(e.target.value);
        });

        // 快捷操作按钮
        document.getElementById('loadContactsBtn').addEventListener('click', () => {
            this.loadContacts();
        });

        document.getElementById('loadChatroomsBtn').addEventListener('click', () => {
            this.loadChatrooms();
        });

        document.getElementById('loadSessionsBtn').addEventListener('click', () => {
            this.loadSessions();
        });

        // 控制按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // 分页按钮
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.searchChatlog();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.currentPage++;
            this.searchChatlog();
        });

        // 图片预览模态框
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeImageModal();
        });

        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeImageModal();
            }
        });

        // AI分析功能事件绑定
        document.getElementById('analyzeGroup1Btn').addEventListener('click', () => {
            this.startAIAnalysis('AI 编程互助会 07 群', 'programming');
        });
        
        document.getElementById('analyzeGroup2Btn').addEventListener('click', () => {
            this.startAIAnalysis('小朋友学科学', 'science');
        });
        
        document.getElementById('analyzeGroup3Btn').addEventListener('click', () => {
            this.startAIAnalysis('松节油读者群', 'reading');
        });
        

        
        document.getElementById('executeCustomAnalysis').addEventListener('click', () => {
            this.executeCustomAnalysis();
        });
        
        document.getElementById('closeAiResult').addEventListener('click', () => {
            this.closeAIResultModal();
        });
        
        // 新增分析项按钮
        document.getElementById('addAnalysisBtn').addEventListener('click', () => {
            this.addNewAnalysisItem();
        });
        
        // 一键全分析按钮
        document.getElementById('batchAnalysisBtn').addEventListener('click', () => {
            this.startBatchAnalysis();
        });
        
        // 取消批量分析按钮
        document.getElementById('cancelBatchBtn').addEventListener('click', () => {
            this.cancelBatchAnalysis();
        });
    }

    // 初始化日期选择器
    initDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('endDate').value = today;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        document.getElementById('startDate').value = weekAgo.toISOString().split('T')[0];
    }

    // 处理时间范围变化
    handleTimeRangeChange(value) {
        const customTimeGroup = document.getElementById('customTimeGroup');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (value === 'custom') {
            customTimeGroup.style.display = 'block';
        } else {
            customTimeGroup.style.display = 'none';
            
            const today = new Date();
            const endDateStr = today.toISOString().split('T')[0];
            
            let startDateStr;
            switch (value) {
                case 'today':
                    startDateStr = endDateStr;
                    break;
                case 'yesterday':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    startDateStr = yesterday.toISOString().split('T')[0];
                    endDate.value = startDateStr;
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    startDateStr = weekAgo.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    startDateStr = monthAgo.toISOString().split('T')[0];
                    break;
                default:
                    startDateStr = '';
            }
            
            if (startDateStr) {
                startDate.value = startDateStr;
                if (value !== 'yesterday') {
                    endDate.value = endDateStr;
                }
            }
        }
    }

    // 检查服务状态
    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            const statusIndicator = document.getElementById('statusIndicator');
            const statusDot = statusIndicator.querySelector('.status-dot');
            const statusText = statusIndicator.querySelector('.status-text');
            
            if (data.status === 'connected') {
                statusDot.className = 'status-dot connected';
                statusText.textContent = '已连接 Chatlog 服务';
            } else {
                statusDot.className = 'status-dot disconnected';
                statusText.textContent = 'Chatlog 服务未连接';
            }
        } catch (error) {
            console.error('检查状态失败:', error);
            const statusIndicator = document.getElementById('statusIndicator');
            const statusDot = statusIndicator.querySelector('.status-dot');
            const statusText = statusIndicator.querySelector('.status-text');
            
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = '连接检查失败';
        }
    }

    // 显示加载动画
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('show');
    }

    // 隐藏加载动画
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    }

    // 加载联系人列表
    async loadContacts() {
        this.showLoading();
        try {
            const response = await fetch('/api/contacts');
            const data = await response.json();
            
            if (response.ok) {
                this.populateSelect('talkerSelect', data, 'displayName', 'wxid');
                this.showMessage('联系人列表加载成功', 'success');
            } else {
                throw new Error(data.message || '加载联系人失败');
            }
        } catch (error) {
            console.error('加载联系人失败:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 加载群聊列表
    async loadChatrooms() {
        this.showLoading();
        try {
            const response = await fetch('/api/chatrooms');
            const data = await response.json();
            
            if (response.ok) {
                this.populateSelect('talkerSelect', data, 'displayName', 'wxid');
                this.showMessage('群聊列表加载成功', 'success');
            } else {
                throw new Error(data.message || '加载群聊失败');
            }
        } catch (error) {
            console.error('加载群聊失败:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 加载会话列表
    async loadSessions() {
        this.showLoading();
        try {
            const response = await fetch('/api/sessions');
            const data = await response.json();
            
            if (response.ok) {
                this.populateSelect('talkerSelect', data, 'displayName', 'wxid');
                this.showMessage('最近会话加载成功', 'success');
            } else {
                throw new Error(data.message || '加载会话失败');
            }
        } catch (error) {
            console.error('加载会话失败:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 填充下拉选择框
    populateSelect(selectId, data, textKey, valueKey) {
        const select = document.getElementById(selectId);
        
        // 清空现有选项（保留第一个默认选项）
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // 添加新选项
        if (Array.isArray(data)) {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueKey] || item.wxid || item.id;
                option.textContent = item[textKey] || item.displayName || item.nickname || item.remark || option.value;
                select.appendChild(option);
            });
        }
    }

    // 搜索聊天记录
    async searchChatlog() {
        this.showLoading();
        
        try {
            const formData = new FormData(document.getElementById('searchForm'));
            const params = new URLSearchParams();
            
            // 处理聊天对象参数 - 必须提供
            const talker = formData.get('talker');
            if (!talker) {
                throw new Error('请选择聊天对象');
            }
            params.append('talker', talker);
            this.selectedTalker = talker;
            
            // 处理时间参数 - 必须提供
            const timeRange = formData.get('timeRange');
            let timeParam = null;
            
            if (timeRange && timeRange !== '' && timeRange !== 'all') {
                if (timeRange === 'custom') {
                    const startDate = formData.get('startDate');
                    const endDate = formData.get('endDate');
                    if (startDate && endDate) {
                        timeParam = `${startDate}~${endDate}`;
                    } else if (startDate) {
                        timeParam = startDate;
                    } else if (endDate) {
                        timeParam = endDate;
                    }
                } else {
                    // 使用预设的时间范围
                    const today = new Date();
                    const endDateStr = today.toISOString().split('T')[0];
                    
                    switch (timeRange) {
                        case 'today':
                            timeParam = endDateStr;
                            break;
                        case 'yesterday':
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            timeParam = yesterday.toISOString().split('T')[0];
                            break;
                        case 'week':
                            const weekAgo = new Date(today);
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            timeParam = `${weekAgo.toISOString().split('T')[0]}~${endDateStr}`;
                            break;
                        case 'month':
                            const monthAgo = new Date(today);
                            monthAgo.setMonth(monthAgo.getMonth() - 1);
                            timeParam = `${monthAgo.toISOString().split('T')[0]}~${endDateStr}`;
                            break;
                    }
                }
            }
            
            // 如果没有提供时间参数，使用默认的最近一个月
            if (!timeParam) {
                const today = new Date();
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                timeParam = `${monthAgo.toISOString().split('T')[0]}~${today.toISOString().split('T')[0]}`;
            }
            
            params.append('time', timeParam);
            
            // 处理分页参数
            const limit = formData.get('limit') || this.pageSize;
            const offset = (this.currentPage - 1) * limit;
            params.append('limit', limit);
            params.append('offset', offset);
            params.append('format', 'json');
            
            const response = await fetch(`/api/chatlog?${params}`);
            const data = await response.json();
            
            if (response.ok) {
                this.currentData = data;
                this.displayChatMessages(data);
                this.updatePagination(data.length >= limit);
                document.getElementById('exportBtn').disabled = false;
                
                // 更新聊天标题
                const chatTitle = document.getElementById('chatTitle');
                const selectedOption = document.querySelector(`#talkerSelect option[value="${talker}"]`);
                const talkerName = selectedOption ? selectedOption.textContent : talker;
                chatTitle.textContent = `与 ${talkerName} 的聊天记录`;
            } else {
                throw new Error(data.message || data.error || '查询聊天记录失败');
            }
        } catch (error) {
            console.error('查询聊天记录失败:', error);
            this.showMessage(error.message, 'error');
            this.displayError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    // 显示聊天消息
    displayChatMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>未找到聊天记录</h3>
                    <p>请尝试调整搜索条件</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            chatMessages.appendChild(messageElement);
        });
        
        // 滚动到顶部
        chatMessages.scrollTop = 0;
    }

    // 创建消息元素
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        // 判断是否为自己发送的消息（这里需要根据实际API响应调整）
        if (message.isSelf || message.IsSelf || message.Type === 1) {
            messageDiv.classList.add('self');
        }
        
        // 消息头部
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'message-sender';
        
        // 尝试不同的发送者字段名
        const senderName = message.sender || message.senderName || message.Sender || 
                          message.SenderName || message.DisplayName || message.NickName || 
                          message.StrTalker || message.talker || '未知用户';
        senderSpan.textContent = senderName;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        
        // 尝试不同的时间字段名
        const timeValue = message.timestamp || message.time || message.Time || 
                         message.CreateTime || message.CreateTimestamp || message.SendTime;
        timeSpan.textContent = this.formatTime(timeValue);
        
        headerDiv.appendChild(senderSpan);
        headerDiv.appendChild(timeSpan);
        
        // 消息内容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 根据消息类型处理内容
        const messageType = message.type || message.Type || message.MsgType;
        if (messageType === 'text' || messageType === 1 || !messageType) {
            const content = message.content || message.message || message.Content || 
                          message.Message || message.StrContent || '';
            contentDiv.textContent = content;
        } else {
            contentDiv.appendChild(this.createMediaContent(message));
        }
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        return messageDiv;
    }

    // 创建媒体内容
    createMediaContent(message) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'message-media';
        
        switch (message.type) {
            case 'image':
                const img = document.createElement('img');
                img.className = 'message-image';
                img.src = `/api/media?msgid=${message.msgId || message.id}`;
                img.alt = '图片';
                img.addEventListener('click', () => {
                    this.showImageModal(img.src);
                });
                img.addEventListener('error', () => {
                    img.style.display = 'none';
                    const errorText = document.createElement('span');
                    errorText.textContent = '[图片加载失败]';
                    errorText.style.color = '#999';
                    mediaDiv.appendChild(errorText);
                });
                mediaDiv.appendChild(img);
                break;
                
            case 'audio':
                const audioDiv = document.createElement('div');
                audioDiv.className = 'message-audio';
                audioDiv.innerHTML = `
                    <i class="fas fa-volume-up"></i>
                    <span>语音消息</span>
                `;
                audioDiv.addEventListener('click', () => {
                    // 这里可以添加音频播放功能
                    window.open(`/api/media?msgid=${message.msgId || message.id}`);
                });
                mediaDiv.appendChild(audioDiv);
                break;
                
            case 'file':
                const fileDiv = document.createElement('div');
                fileDiv.className = 'message-file';
                fileDiv.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span>${message.filename || '文件'}</span>
                `;
                fileDiv.addEventListener('click', () => {
                    window.open(`/api/media?msgid=${message.msgId || message.id}`);
                });
                mediaDiv.appendChild(fileDiv);
                break;
                
            default:
                mediaDiv.textContent = message.content || `[${message.type}消息]`;
        }
        
        return mediaDiv;
    }

    // 格式化时间
    formatTime(timestamp) {
        if (!timestamp) return '';
        
        let date;
        
        // 尝试解析不同格式的时间
        if (typeof timestamp === 'string') {
            // 如果是字符串，直接尝试解析
            date = new Date(timestamp);
            
            // 如果解析失败，可能是不规范的格式，尝试其他方式
            if (isNaN(date.getTime())) {
                // 尝试作为时间戳处理（可能是字符串形式的时间戳）
                const numericTimestamp = parseInt(timestamp);
                if (!isNaN(numericTimestamp)) {
                    // 判断是秒还是毫秒（小于10位数认为是秒）
                    date = new Date(numericTimestamp < 10000000000 ? numericTimestamp * 1000 : numericTimestamp);
                }
            }
        } else if (typeof timestamp === 'number') {
            // 如果是数字，判断是秒还是毫秒
            date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
        } else {
            // 其他类型，直接尝试转换
            date = new Date(timestamp);
        }
        
        // 最终检查是否为有效日期
        if (!date || isNaN(date.getTime())) {
            console.warn('无效的时间格式:', timestamp);
            return '时间解析失败';
        }
        
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.getDate() === yesterday.getDate()) {
            return `昨天 ${date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })}`;
        }
        
        // 其他日期
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 显示图片模态框
    showImageModal(src) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        modalImage.src = src;
        modal.classList.add('show');
    }

    // 关闭图片模态框
    closeImageModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('show');
    }

    // 更新分页
    updatePagination(hasMore) {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const pageInfo = document.getElementById('pageInfo');
        
        pagination.style.display = 'flex';
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = !hasMore;
        
        pageInfo.textContent = `第 ${this.currentPage} 页`;
    }

    // 刷新数据
    refreshData() {
        this.currentPage = 1;
        this.searchChatlog();
    }

    // 导出数据
    exportData() {
        if (!this.currentData || this.currentData.length === 0) {
            this.showMessage('没有数据可导出', 'error');
            return;
        }
        
        let content = '聊天记录导出\n';
        content += '==================\n\n';
        
        this.currentData.forEach(message => {
            const time = this.formatTime(message.timestamp || message.time);
            const sender = message.sender || message.senderName || '未知';
            const messageContent = message.content || message.message || `[${message.type}消息]`;
            
            content += `${time} ${sender}:\n${messageContent}\n\n`;
        });
        
        // 创建下载链接
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatlog_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showMessage('导出成功', 'success');
    }

    // 显示错误信息
    displayError(message) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>错误：</strong> ${message}
            </div>
        `;
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
            ${message}
        `;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 设置样式和位置
        Object.assign(messageDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '2000',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease'
        });
        
        // 3秒后移除
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // AI分析相关方法
    async startAIAnalysis(groupName, analysisType) {
        try {
            // 显示加载状态
            this.showAILoading(true);
            
            // 禁用所有AI按钮
            this.setAIButtonsEnabled(false);
            
            // 获取保存的设置
            let settings = {};
            let timeRange = '2024-01-01~2025-12-31';
            let customPrompt = '';
            
            if (window.aiSettingsManager) {
                settings = window.aiSettingsManager.getSettings(analysisType);
                timeRange = window.aiSettingsManager.getTimeRangeString(analysisType);
                if (settings.groupName) {
                    groupName = settings.groupName;
                }
                if (settings.prompt) {
                    customPrompt = settings.prompt;
                }
            }
            
            // 调用AI分析API
            const response = await fetch('/api/ai-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupName: groupName,
                    analysisType: analysisType,
                    customPrompt: customPrompt,
                    timeRange: timeRange
                })
            });

            if (!response.ok) {
                throw new Error('AI分析请求失败');
            }

            const result = await response.json();
            
            if (result.success) {
                // 新窗口打开分析结果
                const analysisUrl = `/analysis/${result.historyId}`;
                window.open(analysisUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                
                this.showMessage(`分析完成！已在新窗口打开：${result.title}`, 'success');
                
                // 刷新历史记录
                this.loadAnalysisHistory();
            } else {
                throw new Error(result.error || '分析失败');
            }

        } catch (error) {
            console.error('AI分析失败:', error);
            this.showMessage('AI分析失败: ' + error.message, 'error');
        } finally {
            this.showAILoading(false);
            this.setAIButtonsEnabled(true);
        }
    }

    handleAIAnalysisProgress(data) {
        const aiStatus = document.getElementById('aiStatus');
        const loadingText = aiStatus.querySelector('.ai-loading span');

        switch (data.status) {
            case 'loading':
                loadingText.textContent = data.message;
                break;
            case 'success':
                this.showAIResult(data.result, data.title);
                break;
            case 'error':
                this.showMessage('AI分析错误: ' + data.message, 'error');
                break;
        }
    }

    showAILoading(show) {
        const aiStatus = document.getElementById('aiStatus');
        aiStatus.style.display = show ? 'block' : 'none';
    }

    setAIButtonsEnabled(enabled) {
        const aiButtons = document.querySelectorAll('.ai-btn');
        aiButtons.forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    showAIResult(htmlContent, title) {
        const modal = document.getElementById('aiResultModal');
        const iframe = document.getElementById('aiResultFrame');
        const titleElement = document.getElementById('aiResultTitle');

        titleElement.textContent = title || 'AI 分析结果';
        iframe.srcdoc = htmlContent;
        modal.classList.add('show');
    }

    closeAIResultModal() {
        const modal = document.getElementById('aiResultModal');
        modal.classList.remove('show');
    }

    toggleCustomAnalysisForm() {
        const form = document.getElementById('customAnalysisForm');
        const isVisible = form.classList.contains('show');
        
        if (isVisible) {
            form.classList.remove('show');
        } else {
            form.classList.add('show');
            // 填充群聊选择框
            this.populateCustomGroupSelect();
        }
    }

    populateCustomGroupSelect() {
        const select = document.getElementById('customGroup');
        const talkerSelect = document.getElementById('talkerSelect');
        
        // 复制主选择框的选项
        select.innerHTML = '<option value="">请选择群聊</option>';
        
        for (let i = 1; i < talkerSelect.options.length; i++) {
            const option = talkerSelect.options[i];
            if (option.textContent.includes('@chatroom') || option.textContent.includes('群')) {
                const newOption = option.cloneNode(true);
                select.appendChild(newOption);
            }
        }
    }

    async executeCustomAnalysis() {
        const groupName = document.getElementById('customGroup').value;
        const customPrompt = document.getElementById('customPrompt').value.trim();
        const customTimeRange = document.getElementById('customTimeRange').value;

        if (!groupName) {
            this.showMessage('请选择群聊', 'error');
            return;
        }

        if (!customPrompt) {
            this.showMessage('请输入分析提示词', 'error');
            return;
        }

        // 获取时间范围，默认使用昨天
        let timeRange = customTimeRange || '2025-06-15~2025-06-15'; // 昨天的日期
        
        // 如果选择了"昨天"，计算昨天的日期
        if (customTimeRange === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            timeRange = `${dateStr}~${dateStr}`;
        }

        try {
            // 显示加载状态
            this.showAILoading(true);
            this.setAIButtonsEnabled(false);

            // 调用AI分析API
            const response = await fetch('/api/ai-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupName: groupName,
                    analysisType: 'custom',
                    customPrompt: customPrompt,
                    timeRange: timeRange
                })
            });

            if (!response.ok) {
                throw new Error('自定义分析请求失败');
            }

            const result = await response.json();
            
            if (result.success) {
                // 新窗口打开分析结果
                const analysisUrl = `/analysis/${result.historyId}`;
                window.open(analysisUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                
                this.showMessage(`分析完成！已在新窗口打开：${result.title}`, 'success');
                
                // 刷新历史记录
                this.loadAnalysisHistory();
                
                // 隐藏自定义分析表单
                this.toggleCustomAnalysisForm();
            } else {
                throw new Error(result.error || '分析失败');
            }

        } catch (error) {
            console.error('自定义分析失败:', error);
            this.showMessage('自定义分析失败: ' + error.message, 'error');
        } finally {
            this.showAILoading(false);
            this.setAIButtonsEnabled(true);
        }
    }

    // 加载分析历史记录
    async loadAnalysisHistory() {
        try {
            const response = await fetch('/api/analysis-history');
            const result = await response.json();
            
            if (result.success) {
                this.displayAnalysisHistory(result.history);
            } else {
                console.error('加载历史记录失败:', result.error);
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
    }

    // 显示分析历史记录
    displayAnalysisHistory(history) {
        const historyContainer = document.getElementById('analysisHistory');
        if (!historyContainer) {
            console.warn('历史记录容器不存在');
            return;
        }

        historyContainer.innerHTML = '';

        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="no-history">暂无分析历史记录</p>';
            return;
        }

        const historyList = document.createElement('div');
        historyList.className = 'history-list';

        history.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(record.timestamp);
            const formattedDate = date.toLocaleString('zh-CN');
            
            historyItem.innerHTML = `
                <div class="history-title">${record.title}</div>
                <div class="history-meta">
                    <span class="history-date">${formattedDate}</span>
                    <span class="history-type">${this.getAnalysisTypeLabel(record.analysisType)}</span>
                    <span class="history-messages">${record.messageCount}条消息</span>
                </div>
                <div class="history-actions">
                    <button onclick="window.open('/analysis/${record.id}', '_blank')" class="view-btn">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button onclick="window.chatlogApp.deleteAnalysisHistory('${record.id}', '${record.title}')" class="delete-history-btn">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });

        historyContainer.appendChild(historyList);
    }

    // 获取分析类型标签
    getAnalysisTypeLabel(type) {
        const labels = {
            'programming': '编程分析',
            'science': '科学分析',
            'reading': '阅读分析',
            'custom': '自定义分析'
        };
        return labels[type] || '未知类型';
    }
    
    // 初始化动态分析项
    initDynamicAnalysisItems() {
        if (window.aiSettingsManager) {
            this.loadDynamicAnalysisItems();
        } else {
            // 等待AI设置管理器加载完成
            setTimeout(() => {
                this.initDynamicAnalysisItems();
            }, 100);
        }
    }
    
    // 加载动态分析项到页面
    loadDynamicAnalysisItems() {
        const container = document.getElementById('dynamicAnalysisContainer');
        if (!container || !window.aiSettingsManager) return;
        
        // 清空容器
        container.innerHTML = '';
        
        // 获取所有动态分析项
        const dynamicItems = window.aiSettingsManager.dynamicAnalysisItems;
        
        // 为每个动态分析项创建UI
        dynamicItems.forEach(item => {
            this.createDynamicAnalysisItemUI(item);
        });
    }
    
    // 创建动态分析项UI
    createDynamicAnalysisItemUI(item) {
        const container = document.getElementById('dynamicAnalysisContainer');
        if (!container) return;
        
        const itemHTML = `
            <div class="dynamic-analysis-item" data-id="${item.id}">
                <div class="ai-btn-group">
                    <button class="ai-btn" data-type="${item.id}">
                        <i class="fas fa-chart-bar"></i> 
                        <span class="analysis-title">${item.displayName || '新建分析'}</span>
                    </button>
                    <button class="ai-settings-btn" data-type="${item.id}" title="设置分析">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHTML);
        
        // 绑定新创建的按钮事件
        this.bindDynamicAnalysisEvents(item.id);
    }
    
    // 绑定动态分析项事件
    bindDynamicAnalysisEvents(itemId) {
        const analysisBtn = document.querySelector(`[data-type="${itemId}"]:not(.ai-settings-btn)`);
        const settingsBtn = document.querySelector(`[data-type="${itemId}"].ai-settings-btn`);
        
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => {
                this.executeDynamicAnalysis(itemId);
            });
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (window.aiSettingsManager) {
                    window.aiSettingsManager.openSettings(itemId);
                }
            });
        }
    }
    
    // 执行动态分析
    async executeDynamicAnalysis(itemId) {
        if (!window.aiSettingsManager) {
            alert('AI设置管理器未初始化');
            return;
        }
        
        const settings = window.aiSettingsManager.getSettings(itemId);
        if (!settings.groupName || !settings.prompt) {
            // 如果没有配置群聊或提示词，展开自定义分析表单并预填充设置
            this.toggleCustomAnalysisForm();
            
            // 预填充已有的设置
            if (settings.displayName) {
                // 可以在这里预填充一些设置到自定义分析表单
                const customPrompt = document.getElementById('customPrompt');
                if (customPrompt && settings.prompt) {
                    customPrompt.value = settings.prompt;
                }
            }
            return;
        }
        
        this.startAIAnalysis(settings.groupName, itemId);
    }
    
    // 新增分析项
    addNewAnalysisItem() {
        if (!window.aiSettingsManager) {
            alert('AI设置管理器未初始化');
            return;
        }
        
        const newItem = window.aiSettingsManager.addDynamicAnalysisItem();
        this.createDynamicAnalysisItemUI(newItem);
        
        // 立即打开设置对话框
        setTimeout(() => {
            window.aiSettingsManager.openSettings(newItem.id);
        }, 100);
    }
    
    // 移除动态分析项UI
    removeDynamicAnalysisItemUI(itemId) {
        const element = document.querySelector(`.dynamic-analysis-item[data-id="${itemId}"]`);
        if (element) {
            element.remove();
        }
    }

    // 删除分析历史记录
    async deleteAnalysisHistory(recordId, recordTitle) {
        // 二次确认对话框
        const confirmed = confirm(`确认删除分析记录吗？\n\n${recordTitle}\n\n此操作不可撤销！`);
        
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/analysis-history/${recordId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('分析记录已删除', 'success');
                // 重新加载历史记录列表
                this.loadAnalysisHistory();
            } else {
                this.showMessage('删除失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('删除分析记录失败:', error);
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }
    
    // ============ 批量分析功能 ============
    
    // 获取所有可用的分析项
    getAllAnalysisItems() {
        const analysisItems = [];
        
        // 添加默认分析项
        const defaultItems = [
            { id: 'programming', name: '编程群分析', type: 'default' },
            { id: 'science', name: '科学群分析', type: 'default' },
            { id: 'reading', name: '读者群分析', type: 'default' }
        ];
        
        // 检查每个默认分析项是否有配置和群聊选择
        defaultItems.forEach(item => {
            const settings = window.aiSettingsManager?.getSettings(item.id);
            if (settings && settings.groupName) {
                analysisItems.push({
                    id: item.id,
                    name: settings.displayName || item.name,
                    groupName: settings.groupName,
                    analysisType: item.id,
                    timeRange: window.aiSettingsManager?.getTimeRangeString(item.id) || 'yesterday',
                    customPrompt: settings.prompt || ''
                });
            }
        });
        
        // 添加动态分析项
        const dynamicItems = window.aiSettingsManager?.dynamicAnalysisItems || [];
        dynamicItems.forEach(item => {
            const settings = window.aiSettingsManager?.getSettings(item.id);
            if (settings && settings.groupName) {
                analysisItems.push({
                    id: item.id,
                    name: settings.displayName || item.name,
                    groupName: settings.groupName,
                    analysisType: 'custom',
                    timeRange: window.aiSettingsManager?.getTimeRangeString(item.id) || 'yesterday',
                    customPrompt: settings.prompt || ''
                });
            }
        });
        
        return analysisItems;
    }
    
    // 开始批量分析
    async startBatchAnalysis() {
        console.log('开始批量分析...');
        
        // 获取所有可用的分析项
        const analysisItems = this.getAllAnalysisItems();
        
        if (analysisItems.length === 0) {
            this.showMessage('没有找到可用的分析项，请先配置分析设置', 'error');
            return;
        }
        
        // 确认对话
        const confirmMessage = `即将开始批量分析，共 ${analysisItems.length} 个分析项：\n\n${analysisItems.map((item, index) => `${index + 1}. ${item.name} (${item.groupName})`).join('\n')}\n\n分析过程预计需要 ${Math.ceil(analysisItems.length * 2)} 分钟，确定要开始吗？`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 初始化批量分析状态
        this.batchAnalysisState = {
            isRunning: true,
            isCancelled: false,
            currentIndex: 0,
            totalItems: analysisItems.length,
            analysisQueue: [...analysisItems],
            results: {
                success: [],
                failed: []
            }
        };
        
        // 显示进度界面
        this.showBatchProgress();
        
        // 禁用批量分析按钮
        const batchBtn = document.getElementById('batchAnalysisBtn');
        if (batchBtn) {
            batchBtn.disabled = true;
        }
        
        // 开始执行分析队列
        await this.processBatchAnalysisQueue();
    }
    
    // 处理批量分析队列
    async processBatchAnalysisQueue() {
        const state = this.batchAnalysisState;
        
        while (state.currentIndex < state.totalItems && !state.isCancelled) {
            const currentItem = state.analysisQueue[state.currentIndex];
            
            // 更新进度显示
            this.updateBatchProgress(currentItem);
            
            try {
                console.log(`开始分析第 ${state.currentIndex + 1}/${state.totalItems} 项: ${currentItem.name}`);
                
                // 执行单个分析
                const result = await this.executeSingleAnalysis(currentItem);
                
                if (result.success) {
                    state.results.success.push({
                        ...currentItem,
                        historyId: result.historyId
                    });
                    console.log(`✅ ${currentItem.name} 分析成功`);
                } else {
                    state.results.failed.push({
                        ...currentItem,
                        error: result.error
                    });
                    console.log(`❌ ${currentItem.name} 分析失败: ${result.error}`);
                }
            } catch (error) {
                console.error(`分析 ${currentItem.name} 时发生异常:`, error);
                state.results.failed.push({
                    ...currentItem,
                    error: error.message
                });
            }
            
            state.currentIndex++;
            
            // 分析间隔2.5秒，避免API频率限制
            if (state.currentIndex < state.totalItems && !state.isCancelled) {
                console.log('等待 2.5 秒后继续下一个分析...');
                await this.sleep(2500);
            }
        }
        
        // 完成批量分析
        this.completeBatchAnalysis();
    }
    
    // 执行单个分析
    async executeSingleAnalysis(analysisItem) {
        try {
            const response = await fetch('/api/ai-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupName: analysisItem.groupName,
                    analysisType: analysisItem.analysisType,
                    customPrompt: analysisItem.customPrompt,
                    timeRange: analysisItem.timeRange
                })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 显示批量分析进度
    showBatchProgress() {
        const progressElement = document.getElementById('batchProgress');
        if (progressElement) {
            progressElement.style.display = 'block';
        }
        
        // 初始化进度
        this.updateProgressBar(0);
        this.updateProgressText('准备开始批量分析...');
    }
    
    // 更新批量分析进度
    updateBatchProgress(currentItem) {
        const state = this.batchAnalysisState;
        const progress = ((state.currentIndex) / state.totalItems) * 100;
        
        this.updateProgressBar(progress);
        this.updateProgressText(`正在分析 ${state.currentIndex + 1}/${state.totalItems}`);
        this.updateCurrentAnalysis(currentItem.name);
    }
    
    // 更新进度条
    updateProgressBar(percentage) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // 更新进度文本
    updateProgressText(text) {
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = text;
        }
    }
    
    // 更新当前分析项显示
    updateCurrentAnalysis(analysisName) {
        const currentAnalysis = document.querySelector('#currentAnalysis .analysis-name');
        if (currentAnalysis) {
            currentAnalysis.textContent = analysisName;
        }
    }
    
    // 完成批量分析
    completeBatchAnalysis() {
        const state = this.batchAnalysisState;
        
        console.log('批量分析完成:', state.results);
        
        // 更新进度为100%
        this.updateProgressBar(100);
        this.updateProgressText('批量分析完成！');
        
        // 显示结果汇总
        this.showBatchSummary();
        
        // 重新加载分析历史
        setTimeout(() => {
            this.loadAnalysisHistory();
        }, 1000);
        
        // 重置状态
        this.resetBatchAnalysisState();
    }
    
    // 显示批量分析结果汇总
    showBatchSummary() {
        const state = this.batchAnalysisState;
        const successCount = state.results.success.length;
        const failedCount = state.results.failed.length;
        const hasErrors = failedCount > 0;
        
        // 创建汇总HTML
        const summaryHtml = `
            <div class="batch-summary ${hasErrors ? 'with-errors' : ''}">
                <div class="summary-header ${hasErrors ? 'with-errors' : ''}">
                    <i class="fas ${hasErrors ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                    <span>批量分析完成</span>
                </div>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-number" style="color: #28a745;">${successCount}</span>
                        <div class="stat-label">成功</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" style="color: #dc3545;">${failedCount}</span>
                        <div class="stat-label">失败</div>
                    </div>
                </div>
                ${failedCount > 0 ? `
                    <div style="margin-bottom: 0.75rem;">
                        <strong>失败项目：</strong><br>
                        ${state.results.failed.map(item => `• ${item.name}: ${item.error}`).join('<br>')}
                    </div>
                ` : ''}
                <div class="summary-actions">
                    <button class="summary-btn" onclick="window.chatlogApp.viewBatchResults()">
                        <i class="fas fa-eye"></i> 查看结果
                    </button>
                    <button class="summary-btn secondary" onclick="window.chatlogApp.closeBatchSummary()">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
        `;
        
        // 将汇总插入到进度显示后面
        const batchProgress = document.getElementById('batchProgress');
        if (batchProgress) {
            batchProgress.insertAdjacentHTML('afterend', summaryHtml);
        }
    }
    
    // 查看批量分析结果
    viewBatchResults() {
        const state = this.batchAnalysisState;
        if (state.results.success.length > 0) {
            // 打开第一个成功的分析结果
            const firstSuccess = state.results.success[0];
            if (firstSuccess.historyId) {
                window.open(`/analysis/${firstSuccess.historyId}`, '_blank', 'width=1200,height=800');
            }
        }
        this.showMessage(`共生成 ${state.results.success.length} 个分析报告，请查看侧边栏历史记录`, 'success');
    }
    
    // 关闭批量分析汇总
    closeBatchSummary() {
        const summary = document.querySelector('.batch-summary');
        if (summary) {
            summary.remove();
        }
        this.hideBatchProgress();
    }
    
    // 取消批量分析
    cancelBatchAnalysis() {
        if (confirm('确定要取消批量分析吗？已完成的分析结果将保留。')) {
            this.batchAnalysisState.isCancelled = true;
            this.updateProgressText('正在取消...');
            this.showMessage('批量分析已取消', 'info');
            
            setTimeout(() => {
                this.resetBatchAnalysisState();
                this.hideBatchProgress();
            }, 1000);
        }
    }
    
    // 隐藏批量分析进度
    hideBatchProgress() {
        const progressElement = document.getElementById('batchProgress');
        if (progressElement) {
            progressElement.style.display = 'none';
        }
    }
    
    // 重置批量分析状态
    resetBatchAnalysisState() {
        this.batchAnalysisState = {
            isRunning: false,
            isCancelled: false,
            currentIndex: 0,
            totalItems: 0,
            analysisQueue: [],
            results: {
                success: [],
                failed: []
            }
        };
        
        // 重新启用批量分析按钮
        const batchBtn = document.getElementById('batchAnalysisBtn');
        if (batchBtn) {
            batchBtn.disabled = false;
        }
    }
    
    // 工具方法：延迟函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.chatlogApp = new ChatlogApp();
});

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 