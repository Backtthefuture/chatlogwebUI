class ChatlogApp {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 100;
        this.totalMessages = 0;
        this.apiInProgress = false;
        this.aiAnalysisInProgress = false;
        this.analysisHistory = [];
        this.currentBatchAnalysis = null;
        
        // 连接检测相关配置
        this.connectionCheckInterval = null;
        this.connectionRetryCount = 0;
        this.maxRetryCount = 3;
        this.retryDelay = 2000; // 重试延迟2秒
        this.autoCheckInterval = 60000; // 自动检测间隔60秒（减少频率）
        this.isConnecting = false;
        
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

    // 格式化本地日期为YYYY-MM-DD格式
    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    init() {
        this.bindEvents();
        this.initDatePickers();
        this.loadAnalysisHistory();
        this.initDynamicAnalysisItems();
        
        // 页面加载完成后检查连接状态和定时任务状态
        setTimeout(() => {
            this.checkStatus(true); // 显示初始检测结果
            this.loadScheduledStatus(); // 加载定时任务状态
        }, 500);
        
        // 页面卸载时停止自动检测
        window.addEventListener('beforeunload', () => {
            this.stopAutoConnectionCheck();
        });
        
        // 页面可见性变化时的处理
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // 页面变为可见时，立即检测连接状态
                this.checkStatus();
            } else {
                // 页面隐藏时，停止自动检测以节省资源
                this.stopAutoConnectionCheck();
            }
        });
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

        // 显示数量选择器 - 显示/隐藏不限制警告
        document.getElementById('limitSelect').addEventListener('change', (e) => {
            const limitWarning = document.getElementById('limitWarning');
            if (e.target.value === '') {
                limitWarning.classList.add('show');
            } else {
                limitWarning.classList.remove('show');
            }
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

        // 刷新连接按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshConnection();
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
        
        // 定时任务管理按钮
        document.getElementById('triggerScheduledBtn').addEventListener('click', () => {
            this.triggerScheduledAnalysis();
        });
        
        document.getElementById('refreshStatusBtn').addEventListener('click', () => {
            this.loadScheduledStatus();
        });
        
        // 配置定时任务按钮
        document.getElementById('configScheduledBtn').addEventListener('click', () => {
            this.openScheduledConfig();
        });
        
        document.getElementById('closeScheduledConfig').addEventListener('click', () => {
            this.closeScheduledConfig();
        });
        
        // 分析项信息图标点击事件
        document.getElementById('scheduledItemsInfo').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleItemsTooltip();
        });
        
        // 点击其他地方关闭工具提示
        document.addEventListener('click', (e) => {
            const tooltip = document.getElementById('itemsTooltip');
            const infoIcon = document.getElementById('scheduledItemsInfo');
            
            if (!tooltip.contains(e.target) && e.target !== infoIcon) {
                this.hideItemsTooltip();
            }
        });
    }

    // 初始化日期选择器
    initDatePickers() {
        const today = this.formatLocalDate(new Date());
        document.getElementById('endDate').value = today;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        document.getElementById('startDate').value = this.formatLocalDate(weekAgo);
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
            const endDateStr = this.formatLocalDate(today);
            
            let startDateStr;
            switch (value) {
                case 'today':
                    startDateStr = endDateStr;
                    break;
                case 'yesterday':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    startDateStr = this.formatLocalDate(yesterday);
                    endDate.value = startDateStr;
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    startDateStr = this.formatLocalDate(weekAgo);
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    startDateStr = this.formatLocalDate(monthAgo);
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

    // 检查服务状态（带重试机制）
    async checkStatus(showMessage = false, isRetry = false) {
        if (this.isConnecting && !isRetry) {
            return; // 避免重复检测
        }
        
        try {
            this.isConnecting = true;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 增加到20秒超时，给后端足够时间重试
            
            const response = await fetch('/api/status', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.status === 'connected') {
                this.updateConnectionStatus(true);
                this.connectionRetryCount = 0; // 成功后重置重试计数
                
                if (showMessage) {
                    let message = '连接状态检测成功';
                    if (data.responseTime) {
                        message += ` (响应时间: ${data.responseTime}ms)`;
                    }
                    if (data.attempt > 1) {
                        message += ` [重试${data.attempt}次成功]`;
                    }
                    this.showMessage(message, 'success');
                }
                
                // 启动自动检测
                this.startAutoConnectionCheck();
            } else {
                // 服务器返回了连接失败的详细信息
                this.updateConnectionStatus(false);
                
                if (showMessage && data.message) {
                    let errorDetails = data.message;
                    if (data.suggestions && data.suggestions.length > 0) {
                        errorDetails += '\n\n建议解决方案:\n' + data.suggestions.map(s => `• ${s}`).join('\n');
                    }
                    this.showMessage(errorDetails, 'error');
                }
                
                // 自动重试机制
                if (this.connectionRetryCount < this.maxRetryCount) {
                    this.connectionRetryCount++;
                    console.log(`连接失败，${this.retryDelay/1000}秒后进行第${this.connectionRetryCount}次重试...`);
                    
                    setTimeout(() => {
                        this.checkStatus(false, true);
                    }, this.retryDelay);
                    
                    if (showMessage) {
                        this.showMessage(`${data.message}，正在重试 (${this.connectionRetryCount}/${this.maxRetryCount})`, 'warning');
                    }
                } else {
                    this.connectionRetryCount = 0;
                }
            }
            
        } catch (error) {
            console.error('检查状态失败:', error);
            
            this.updateConnectionStatus(false);
            
            // 处理不同类型的错误
            let errorMessage = '连接检测失败';
            if (error.name === 'AbortError') {
                errorMessage = 'Chatlog服务响应超时 (20秒)';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = '网络连接失败或Web服务器未启动';
            } else {
                errorMessage = `连接失败: ${error.message}`;
            }
            
            // 自动重试机制
            if (this.connectionRetryCount < this.maxRetryCount) {
                this.connectionRetryCount++;
                console.log(`连接失败，${this.retryDelay/1000}秒后进行第${this.connectionRetryCount}次重试...`);
                
                setTimeout(() => {
                    this.checkStatus(false, true);
                }, this.retryDelay);
                
                if (showMessage) {
                    this.showMessage(`${errorMessage}，正在重试 (${this.connectionRetryCount}/${this.maxRetryCount})`, 'warning');
                }
            } else {
                // 重试次数耗尽
                this.connectionRetryCount = 0;
                if (showMessage) {
                    this.showMessage(`${errorMessage}，请检查相关服务是否正常运行`, 'error');
                }
            }
        } finally {
            this.isConnecting = false;
        }
    }

    // 更新连接状态显示
    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        const refreshBtn = document.getElementById('refreshBtn');
        
        // 移除所有状态类
        statusDot.classList.remove('connected', 'disconnected', 'connecting');
        statusIndicator.classList.remove('just-connected');
        refreshBtn.classList.remove('disconnected', 'connecting');
        statusText.classList.remove('retry-info');
        
        if (isConnected) {
            statusDot.classList.add('connected');
            statusText.textContent = '已连接 Chatlog 服务';
            
            // 连接成功时的闪烁效果
            statusIndicator.classList.add('just-connected');
            setTimeout(() => {
                statusIndicator.classList.remove('just-connected');
            }, 1000);
            
            // 更新按钮状态
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新连接';
        } else {
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Chatlog 服务未连接';
            refreshBtn.classList.add('disconnected');
            
            // 连接失败时，显示重试状态
            if (this.connectionRetryCount > 0 && this.connectionRetryCount <= this.maxRetryCount) {
                statusDot.classList.remove('disconnected');
                statusDot.classList.add('connecting');
                statusText.textContent = `正在重连... (${this.connectionRetryCount}/${this.maxRetryCount})`;
                statusText.classList.add('retry-info');
                refreshBtn.classList.remove('disconnected');
                refreshBtn.classList.add('connecting');
            }
        }
    }

    // 刷新连接状态（改进版）
    async refreshConnection() {
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.innerHTML;
        
        // 重置重试计数
        this.connectionRetryCount = 0;
        
        // 显示刷新中状态
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 连接中...';
        refreshBtn.disabled = true;
        
        try {
            await this.checkStatus(true); // 显示检测结果消息
        } catch (error) {
            console.error('刷新连接失败:', error);
            this.showMessage('刷新连接失败', 'error');
        } finally {
            // 恢复按钮状态
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 1000); // 延迟1秒恢复，避免按钮状态变化太快
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

    // 转换时间范围关键词为实际时间范围
    convertTimeRange(timeRange) {
        if (timeRange.includes('~')) {
            // 已经是时间范围格式，直接返回
            return timeRange;
        }
        
        const today = new Date();
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        switch (timeRange) {
            case 'today':
                const todayStr = formatDate(today);
                return `${todayStr}~${todayStr}`;
                
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = formatDate(yesterday);
                return `${yesterdayStr}~${yesterdayStr}`;
                
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return `${formatDate(weekAgo)}~${formatDate(today)}`;
                
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return `${formatDate(monthAgo)}~${formatDate(today)}`;
                
            case 'custom':
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                if (startDate && endDate) {
                    return `${startDate}~${endDate}`;
                }
                return timeRange; // 回退到原值
                
            default:
                return timeRange;
        }
    }

    // 搜索聊天记录
    async searchChatlog() {
        const timeRange = document.getElementById('timeRange').value;
        const talker = document.getElementById('talkerSelect').value;
        const limitValue = document.getElementById('limitSelect').value;
        const limit = limitValue === '' ? null : parseInt(limitValue);

        if (!talker) {
            this.showMessage('请选择聊天对象', 'error');
            return;
        }

        this.showLoading();
        
        try {
            // 构建查询参数
            const params = new URLSearchParams();
            // 注意：后端API使用 'time' 参数而不是 'timeRange'
            // 转换时间关键词为实际时间范围
            const actualTimeRange = this.convertTimeRange(timeRange);
            params.append('time', actualTimeRange);
            params.append('talker', talker);
            
            // 只有当limit不为null时才添加limit参数
            if (limit !== null) {
                params.append('limit', limit.toString());
                params.append('offset', (this.currentPage * limit).toString());
            } else {
                // 不限制时不设置offset
                params.append('offset', '0');
            }
            
            params.append('format', 'json');
            
            const response = await fetch(`/api/chatlog?${params}`);
            const data = await response.json();
            
            if (response.ok) {
                this.currentData = data;
                this.displayChatMessages(data);
                // 当不限制条数时，不显示分页控件
                if (limit !== null) {
                    this.updatePagination(data.length >= limit);
                } else {
                    this.updatePagination(false); // 不显示分页
                }
                

                
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
        let timeRange = customTimeRange;
        
        // 如果没有指定时间范围或选择了"昨天"，计算昨天的日期
        if (!customTimeRange || customTimeRange === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            // 使用本地时间而不是UTC时间
            const year = yesterday.getFullYear();
            const month = String(yesterday.getMonth() + 1).padStart(2, '0');
            const day = String(yesterday.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
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
                <div class="history-info">
                    <div class="history-title">${record.title}</div>
                    <div class="history-meta">
                        <span class="history-date">${formattedDate}</span>
                        <span class="history-messages">${record.messageCount}条消息</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button onclick="window.open('/analysis/${record.id}', '_blank')" class="view-btn">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="export-chatlog-btn" title="导出原始聊天记录" data-record-id="${record.id}" data-record-title="${record.title}">
                        <i class="fas fa-file-text"></i> 导出记录
                    </button>
                    <button class="export-analysis-btn" title="导出AI分析报告" data-record-id="${record.id}" data-record-title="${record.title}">
                        <i class="fas fa-download"></i> 导出分析
                    </button>
                    <button class="delete-history-btn" data-record-id="${record.id}" data-record-title="${record.title}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });

        historyContainer.appendChild(historyList);
        
        // 绑定导出和删除按钮事件
        this.bindHistoryButtonEvents();
    }
    
    // 绑定历史记录按钮事件
    bindHistoryButtonEvents() {
        // 导出聊天记录按钮
        document.querySelectorAll('.export-chatlog-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.recordId;
                const recordTitle = e.currentTarget.dataset.recordTitle;
                this.exportChatlogFromHistory(recordId, recordTitle);
            });
        });
        
        // 导出分析报告按钮
        document.querySelectorAll('.export-analysis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.recordId;
                const recordTitle = e.currentTarget.dataset.recordTitle;
                this.exportAnalysisFromHistory(recordId, recordTitle);
            });
        });
        
        // 删除历史记录按钮
        document.querySelectorAll('.delete-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.recordId;
                const recordTitle = e.currentTarget.dataset.recordTitle;
                this.deleteAnalysisHistory(recordId, recordTitle);
            });
        });
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
            <div class="ai-btn-group dynamic-analysis-item" data-id="${item.id}">
                <button class="ai-btn" data-type="${item.id}">
                    <i class="fas fa-chart-bar"></i> 
                    <span class="analysis-title">${item.displayName || '新建分析'}</span>
                </button>
                <button class="ai-settings-btn" data-type="${item.id}" title="设置分析">
                    <i class="fas fa-cog"></i>
                </button>
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

    // 从历史记录导出聊天记录
    async exportChatlogFromHistory(recordId, recordTitle) {
        try {
            // 获取该分析记录的原始聊天数据
            const response = await fetch(`/api/analysis-chatlog/${recordId}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '获取聊天记录失败');
            }
            
            const chatData = result.data;
            
            // 生成文本内容
            let content = `聊天记录导出\n`;
            content += `来源分析: ${recordTitle}\n`;
            content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
            content += '==================\n\n';
            
            chatData.forEach(message => {
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
            a.download = `chatlog_${recordTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_')}_${this.formatLocalDate(new Date())}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showMessage('聊天记录导出成功', 'success');
            
        } catch (error) {
            console.error('导出聊天记录失败:', error);
            this.showMessage('导出聊天记录失败: ' + error.message, 'error');
        }
    }

    // 从历史记录导出AI分析报告
    async exportAnalysisFromHistory(recordId, recordTitle) {
        try {
            // 获取分析报告的HTML内容
            const response = await fetch(`/api/analysis-content/${recordId}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '获取分析内容失败');
            }
            
            const htmlContent = result.content;
            
            // 创建下载链接
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_${recordTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_')}_${this.formatLocalDate(new Date())}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showMessage('AI分析报告导出成功', 'success');
            
        } catch (error) {
            console.error('导出分析报告失败:', error);
            this.showMessage('导出分析报告失败: ' + error.message, 'error');
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
    
    // ============ 定时任务管理功能 ============
    
    // 加载定时任务状态
    async loadScheduledStatus() {
        console.log('🔍 开始加载定时任务状态...');
        try {
            const response = await fetch('/api/scheduled-analysis-status');
            console.log('📡 API响应状态:', response.status);
            
            const data = await response.json();
            console.log('📊 API响应数据:', data);
            
            if (data.success) {
                console.log('✅ 定时任务状态加载成功');
                this.displayScheduledStatus(data);
            } else {
                console.error('❌ 获取定时任务状态失败:', data.error);
                this.showScheduledError('获取定时任务状态失败');
            }
        } catch (error) {
            console.error('❌ 加载定时任务状态失败:', error);
            this.showScheduledError('加载定时任务状态失败');
        }
    }
    
    // 显示定时任务状态
    displayScheduledStatus(data) {
        // 更新状态显示
        const enabledElement = document.getElementById('scheduledEnabled');
        const timeElement = document.getElementById('scheduledTime');
        const countElement = document.getElementById('scheduledItemCount');
        
        if (data.enabled) {
            enabledElement.textContent = '✅ 已启用';
            enabledElement.className = 'status-value enabled';
        } else {
            enabledElement.textContent = '❌ 未启用';
            enabledElement.className = 'status-value disabled';
        }
        
        // 显示人类可读的时间格式，并添加技术格式作为提示
        const displayTime = data.humanReadableTime || data.cronTime || '-';
        timeElement.textContent = displayTime;
        
        // 如果有技术格式，添加为提示
        if (data.humanReadableTime && data.cronTime) {
            timeElement.title = `Cron表达式: ${data.cronTime}`;
            timeElement.style.cursor = 'help';
        }
        
        countElement.textContent = `${data.analysisItems.length} 个`;
        
        // 更新分析项列表
        this.displayScheduledItems(data.analysisItems);
        
        // 更新按钮状态
        const triggerBtn = document.getElementById('triggerScheduledBtn');
        if (data.analysisItems.length > 0) {
            triggerBtn.disabled = false;
        } else {
            triggerBtn.disabled = true;
        }
    }
    
    // 显示分析项列表（工具提示形式）
    displayScheduledItems(items) {
        const tooltipContent = document.getElementById('tooltipContent');
        
        if (items.length === 0) {
            tooltipContent.innerHTML = '<p class="loading-items">暂无配置的分析项<br><small>请先在上方配置AI分析设置</small></p>';
            return;
        }
        
        const itemsHTML = items.map(item => `
            <div class="analysis-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-group">群聊: ${item.groupName}</div>
                </div>
            </div>
        `).join('');
        
        tooltipContent.innerHTML = itemsHTML;
    }
    
    // 手动触发定时分析
    async triggerScheduledAnalysis() {
        const triggerBtn = document.getElementById('triggerScheduledBtn');
        
        if (!confirm('确定要手动触发定时分析吗？这将执行所有配置的分析项。')) {
            return;
        }
        
        try {
            // 禁用按钮并显示加载状态
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 执行中...';
            
            const response = await fetch('/api/trigger-scheduled-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('定时分析已开始执行，请查看服务器日志获取进度', 'success');
                
                // 3秒后刷新历史记录
                setTimeout(() => {
                    this.loadAnalysisHistory();
                }, 3000);
            } else {
                this.showMessage('触发定时分析失败: ' + data.error, 'error');
            }
            
        } catch (error) {
            console.error('触发定时分析失败:', error);
            this.showMessage('触发定时分析失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            setTimeout(() => {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = '<i class="fas fa-play"></i> 手动触发分析';
            }, 2000);
        }
    }
    
    // 显示定时任务错误
    showScheduledError(message) {
        const enabledElement = document.getElementById('scheduledEnabled');
        const timeElement = document.getElementById('scheduledTime');
        const countElement = document.getElementById('scheduledItemCount');
        const tooltipContent = document.getElementById('tooltipContent');
        
        enabledElement.textContent = '❌ 检查失败';
        enabledElement.className = 'status-value disabled';
        timeElement.textContent = '-';
        countElement.textContent = '-';
        tooltipContent.innerHTML = `<p class="loading-items">❌ ${message}</p>`;
        
        // 禁用触发按钮
        const triggerBtn = document.getElementById('triggerScheduledBtn');
        triggerBtn.disabled = true;
    }
    
    // ============ 定时任务配置界面功能 ============
    
    // 打开配置模态框
    async openScheduledConfig() {
        const modal = document.getElementById('scheduledConfigModal');
        modal.classList.add('show');
        
        // 先同步分析项配置到服务器
        await this.syncAnalysisConfigToServer();
        
        // 初始化配置界面
        this.initScheduledConfig();
        
        // 绑定配置界面事件
        this.bindScheduledConfigEvents();
    }
    
    // 关闭配置模态框
    closeScheduledConfig() {
        const modal = document.getElementById('scheduledConfigModal');
        modal.classList.remove('show');
    }
    
    // 初始化配置界面
    async initScheduledConfig() {
        try {
            // 加载当前配置
            await this.loadCurrentScheduledConfig();
            
            // 加载分析项列表
            await this.loadAnalysisItemsForConfig();
            
            // 更新Cron预览
            this.updateCronPreview();
            
        } catch (error) {
            console.error('初始化配置界面失败:', error);
            this.showMessage('初始化配置界面失败: ' + error.message, 'error');
        }
    }
    
    // 绑定配置界面事件
    bindScheduledConfigEvents() {
        // 避免重复绑定
        if (this.configEventsBound) return;
        this.configEventsBound = true;
        
        // 时间配置标签页切换
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTimeConfigTab(e.target.dataset.tab);
            });
        });
        
        // 简单模式配置变化
        document.getElementById('simpleTimeType').addEventListener('change', () => {
            this.updateSimpleTimeConfig();
            this.updateCronPreview();
        });
        
        document.getElementById('simpleTime').addEventListener('change', () => {
            this.updateCronPreview();
        });
        
        document.getElementById('weeklyDay').addEventListener('change', () => {
            this.updateCronPreview();
        });
        
        // 高级模式Cron表达式验证
        document.getElementById('cronExpression').addEventListener('input', () => {
            this.validateCronExpression();
        });
        
        // Cron示例按钮
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cronExpr = e.target.dataset.cron;
                document.getElementById('cronExpression').value = cronExpr;
                this.validateCronExpression();
            });
        });
        
        // 刷新分析项
        document.getElementById('refreshAnalysisItems').addEventListener('click', () => {
            this.loadAnalysisItemsForConfig();
        });
        
        // 表单提交
        document.getElementById('scheduledConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveScheduledConfig();
        });
        
        // 测试配置
        document.getElementById('testScheduledConfig').addEventListener('click', () => {
            this.testScheduledConfig();
        });
        
        // 重置配置
        document.getElementById('resetScheduledConfig').addEventListener('click', () => {
            this.resetScheduledConfig();
        });
        
        // 模态框外部点击关闭
        document.getElementById('scheduledConfigModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeScheduledConfig();
            }
        });
    }
    
    // 加载当前配置
    async loadCurrentScheduledConfig() {
        try {
            const response = await fetch('/api/scheduled-analysis-status');
            const data = await response.json();
            
            if (data.success) {
                // 设置启用状态
                document.getElementById('enableScheduled').checked = data.enabled;
                
                // 设置Cron表达式
                document.getElementById('cronExpression').value = data.cronTime || '0 0 8 * * *';
                
                // 尝试解析为简单模式
                this.parseCronToSimpleMode(data.cronTime || '0 0 8 * * *');
                
                // 验证Cron表达式
                this.validateCronExpression();
            }
        } catch (error) {
            console.error('加载当前配置失败:', error);
        }
    }
    
    // 加载分析项列表用于配置
    async loadAnalysisItemsForConfig() {
        const container = document.getElementById('analysisItemsConfig');
        container.innerHTML = '<div class="loading-config">正在加载分析项...</div>';
        
        try {
            const response = await fetch('/api/scheduled-analysis-status');
            const data = await response.json();
            
            if (data.success) {
                this.displayAnalysisItemsForConfig(data.analysisItems);
            } else {
                container.innerHTML = '<div class="loading-config">❌ 加载失败</div>';
            }
        } catch (error) {
            console.error('加载分析项失败:', error);
            container.innerHTML = '<div class="loading-config">❌ 加载失败</div>';
        }
    }
    
    // 显示分析项配置列表
    displayAnalysisItemsForConfig(items) {
        const container = document.getElementById('analysisItemsConfig');
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="loading-config">
                    暂无配置的分析项<br>
                    <small>请先在上方"AI分析"区域配置分析项</small>
                </div>
            `;
            return;
        }
        
        const itemsHTML = items.map(item => {
            const isReady = item.groupName && item.name;
            return `
                <div class="config-analysis-item">
                    <div class="config-item-info">
                        <div class="config-item-name">${item.name}</div>
                        <div class="config-item-group">群聊: ${item.groupName || '未配置'}</div>
                    </div>
                    <div class="config-item-status ${isReady ? 'ready' : 'incomplete'}">
                        ${isReady ? '✅ 已配置' : '⚠️ 未完成'}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = itemsHTML;
    }
    
    // 切换时间配置标签页
    switchTimeConfigTab(tabName) {
        // 更新标签页状态
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 显示对应面板
        document.getElementById('simpleTimePanel').style.display = tabName === 'simple' ? 'block' : 'none';
        document.getElementById('advancedTimePanel').style.display = tabName === 'advanced' ? 'block' : 'none';
    }
    
    // 更新简单模式配置
    updateSimpleTimeConfig() {
        const timeType = document.getElementById('simpleTimeType').value;
        const weeklyGroup = document.getElementById('weeklyDayGroup');
        
        if (timeType === 'weekly') {
            weeklyGroup.style.display = 'block';
        } else {
            weeklyGroup.style.display = 'none';
        }
    }
    
    // 将Cron表达式转换为人类可读格式
    cronToHumanReadable(cronExpression) {
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

    // 更新Cron预览
    updateCronPreview() {
        const activeTab = document.querySelector('.time-tab.active').dataset.tab;
        let cronExpr = '';
        
        if (activeTab === 'simple') {
            cronExpr = this.generateCronFromSimpleMode();
        } else {
            cronExpr = document.getElementById('cronExpression').value;
        }
        
        // 显示人类可读格式和技术格式
        const humanReadable = this.cronToHumanReadable(cronExpr);
        const previewElement = document.getElementById('cronPreview');
        
        if (humanReadable !== cronExpr) {
            previewElement.innerHTML = `
                <div class="cron-preview-readable">${humanReadable}</div>
                <div class="cron-preview-technical" title="技术格式">${cronExpr}</div>
            `;
        } else {
            previewElement.textContent = cronExpr;
        }
        
        // 同步到高级模式
        if (activeTab === 'simple') {
            document.getElementById('cronExpression').value = cronExpr;
        }
    }
    
    // 从简单模式生成Cron表达式
    generateCronFromSimpleMode() {
        const timeType = document.getElementById('simpleTimeType').value;
        const time = document.getElementById('simpleTime').value;
        const weeklyDay = document.getElementById('weeklyDay').value;
        
        if (!time) return '0 0 8 * * *';
        
        const [hour, minute] = time.split(':');
        
        switch (timeType) {
            case 'daily':
                return `0 ${minute} ${hour} * * *`;
            case 'weekdays':
                return `0 ${minute} ${hour} * * 1-5`;
            case 'weekends':
                return `0 ${minute} ${hour} * * 0,6`;
            case 'weekly':
                return `0 ${minute} ${hour} * * ${weeklyDay}`;
            default:
                return `0 ${minute} ${hour} * * *`;
        }
    }
    
    // 解析Cron表达式到简单模式
    parseCronToSimpleMode(cronExpr) {
        try {
            const parts = cronExpr.trim().split(/\s+/);
            if (parts.length !== 6) return;
            
            const [sec, min, hour, day, month, week] = parts;
            
            // 设置时间
            document.getElementById('simpleTime').value = 
                `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
            
            // 判断类型
            if (week === '*') {
                document.getElementById('simpleTimeType').value = 'daily';
            } else if (week === '1-5') {
                document.getElementById('simpleTimeType').value = 'weekdays';
            } else if (week === '0,6') {
                document.getElementById('simpleTimeType').value = 'weekends';
            } else if (/^\d$/.test(week)) {
                document.getElementById('simpleTimeType').value = 'weekly';
                document.getElementById('weeklyDay').value = week;
            }
            
            this.updateSimpleTimeConfig();
        } catch (error) {
            console.error('解析Cron表达式失败:', error);
        }
    }
    
    // 验证Cron表达式
    validateCronExpression() {
        const cronExpr = document.getElementById('cronExpression').value;
        const validation = document.getElementById('cronValidation');
        
        if (!cronExpr.trim()) {
            validation.textContent = '';
            validation.className = 'validation-message';
            return false;
        }
        
        // 简单验证：检查格式
        const parts = cronExpr.trim().split(/\s+/);
        if (parts.length !== 6) {
            validation.textContent = '❌ Cron表达式应包含6个部分（秒 分 时 日 月 星期）';
            validation.className = 'validation-message invalid';
            return false;
        }
        
        // 检查各部分的基本格式
        const patterns = [
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 秒
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 分
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 时
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 日
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 月
            /^(\*|\d+(-\d+)?|\d+(,\d+)*|\*\/\d+)$/, // 星期
        ];
        
        for (let i = 0; i < parts.length; i++) {
            if (!patterns[i].test(parts[i])) {
                validation.textContent = `❌ 第${i + 1}部分格式错误`;
                validation.className = 'validation-message invalid';
                return false;
            }
        }
        
        validation.textContent = '✅ Cron表达式格式正确';
        validation.className = 'validation-message valid';
        return true;
    }
    
    // 保存配置
    async saveScheduledConfig() {
        try {
            // 首先保存分析项配置到服务器
            await this.syncAnalysisConfigToServer();
            
            const formData = new FormData(document.getElementById('scheduledConfigForm'));
            const config = {
                enabled: document.getElementById('enableScheduled').checked,
                cronTime: document.getElementById('cronExpression').value,
                analysisTimeRange: formData.get('analysisTimeRange'),
                analysisInterval: parseInt(formData.get('analysisInterval')),
                skipEmptyData: document.getElementById('skipEmptyData').checked,
                enableNotification: document.getElementById('enableNotification').checked
            };
            
            // 验证配置
            if (config.enabled && !this.validateCronExpression()) {
                this.showMessage('请输入有效的Cron表达式', 'error');
                return;
            }
            
            // 发送保存请求
            const response = await fetch('/api/save-scheduled-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('配置保存成功！请重启服务使配置生效', 'success');
                this.closeScheduledConfig();
                
                // 刷新状态显示
                setTimeout(() => {
                    this.loadScheduledStatus();
                }, 1000);
            } else {
                this.showMessage('保存配置失败: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showMessage('保存配置失败: ' + error.message, 'error');
        }
    }
    
    // 同步分析项配置到服务器
    async syncAnalysisConfigToServer() {
        try {
            // 获取当前的分析项配置
            const analysisConfig = {
                dynamicAnalysisItems: window.aiSettingsManager?.dynamicAnalysisItems || []
            };
            
            // 添加所有配置的分析项设置
            const allItems = this.getAllAnalysisItems();
            allItems.forEach(item => {
                const settings = window.aiSettingsManager?.getSettings(item.id);
                if (settings && settings.groupName) {
                    analysisConfig[item.id] = settings;
                }
            });
            
            // 发送到服务器
            const response = await fetch('/api/save-analysis-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ analysisConfig })
            });
            
            const result = await response.json();
            if (!result.success) {
                console.error('同步分析项配置失败:', result.error);
            } else {
                console.log('✅ 分析项配置已同步到服务器');
            }
            
        } catch (error) {
            console.error('同步分析项配置失败:', error);
        }
    }
    
    // 测试配置
    async testScheduledConfig() {
        const testBtn = document.getElementById('testScheduledConfig');
        const originalText = testBtn.innerHTML;
        
        try {
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
            
            // 验证Cron表达式
            if (!this.validateCronExpression()) {
                this.showMessage('请输入有效的Cron表达式', 'error');
                return;
            }
            
            const cronExpr = document.getElementById('cronExpression').value;
            
            // 发送测试请求
            const response = await fetch('/api/test-cron-expression', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cronExpression: cronExpr })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`测试成功！下次执行时间: ${result.nextRun}`, 'success');
            } else {
                this.showMessage('测试失败: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('测试配置失败:', error);
            this.showMessage('测试配置失败: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = originalText;
        }
    }
    
    // 重置配置
    resetScheduledConfig() {
        if (!confirm('确定要重置所有配置吗？')) {
            return;
        }
        
        // 重置为默认值
        document.getElementById('enableScheduled').checked = false;
        document.getElementById('simpleTimeType').value = 'daily';
        document.getElementById('simpleTime').value = '08:00';
        document.getElementById('weeklyDay').value = '1';
        document.getElementById('cronExpression').value = '0 8 * * *';
        document.getElementById('analysisTimeRange').value = 'yesterday';
        document.getElementById('analysisInterval').value = '3';
        document.getElementById('skipEmptyData').checked = true;
        document.getElementById('enableNotification').checked = false;
        
        // 更新界面
        this.updateSimpleTimeConfig();
        this.updateCronPreview();
        this.validateCronExpression();
        
        this.showMessage('配置已重置为默认值', 'info');
    }

    // 启动自动连接检测
    startAutoConnectionCheck() {
        // 清除现有的定时器
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
        
        // 设置新的定时器
        this.connectionCheckInterval = setInterval(() => {
            this.checkStatus(); // 静默检测，不显示消息
        }, this.autoCheckInterval);
        
        console.log(`🔄 自动连接检测已启动，间隔: ${this.autoCheckInterval/1000}秒`);
    }
    
    // 停止自动连接检测
    stopAutoConnectionCheck() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
            console.log('⏹️ 自动连接检测已停止');
        }
    }
    
    // ============ 工具提示管理 ============
    
    // 切换分析项工具提示显示状态
    toggleItemsTooltip() {
        const tooltip = document.getElementById('itemsTooltip');
        
        if (tooltip.classList.contains('show')) {
            this.hideItemsTooltip();
        } else {
            this.showItemsTooltip();
        }
    }
    
    // 显示分析项工具提示
    showItemsTooltip() {
        const tooltip = document.getElementById('itemsTooltip');
        tooltip.classList.add('show');
    }
    
    // 隐藏分析项工具提示
    hideItemsTooltip() {
        const tooltip = document.getElementById('itemsTooltip');
        tooltip.classList.remove('show');
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