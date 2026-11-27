/**
 * 环球语堂 · AI 对话模块
 *
 * 功能：
 * - 场景化对话（角色扮演）
 * - 自由对话
 * - 语法解释 / 词汇讲解 / 翻译
 * - 流式输出（模拟）
 * - Markdown 简化渲染
 *
 * 接入方式：
 * - MVP 阶段：接入白驹主站 ccowork.js 的 AI 能力
 * - 如 ccowork.js 不可用，使用 mock 数据演示
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 场景定义
  // ============================================================

  const SCENES = {
    free: {
      id: 'free',
      name: '自由对话',
      icon: 'message-circle',
      description: '和 AI 用目标语言自由聊天',
      difficulty: 'all',
    },
    restaurant: {
      id: 'restaurant',
      name: '餐厅点餐',
      icon: 'utensils',
      description: '在餐厅点餐、询问菜品、结账',
      difficulty: 'beginner',
      systemPrompt: (lang) =>
        `你是一位餐厅服务员。请用${_langName(lang)}与用户对话，扮演餐厅服务员的角色。
- 用语自然、口语化
- 适当纠正用户的语法错误（用括号标注正确说法）
- 回答简洁，每次 2-3 句话
- 场景：一家有特色的本地餐厅`,
    },
    airport: {
      id: 'airport',
      name: '机场出行',
      icon: 'plane',
      description: '值机、安检、登机、转机对话',
      difficulty: 'intermediate',
      systemPrompt: (lang) =>
        `你是一位机场地勤人员。请用${_langName(lang)}与用户对话。
- 场景：国际机场的值机柜台和登机口
- 用语专业但友好
- 适当纠正用户的表达错误
- 每次回复 2-3 句话`,
    },
    shopping: {
      id: 'shopping',
      name: '购物',
      icon: 'shopping-bag',
      description: '商店购物、砍价、询问尺码',
      difficulty: 'beginner',
      systemPrompt: (lang) =>
        `你是一位商店店员。请用${_langName(lang)}与用户对话。
- 场景：一家时尚服装店
- 用语热情友好
- 适当纠正用户的表达错误
- 每次回复 2-3 句话`,
    },
    interview: {
      id: 'interview',
      name: '面试',
      icon: 'briefcase',
      description: '模拟工作面试对话',
      difficulty: 'advanced',
      systemPrompt: (lang) =>
        `你是一位 HR 面试官。请用${_langName(lang)}与用户进行工作面试。
- 逐题提问，常见面试问题
- 对用户的回答给出简短反馈
- 适当指出表达上可以改进的地方
- 每次回复 1-2 个问题 + 简短反馈`,
    },
    grammar: {
      id: 'grammar',
      name: '语法讲解',
      icon: 'book-open',
      description: '向 AI 请教语法问题',
      difficulty: 'all',
      systemPrompt: (lang) =>
        `你是一位${_langName(lang)}语法老师。请用中文为用户讲解语法知识。
- 解释清晰，用简单的语言
- 给出 2-3 个例句
- 如有常见错误也一并指出
- 结构：规则说明 → 例句 → 注意事项`,
    },
    vocabulary: {
      id: 'vocabulary',
      name: '词汇学习',
      icon: 'notebook-pen',
      description: '单词释义、用法、近义词辨析',
      difficulty: 'all',
      systemPrompt: (lang) =>
        `你是一位${_langName(lang)}词汇老师。请用中文为用户讲解单词。
- 给出音标/假名、词性、中文释义
- 2-3 个常用例句
- 近义词/反义词（如有）
- 常见搭配和用法`,
    },
    translation: {
      id: 'translation',
      name: '翻译练习',
      icon: 'globe',
      description: '中英互译练习与讲解',
      difficulty: 'all',
      systemPrompt: (lang) =>
        `你是一位翻译老师。用户会给出中文或${_langName(lang)}句子，请你翻译并讲解。
- 先给出翻译结果
- 讲解重点词汇和句型
- 说明翻译思路和技巧
- 如果有多种译法都列出来`,
    },
  };

  function _langName(code) {
    const names = {
      en: '英语',
      ja: '日语',
      ko: '韩语',
      fr: '法语',
      es: '西班牙语',
      de: '德语',
      it: '意大利语',
      pt: '葡萄牙语',
      ru: '俄语',
    };
    return names[code] || '目标语言';
  }

  // ============================================================
  // 2. Mock 回复（用于演示）
  // ============================================================

  const MOCK_REPLIES = {
    en: {
      greeting:
        "Hello! I'm your English learning partner. What would you like to practice today?\n\n你好！我是你的英语学习伙伴。今天想练习什么呢？",
      restaurant:
        "Good evening! Welcome to our restaurant. Do you have a reservation?\n\n晚上好！欢迎来到我们的餐厅。您有预订吗？",
      airport:
        "Good morning! May I see your passport and ticket, please?\n\n早上好！请出示您的护照和机票好吗？",
      shopping:
        "Welcome! Can I help you find something today?\n\n欢迎光临！有什么可以帮您的吗？",
      interview:
        "Thank you for coming in today. Let's start with a simple question: could you tell me a little about yourself?\n\n感谢你今天来面试。我们从一个简单的问题开始：你能简单介绍一下自己吗？",
      grammar:
        "好的！请告诉我你想了解哪个语法点，我会用清晰的解释和例句来帮你理解。\n\n你可以问比如：\n- 现在完成时怎么用？\n- a/an/the 的区别是什么？\n- 虚拟语气怎么用？",
      vocabulary:
        "好的！请告诉我你想学习哪个单词，我会为你详细讲解它的意思、用法和常见搭配。",
      translation:
        "好的！请把你想翻译的句子发给我，我会给出翻译并讲解其中的重点。",
      default:
        "That's a great question! Let me explain...\n\n这个问题问得好！让我来解释一下...\n\n**重点词汇：**\n- example /ɪɡˈzæmpəl/ n. 例子\n- practice /ˈpræktɪs/ v. 练习\n\n**常用句型：**\n> Could you please...? 你能...吗？\n\n有什么其他问题随时问我！",
    },
    ja: {
      greeting:
        "こんにちは！あなたの日本語学習パートナーです。今日は何を練習しますか？\n\n你好！我是你的日语学习伙伴。今天想练习什么呢？",
      restaurant:
        "いらっしゃいませ！ご予約はおありでしょうか？\n\n欢迎光临！请问您有预订吗？",
      airport:
        "おはようございます。パスポートとチケットをお願いできますか？\n\n早上好！请出示您的护照和机票好吗？",
      shopping:
        "いらっしゃいませ！何かお探しですか？\n\n欢迎光临！您在找什么吗？",
      interview:
        "本日はお越しいただきありがとうございます。まずは簡単な質問から始めましょう。自己紹介をお願いできますか？\n\n感谢您今天来面试。我们从一个简单的问题开始吧。请您做一下自我介绍。",
      grammar:
        "はい、承知いたしました。どの文法について知りたいですか？分かりやすく説明し、例文を交えてお教えします。\n\n好的！请告诉我你想了解哪个语法点，我会用清晰的解释和例句来帮你理解。",
      vocabulary:
        "はい！どの単語について学びたいですか？意味、使い方、よく使う表現を詳しく説明します。\n\n好的！请告诉我你想学习哪个单词，我会为你详细讲解它的意思、用法和常见搭配。",
      translation:
        "はい！翻訳したい文章を送ってください。翻訳とポイントの解説をいたします。\n\n好的！请把你想翻译的句子发给我，我会给出翻译并讲解其中的重点。",
      default:
        "良い質問ですね！説明しましょう...\n\n这个问题问得好！让我来解释一下...\n\n**重点词汇：**\n- 例（れい）n. 例子\n- 練習（れんしゅう）v. 练习\n\n**常用句型：**\n> ～てください 请...\n\n他に質問があればいつでも聞いてください！",
    },
  };

  // ============================================================
  // 3. AI 对话类
  // ============================================================

  class AIChat {
    constructor(options = {}) {
      this.lang = options.lang || 'en';
      this.scene = options.scene || 'free';
      this.conversationId = options.conversationId || null;
      this.onMessage = options.onMessage || null;
      this.onStream = options.onStream || null;
      this.isStreaming = false;
      this._streamController = null;
    }

    /**
     * 获取场景列表
     */
    static getScenes() {
      return Object.values(SCENES);
    }

    /**
     * 获取当前场景信息
     */
    getSceneInfo() {
      return SCENES[this.scene] || SCENES.free;
    }

    /**
     * 发送消息
     * @param {string} content - 用户消息
     */
    async sendMessage(content) {
      if (!content || !content.trim()) return;

      // 保存用户消息
      if (this.conversationId && global.LVStorage) {
        await LVStorage.db.addMessage(
          this.conversationId,
          'user',
          content
        );
      }

      // 触发回调
      if (this.onMessage) {
        this.onMessage({
          role: 'user',
          content,
          timestamp: Date.now(),
        });
      }

      // 获取 AI 回复
      this.isStreaming = true;
      const reply = await this._getReply(content);

      // 流式输出
      await this._streamReply(reply);

      this.isStreaming = false;

      // 保存 AI 消息
      if (this.conversationId && global.LVStorage) {
        await LVStorage.db.addMessage(
          this.conversationId,
          'assistant',
          reply
        );
      }

      return reply;
    }

    /**
     * 流式输出回复
     */
    async _streamReply(reply) {
      if (this.onStream) {
        // 模拟流式输出：逐字符推送
        let current = '';
        const chars = reply.split('');
        const delay = this._calculateDelay(reply);

        for (let i = 0; i < chars.length; i++) {
          current += chars[i];
          this.onStream(current, i === chars.length - 1);

          // 中文字符慢一点，英文快一点
          const char = chars[i];
          const wait = /[\u4e00-\u9fa5\u3040-\u30ff]/.test(char)
            ? delay * 1.5
            : delay;
          await this._sleep(wait);
        }
      }
    }

    _calculateDelay(text) {
      const len = text.length;
      if (len < 50) return 30;
      if (len < 200) return 20;
      return 15;
    }

    _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 获取 AI 回复
     * 优先使用 ccowork.js，回退到 mock 数据
     */
    async _getReply(userMessage) {
      // 尝试使用 ccowork.js 的 AI 能力
      if (this._hasCcowork()) {
        try {
          return await this._callCcowork(userMessage);
        } catch (e) {
          console.warn('[AIChat] ccowork 调用失败，使用 mock:', e);
        }
      }

      // 使用 mock 数据
      return this._getMockReply(userMessage);
    }

    /**
     * 检查是否有 ccowork.js
     */
    _hasCcowork() {
      return (
        typeof global.ccowork !== 'undefined' ||
        typeof global.__ccowork !== 'undefined'
      );
    }

    /**
     * 调用 ccowork.js
     */
    async _callCcowork(userMessage) {
      // 尝试通过 ccowork 发送消息
      if (global.ccowork && global.ccowork.chat) {
        const scene = SCENES[this.scene];
        const systemPrompt =
          scene && scene.systemPrompt
            ? scene.systemPrompt(this.lang)
            : `你是一位${_langName(this.lang)}老师，请帮助用户学习${_langName(this.lang)}。`;

        const result = await global.ccowork.chat({
          message: userMessage,
          system: systemPrompt,
          lang: this.lang,
        });

        if (result && result.content) {
          return result.content;
        }
      }

      throw new Error('ccowork chat not available');
    }

    /**
     * 获取 mock 回复
     */
    _getMockReply(userMessage) {
      const langReplies = MOCK_REPLIES[this.lang] || MOCK_REPLIES.en;

      // 根据场景返回不同回复
      if (this.scene && langReplies[this.scene]) {
        // 简单模拟：第一条消息用场景初始回复，后续用默认
        return langReplies[this.scene];
      }

      // 根据关键词匹配
      const msg = userMessage.toLowerCase();
      if (msg.includes('hello') || msg.includes('hi') || msg.includes('你好')) {
        return langReplies.greeting;
      }

      return langReplies.default;
    }

    /**
     * 开始新对话
     */
    async startNewConversation() {
      if (global.LVStorage) {
        const conv = await LVStorage.db.createConversation(
          this.lang,
          this.scene
        );
        this.conversationId = conv.id;
        return conv;
      }
      return null;
    }

    /**
     * 停止流式输出
     */
    stopStream() {
      this.isStreaming = false;
    }

    /**
     * 渲染 Markdown（简化版）
     */
    static renderMarkdown(text) {
      if (!text) return '';

      let html = text;

      // 转义 HTML
      html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // 代码块 ```
      html = html.replace(
        /```([\s\S]*?)```/g,
        '<pre><code>$1</code></pre>'
      );

      // 行内代码 `code`
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

      // 粗体 **text**
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      // 斜体 *text*
      html = html.replace(/(^|\W)\*([^*]+)\*($|\W)/g, '$1<em>$2</em>$3');

      // 引用 > text
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

      // 标题 ###
      html = html.replace(
        /^### (.+)$/gm,
        '<h4 style="font-size:15px;font-weight:700;margin:12px 0 6px">$1</h4>'
      );
      html = html.replace(
        /^## (.+)$/gm,
        '<h3 style="font-size:17px;font-weight:800;margin:14px 0 8px">$1</h3>'
      );

      // 无序列表
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(
        /(<li>.*<\/li>\n?)+/g,
        '<ul style="margin:8px 0;padding-left:20px">$&</ul>'
      );

      // 有序列表
      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

      // 段落
      const lines = html.split('\n');
      let result = '';
      let inParagraph = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          if (inParagraph) {
            result += '</p>';
            inParagraph = false;
          }
          continue;
        }

        // 已经是块级元素就不包 p
        if (
          line.startsWith('<') &&
          (line.startsWith('<ul') ||
            line.startsWith('<ol') ||
            line.startsWith('<li') ||
            line.startsWith('<pre') ||
            line.startsWith('<h') ||
            line.startsWith('<blockquote'))
        ) {
          if (inParagraph) {
            result += '</p>';
            inParagraph = false;
          }
          result += line;
        } else {
          if (!inParagraph) {
            result += '<p style="margin-bottom:10px;line-height:1.7">';
            inParagraph = true;
          } else {
            result += ' ';
          }
          result += line;
        }
      }

      if (inParagraph) {
        result += '</p>';
      }

      return result;
    }
  }

  // ============================================================
  // 4. 导出
  // ============================================================

  global.LVAIChat = AIChat;
  global.LVAIChatScenes = SCENES;
})(window);
