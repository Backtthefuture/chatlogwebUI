// 模型设置管理
class ModelSettings {
    constructor() {
        this.modal = document.getElementById('modelSettingsModal');
        this.form = document.getElementById('modelSettingsForm');
        this.currentSettings = this.loadSettings();
        
        this.initEventListeners();
        this.loadCurrentSettings();
    }

    // 初始化事件监听器
    initEventListeners() {
        // 打开设置弹窗
        document.getElementById('modelSettingsBtn').addEventListener('click', () => {
            this.openModal();
        });

        // 关闭弹窗
        document.getElementById('closeModelSettings').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelModelSettings').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // 提供商切换
        document.querySelectorAll('input[name="modelProvider"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchProvider(e.target.value);
            });
        });

        // API Key 可见性切换
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e.target.dataset.target);
            });
        });

        // 测试连接
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testConnection();
        });

        // 保存设置
        document.getElementById('saveModelSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // 重置设置
        document.getElementById('resetModelSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // API Key 输入验证
        document.getElementById('deepseekApiKey').addEventListener('input', (e) => {
            this.validateApiKey('deepseek', e.target.value);
        });

        document.getElementById('geminiApiKey').addEventListener('input', (e) => {
            this.validateApiKey('gemini', e.target.value);
        });
    }

    // 打开弹窗
    openModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 关闭弹窗
    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // 切换提供商
    switchProvider(provider) {
        const deepseekConfig = document.getElementById('deepseekConfig');
        const geminiConfig = document.getElementById('geminiConfig');

        if (provider === 'DeepSeek') {
            deepseekConfig.style.display = 'block';
            geminiConfig.style.display = 'none';
        } else if (provider === 'Gemini') {
            deepseekConfig.style.display = 'none';
            geminiConfig.style.display = 'block';
        }
    }

    // 切换密码可见性
    togglePasswordVisibility(targetId) {
        const input = document.getElementById(targetId);
        const button = document.querySelector(`[data-target="${targetId}"]`);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    // 验证API Key格式
    validateApiKey(provider, apiKey) {
        const statusElement = document.getElementById(`${provider}KeyStatus`);
        
        if (!apiKey.trim()) {
            statusElement.textContent = '';
            statusElement.className = 'key-status';
            return;
        }

        let isValid = false;
        let message = '';

        if (provider === 'deepseek') {
            isValid = apiKey.startsWith('sk-') && apiKey.length > 20;
            message = isValid ? '✓ API Key 格式正确' : '✗ DeepSeek API Key 应以 sk- 开头';
        } else if (provider === 'gemini') {
            isValid = apiKey.startsWith('AI') && apiKey.length > 20;
            message = isValid ? '✓ API Key 格式正确' : '✗ Gemini API Key 应以 AI 开头';
        }

        statusElement.textContent = message;
        statusElement.className = `key-status ${isValid ? 'valid' : 'invalid'}`;
    }

    // 测试连接
    async testConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        const testResult = document.getElementById('testResult');
        const provider = document.querySelector('input[name="modelProvider"]:checked').value;

        // 获取当前配置
        const config = this.getCurrentFormData();
        
        if (!config[provider.toLowerCase()]?.apiKey?.trim()) {
            this.showTestResult('error', '请先填写 API Key');
            return;
        }

        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
        this.showTestResult('testing', '正在测试连接...');

        try {
            const response = await fetch('/api/model-settings/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider: provider,
                    config: config[provider.toLowerCase()]
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showTestResult('success', `✓ 连接成功！模型: ${result.model || 'N/A'}`);
            } else {
                this.showTestResult('error', `✗ 连接失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            this.showTestResult('error', `✗ 连接失败: ${error.message}`);
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-flask"></i> 测试连接';
        }
    }

    // 显示测试结果
    showTestResult(type, message) {
        const testResult = document.getElementById('testResult');
        testResult.textContent = message;
        testResult.className = `test-result ${type}`;
    }

    // 获取表单数据
    getCurrentFormData() {
        return {
            modelProvider: document.querySelector('input[name="modelProvider"]:checked').value,
            deepseek: {
                model: document.getElementById('deepseekModel').value,
                apiKey: document.getElementById('deepseekApiKey').value
            },
            gemini: {
                model: document.getElementById('geminiModel').value,
                apiKey: document.getElementById('geminiApiKey').value
            }
        };
    }

    // 保存设置
    async saveSettings() {
        const saveBtn = document.getElementById('saveModelSettings');
        const originalText = saveBtn.innerHTML;
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

        try {
            const settings = this.getCurrentFormData();
            
            // 保存到本地存储
            localStorage.setItem('modelSettings', JSON.stringify(settings));
            
            // 发送到服务器
            const response = await fetch('/api/model-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.currentSettings = settings;
                this.showNotification('success', '设置保存成功！');
                setTimeout(() => {
                    this.closeModal();
                }, 1000);
            } else {
                this.showNotification('error', `保存失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('error', `保存失败: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // 重置设置
    resetSettings() {
        if (confirm('确定要恢复默认设置吗？这将清除所有自定义配置。')) {
            const defaultSettings = this.getDefaultSettings();
            this.applySettings(defaultSettings);
            localStorage.removeItem('modelSettings');
            this.showNotification('success', '已恢复默认设置');
        }
    }

    // 从本地存储加载设置
    loadSettings() {
        const saved = localStorage.getItem('modelSettings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('解析保存的设置失败:', error);
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    }

    // 获取默认设置
    getDefaultSettings() {
        return {
            modelProvider: 'DeepSeek',
            deepseek: {
                model: 'deepseek-chat',
                apiKey: ''
            },
            gemini: {
                model: 'gemini-2.5-pro',
                apiKey: ''
            }
        };
    }

    // 加载当前设置到表单
    loadCurrentSettings() {
        this.applySettings(this.currentSettings);
    }

    // 应用设置到表单
    applySettings(settings) {
        // 设置提供商
        document.querySelector(`input[name="modelProvider"][value="${settings.modelProvider}"]`).checked = true;
        this.switchProvider(settings.modelProvider);

        // 设置 DeepSeek 配置
        document.getElementById('deepseekModel').value = settings.deepseek.model;
        document.getElementById('deepseekApiKey').value = settings.deepseek.apiKey;
        if (settings.deepseek.apiKey) {
            this.validateApiKey('deepseek', settings.deepseek.apiKey);
        }

        // 设置 Gemini 配置
        document.getElementById('geminiModel').value = settings.gemini.model;
        document.getElementById('geminiApiKey').value = settings.gemini.apiKey;
        if (settings.gemini.apiKey) {
            this.validateApiKey('gemini', settings.gemini.apiKey);
        }
    }

    // 显示通知
    showNotification(type, message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 获取当前使用的模型配置
    getCurrentModelConfig() {
        const provider = this.currentSettings.modelProvider;
        return {
            provider: provider,
            config: this.currentSettings[provider.toLowerCase()]
        };
    }
}

// 初始化模型设置
document.addEventListener('DOMContentLoaded', () => {
    window.modelSettings = new ModelSettings();
});

// 导出供其他模块使用
window.ModelSettings = ModelSettings; 