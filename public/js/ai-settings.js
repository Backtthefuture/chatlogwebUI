// AI设置管理类
class AISettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.defaultSettings = {
            programming: {
                timeRange: 'yesterday', // 改为昨天
                groupName: 'AI 编程互助会 07 群',
                prompt: this.getDefaultPrompt('programming'),
                displayName: '编程群分析'
            },
            science: {
                timeRange: 'yesterday',
                groupName: '小朋友学科学',
                prompt: this.getDefaultPrompt('science'),
                displayName: '科学群分析'
            },
            reading: {
                timeRange: 'yesterday',
                groupName: '松节油读者群',
                prompt: this.getDefaultPrompt('reading'),
                displayName: '读者群分析'
            },
            custom: {
                timeRange: 'yesterday',
                groupName: '',
                prompt: '',
                displayName: '自定义分析'
            }
        };
        
        // 动态分析项管理
        this.dynamicAnalysisItems = this.loadDynamicItems();
        this.currentEditingType = null;
        this.bindEvents();
        
        // 初始化完成后，更新所有按钮的显示名称
        setTimeout(() => {
            this.initializeDisplayNames();
        }, 100);
        
        console.log('AI设置管理器初始化完成');
    }
    
    // 初始化所有按钮的显示名称
    initializeDisplayNames() {
        // 更新默认分析项
        Object.keys(this.defaultSettings).forEach(type => {
            const settings = this.getSettings(type);
            if (settings.displayName) {
                this.updateDisplayName(type, settings.displayName);
            }
        });
        
        // 更新动态分析项
        this.dynamicAnalysisItems.forEach(item => {
            const settings = this.getSettings(item.id);
            if (settings.displayName) {
                this.updateDisplayName(item.id, settings.displayName);
            }
        });
    }

    // 获取默认提示词
    getDefaultPrompt(type) {
        const prompts = {
            programming: `请基于以上编程技术群聊数据，生成一个完整的HTML可视化分析页面，包含：
1. 讨论话题分布（技术栈、框架、问题类型等）
2. 活跃用户贡献度分析
3. 时间活跃度热力图
4. 技术关键词词云
5. 问答互动质量分析

要求：
- 生成完整的HTML页面，包含CSS和JavaScript
- 使用Chart.js或类似库创建图表
- 页面美观，响应式设计
- 包含具体的数据分析和洞察`,

            science: `请基于以上科学学习群聊数据，生成一个完整的HTML可视化分析页面，包含：
1. 学科分布分析
2. 学习讨论热点话题
3. 知识分享频率统计
4. 互动模式分析
5. 学习活跃时间分析

要求：
- 生成完整的HTML页面，包含CSS和JavaScript
- 使用数据可视化库创建图表
- 教育主题的配色方案
- 包含学习效果评估`,

            reading: `请基于以上读者群聊数据，生成一个完整的HTML可视化分析页面，包含：
1. 图书类型和作者分布
2. 读书讨论热度分析
3. 读者互动网络图
4. 阅读推荐统计
5. 读书心得分享频次

要求：
- 生成完整的HTML页面，包含CSS和JavaScript
- 书香主题的设计风格
- 使用合适的图表展示阅读数据
- 包含阅读趋势分析`
        };
        return prompts[type] || '';
    }

    // 绑定事件监听器
    bindEvents() {
        console.log('绑定AI设置事件监听器');
        
        // 设置按钮点击事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ai-settings-btn')) {
                const type = e.target.closest('.ai-settings-btn').dataset.type;
                console.log('点击设置按钮:', type);
                this.openSettings(type);
            }
        });

        // 等待DOM加载完成后绑定模态框事件
        this.bindModalEvents();
    }

    // 绑定模态框相关事件
    bindModalEvents() {
        // 使用延迟绑定确保DOM元素存在
        setTimeout(() => {
            const modal = document.getElementById('aiSettingsModal');
            const closeBtn = document.getElementById('closeAiSettings');
            const timeRange = document.getElementById('settingsTimeRange');
            const saveBtn = document.getElementById('saveSettingsBtn');
            const resetBtn = document.getElementById('resetSettingsBtn');
            const deleteBtn = document.getElementById('deleteItemBtn');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeSettings();
                });
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        this.closeSettings();
                    }
                });
            }

            if (timeRange) {
                timeRange.addEventListener('change', (e) => {
                    this.handleTimeRangeChange(e.target.value);
                });
            }

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveCurrentSettings();
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetToDefault();
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteCurrentItem();
                });
            }
        }, 100);
    }

    // 获取指定类型的设置
    getSettings(type) {
        // 优先从保存的设置中获取
        const savedSettings = this.settings[type];
        
        // 如果是默认类型，合并默认设置
        if (this.defaultSettings[type]) {
            return { ...this.defaultSettings[type], ...savedSettings };
        }
        
        // 如果是动态分析项，从动态分析项数组中获取
        if (type.startsWith('dynamic_')) {
            const dynamicItem = this.dynamicAnalysisItems.find(item => item.id === type);
            if (dynamicItem) {
                return { ...dynamicItem, ...savedSettings };
            }
        }
        
        return savedSettings || {};
    }

    // 获取时间范围字符串
    getTimeRangeString(type) {
        const settings = this.getSettings(type);
        const timeRange = settings.timeRange;
        
        if (timeRange === 'custom' && settings.startDate && settings.endDate) {
            return `${settings.startDate}~${settings.endDate}`;
        }
        
        // 如果已经是时间范围格式，直接返回
        if (timeRange && timeRange.includes('~')) {
            return timeRange;
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        switch (timeRange) {
            case 'today':
                return today.toISOString().split('T')[0];
            case 'yesterday':
                return yesterday.toISOString().split('T')[0];
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return `${weekAgo.toISOString().split('T')[0]}~${today.toISOString().split('T')[0]}`;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setDate(monthAgo.getDate() - 30);
                return `${monthAgo.toISOString().split('T')[0]}~${today.toISOString().split('T')[0]}`;
            default:
                // 默认返回昨天
                return yesterday.toISOString().split('T')[0];
        }
    }

    // 从本地存储加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('aiAnalysisSettings');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('加载AI设置失败:', error);
            return {};
        }
    }

    // 保存设置到本地存储
    saveSettings() {
        try {
            localStorage.setItem('aiAnalysisSettings', JSON.stringify(this.settings));
            console.log('AI设置已保存');
        } catch (error) {
            console.error('保存AI设置失败:', error);
        }
    }

    // 加载动态分析项
    loadDynamicItems() {
        try {
            const saved = localStorage.getItem('dynamicAnalysisItems');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('加载动态分析项失败:', error);
            return [];
        }
    }

    // 保存动态分析项
    saveDynamicItems() {
        try {
            localStorage.setItem('dynamicAnalysisItems', JSON.stringify(this.dynamicAnalysisItems));
            console.log('动态分析项已保存');
        } catch (error) {
            console.error('保存动态分析项失败:', error);
        }
    }

    // 新增动态分析项
    addDynamicAnalysisItem() {
        const newId = 'dynamic_' + Date.now();
        const newItem = {
            id: newId,
            displayName: '新建分析',
            timeRange: 'yesterday',
            groupName: '',
            prompt: ''
        };
        
        this.dynamicAnalysisItems.push(newItem);
        this.saveDynamicItems();
        
        // 保存设置
        this.settings[newId] = { ...newItem };
        this.saveSettings();
        
        return newItem;
    }

    // 删除动态分析项
    removeDynamicAnalysisItem(id) {
        this.dynamicAnalysisItems = this.dynamicAnalysisItems.filter(item => item.id !== id);
        this.saveDynamicItems();
        
        // 删除设置
        delete this.settings[id];
        this.saveSettings();
    }

    // 获取所有分析项（包括默认和动态）
    getAllAnalysisItems() {
        const defaultItems = Object.keys(this.defaultSettings).map(type => ({
            id: type,
            type: 'default',
            ...this.getSettings(type)
        }));
        
        const dynamicItems = this.dynamicAnalysisItems.map(item => ({
            ...item,
            type: 'dynamic',
            ...this.getSettings(item.id)
        }));
        
        return [...defaultItems, ...dynamicItems];
    }

    // 创建设置模态框HTML（如果不存在）
    createModalIfNotExists() {
        if (document.getElementById('aiSettingsModal')) {
            return; // 已存在，不需要创建
        }

        const modalHTML = `
        <div id="aiSettingsModal" class="ai-settings-modal">
            <div class="ai-settings-content">
                <div class="ai-settings-header">
                    <h3 id="settingsModalTitle">AI分析设置</h3>
                    <button id="closeAiSettings" class="ai-settings-close">&times;</button>
                </div>
                <div class="ai-settings-body">
                    <div class="settings-group">
                        <label for="settingsDisplayName">显示名称：</label>
                        <input type="text" id="settingsDisplayName" placeholder="请输入显示在首页的名称">
                    </div>
                    <div class="settings-group">
                        <label for="settingsTimeRange">时间范围：</label>
                        <select id="settingsTimeRange">
                            <option value="yesterday">昨天</option>
                            <option value="today">今天</option>
                            <option value="week">最近一周</option>
                            <option value="month">最近一月</option>
                            <option value="custom">自定义</option>
                        </select>
                    </div>
                    <div class="settings-group custom-date-range" id="customDateGroup" style="display: none;">
                        <div class="date-inputs">
                            <div>
                                <label for="settingsStartDate">开始日期：</label>
                                <input type="date" id="settingsStartDate">
                            </div>
                            <div>
                                <label for="settingsEndDate">结束日期：</label>
                                <input type="date" id="settingsEndDate">
                            </div>
                        </div>
                    </div>
                    <div class="settings-group">
                        <label for="settingsGroupName">选择群聊：</label>
                        <select id="settingsGroupName">
                            <option value="">请选择群聊</option>
                        </select>
                    </div>
                    <div class="settings-group">
                        <label for="settingsPrompt">自定义提示词：</label>
                        <textarea id="settingsPrompt" rows="8" placeholder="请输入自定义提示词"></textarea>
                    </div>
                    <div class="settings-actions">
                        <button id="deleteItemBtn" class="delete-item-btn" style="display: none;">
                            <i class="fas fa-trash"></i> 删除此项
                        </button>
                        <button id="resetSettingsBtn" class="reset-settings-btn">
                            <i class="fas fa-undo"></i> 恢复默认
                        </button>
                        <button id="saveSettingsBtn" class="save-settings-btn">
                            <i class="fas fa-save"></i> 保存设置
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindModalEvents();
    }

    // 加载群聊列表
    async loadChatrooms() {
        try {
            const response = await fetch('/api/chatrooms');
            const data = await response.json();
            
            const groupSelect = document.getElementById('settingsGroupName');
            if (groupSelect && response.ok) {
                // 清空现有选项
                groupSelect.innerHTML = '<option value="">请选择群聊</option>';
                
                // 添加群聊选项
                data.forEach(chatroom => {
                    const option = document.createElement('option');
                    option.value = chatroom.displayName;
                    option.textContent = `${chatroom.displayName} (${chatroom.userCount}人)`;
                    groupSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载群聊列表失败:', error);
        }
    }

    // 打开设置对话框
    openSettings(type) {
        console.log('打开设置对话框:', type);
        this.currentEditingType = type;
        this.createModalIfNotExists();
        
        const modal = document.getElementById('aiSettingsModal');
        const title = document.getElementById('settingsModalTitle');
        const displayName = document.getElementById('settingsDisplayName');
        const timeRange = document.getElementById('settingsTimeRange');
        const groupName = document.getElementById('settingsGroupName');
        const prompt = document.getElementById('settingsPrompt');
        const deleteBtn = document.getElementById('deleteItemBtn');
        
        if (!modal) {
            console.error('设置模态框不存在');
            return;
        }

        // 设置标题
        const titles = {
            programming: 'AI编程群分析设置',
            science: 'AI科学群分析设置',
            reading: 'AI读者群分析设置',
            custom: 'AI自定义分析设置'
        };
        if (title) title.textContent = titles[type] || 'AI分析设置';

        // 判断是否为动态分析项，决定是否显示删除按钮
        const isDynamic = type.startsWith('dynamic_');
        if (deleteBtn) {
            deleteBtn.style.display = isDynamic ? 'inline-block' : 'none';
        }

        // 加载群聊列表
        this.loadChatrooms();

        // 填充当前设置
        const settings = this.getSettings(type);
        if (displayName) displayName.value = settings.displayName || '';
        if (timeRange) timeRange.value = settings.timeRange || 'yesterday';
        if (groupName) {
            // 延迟设置值，等待群聊列表加载完成
            setTimeout(() => {
                groupName.value = settings.groupName || '';
            }, 500);
        }
        if (prompt) prompt.value = settings.prompt || '';

        // 处理自定义日期显示
        this.handleTimeRangeChange(settings.timeRange);

        modal.classList.add('show');
    }

    // 关闭设置对话框
    closeSettings() {
        const modal = document.getElementById('aiSettingsModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentEditingType = null;
    }

    // 处理时间范围变化
    handleTimeRangeChange(value) {
        const customDateGroup = document.getElementById('customDateGroup');
        const startDate = document.getElementById('settingsStartDate');
        const endDate = document.getElementById('settingsEndDate');
        
        if (customDateGroup) {
            if (value === 'custom') {
                customDateGroup.style.display = 'block';
                // 设置默认的自定义日期
                if (startDate && endDate) {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    startDate.value = weekAgo.toISOString().split('T')[0];
                    endDate.value = today.toISOString().split('T')[0];
                }
            } else {
                customDateGroup.style.display = 'none';
            }
        }
    }

    // 保存当前设置
    saveCurrentSettings() {
        if (!this.currentEditingType) return;

        const displayName = document.getElementById('settingsDisplayName')?.value;
        const timeRange = document.getElementById('settingsTimeRange')?.value;
        const groupName = document.getElementById('settingsGroupName')?.value;
        const prompt = document.getElementById('settingsPrompt')?.value;
        const startDate = document.getElementById('settingsStartDate')?.value;
        const endDate = document.getElementById('settingsEndDate')?.value;

        const newSettings = {
            displayName: displayName || '',
            timeRange: timeRange || 'week',
            groupName: groupName || '',
            prompt: prompt || ''
        };

        // 如果是自定义时间，保存日期
        if (timeRange === 'custom' && startDate && endDate) {
            newSettings.startDate = startDate;
            newSettings.endDate = endDate;
        }

        this.settings[this.currentEditingType] = newSettings;
        this.saveSettings();
        
        // 如果是动态分析项，更新动态分析项数组
        if (this.currentEditingType.startsWith('dynamic_')) {
            const dynamicItem = this.dynamicAnalysisItems.find(item => item.id === this.currentEditingType);
            if (dynamicItem) {
                dynamicItem.displayName = newSettings.displayName;
                dynamicItem.timeRange = newSettings.timeRange;
                dynamicItem.groupName = newSettings.groupName;
                dynamicItem.prompt = newSettings.prompt;
                this.saveDynamicItems();
            }
        }
        
        // 更新首页显示
        this.updateDisplayName(this.currentEditingType, newSettings.displayName);
        
        console.log('设置已保存:', this.currentEditingType, newSettings);
        alert('设置已保存');
        this.closeSettings();
    }
    
    // 删除当前分析项
    deleteCurrentItem() {
        if (!this.currentEditingType || !this.currentEditingType.startsWith('dynamic_')) {
            alert('只能删除自定义添加的分析项');
            return;
        }
        
        if (confirm('确定要删除这个分析项吗？此操作不可恢复。')) {
            this.removeDynamicAnalysisItem(this.currentEditingType);
            
            // 从页面中移除对应的UI元素
            this.removeAnalysisItemFromUI(this.currentEditingType);
            
            this.closeSettings();
        }
    }
    
    // 更新首页显示名称
    updateDisplayName(type, displayName) {
        if (!displayName) return;
        
        // 查找对应的分析按钮
        const analysisButton = document.querySelector(`button[data-type="${type}"]:not(.ai-settings-btn)`);
        
        if (analysisButton) {
            // 查找按钮内的图标
            const icon = analysisButton.querySelector('i');
            const iconClass = icon ? icon.className : '';
            
            // 更新按钮文本，保留图标
            if (icon) {
                analysisButton.innerHTML = `<i class="${iconClass}"></i> ${displayName}`;
            } else {
                // 如果是动态分析项，可能有span包装
                const titleSpan = analysisButton.querySelector('.analysis-title');
                if (titleSpan) {
                    titleSpan.textContent = displayName;
                } else {
                    analysisButton.textContent = displayName;
                }
            }
            
            console.log(`已更新按钮 ${type} 的显示名称为: ${displayName}`);
        } else {
            console.warn(`未找到类型为 ${type} 的分析按钮`);
        }
    }
    
    // 从UI中移除分析项
    removeAnalysisItemFromUI(type) {
        // 对于动态分析项，需要移除整个容器
        if (type.startsWith('dynamic_')) {
            const dynamicItem = document.querySelector(`.dynamic-analysis-item[data-id="${type}"]`);
            if (dynamicItem) {
                dynamicItem.remove();
            }
            
            // 通知app.js更新UI
            if (window.chatlogApp && window.chatlogApp.removeDynamicAnalysisItemUI) {
                window.chatlogApp.removeDynamicAnalysisItemUI(type);
            }
        } else {
            // 默认分析项不允许删除
            const analysisItem = document.querySelector(`[data-type="${type}"]`);
            if (analysisItem) {
                analysisItem.remove();
            }
        }
    }

    // 恢复默认设置
    resetToDefault() {
        if (!this.currentEditingType) return;

        const defaultSetting = this.defaultSettings[this.currentEditingType];
        
        const displayName = document.getElementById('settingsDisplayName');
        const timeRange = document.getElementById('settingsTimeRange');
        const groupName = document.getElementById('settingsGroupName');
        const prompt = document.getElementById('settingsPrompt');
        
        if (displayName) displayName.value = defaultSetting.displayName || '';
        if (timeRange) timeRange.value = defaultSetting.timeRange;
        if (groupName) groupName.value = defaultSetting.groupName;
        if (prompt) prompt.value = defaultSetting.prompt;
        
        this.handleTimeRangeChange(defaultSetting.timeRange);
        console.log('已恢复默认设置');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化AI设置管理器');
    window.aiSettingsManager = new AISettingsManager();
}); 