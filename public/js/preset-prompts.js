// 预设提示词配置
const PRESET_PROMPTS = {
    chatEssenceReport: `### 系统化生成聊天精华HTML报告及AI解读的提示词 (优化版: 暖色系Bento, 核心概念图, 阅读体验增强)

**本提示词旨在指导AI完成以下综合任务：根据提供的聊天记录文本文件，分析内容，提取精华，并生成一个包含核心概念关系图、AI智能解读功能、采用暖色系Bento Grid启发式设计、注重阅读体验的、美观的、响应式的HTML单页报告。**

---

**模块一：总体任务与输入输出定义**

1.  **核心任务：**
    *   深入分析用户上传的聊天记录文本文件（例如，\`AI传术师俱乐部|生财有术_YYYY-MM-DD.txt\`）。
    *   提取关键信息，包括核心讨论话题、代表性对话（务必要选择更有洞察力的对话，让人看完后有一种aha moment）、富有洞察力或趣味性的群友金句、以及提及的产品与资源。这一块要反复思考，确保能提取出有最好的洞察内容！
    *   生成一个结构化、信息丰富且视觉效果出色的单页HTML报告，采用**暖色系**设计。

2.  **输入数据：**
    *   一个聊天记录文本文件。文件名格式: \`AI传术师俱乐部|生财有术_YYYY-MM-DD.txt\` (提取俱乐部名称和日期用于报告标题)。
    *   聊天记录格式通常为：\`发言人(可选的wxid) HH:MM:SS\\n发言内容\` 或 \`发言人(可选的wxid) YYYY-MM-DD HH:MM:SS\\n发言内容\`。AI需能灵活处理时间戳格式。

3.  **最终输出：**
    *   一个独立的 \`.html\` 文件，包含所有指定内容和功能，使用中文呈现。
    *   报告主标题应结合文件名中的俱乐部名称和日期，例如："AI传术师俱乐部 | 生财有术 - 2025年05月22日 聊天精华报告"。

---

**模块二：内容提取与分析**

1.  **本日核心议题聚焦：关键词速览**
    *   **核心关键词智能提取：**
        *   AI需深入分析当日聊天记录，自动识别并提取出讨论频率较高、能够代表当日核心讨论方向的主要关键词或关键短语。
        *   提取原则：侧重于提取能明确指向讨论主题的名词、专有名词（如产品名、项目名、人物名）、以及被反复提及的核心动词或概念性短语。应自动过滤常见的中文停用词、无实际意义的语气词、高频但非主题性的寒暄语或日常用语。
        *   输出数量：目标是精炼地提取约 6-10个 当日最具代表性的核心关键词/短语。
    *   **关键词呈现方式（HTML中）：**
        *   在报告醒目位置（如主标题下方或专属区域）展示。
        *   每个关键词包裹在 \`<span class="keyword-tag">\` 标签中，通过CSS赋予其暖色背景、圆角、内边距，形成视觉上清晰的"标签云"效果，使其**非常突出**。

2.  **核心概念关系图 (Mermaid.js)**
    *   **关系分析：** 基于提取的核心关键词及聊天内容，AI需分析这些概念之间的潜在联系（如：A工具用于B场景，C概念是D技术的子集，E和F常被一同讨论等）。
    *   **Mermaid语法生成：** 将分析出的关系，转化为Mermaid.js的 \`graph LR;\` 或 \`flowchart LR;\` (推荐) 的代码。
        *   节点(node)应为核心关键词或概念。
        *   边(edge)应表示它们之间的关系，可适当添加标签说明关系类型。
        *   示例：\`A[关键词A] -->|关联| B(关键词B); B --> C{决策点}; C --是--> D; C --否--> E;\`
    *   **呈现位置：** 在"关键词速览"之后，或作为一个独立的、视觉上吸引人的模块，帮助用户快速理解当日讨论的知识结构。

3.  **精华话题识别与提炼：**
    *   自动从全部聊天记录中识别出多个讨论热度最高、持续时间较长或最具价值的核心话题。
    *   为每个话题生成一段简洁明了的摘要（约100-150字）。

4.  **重要对话节选 (强化阅读体验)：**
    *   针对每个核心话题，筛选出 4-10条代表性对话片段，务必要选择更有洞察力的对话，让人看完后有一种aha moment。
    *   **对话呈现优化：**
        *   每条对话使用特定样式（如轻微圆角的背景色块 \`.message-bubble\`）进行区隔。
        *   **清晰区分发言人：** 不同发言人的消息气泡可以使用略微不同的暖色背景色或边框，或通过左右对齐（如Tailwind的 \`mr-auto\` / \`ml-auto\`）来模拟聊天界面。
        *   发言人名称和时间戳（\`.speaker-info\`）应清晰、不突兀，内容（\`.dialogue-content\`）为主体。
        *   处理非文本信息占位符（如 "[图片]", "[链接]"）。

5.  **群友金句提取：**
    *   挑选 4-6 条具有代表性的"金句"。记录文本、发言人、时间。

6.  **提及产品与推荐资源：**
    *   **产品介绍：** 识别产品名，AI使用AISearch MCP搜索并提炼一句20字内的核心介绍。HTML中：\`<strong>[产品名]</strong>：[AI生成的20字介绍]\`。
    *   **文章/资源推荐：** 识别文章标题和URL。若无标题，用Browse工具访问URL取\`<title>\`。HTML中：\`<a href="[URL]" target="_blank">[标题]</a>\`。

---

**模块三：HTML结构与设计哲学 (暖色系Bento Grid启发，聚焦视觉与分享)**

你是极具审美的前端设计大师，请为我生成一个基于 **Bento Grid 启发式设计风格**的单页HTML网站，内嵌CSS、JS。此页面需采用**统一的暖色系调色板** (例如：主色调可选米白、浅黄、淡橙，搭配深褐、赭石等作为强调色和文本色，点缀少量高饱和度的暖色如珊瑚红或金色)，营造温馨、专业且富有活力的视觉氛围。页面将被截图分享，因此**视觉效果和阅读体验至关重要**。

**核心设计原则：**

*   **视觉惊艳 (Aha-Moment)：** 创造一个既美观又现代的页面，第一眼就能吸引用户。
*   **卓越可读性：** 确保所有文本内容在暖色背景下依然清晰易读，对比度适宜。选择适合中文阅读的字体。
*   **信息层级清晰：** 通过大小、字重、颜色（在暖色系内变化）和空间布局，突出重点内容。
*   **Bento启发式布局：**
    *   页面由多个独立的"卡片"或"区块"组成，每个区块承载不同类型的内容（如关键词、概念图、话题、金句等）。
    *   区块大小和排列可以不对称，但整体需保持视觉平衡与和谐。
    *   利用圆角、微妙的阴影和边框（使用暖色系）来定义区块，增强质感。
*   **分享友好：** 整体设计需考虑截图后的美观度。

**具体设计指导：**

*   **主标题：** 页面顶部应有清晰、醒目的主标题（如 "AI传术师俱乐部 | 生财有术 - YYYY年MM月DD日 聊天精华报告"），字体稍大，颜色突出（如深褐色）。
*   **排版：**
    *   字体组合：\`font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;\` 优先使用系统默认中文字体，辅以 \`Noto Sans SC\` 或 \`Heiti SC\` 作为后备。
    *   字号：主标题 >= 32px, 卡片标题 >= 24px, 正文 >= 20px, 辅助文字 >= 18px。使用 \`rem\` 单位。
    *   行高：确保足够的行高（如 1.6-1.8）提升阅读舒适度。
*   **配色方案 (暖色系)：**
    *   背景：主背景可为非常浅的暖色（如 \`bg-amber-50\`, \`bg-orange-50\`），卡片背景可略深或有细微纹理。
    *   文本：深暖色（如 \`text-stone-700\`, \`text-amber-800\`）保证可读性。
    *   强调/链接：使用饱和度稍高的暖色（如 \`text-orange-600\`, \`border-amber-500\`）。
    *   避免使用冷色调，除非作为极小面积的对比点缀且有充分理由。
*   **图标：** 适度使用 Font Awesome 图标点缀，选择与暖色系协调的颜色。
*   **Mermaid 图表样式：**
    *   尝试通过 Mermaid 的 \`%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#D2B48C', 'nodeBorder': '#A0522D', 'lineColor': '#8B4513', 'textColor': '#5C4033'}}}%%\` (示例暖色，AI可调整) 或外部CSS来定制图表颜色，使其融入整体暖色调。如果直接定制困难，确保图表容器背景与页面协调。

**技术规范：**

*   HTML5, Font Awesome, Tailwind CSS, Mermaid.js, 必要JS。
    *   Font Awesome: \`https://cdn.staticfile.org/font-awesome/6.4.0/css/all.min.css\`
    *   Tailwind CSS: \`https://cdn.staticfile.org/tailwindcss/2.2.19/tailwind.min.css\` (或更高版本以支持更多暖色调)
    *   Mermaid: \`https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.min.js\`
*   响应式设计：在手机、平板、桌面均完美展示。
*   代码结构清晰、语义化，包含注释。

---

**模块四：核心内容模块生成细则 (HTML与样式)**

1.  **"核心关键词速览"模块：**
    *   使用清晰的二级标题。
    *   关键词标签 \`<span class="keyword-tag bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm font-medium m-1 inline-block shadow-sm hover:bg-amber-300 transition-colors">\` (示例Tailwind类，AI可调整以符合整体暖色风格)。

2.  **"核心概念关系图"模块：**
    *   使用清晰的二级标题。
    *   包含一个 \`<div class="mermaid bg-warm-gray-100 p-4 rounded-lg shadow-md">\` 元素，其中填充AI生成的Mermaid代码。确保容器背景也是暖色调。
    *   在Mermaid JS初始化脚本下方，添加 \`mermaid.initialize({ startOnLoad: true, theme: 'base', /* 可尝试在此处或上方注释中定义themeVariables */ });\`

3.  **"精华话题聚焦"模块：**
    *   二级标题。
    *   每个话题卡片 (\`.topic-card.bg-white/bg-opacity-70.p-4.rounded-lg.shadow-lg.mb-6\` - 背景使用暖白或带透明度的暖色):
        *   话题标题 (三级标题，如 \`text-orange-700 font-semibold\`)。
        *   话题摘要 (\`.topic-description.text-stone-600.mb-3\`)。
        *   "重要对话节选"小标题。
        *   对话列表：
            *   \`.message-bubble.p-3.rounded-lg.mb-2\`
            *   发言人A: \`bg-amber-100 text-stone-700 mr-auto max-w-xs md:max-w-md\` (左对齐)
            *   发言人B: \`bg-orange-100 text-stone-700 ml-auto max-w-xs md:max-w-md\` (右对齐)
            *   \`.speaker-info.text-xs.text-stone-500.mb-1\`
            *   \`.dialogue-content.text-sm\`

4.  **"群友金句闪耀"模块：**
    *   二级标题。
    *   网格布局 (如 \`md:grid-cols-2 gap-4\`)。
    *   金句卡片 (\`.quote-card.bg-yellow-50/bg-opacity-80.p-4.rounded-lg.shadow-md.flex.flex-col.justify-between\`):
        *   金句文本 (\`.quote-text.text-lg.text-amber-900.font-serif.mb-2\`)，核心词高亮 (\`.quote-highlight.font-bold\`)。
        *   发言人及时间 (\`.quote-author.text-xs.text-stone-500.self-end\`)。
        *   AI解读区域 (\`.interpretation-area.mt-2.p-2.bg-stone-100.rounded.text-sm.text-stone-600\`)，填充静态解读文本。

5.  **"提及产品与资源"模块：**
    *   二级标题。
    *   列表形式展示，产品名加粗，链接使用暖色强调。

---

**模块五：金句AI解读与嵌入 (静态)**

1.  **AI直接生成并嵌入解读：**
    *   在HTML生成阶段，对每条"群友金句"：
        *   构建内部Prompt生成解读（50-100字中文，结合聊天背景，如AI Agent、教育、知识管理、用户交互、技术发展等潜在上下文）。
        *   将生成的解读文本直接写入该金句卡片内对应的 \`.interpretation-area\` div中。**无客户端JS加载。**

---

**模块六：技术、风格与环境要求**

1.  **响应式设计：** 强制。
2.  **交互细节：** 卡片悬停效果 (如 \`hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300\`)，使用暖色系阴影。
3.  **代码规范：** 注释清晰，语义化。
4.  **语言：** 所有用户可见文本为中文。
5.  **Tailwind CSS 色板：** 充分利用Tailwind内置的暖色系色板 (e.g., \`amber\`, \`orange\`, \`yellow\`, \`red\`, \`stone\`, \`neutral\` 中的暖调部分)。避免直接使用 \`blue\`, \`green\`, \`purple\` 等冷色，除非有特定设计意图且能和谐融入。

---

**总结性要求：AI需综合理解以上所有模块的指令，将它们视为一个整体的、连贯的任务，最终输出一个功能完整、内容准确、视觉采用统一暖色调、体验优秀的HTML报告。特别关注关键词和对话部分的可读性与视觉突出性。**`
};

// 快速填入预设提示词的函数
function fillPresetPrompt(promptKey) {
    const promptText = PRESET_PROMPTS[promptKey];
    if (promptText) {
        const customPromptTextarea = document.getElementById('customPrompt');
        if (customPromptTextarea) {
            customPromptTextarea.value = promptText;
            
            // 显示成功消息
            if (window.chatlogApp && window.chatlogApp.showMessage) {
                window.chatlogApp.showMessage('已填入预设提示词：聊天精华报告分析', 'success');
            }
            
            // 自动调整文本框高度
            customPromptTextarea.style.height = 'auto';
            customPromptTextarea.style.height = Math.min(customPromptTextarea.scrollHeight, 400) + 'px';
        }
    }
}

// 暴露给全局作用域
window.fillPresetPrompt = fillPresetPrompt;
window.PRESET_PROMPTS = PRESET_PROMPTS; 