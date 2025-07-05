// 模板设置管理
class TemplateManager {
    constructor() {
        this.templates = {};
        this.customTemplates = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTemplates();
        this.loadCustomTemplates();
    }

    bindEvents() {
        // 打开模板设置模态框
        document.getElementById('templateSettingsBtn').addEventListener('click', () => {
            this.openModal();
        });

        // 关闭模态框
        document.getElementById('closeTemplateSettings').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击背景关闭模态框
        document.getElementById('templateSettingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Tab切换
        document.querySelectorAll('.template-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.type);
            });
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('templateSettingsModal').style.display === 'block') {
                this.closeModal();
            }
        });
    }

    openModal() {
        document.getElementById('templateSettingsModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.loadTemplates();
        this.loadCustomTemplates();
    }

    closeModal() {
        document.getElementById('templateSettingsModal').style.display = 'none';
        document.body.style.overflow = '';
    }

    switchTab(type) {
        // 更新tab状态
        document.querySelectorAll('.template-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // 显示对应面板
        document.querySelectorAll('.template-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${type}-template`).classList.add('active');
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            if (response.ok) {
                this.templates = await response.json();
                this.populateTemplates();
            }
        } catch (error) {
            console.error('加载模板失败:', error);
            this.loadDefaultTemplates();
        }
    }

    loadDefaultTemplates() {
        this.templates = {
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
        this.populateTemplates();
    }

    populateTemplates() {
        // 填充各个模板文本区域
        Object.keys(this.templates).forEach(type => {
            const textarea = document.getElementById(`${type}Template`);
            if (textarea) {
                textarea.value = this.templates[type] || '';
            }
        });
    }

    async loadCustomTemplates() {
        try {
            const response = await fetch('/api/custom-templates');
            if (response.ok) {
                this.customTemplates = await response.json();
                this.renderCustomTemplates();
            }
        } catch (error) {
            console.error('加载自定义模板失败:', error);
            this.customTemplates = [];
            this.renderCustomTemplates();
        }
    }

    renderCustomTemplates() {
        const container = document.getElementById('customTemplateList');
        
        if (this.customTemplates.length === 0) {
            container.innerHTML = '<p class="no-templates">暂无自定义模板</p>';
            return;
        }

        container.innerHTML = this.customTemplates.map(template => `
            <div class="custom-template-item" data-id="${template.id}">
                <div class="custom-template-header">
                    <span class="custom-template-name">${template.name}</span>
                    <div class="custom-template-actions">
                        <button class="edit-template-btn" onclick="templateManager.editCustomTemplate('${template.id}')">
                            编辑
                        </button>
                        <button class="delete-template-btn" onclick="templateManager.deleteCustomTemplate('${template.id}')">
                            删除
                        </button>
                    </div>
                </div>
                <div class="custom-template-preview">
                    ${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}
                </div>
            </div>
        `).join('');
    }

    async saveTemplate(type) {
        const textarea = document.getElementById(`${type}Template`);
        const content = textarea.value.trim();

        if (!content) {
            alert('模板内容不能为空');
            return;
        }

        try {
            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    content: content
                })
            });

            if (response.ok) {
                this.templates[type] = content;
                this.showToast('模板保存成功', 'success');
            } else {
                throw new Error('保存失败');
            }
        } catch (error) {
            console.error('保存模板失败:', error);
            this.showToast('模板保存失败', 'error');
        }
    }

    resetTemplate(type) {
        if (confirm('确定要重置为默认模板吗？此操作不可撤销。')) {
            this.loadDefaultTemplates();
            const defaultContent = this.templates[type];
            document.getElementById(`${type}Template`).value = defaultContent;
            this.showToast('模板已重置为默认', 'success');
        }
    }

    async addCustomTemplate() {
        const name = document.getElementById('newTemplateName').value.trim();
        const content = document.getElementById('newTemplateContent').value.trim();

        if (!name || !content) {
            alert('请填写模板名称和内容');
            return;
        }

        try {
            const response = await fetch('/api/custom-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    content: content
                })
            });

            if (response.ok) {
                const newTemplate = await response.json();
                this.customTemplates.push(newTemplate);
                this.renderCustomTemplates();
                
                // 清空表单
                document.getElementById('newTemplateName').value = '';
                document.getElementById('newTemplateContent').value = '';
                
                this.showToast('自定义模板添加成功', 'success');
            } else {
                throw new Error('添加失败');
            }
        } catch (error) {
            console.error('添加自定义模板失败:', error);
            this.showToast('添加自定义模板失败', 'error');
        }
    }

    async editCustomTemplate(id) {
        const template = this.customTemplates.find(t => t.id === id);
        if (!template) return;

        const newName = prompt('请输入新的模板名称:', template.name);
        if (newName === null) return;

        const newContent = prompt('请输入新的模板内容:', template.content);
        if (newContent === null) return;

        if (!newName.trim() || !newContent.trim()) {
            alert('模板名称和内容不能为空');
            return;
        }

        try {
            const response = await fetch(`/api/custom-templates/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newName.trim(),
                    content: newContent.trim()
                })
            });

            if (response.ok) {
                const updatedTemplate = await response.json();
                const index = this.customTemplates.findIndex(t => t.id === id);
                this.customTemplates[index] = updatedTemplate;
                this.renderCustomTemplates();
                this.showToast('模板更新成功', 'success');
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            console.error('更新自定义模板失败:', error);
            this.showToast('更新自定义模板失败', 'error');
        }
    }

    async deleteCustomTemplate(id) {
        if (!confirm('确定要删除这个自定义模板吗？此操作不可撤销。')) {
            return;
        }

        try {
            const response = await fetch(`/api/custom-templates/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.customTemplates = this.customTemplates.filter(t => t.id !== id);
                this.renderCustomTemplates();
                this.showToast('模板删除成功', 'success');
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除自定义模板失败:', error);
            this.showToast('删除自定义模板失败', 'error');
        }
    }

    showToast(message, type = 'info') {
        // 创建toast提示
        const toast = document.createElement('div');
        toast.className = `template-toast template-toast-${type}`;
        toast.textContent = message;
        
        // 添加样式
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // 根据类型设置背景色
        switch (type) {
            case 'success':
                toast.style.background = '#34c759';
                break;
            case 'error':
                toast.style.background = '#ff3b30';
                break;
            default:
                toast.style.background = '#007aff';
        }

        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 获取指定类型的模板内容
    getTemplate(type) {
        return this.templates[type] || '';
    }

    // 获取自定义模板列表
    getCustomTemplates() {
        return this.customTemplates;
    }
}

// 全局函数，供HTML调用
function saveTemplate(type) {
    templateManager.saveTemplate(type);
}

function resetTemplate(type) {
    templateManager.resetTemplate(type);
}

function addCustomTemplate() {
    templateManager.addCustomTemplate();
}

// 初始化模板管理器
const templateManager = new TemplateManager();

// 导出供其他模块使用
window.templateManager = templateManager;