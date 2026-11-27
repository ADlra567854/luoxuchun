/**
 * 环球语堂 · 应用入口 + 路由
 *
 * 功能：
 * - Hash 路由（单页应用风格）
 * - 页面切换动画
 * - 全局状态管理
 * - 导航 / Tab Bar 交互
 * - 数据初始化
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 全局状态
  // ============================================================

  const AppState = {
    currentPage: 'home',
    currentLang: 'en',
    isInitialized: false,
    data: {
      stats: null,
      settings: null,
    },
  };

  // ============================================================
  // 2. 路由配置
  // ============================================================

  const routes = {
    home: {
      path: '#/',
      title: '环球语堂',
      render: renderHomePage,
    },
    languages: {
      path: '#/languages',
      title: '语种中心',
      render: renderLanguagesPage,
    },
    flashcards: {
      path: '#/flashcards',
      title: '闪卡学习',
      render: renderFlashcardsPage,
    },
    chat: {
      path: '#/chat',
      title: 'AI 对话',
      render: renderChatPage,
    },
    profile: {
      path: '#/profile',
      title: '个人中心',
      render: renderProfilePage,
    },
  };

  // ============================================================
  // 3. 应用初始化
  // ============================================================

  const LVApp = {
    /**
     * 初始化应用
     */
    async init() {
      if (AppState.isInitialized) return;

      console.log('[App] 环球语堂 正在初始化...');

      // 初始化存储
      if (global.LVStorage) {
        try {
          await LVStorage.init();
          AppState.currentLang = LVStorage.getCurrentLang();
          AppState.data.settings = LVStorage.settings.getAll();
          AppState.data.stats = LVStorage.stats.getOverview();
        } catch (e) {
          console.warn('[App] 存储初始化失败:', e);
        }
      }

      // 初始化主题
      if (global.LVTheme) {
        LVTheme.init();
      }

      // 初始化数据
      await this._initVocabData();

      // 设置路由
      this._setupRouter();

      // 设置导航交互
      this._setupNavigation();

      // 设置底部 Tab Bar
      this._setupTabBar();

      AppState.isInitialized = true;
      console.log('[App] 环球语堂 初始化完成');

      // 触发初始化完成事件
      document.dispatchEvent(new CustomEvent('lv:ready', { detail: AppState }));
    },

    /**
     * 初始化词汇数据
     */
    async _initVocabData() {
      if (!global.LVStorage) return;

      try {
        const stats = await LVStorage.db.getVocabStats(AppState.currentLang);
        if (stats.total === 0) {
          console.log('[App] 首次加载，导入词汇数据...');
          await this._loadVocabData(AppState.currentLang);
        }
      } catch (e) {
        console.warn('[App] 词汇数据初始化失败:', e);
      }
    },

    /**
     * 加载词汇数据
     */
    async _loadVocabData(lang) {
      try {
        const response = await fetch(`assets/data/${lang}/vocab.json`);
        if (!response.ok) return;
        const words = await response.json();
        await LVStorage.db.importVocab(lang, words);
      } catch (e) {
        console.warn(`[App] 加载 ${lang} 词汇数据失败:`, e);
      }
    },

    /**
     * 设置路由
     */
    _setupRouter() {
      // 监听 hash 变化
      window.addEventListener('hashchange', () => this._handleRouteChange());

      // 初始路由
      this._handleRouteChange();
    },

    /**
     * 处理路由变化
     */
    _handleRouteChange() {
      const hash = window.location.hash || '#/';
      let routeName = 'home';

      // 匹配路由
      for (const [name, route] of Object.entries(routes)) {
        if (hash === route.path || hash.startsWith(route.path + '/')) {
          routeName = name;
          break;
        }
      }

      // 切换语种页匹配
      if (hash.startsWith('#/languages/')) {
        routeName = 'languages';
      }

      AppState.currentPage = routeName;

      // 更新页面标题
      const route = routes[routeName];
      if (route && route.title) {
        document.title = route.title + ' · 环球语堂';
      }

      // 渲染页面
      this._renderPage(routeName);

      // 更新导航高亮
      this._updateNavActive(routeName);
    },

    /**
     * 渲染页面
     */
    _renderPage(routeName) {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) return;

      const route = routes[routeName];
      if (!route || !route.render) {
        mainContent.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="cc-ic" data-ic="search"></i></div><h3>页面未找到</h3><p>请返回首页</p></div>';
        return;
      }

      // 页面切换动画
      mainContent.style.opacity = '0';
      mainContent.style.transform = 'translateY(12px)';
      mainContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

      setTimeout(() => {
        route.render(mainContent);

        // 入场动画
        requestAnimationFrame(() => {
          mainContent.style.opacity = '1';
          mainContent.style.transform = 'translateY(0)';
        });

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    },

    /**
     * 更新导航激活状态
     */
    _updateNavActive(routeName) {
      document.querySelectorAll('[data-nav]').forEach((el) => {
        const nav = el.getAttribute('data-nav');
        if (nav === routeName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    },

    /**
     * 设置导航交互
     */
    _setupNavigation() {
      // 主题切换按钮
      document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (global.LVTheme) {
            const newTheme = LVTheme.toggleTheme();
            if (global.LVComponents) {
              LVComponents.toast.info(
                newTheme === 'deep' ? '已切换到深空纪元' : '已切换到云顶天空'
              );
            }
          }
        });
      });

      // 语种选择器
      const langSelector = document.querySelector('[data-lang-selector]');
      if (langSelector) {
        langSelector.addEventListener('click', (e) => {
          e.stopPropagation();
          langSelector.classList.toggle('open');
        });

        // 点击外部关闭
        document.addEventListener('click', () => {
          langSelector.classList.remove('open');
        });
      }

      // 语种切换
      document.querySelectorAll('[data-lang]').forEach((el) => {
        el.addEventListener('click', async (e) => {
          e.preventDefault();
          const lang = el.getAttribute('data-lang');
          await this.switchLanguage(lang);
        });
      });
    },

    /**
     * 设置底部 Tab Bar
     */
    _setupTabBar() {
      const tabBar = document.querySelector('.tab-bar');
      if (!tabBar) return;

      // 在移动端添加 body 类
      if (window.innerWidth <= 768) {
        document.body.classList.add('has-tab-bar');
      }

      window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
          document.body.classList.add('has-tab-bar');
        } else {
          document.body.classList.remove('has-tab-bar');
        }
      });
    },

    /**
     * 切换语种
     */
    async switchLanguage(lang) {
      AppState.currentLang = lang;

      if (global.LVStorage) {
        LVStorage.setCurrentLang(lang);

        // 检查该语种是否有数据，没有则导入
        const stats = await LVStorage.db.getVocabStats(lang);
        if (stats.total === 0) {
          await this._loadVocabData(lang);
        }
      }

      // 更新 UI
      document.querySelectorAll('[data-current-lang]').forEach((el) => {
        el.textContent = lang.toUpperCase();
      });

      // 关闭下拉
      document.querySelectorAll('.lang-selector').forEach((el) => {
        el.classList.remove('open');
      });

      if (global.LVComponents) {
        const langNames = { en: '英语', ja: '日语', ko: '韩语', fr: '法语', es: '西班牙语' };
        LVComponents.toast.success(`已切换到${langNames[lang] || lang}`);
      }

      // 刷新当前页面
      this._renderPage(AppState.currentPage);

      // 触发事件
      document.dispatchEvent(
        new CustomEvent('lv:langchange', { detail: { lang } })
      );
    },

    /**
     * 获取当前状态
     */
    getState() {
      return { ...AppState };
    },

    /**
     * 刷新统计数据
     */
    async refreshStats() {
      if (global.LVStorage) {
        AppState.data.stats = LVStorage.stats.getOverview();
      }
      return AppState.data.stats;
    },

    /**
     * 导航到指定页面
     */
    navigate(routeName) {
      const route = routes[routeName];
      if (route) {
        window.location.hash = route.path;
      }
    },
  };

  // ============================================================
  // 4. 页面渲染函数（各页面的主要结构，详细内容在各自 HTML 中也有）
  // ============================================================

  function renderHomePage(container) {
    // 首页内容由 index.html 的内联内容提供
    // 这里主要处理数据更新
    updateHomeStats();
  }

  function renderLanguagesPage(container) {
    // 语种中心
    container.innerHTML = `
      <div class="section">
        <div class="container">
          <div class="section-header">
            <h2><span class="grad">选择你想学习的语言</span></h2>
            <p class="section-desc">多语种一站畅学，切换不用换 App</p>
          </div>
          
          <div class="lang-grid" id="lang-grid">
            <!-- 语种卡片由 JS 动态渲染 -->
          </div>
        </div>
      </div>
    `;

    renderLanguageGrid();
  }

  function renderFlashcardsPage(container) {
    container.innerHTML = `
      <div class="section">
        <div class="container-narrow">
          <div class="section-header">
            <h2><span class="grad">闪卡学习</span></h2>
            <p class="section-desc">基于科学记忆算法，高效记忆词汇</p>
          </div>
          
          <div class="flashcard-container" id="flashcard-container">
            <div class="flashcard" id="flashcard">
              <div class="flashcard-face front">
                <div class="card-word">Loading...</div>
                <div class="card-phonetic">/ˈloʊdɪŋ/</div>
                <div class="card-hint">
                  <i class="cc-ic" data-ic="hand"></i> 点击卡片查看释义
                </div>
              </div>
              <div class="flashcard-face back">
                <div class="card-pos">v.</div>
                <div class="card-meaning">加载中</div>
                <div class="card-example">
                  正在加载词汇数据...
                </div>
              </div>
            </div>
          </div>
          
          <div class="flashcard-actions" id="flashcard-actions">
            <button class="rate-btn rate-again">
              <span>不认识</span>
              <span class="rate-time">现在</span>
            </button>
            <button class="rate-btn rate-hard">
              <span>模糊</span>
              <span class="rate-time">1天</span>
            </button>
            <button class="rate-btn rate-good">
              <span>认识</span>
              <span class="rate-time">4天</span>
            </button>
            <button class="rate-btn rate-easy">
              <span>简单</span>
              <span class="rate-time">7天</span>
            </button>
          </div>
          
          <div style="text-align:center;margin-top:24px;color:var(--muted);font-size:13px">
            <span id="card-progress">0 / 0</span>
          </div>
        </div>
      </div>
    `;

    // 初始化闪卡
    initFlashcards();
  }

  function renderChatPage(container) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:calc(100vh - 64px)">
        <!-- 场景选择 -->
        <div style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;gap:8px;overflow-x:auto;scrollbar-width:none">
          <div class="scene-tag active" data-scene="free"><i class="cc-ic" data-ic="message-circle"></i> 自由对话</div>
          <div class="scene-tag" data-scene="restaurant"><i class="cc-ic" data-ic="utensils"></i> 餐厅</div>
          <div class="scene-tag" data-scene="airport"><i class="cc-ic" data-ic="plane"></i> 机场</div>
          <div class="scene-tag" data-scene="shopping"><i class="cc-ic" data-ic="shopping-bag"></i> 购物</div>
          <div class="scene-tag" data-scene="interview"><i class="cc-ic" data-ic="briefcase"></i> 面试</div>
          <div class="scene-tag" data-scene="grammar"><i class="cc-ic" data-ic="book-open"></i> 语法</div>
          <div class="scene-tag" data-scene="vocabulary"><i class="cc-ic" data-ic="notebook-pen"></i> 词汇</div>
        </div>
        
        <!-- 聊天区 -->
        <div class="chat-container" id="chat-container" style="flex:1;overflow-y:auto">
          <div class="message ai">
            <div class="msg-avatar">AI</div>
            <div>
              <div class="msg-bubble">
                你好！我是你的 AI 语言学习伙伴。选择一个场景开始练习，或者直接开始自由对话吧！
              </div>
            </div>
          </div>
        </div>
        
        <!-- 输入区 -->
        <div style="padding:12px 16px;border-top:1px solid var(--line);display:flex;gap:10px;align-items:flex-end">
          <textarea 
            id="chat-input" 
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            rows="1"
            style="flex:1;resize:none;max-height:120px;padding:12px 16px;border-radius:14px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text);font-size:14px;outline:none;line-height:1.5;transition:border-color 0.2s"
          ></textarea>
          <button class="btn btn-primary" id="send-btn" style="padding:12px 20px">
            发送
          </button>
        </div>
      </div>
    `;

    initChat();
  }

  function renderProfilePage(container) {
    const stats = AppState.data.stats || {
      totalCardsStudied: 0,
      streak: 0,
      level: 1,
      xp: 0,
    };

    const xpForCurrentLevel = (stats.level - 1) * (stats.level - 1) * 100;
    const xpForNextLevel = stats.level * stats.level * 100;
    const xpProgress = stats.level === 1
      ? (stats.xp / xpForNextLevel) * 100
      : ((stats.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

    container.innerHTML = `
      <div class="section">
        <div class="container-narrow">
          <!-- 用户信息卡 -->
          <div class="progress-panel" style="margin-bottom:24px">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
              <div style="width:64px;height:64px;border-radius:18px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;font-weight:800;box-shadow:0 6px 18px rgba(91,140,255,0.35)">
                学
              </div>
              <div style="flex:1">
                <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">语言探索者</h2>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)">
                  <span class="badge badge-level">Lv.${stats.level}</span>
                  <span>${stats.xp} XP</span>
                </div>
              </div>
            </div>
            <div class="progress-with-label">
              <div class="progress">
                <div class="progress-bar" style="width:${Math.min(xpProgress, 100)}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:6px">
                <span>Lv.${stats.level}</span>
                <span>${stats.xp - xpForCurrentLevel} / ${xpForNextLevel - xpForCurrentLevel} XP</span>
                <span>Lv.${stats.level + 1}</span>
              </div>
            </div>
          </div>
          
          <!-- 数据统计 -->
          <div class="grid grid-3" style="margin-bottom:24px">
            <div class="stat-card">
              <div class="stat-value">${stats.streak}</div>
              <div class="stat-label">连续学习天数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.totalCardsStudied}</div>
              <div class="stat-label">已学卡片数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.maxStreak || 0}</div>
              <div class="stat-label">最长连胜</div>
            </div>
          </div>
          
          <!-- 学习热力图 -->
          <div class="progress-panel" style="margin-bottom:24px">
            <div class="panel-header">
              <div class="panel-title"><span class="icon"><i class="cc-ic" data-ic="calendar-days"></i></span> 学习日历</div>
            </div>
            <div id="heatmap-container"></div>
          </div>
          
          <!-- 设置项 -->
          <div class="progress-panel">
            <div class="panel-header">
              <div class="panel-title"><span class="icon"><i class="cc-ic" data-ic="settings"></i></span> 设置</div>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)">
                <div>
                  <div style="font-weight:600;font-size:14px">主题模式</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">深空纪元 / 云顶天空</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="profile-theme-toggle">
                  切换主题
                </button>
              </div>
              
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)">
                <div>
                  <div style="font-weight:600;font-size:14px">每日目标</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">每天学习 ${AppState.data.settings?.dailyGoal || 20} 张卡片</div>
                </div>
                <select id="daily-goal-select" style="width:auto;padding:8px 12px;font-size:13px">
                  <option value="10">10 张</option>
                  <option value="20">20 张</option>
                  <option value="30">30 张</option>
                  <option value="50">50 张</option>
                </select>
              </div>
              
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0">
                <div>
                  <div style="font-weight:600;font-size:14px">数据导出</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">导出学习数据备份</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="export-data-btn">
                  导出
                </button>
              </div>
            </div>
          </div>
          
          <div style="text-align:center;margin-top:24px">
            <button class="btn btn-danger btn-sm" id="clear-data-btn">
              清除所有数据
            </button>
          </div>
          
          <div style="text-align:center;margin-top:20px;font-size:12px;color:var(--dim)">
            环球语堂 v1.0.0 · MVP
          </div>
        </div>
      </div>
    `;

    // 渲染热力图
    if (global.LVStorage && global.LVComponents) {
      const heatmapData = LVStorage.stats.getHeatmapData();
      LVComponents.renderHeatmap(
        document.getElementById('heatmap-container'),
        heatmapData
      );
    }

    // 绑定事件
    const themeBtn = document.getElementById('profile-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        if (global.LVTheme) LVTheme.toggleTheme();
      });
    }

    const goalSelect = document.getElementById('daily-goal-select');
    if (goalSelect && AppState.data.settings) {
      goalSelect.value = AppState.data.settings.dailyGoal;
      goalSelect.addEventListener('change', (e) => {
        if (global.LVStorage) {
          LVStorage.settings.update({ dailyGoal: parseInt(e.target.value) });
          AppState.data.settings = LVStorage.settings.getAll();
          if (global.LVComponents) {
            LVComponents.toast.success('每日目标已更新');
          }
        }
      });
    }

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (global.LVStorage) {
          try {
            const data = await LVStorage.db.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linguavista-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            LVComponents.toast.success('数据导出成功');
          } catch (e) {
            LVComponents.toast.error('导出失败');
          }
        }
      });
    }

    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (global.LVComponents) {
          const confirmed = await LVComponents.confirmDialog(
            '确定要清除所有学习数据吗？此操作不可撤销。'
          );
          if (confirmed && global.LVStorage) {
            await LVStorage.db.clearAll();
            LVComponents.toast.success('数据已清除');
            setTimeout(() => location.reload(), 1000);
          }
        }
      });
    }
  }

  // ============================================================
  // 5. 首页数据更新
  // ============================================================

  function updateHomeStats() {
    const stats = AppState.data.stats || {
      streak: 0,
      totalCardsStudied: 0,
      level: 1,
      xp: 0,
    };

    // 更新 streak
    const streakEl = document.getElementById('streak-count');
    if (streakEl) {
      streakEl.textContent = stats.streak;
    }

    // 更新等级
    const levelEl = document.getElementById('user-level');
    if (levelEl) {
      levelEl.textContent = 'Lv.' + stats.level;
    }

    // 更新今日进度
    const dailyGoal = AppState.data.settings?.dailyGoal || 20;
    const today = new Date().toISOString().split('T')[0];
    const daily = global.LVStorage
      ? (LVStorage.local.get('stats.daily', {})[today]?.cardsStudied || 0)
      : 0;
    const percent = Math.min((daily / dailyGoal) * 100, 100);

    const todayCountEl = document.getElementById('today-count');
    if (todayCountEl) {
      todayCountEl.textContent = daily + ' / ' + dailyGoal;
    }

    // 环形进度
    const ringEl = document.getElementById('today-progress-ring');
    if (ringEl && global.LVComponents) {
      LVComponents.renderRingProgress(ringEl, percent, {
        size: 80,
        strokeWidth: 7,
        label: '今日进度',
      });
    }
  }

  // ============================================================
  // 6. 语种网格渲染
  // ============================================================

  function renderLanguageGrid() {
    const grid = document.getElementById('lang-grid');
    if (!grid) return;

    const languages = [
      { code: 'en', name: '英语', native: 'English', flag: '🇺🇸', color: 'var(--lang-en)' },
      { code: 'ja', name: '日语', native: '日本語', flag: '🇯🇵', color: 'var(--lang-ja)' },
      { code: 'ko', name: '韩语', native: '한국어', flag: '🇰🇷', color: 'var(--lang-ko)', comingSoon: true },
      { code: 'fr', name: '法语', native: 'Français', flag: '🇫🇷', color: 'var(--lang-fr)', comingSoon: true },
      { code: 'es', name: '西班牙语', native: 'Español', flag: '🇪🇸', color: 'var(--lang-es)', comingSoon: true },
      { code: 'de', name: '德语', native: 'Deutsch', flag: '🇩🇪', color: 'var(--lang-de)', comingSoon: true },
    ];

    grid.innerHTML = languages
      .map(
        (lang) => `
        <div class="lang-card ${lang.comingSoon ? 'coming-soon' : ''}" 
             style="--lang-color:${lang.color}"
             data-lang-card="${lang.code}">
          ${lang.comingSoon ? '<span class="cs-badge">即将推出</span>' : ''}
          <div class="lang-flag">${lang.flag}</div>
          <div class="lang-name">${lang.name}</div>
          <div class="lang-native">${lang.native}</div>
          <div class="lang-progress">
            <span class="lang-level" style="background:${lang.comingSoon ? 'var(--chip-bg)' : 'var(--lang-color)'};color:${lang.comingSoon ? 'var(--muted)' : '#fff'}">
              ${lang.comingSoon ? '敬请期待' : '开始学习'}
            </span>
          </div>
        </div>
      `
      )
      .join('');

    // 绑定点击事件
    grid.querySelectorAll('.lang-card').forEach((card) => {
      card.addEventListener('click', () => {
        const code = card.getAttribute('data-lang-card');
        const lang = languages.find((l) => l.code === code);
        if (lang && !lang.comingSoon) {
          LVApp.switchLanguage(code);
          global.location.hash = '#/flashcards';
        } else if (global.LVComponents) {
          LVComponents.toast.info('该语种即将推出，敬请期待！');
        }
      });
    });
  }

  // ============================================================
  // 7. 闪卡学习
  // ============================================================

  let flashcardState = {
    cards: [],
    currentIndex: 0,
    isFlipped: false,
  };

  async function initFlashcards() {
    const card = document.getElementById('flashcard');
    if (!card) return;

    // 加载卡片
    if (global.LVStorage) {
      const lang = AppState.currentLang;
      const dueCards = await LVStorage.db.getDueCards(lang, 15);
      const newCards = await LVStorage.db.getNewCards(lang, 5);
      flashcardState.cards = [...dueCards, ...newCards];
    }

    if (flashcardState.cards.length === 0) {
      // 没有卡片时的空状态
      const container = document.getElementById('flashcard-container');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="cc-ic" data-ic="party-popper"></i></div>
            <h3>今天的学习完成啦！</h3>
            <p>所有待复习卡片都已完成，明天再来吧～</p>
            <button class="btn btn-primary mt-4" onclick="location.reload()">
              刷新获取更多
            </button>
          </div>
        `;
      }
      return;
    }

    flashcardState.currentIndex = 0;
    displayCurrentCard();

    // 卡片点击翻转
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      flashcardState.isFlipped = !flashcardState.isFlipped;
    });

    // 评分按钮
    document.querySelectorAll('.rate-btn').forEach((btn, idx) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await rateCard(idx);
      });
    });

    // 键盘快捷键
    document.addEventListener('keydown', handleFlashcardKeypress);
  }

  function displayCurrentCard() {
    const card = flashcardState.cards[flashcardState.currentIndex];
    if (!card) return;

    const cardEl = document.getElementById('flashcard');
    if (!cardEl) return;

    // 重置翻转状态
    cardEl.classList.remove('flipped');
    flashcardState.isFlipped = false;

    // 更新正面
    const frontWord = cardEl.querySelector('.front .card-word');
    const frontPhonetic = cardEl.querySelector('.front .card-phonetic');
    if (frontWord) frontWord.textContent = card.word || card.term || '';
    if (frontPhonetic)
      frontPhonetic.textContent = card.phonetic || card.kana || '';

    // 更新背面
    const backPos = cardEl.querySelector('.back .card-pos');
    const backMeaning = cardEl.querySelector('.back .card-meaning');
    const backExample = cardEl.querySelector('.back .card-example');
    if (backPos) backPos.textContent = card.pos || 'n.';
    if (backMeaning) backMeaning.textContent = card.meaning || card.definition || '';
    if (backExample)
      backExample.textContent = card.example || card.sentence || '暂无例句';

    // 更新进度
    const progressEl = document.getElementById('card-progress');
    if (progressEl) {
      progressEl.textContent = `${flashcardState.currentIndex + 1} / ${flashcardState.cards.length}`;
    }

    // 更新评分按钮的下次复习时间
    if (global.LVSRS) {
      const times = [0, 1, 2, 3].map((q) =>
        LVSRS.getNextReviewText(card, q)
      );
      const btnEls = document.querySelectorAll('.rate-btn .rate-time');
      btnEls.forEach((el, i) => {
        if (times[i]) el.textContent = times[i];
      });
    }
  }

  async function rateCard(quality) {
    const card = flashcardState.cards[flashcardState.currentIndex];
    if (!card) return;

    // 更新 SRS 数据
    if (global.LVSRS && global.LVStorage) {
      const updates = LVSRS.getNextReview(card, quality);
      await LVStorage.db.updateCard(card.id, updates);

      // 记录复习
      await LVStorage.db.addReview({
        cardId: card.id,
        lang: AppState.currentLang,
        quality,
        interval: updates.interval,
      });
    }

    // 下一张
    flashcardState.currentIndex++;

    if (flashcardState.currentIndex >= flashcardState.cards.length) {
      // 学习完成
      await finishFlashcardSession();
    } else {
      displayCurrentCard();
    }
  }

  async function finishFlashcardSession() {
    // 记录学习会话
    if (global.LVStorage) {
      const session = {
        cardsStudied: flashcardState.cards.length,
        correct: flashcardState.cards.filter((_, i) => i > 0).length, // 简化计算
        duration: 300, // 假设 5 分钟
      };
      LVStorage.stats.recordSession(session);
      AppState.data.stats = LVStorage.stats.getOverview();
    }

    const container = document.getElementById('flashcard-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="font-size:56px"><i class="cc-ic" data-ic="party-popper"></i></div>
          <h3 style="font-size:22px">本轮学习完成！</h3>
          <p>共学习了 ${flashcardState.cards.length} 张卡片</p>
          <div class="mt-4">
            <span class="badge badge-level">+${flashcardState.cards.length * 10} XP</span>
          </div>
          <button class="btn btn-primary mt-4" onclick="location.hash='#/'">
            返回首页
          </button>
        </div>
      `;
    }

    if (global.LVComponents) {
      LVComponents.toast.success('学习完成，继续加油！');
    }
  }

  function handleFlashcardKeypress(e) {
    if (AppState.currentPage !== 'flashcards') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        document.getElementById('flashcard')?.click();
        break;
      case '1':
        rateCard(0);
        break;
      case '2':
        rateCard(1);
        break;
      case '3':
        rateCard(2);
        break;
      case '4':
        rateCard(3);
        break;
    }
  }

  // ============================================================
  // 8. AI 对话
  // ============================================================

  let chatInstance = null;
  let currentScene = 'free';

  function initChat() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const container = document.getElementById('chat-container');

    if (!input || !sendBtn) return;

    // 自动调整高度
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // 发送消息
    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      input.style.height = 'auto';

      if (!chatInstance) {
        chatInstance = new LVAIChat({
          lang: AppState.currentLang,
          scene: currentScene,
        });
        await chatInstance.startNewConversation();
      }

      // 添加用户消息
      appendMessage('user', text);

      // 添加 AI 消息（流式）
      const aiMsgEl = appendMessage('ai', '', true);

      chatInstance.onStream = (content, isDone) => {
        const bubble = aiMsgEl.querySelector('.msg-bubble');
        if (bubble) {
          bubble.innerHTML = LVAIChat.renderMarkdown(content);
        }
        if (isDone) {
          // 消息完成
        }
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
      };

      await chatInstance.sendMessage(text);
    };

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 场景切换
    document.querySelectorAll('.scene-tag').forEach((tag) => {
      tag.addEventListener('click', () => {
        const scene = tag.getAttribute('data-scene');
        if (scene === currentScene) return;

        currentScene = scene;
        chatInstance = null;

        // 更新激活状态
        document.querySelectorAll('.scene-tag').forEach((t) =>
          t.classList.remove('active')
        );
        tag.classList.add('active');

        // 清空聊天并显示欢迎语
        container.innerHTML = `
          <div class="message ai">
            <div class="msg-avatar">AI</div>
            <div>
              <div class="msg-bubble">
                已切换到「${tag.textContent.trim()}」场景，开始练习吧！
              </div>
            </div>
          </div>
        `;
      });
    });
  }

  function appendMessage(role, content, isStreaming = false) {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    const avatar = role === 'ai' ? 'AI' : '我';
    const bubbleContent = isStreaming
      ? '<div class="typing-indicator"><span></span><span></span><span></span></div>'
      : LVAIChat.renderMarkdown(content);

    msgEl.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div style="flex:1;min-width:0">
        <div class="msg-bubble">${bubbleContent}</div>
      </div>
    `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;

    return msgEl;
  }

  // ============================================================
  // 9. 导出
  // ============================================================

  global.LVApp = LVApp;
  global.LVRoutes = routes;

  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LVApp.init());
  } else {
    LVApp.init();
  }
})(window);
