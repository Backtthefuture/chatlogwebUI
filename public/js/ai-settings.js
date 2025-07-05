// AI设置管理类
class AISettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.defaultSettings = {
            programming: {
                timeRange: 'yesterday',
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
            }
        };
        
        // 动态分析项管理
        this.dynamicAnalysisItems = this.loadDynamicItems();
        this.currentEditingType = null;
        this.originalGroupOptions = []; // 存储原始群聊数据
        this.searchDebounceTimeout = null; // 搜索防抖计时器
        this.bindEvents();
        
        // 初始化完成后，更新所有按钮的显示名称
        setTimeout(() => {
            this.initializeDisplayNames();
        }, 100);
        
        console.log('AI设置管理器初始化完成');
    }

    // 格式化本地日期为YYYY-MM-DD格式
    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 初始化所有按钮的显示名称
    initializeDisplayNames() {
        // 更新预设分析项
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
        // 首先尝试从模板管理器获取
        if (window.templateManager) {
            const template = window.templateManager.getTemplate(type);
            if (template) {
                return template;
            }
        }
        
        // 如果模板管理器中没有，使用内置默认模板
        const prompts = {
            programming: `请分析这个编程相关群聊的聊天记录，重点关注：

1. 技术讨论与问题解决
2. 编程语言和框架的使用经验
3. 开发工具和最佳实践分享
4. 代码示例和解决方案
5. 技术趋势和新技术讨论

请提供结构化的分析报告，包括：
- 主要技术话题总结
- 重要代码片段和解决方案
- 技术观点和建议摘录
- 有价值的资源链接整理`,

            science: `请分析这个科学相关群聊的聊天记录，重点关注：

1. 科学发现和研究进展
2. 实验方法和数据分析
3. 科学理论的讨论和应用
4. 学术资源和论文分享
5. 科研工具和技术介绍

请提供结构化的分析报告，包括：
- 主要科学话题总结
- 重要研究成果和发现
- 科学观点和见解摘录
- 有价值的学术资源整理`,

            reading: `请分析这个读书相关群聊的聊天记录，重点关注：

1. 书籍推荐和评价
2. 阅读心得和感悟分享
3. 作者观点和思想讨论
4. 读书方法和习惯交流
5. 文学作品的深度解析

请提供结构化的分析报告，包括：
- 主要阅读话题总结
- 推荐书籍和理由
- 精彩观点和感悟摘录
- 有价值的阅读资源整理`
        };
        return prompts[type] || `请分析这个群聊的聊天记录，重点关注核心话题、有价值的观点和重要信息分享。`;
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
            const groupSearch = document.getElementById('settingsGroupSearch');

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

            // 群聊搜索功能 - 添加防抖优化
            if (groupSearch) {
                groupSearch.addEventListener('input', (e) => {
                    // 清除之前的防抖计时器
                    if (this.searchDebounceTimeout) {
                        clearTimeout(this.searchDebounceTimeout);
                    }
                    
                    // 设置新的防抖计时器
                    this.searchDebounceTimeout = setTimeout(() => {
                        this.filterGroupOptions(e.target.value);
                    }, 200); // 200ms 防抖延迟
                });
                
                groupSearch.addEventListener('focus', () => {
                    const container = groupSearch.closest('.searchable-select');
                    if (container) {
                        container.classList.add('searching');
                    }
                });
                
                groupSearch.addEventListener('blur', () => {
                    const container = groupSearch.closest('.searchable-select');
                    if (container) {
                        container.classList.remove('searching');
                    }
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
                return this.formatLocalDate(today);
            case 'yesterday':
                return this.formatLocalDate(yesterday);
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return `${this.formatLocalDate(weekAgo)}~${this.formatLocalDate(today)}`;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setDate(monthAgo.getDate() - 30);
                return `${this.formatLocalDate(monthAgo)}~${this.formatLocalDate(today)}`;
            default:
                // 默认返回昨天
                return this.formatLocalDate(yesterday);
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
                        <div class="searchable-select">
                            <input type="text" id="settingsGroupSearch" placeholder="🔍 搜索群聊名称..." class="group-search-input">
                            <select id="settingsGroupName">
                                <option value="">请选择群聊</option>
                            </select>
                            <div class="search-results-count" id="searchResultsCount" style="display: none;"></div>
                        </div>
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
                // 存储原始群聊数据
                this.originalGroupOptions = data.map(chatroom => ({
                    value: chatroom.displayName,
                    text: `${chatroom.displayName} (${chatroom.userCount}人)`,
                    searchText: chatroom.displayName.toLowerCase()
                }));
                
                // 渲染群聊选项
                this.renderGroupOptions(this.originalGroupOptions);
            }
        } catch (error) {
            console.error('加载群聊列表失败:', error);
        }
    }
    
    // 渲染群聊选项 - 优化版本
    renderGroupOptions(options) {
        const groupSelect = document.getElementById('settingsGroupName');
        if (!groupSelect) return;
        
        // 保存当前选中的值
        const currentValue = groupSelect.value;
        
        // 使用DocumentFragment批量操作DOM，提高性能
        const fragment = document.createDocumentFragment();
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择群聊';
        fragment.appendChild(defaultOption);
        
        // 批量添加群聊选项
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            fragment.appendChild(optionElement);
        });
        
        // 一次性替换所有选项
        groupSelect.innerHTML = '';
        groupSelect.appendChild(fragment);
        
        // 恢复之前选中的值
        if (currentValue) {
            groupSelect.value = currentValue;
        }
        
        // 更新搜索结果计数
        this.updateSearchResultsCount(options.length);
    }
    
    // 过滤群聊选项
    filterGroupOptions(searchTerm) {
        // 优化性能：缓存DOM元素
        const groupSelect = document.getElementById('settingsGroupName');
        if (!groupSelect || !this.originalGroupOptions.length) {
            return;
        }
        
        let filteredOptions;
        
        if (!searchTerm.trim()) {
            // 空搜索，显示所有选项
            filteredOptions = this.originalGroupOptions;
        } else {
            const searchLower = searchTerm.toLowerCase().trim();
            // 优化搜索算法：使用更高效的过滤方式
            filteredOptions = this.originalGroupOptions.filter(option => 
                option.searchText.indexOf(searchLower) !== -1
            );
        }
        
        // 只有在结果发生变化时才重新渲染
        const currentOptionsCount = groupSelect.options.length - 1; // 减去"请选择群聊"选项
        if (currentOptionsCount !== filteredOptions.length) {
            this.renderGroupOptions(filteredOptions);
        }
        
        // 更新搜索结果计数
        this.updateSearchResultsCount(filteredOptions.length);
    }
    
    // 更新搜索结果计数
    updateSearchResultsCount(count) {
        const countElement = document.getElementById('searchResultsCount');
        if (!countElement) return;
        
        if (count === this.originalGroupOptions.length) {
            // 显示全部，隐藏计数
            countElement.style.display = 'none';
        } else {
            // 显示过滤结果计数
            countElement.textContent = `${count}/${this.originalGroupOptions.length}`;
            countElement.style.display = 'block';
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
        
        // 清空搜索框
        const groupSearch = document.getElementById('settingsGroupSearch');
        if (groupSearch) {
            groupSearch.value = '';
            this.filterGroupOptions(''); // 重置群聊列表
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
                                startDate.value = this.formatLocalDate(weekAgo);
            endDate.value = this.formatLocalDate(today);
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

    // 更新getDefaultPrompt方法，从模板管理器获取模板
    async updateDefaultPrompt(type) {
        if (window.templateManager) {
            try {
                // 从模板管理器获取最新模板
                const template = window.templateManager.getTemplate(type);
                if (template) {
                    this.defaultSettings[type].prompt = template;
                }
            } catch (error) {
                console.error('获取模板失败:', error);
            }
        }
    }
}

// 全局函数：填入默认模板
async function fillSettingsPrompt() {
    const promptTextarea = document.getElementById('settingsPrompt');
    if (!promptTextarea) return;

    // 获取当前编辑的类型
    const aiSettings = window.aiSettingsManager;
    if (!aiSettings || !aiSettings.currentEditingType) {
        alert('请先选择要编辑的分析类型');
        return;
    }

    const currentType = aiSettings.currentEditingType;
    
    try {
        // 从模板管理器获取对应类型的模板
        if (window.templateManager) {
            await window.templateManager.loadTemplates();
            const template = window.templateManager.getTemplate(currentType);
            
            if (template) {
                promptTextarea.value = template;
                
                // 显示成功消息
                if (window.templateManager.showToast) {
                    window.templateManager.showToast('已填入默认模板', 'success');
                } else {
                    alert('已填入默认模板');
                }
                
                // 自动调整文本框高度
                promptTextarea.style.height = 'auto';
                promptTextarea.style.height = Math.min(promptTextarea.scrollHeight, 400) + 'px';
            } else {
                alert('该类型暂无默认模板');
            }
        } else {
            // 如果模板管理器未加载，使用内置默认模板
            const builtinTemplate = aiSettings.getDefaultPrompt(currentType);
            if (builtinTemplate) {
                promptTextarea.value = builtinTemplate;
                alert('已填入内置默认模板');
                
                // 自动调整文本框高度
                promptTextarea.style.height = 'auto';
                promptTextarea.style.height = Math.min(promptTextarea.scrollHeight, 400) + 'px';
            } else {
                alert('未找到默认模板');
            }
        }
    } catch (error) {
        console.error('填入默认模板失败:', error);
        alert('填入默认模板失败，请重试');
    }
}

// 清空提示词
function clearSettingsPrompt() {
    const promptTextarea = document.getElementById('settingsPrompt');
    if (promptTextarea) {
        if (confirm('确定要清空提示词内容吗？')) {
            promptTextarea.value = '';
            promptTextarea.style.height = 'auto';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化AI设置管理器');
    window.aiSettingsManager = new AISettingsManager();
    
    // 暴露全局函数
    window.fillSettingsPrompt = fillSettingsPrompt;
    window.clearSettingsPrompt = clearSettingsPrompt;
}); 