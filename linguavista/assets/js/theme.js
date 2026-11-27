/**
 * 环球语堂 · 主题管理模块
 * 支持深空纪元（deep）/ 云顶天空（cloud）双主题
 * 与白驹主站主题系统兼容，使用相同的 localStorage key
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'ccowork.theme';
  const DEFAULT_THEME = 'deep';

  const ThemeManager = {
    /**
     * 初始化主题
     */
    init() {
      const savedTheme = this.getTheme();
      this.applyTheme(savedTheme);
      this._setupSystemThemeListener();
    },

    /**
     * 获取当前主题
     * @returns {'deep'|'cloud'}
     */
    getTheme() {
      try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
      } catch (e) {
        return DEFAULT_THEME;
      }
    },

    /**
     * 设置主题
     * @param {'deep'|'cloud'} theme
     */
    setTheme(theme) {
      if (theme !== 'deep' && theme !== 'cloud') {
        console.warn('[Theme] 无效的主题:', theme);
        return;
      }

      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {
        console.warn('[Theme] 无法保存主题设置:', e);
      }

      this.applyTheme(theme);
      this._dispatchThemeChange(theme);
    },

    /**
     * 切换主题
     */
    toggleTheme() {
      const current = this.getTheme();
      const next = current === 'deep' ? 'cloud' : 'deep';
      this.setTheme(next);
      return next;
    },

    /**
     * 应用主题到 DOM
     * @param {string} theme
     */
    applyTheme(theme) {
      if (!document.body) return;

      // 添加过渡类
      document.body.classList.add('theme-transitioning');

      document.body.setAttribute('data-theme', theme);

      // 更新主题切换按钮图标
      this._updateToggleButton(theme);

      // 移除过渡类
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 400);
    },

    /**
     * 检查是否为深色主题
     * @returns {boolean}
     */
    isDark() {
      return this.getTheme() === 'deep';
    },

    /**
     * 监听系统主题变化（首次加载时跟随系统）
     */
    _setupSystemThemeListener() {
      // 仅在用户没有手动设置过主题时跟随系统
      try {
        const hasUserSet = localStorage.getItem(STORAGE_KEY);
        if (hasUserSet) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemTheme = mediaQuery.matches ? 'deep' : 'cloud';
        this.applyTheme(systemTheme);

        // 监听系统主题变化
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', (e) => {
            // 只有用户没有手动设置过时才跟随
            const userSet = localStorage.getItem(STORAGE_KEY + '.userSet');
            if (!userSet) {
              this.applyTheme(e.matches ? 'deep' : 'cloud');
            }
          });
        }
      } catch (e) {
        // ignore
      }
    },

    /**
     * 更新主题切换按钮状态
     */
    _updateToggleButton(theme) {
      const buttons = document.querySelectorAll('[data-theme-toggle]');
      buttons.forEach((btn) => {
        const label = theme === 'deep' ? '云顶天空' : '深空纪元';
        btn.title = label;
        btn.setAttribute('aria-label', label);
        // 统一使用主站双图标结构，不再用 emoji
        if (!btn.querySelector('.cc-theme-ics')) {
          btn.innerHTML = '<span class="cc-theme-ics" aria-hidden="true"><i class="cc-ic cc-ic-moon" data-ic="moon"></i><i class="cc-ic cc-ic-sun" data-ic="sun"></i></span>';
        }
      });
    },

    /**
     * 派发主题变更事件
     */
    _dispatchThemeChange(theme) {
      const event = new CustomEvent('themechange', {
        detail: { theme },
        bubbles: true,
      });
      document.dispatchEvent(event);
    },
  };

  // 导出到全局
  global.LVTheme = ThemeManager;

  // 自动初始化（DOM 就绪后）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
  } else {
    ThemeManager.init();
  }
})(window);
