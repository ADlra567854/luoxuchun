/**
 * 环球语堂 · 数据存储模块
 * 封装 localStorage + IndexedDB（Dexie.js）
 * 命名空间：linguavista.*
 *
 * 数据结构：
 * - localStorage: 用户设置、学习统计、当前语种
 * - IndexedDB: 词汇库、学习记录、会话历史
 */

(function (global) {
  'use strict';

  const NS = 'linguavista';
  const DB_NAME = 'linguavista';
  const DB_VERSION = 1;

  // ============================================================
  // 1. localStorage 封装
  // ============================================================

  const LocalStore = {
    /**
     * 获取数据
     * @param {string} key
     * @param {*} defaultValue
     */
    get(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(`${NS}.${key}`);
        return raw ? JSON.parse(raw) : defaultValue;
      } catch (e) {
        console.warn('[Storage] localStorage 读取失败:', key, e);
        return defaultValue;
      }
    },

    /**
     * 保存数据
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      try {
        localStorage.setItem(`${NS}.${key}`, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('[Storage] localStorage 写入失败:', key, e);
        return false;
      }
    },

    /**
     * 删除数据
     * @param {string} key
     */
    remove(key) {
      try {
        localStorage.removeItem(`${NS}.${key}`);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * 检查是否存在
     * @param {string} key
     */
    has(key) {
      try {
        return localStorage.getItem(`${NS}.${key}`) !== null;
      } catch (e) {
        return false;
      }
    },

    /**
     * 清空所有 linguavista 数据
     */
    clearAll() {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`${NS}.`)) {
            keys.push(k);
          }
        }
        keys.forEach((k) => localStorage.removeItem(k));
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  // ============================================================
  // 2. 设置管理
  // ============================================================

  const defaultSettings = {
    currentLang: 'en',
    dailyGoal: 20, // 每日目标卡片数
    theme: 'deep',
    ttsRate: 1.0, // 语速
    ttsAutoPlay: false, // 是否自动发音
    showPhonetic: true, // 显示音标
    srsAlgorithm: 'sm2', // sm2 / fsrs
    notifications: false,
    lastStudyDate: null,
  };

  const Settings = {
    /**
     * 获取所有设置
     */
    getAll() {
      const saved = LocalStore.get('settings', {});
      return { ...defaultSettings, ...saved };
    },

    /**
     * 获取单个设置
     * @param {string} key
     */
    get(key) {
      const settings = this.getAll();
      return settings[key] !== undefined ? settings[key] : defaultSettings[key];
    },

    /**
     * 更新设置
     * @param {object} updates
     */
    update(updates) {
      const current = this.getAll();
      const next = { ...current, ...updates };
      LocalStore.set('settings', next);
      return next;
    },

    /**
     * 重置为默认设置
     */
    reset() {
      LocalStore.set('settings', { ...defaultSettings });
      return { ...defaultSettings };
    },
  };

  // ============================================================
  // 3. 学习统计
  // ============================================================

  const Stats = {
    /**
     * 获取总览统计
     */
    getOverview() {
      return LocalStore.get('stats.overview', {
        totalCardsStudied: 0,
        totalStudyTime: 0, // 秒
        streak: 0,
        maxStreak: 0,
        xp: 0,
        level: 1,
        lastStudyDate: null,
      });
    },

    /**
     * 更新统计
     * @param {object} updates
     */
    update(updates) {
      const current = this.getOverview();
      const next = { ...current, ...updates };
      LocalStore.set('stats.overview', next);
      return next;
    },

    /**
     * 记录一次学习会话
     * @param {object} session
     */
    recordSession(session) {
      const overview = this.getOverview();
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split('T')[0];

      // 更新连胜
      let streak = overview.streak;
      let maxStreak = overview.maxStreak;

      if (overview.lastStudyDate === today) {
        // 今天已经学过了，保持 streak
      } else if (overview.lastStudyDate === yesterday) {
        // 连续学习
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        // 断了，重新开始
        streak = 1;
      }

      const xpGain = session.cardsStudied * 10 + session.correct * 5;
      const newXp = overview.xp + xpGain;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      const next = {
        ...overview,
        totalCardsStudied: overview.totalCardsStudied + (session.cardsStudied || 0),
        totalStudyTime: overview.totalStudyTime + (session.duration || 0),
        streak,
        maxStreak,
        xp: newXp,
        level: newLevel,
        lastStudyDate: today,
      };

      LocalStore.set('stats.overview', next);

      // 记录每日数据
      this._recordDaily(today, session);

      return { overview: next, xpGain };
    },

    /**
     * 记录每日数据
     */
    _recordDaily(date, session) {
      const daily = LocalStore.get('stats.daily', {});
      if (!daily[date]) {
        daily[date] = { cardsStudied: 0, studyTime: 0, correct: 0 };
      }
      daily[date].cardsStudied += session.cardsStudied || 0;
      daily[date].studyTime += session.duration || 0;
      daily[date].correct += session.correct || 0;

      // 只保留最近 90 天
      const dates = Object.keys(daily).sort();
      if (dates.length > 90) {
        dates.slice(0, dates.length - 90).forEach((d) => delete daily[d]);
      }

      LocalStore.set('stats.daily', daily);
    },

    /**
     * 获取最近 N 天的每日数据
     * @param {number} days
     */
    getDailyStats(days = 30) {
      const daily = LocalStore.get('stats.daily', {});
      const result = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          ...(daily[dateStr] || { cardsStudied: 0, studyTime: 0, correct: 0 }),
        });
      }

      return result;
    },

    /**
     * 获取热力图数据（最近 365 天）
     */
    getHeatmapData() {
      const daily = LocalStore.get('stats.daily', {});
      const result = [];
      const today = new Date();

      for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const data = daily[dateStr] || { cardsStudied: 0, studyTime: 0 };
        result.push({
          date: dateStr,
          count: data.cardsStudied,
          level: this._getHeatmapLevel(data.cardsStudied),
        });
      }

      return result;
    },

    _getHeatmapLevel(count) {
      if (count === 0) return 0;
      if (count < 5) return 1;
      if (count < 15) return 2;
      if (count < 30) return 3;
      return 4;
    },
  };

  // ============================================================
  // 4. IndexedDB（Dexie.js）封装
  // ============================================================

  class Database {
    constructor() {
      this.db = null;
      this.ready = false;
      this._initPromise = null;
    }

    /**
     * 初始化数据库
     */
    init() {
      if (this._initPromise) return this._initPromise;

      this._initPromise = this._doInit().catch((err) => {
        console.error('[Storage] IndexedDB 初始化失败:', err);
        throw err;
      });

      return this._initPromise;
    }

    async _doInit() {
      if (typeof global.Dexie === 'undefined') {
        console.warn('[Storage] Dexie.js 未加载，尝试动态加载');
        await this._loadDexie();
      }

      const Dexie = global.Dexie;
      if (!Dexie) {
        throw new Error('Dexie.js 不可用');
      }

      const db = new Dexie(DB_NAME);

      // 定义数据库 schema
      db.version(DB_VERSION).stores({
        // 词汇表
        vocab: '++id, word, lang, level, status',
        // 学习记录
        reviews: '++id, cardId, lang, reviewDate, [lang+reviewDate]',
        // 会话历史
        conversations: '++id, lang, scene, createdAt, updatedAt',
        // 消息
        messages: '++id, conversationId, role, timestamp',
        // 词库
        decks: '++id, lang, name, isDefault',
        // 用户自定义词汇
        customVocab: '++id, word, lang, createdAt',
      });

      this.db = db;
      this.ready = true;
      console.log('[Storage] IndexedDB 初始化完成');
      return db;
    }

    /**
     * 动态加载 Dexie.js
     */
    _loadDexie() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Dexie.js 加载失败'));
        document.head.appendChild(script);
      });
    }

    /**
     * 确保数据库已初始化
     */
    async _ensureReady() {
      if (!this.ready) {
        await this.init();
      }
    }

    // ---- 词汇相关 ----

    /**
     * 批量导入词汇
     * @param {string} lang
     * @param {Array} words
     */
    async importVocab(lang, words) {
      await this._ensureReady();
      const existing = await this.db.vocab.where('lang').equals(lang).count();
      if (existing > 0) {
        console.log(`[Storage] ${lang} 词汇已存在 ${existing} 条，跳过导入`);
        return { imported: 0, existing };
      }

      const records = words.map((w, idx) => ({
        ...w,
        lang,
        status: 'new', // new / learning / review / mastered
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: null,
        lastReview: null,
        lapses: 0,
        addedAt: Date.now(),
      }));

      await this.db.vocab.bulkAdd(records);
      console.log(`[Storage] 导入 ${lang} 词汇 ${records.length} 条`);
      return { imported: records.length, existing: 0 };
    }

    /**
     * 获取待复习卡片
     * @param {string} lang
     * @param {number} limit
     */
    async getDueCards(lang, limit = 20) {
      await this._ensureReady();
      const now = Date.now();

      // 获取到期需要复习的卡片
      const reviewCards = await this.db.vocab
        .where('[lang+status]')
        .equals([lang, 'review'])
        .filter((card) => card.nextReview && card.nextReview <= now)
        .limit(limit)
        .toArray();

      if (reviewCards.length >= limit) {
        return reviewCards;
      }

      // 如果复习卡不够，补充学习中卡片
      const remaining = limit - reviewCards.length;
      const learningCards = await this.db.vocab
        .where('[lang+status]')
        .equals([lang, 'learning'])
        .filter((card) => card.nextReview && card.nextReview <= now)
        .limit(remaining)
        .toArray();

      return [...reviewCards, ...learningCards];
    }

    /**
     * 获取新卡片
     * @param {string} lang
     * @param {number} limit
     */
    async getNewCards(lang, limit = 10) {
      await this._ensureReady();
      return this.db.vocab
        .where('[lang+status]')
        .equals([lang, 'new'])
        .limit(limit)
        .toArray();
    }

    /**
     * 更新卡片
     * @param {number} id
     * @param {object} updates
     */
    async updateCard(id, updates) {
      await this._ensureReady();
      await this.db.vocab.update(id, updates);
      return this.db.vocab.get(id);
    }

    /**
     * 获取词汇总数统计
     * @param {string} lang
     */
    async getVocabStats(lang) {
      await this._ensureReady();
      const [total, newCount, learning, review, mastered] = await Promise.all([
        this.db.vocab.where('lang').equals(lang).count(),
        this.db.vocab.where('[lang+status]').equals([lang, 'new']).count(),
        this.db.vocab.where('[lang+status]').equals([lang, 'learning']).count(),
        this.db.vocab.where('[lang+status]').equals([lang, 'review']).count(),
        this.db.vocab.where('[lang+status]').equals([lang, 'mastered']).count(),
      ]);

      return { total, new: newCount, learning, review, mastered };
    }

    // ---- 复习记录 ----

    /**
     * 添加复习记录
     * @param {object} review
     */
    async addReview(review) {
      await this._ensureReady();
      return this.db.reviews.add({
        ...review,
        reviewDate: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      });
    }

    // ---- 对话相关 ----

    /**
     * 创建对话
     * @param {string} lang
     * @param {string} scene
     * @param {string} title
     */
    async createConversation(lang, scene = 'free', title = '') {
      await this._ensureReady();
      const now = Date.now();
      const id = await this.db.conversations.add({
        lang,
        scene,
        title: title || this._getDefaultTitle(scene, lang),
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      });
      return { id, lang, scene, title, createdAt: now };
    }

    _getDefaultTitle(scene, lang) {
      const scenes = {
        free: '自由对话',
        restaurant: '餐厅点餐',
        airport: '机场出行',
        shopping: '购物',
        interview: '面试',
        grammar: '语法讲解',
        vocabulary: '词汇学习',
        translation: '翻译练习',
      };
      return scenes[scene] || '新对话';
    }

    /**
     * 获取对话列表
     * @param {string} lang
     * @param {number} limit
     */
    async getConversations(lang, limit = 20) {
      await this._ensureReady();
      return this.db.conversations
        .where('lang')
        .equals(lang)
        .reverse()
        .sortBy('updatedAt')
        .then((list) => list.slice(0, limit));
    }

    /**
     * 添加消息
     * @param {number} conversationId
     * @param {string} role - user / assistant
     * @param {string} content
     */
    async addMessage(conversationId, role, content) {
      await this._ensureReady();
      const msgId = await this.db.messages.add({
        conversationId,
        role,
        content,
        timestamp: Date.now(),
      });

      // 更新对话的时间和消息数
      const conv = await this.db.conversations.get(conversationId);
      if (conv) {
        await this.db.conversations.update(conversationId, {
          updatedAt: Date.now(),
          messageCount: (conv.messageCount || 0) + 1,
        });
      }

      return msgId;
    }

    /**
     * 获取对话消息
     * @param {number} conversationId
     */
    async getMessages(conversationId) {
      await this._ensureReady();
      return this.db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('timestamp');
    }

    /**
     * 删除对话
     * @param {number} conversationId
     */
    async deleteConversation(conversationId) {
      await this._ensureReady();
      await this.db.messages
        .where('conversationId')
        .equals(conversationId)
        .delete();
      await this.db.conversations.delete(conversationId);
    }

    // ---- 数据导出/导入 ----

    /**
     * 导出所有数据
     */
    async exportAll() {
      await this._ensureReady();
      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        settings: Settings.getAll(),
        stats: {
          overview: Stats.getOverview(),
          daily: LocalStore.get('stats.daily', {}),
        },
        vocab: await this.db.vocab.toArray(),
        reviews: await this.db.reviews.toArray(),
        conversations: await this.db.conversations.toArray(),
        messages: await this.db.messages.toArray(),
      };
      return data;
    }

    /**
     * 导入数据
     * @param {object} data
     */
    async importAll(data) {
      await this._ensureReady();

      if (data.settings) {
        LocalStore.set('settings', data.settings);
      }
      if (data.stats) {
        if (data.stats.overview) LocalStore.set('stats.overview', data.stats.overview);
        if (data.stats.daily) LocalStore.set('stats.daily', data.stats.daily);
      }

      if (data.vocab && data.vocab.length) {
        await this.db.vocab.clear();
        await this.db.vocab.bulkAdd(data.vocab);
      }
      if (data.reviews && data.reviews.length) {
        await this.db.reviews.clear();
        await this.db.reviews.bulkAdd(data.reviews);
      }
      if (data.conversations && data.conversations.length) {
        await this.db.conversations.clear();
        await this.db.conversations.bulkAdd(data.conversations);
      }
      if (data.messages && data.messages.length) {
        await this.db.messages.clear();
        await this.db.messages.bulkAdd(data.messages);
      }

      return true;
    }

    /**
     * 清空所有数据
     */
    async clearAll() {
      await this._ensureReady();
      await Promise.all([
        this.db.vocab.clear(),
        this.db.reviews.clear(),
        this.db.conversations.clear(),
        this.db.messages.clear(),
        this.db.decks.clear(),
        this.db.customVocab.clear(),
      ]);
      LocalStore.clearAll();
    }
  }

  // ============================================================
  // 5. 统一导出
  // ============================================================

  const LVStorage = {
    // localStorage 封装
    local: LocalStore,
    // 设置
    settings: Settings,
    // 统计
    stats: Stats,
    // IndexedDB
    db: new Database(),

    /**
     * 初始化存储系统
     */
    async init() {
      try {
        await this.db.init();
        console.log('[Storage] 存储系统初始化完成');
      } catch (e) {
        console.warn('[Storage] IndexedDB 不可用，仅使用 localStorage:', e);
      }
    },

    /**
     * 获取当前学习语种
     */
    getCurrentLang() {
      return Settings.get('currentLang');
    },

    /**
     * 设置当前学习语种
     */
    setCurrentLang(lang) {
      return Settings.update({ currentLang: lang });
    },
  };

  // 导出到全局
  global.LVStorage = LVStorage;
})(window);
