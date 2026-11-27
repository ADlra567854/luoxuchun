/**
 * 环球语堂 · 通用组件 JS
 * 包含：
 * - 通用 UI 组件交互
 * - 模态框
 * - 下拉菜单
 * - Toast 提示
 * - 环形进度渲染
 * - 热力图渲染
 */

(function (global) {
  'use strict';

  const LVComponents = {
    // ============================================================
    // Toast 提示
    // ============================================================

    toast: {
      _container: null,

      _ensureContainer() {
        if (!this._container) {
          this._container = document.createElement('div');
          this._container.className = 'toast-container';
          this._container.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
          `;
          document.body.appendChild(this._container);
        }
        return this._container;
      },

      show(message, type = 'info', duration = 2500) {
        const container = this._ensureContainer();

        const icons = {
          success: 'circle-check',
          error: 'circle-x',
          warning: 'triangle-alert',
          info: 'info',
        };

        const colors = {
          success: 'var(--green)',
          error: 'var(--red)',
          warning: 'var(--gold)',
          info: 'var(--blue)',
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 14px;
          background: var(--glass-strong);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--line);
          box-shadow: var(--float-shadow);
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          max-width: 90vw;
          animation: toastIn 0.3s ease;
          pointer-events: auto;
        `;

        toast.innerHTML = `
          <span style="color:${colors[type]};font-weight:700;display:inline-flex;align-items:center"><i class="cc-ic" data-ic="${icons[type]}"></i></span>
          <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
          toast.style.animation = 'toastOut 0.3s ease forwards';
          setTimeout(() => toast.remove(), 300);
        }, duration);
      },

      success(msg, duration) {
        this.show(msg, 'success', duration);
      },
      error(msg, duration) {
        this.show(msg, 'error', duration);
      },
      warning(msg, duration) {
        this.show(msg, 'warning', duration);
      },
      info(msg, duration) {
        this.show(msg, 'info', duration);
      },
    },

    // ============================================================
    // 模态框
    // ============================================================

    modal: {
      /**
       * 显示模态框
       * @param {object} options
       */
      show(options) {
        const { title, content, onConfirm, onCancel, confirmText, cancelText } =
          {
            title: '提示',
            content: '',
            onConfirm: null,
            onCancel: null,
            confirmText: '确定',
            cancelText: '取消',
            ...options,
          };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay open';
        overlay.innerHTML = `
          <div class="modal">
            <div class="modal-header">
              <h3>${title}</h3>
              <button class="modal-close" aria-label="关闭"><i class="cc-ic" data-ic="x"></i></button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer">
              <button class="btn btn-secondary modal-cancel">${cancelText}</button>
              <button class="btn btn-primary modal-confirm">${confirmText}</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const close = () => {
          overlay.classList.remove('open');
          document.body.style.overflow = '';
          setTimeout(() => overlay.remove(), 300);
        };

        overlay.querySelector('.modal-close').onclick = () => {
          if (onCancel) onCancel();
          close();
        };

        overlay.querySelector('.modal-cancel').onclick = () => {
          if (onCancel) onCancel();
          close();
        };

        overlay.querySelector('.modal-confirm').onclick = () => {
          if (onConfirm) onConfirm();
          close();
        };

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            if (onCancel) onCancel();
            close();
          }
        });

        return { close };
      },

      /**
       * 确认对话框
       */
      confirm(message, onConfirm) {
        return this.show({
          title: '确认',
          content: `<p style="color:var(--text-secondary);line-height:1.7">${message}</p>`,
          onConfirm,
        });
      },
    },

    // ============================================================
    // 环形进度渲染
    // ============================================================

    /**
     * 渲染环形进度
     * @param {HTMLElement} container
     * @param {number} percent - 0-100
     * @param {object} options
     */
    renderRingProgress(container, percent, options = {}) {
      const { size = 100, strokeWidth = 8, label = '', value = null } = options;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percent / 100) * circumference;

      container.innerHTML = `
        <div class="progress-ring" style="width:${size}px;height:${size}px">
          <svg width="${size}" height="${size}">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:var(--cyan)" />
                <stop offset="50%" style="stop-color:var(--blue)" />
                <stop offset="100%" style="stop-color:var(--purple)" />
              </linearGradient>
            </defs>
            <circle
              class="ring-bg"
              cx="${size / 2}"
              cy="${size / 2}"
              r="${radius}"
              fill="none"
              stroke-width="${strokeWidth}"
            />
            <circle
              class="ring-fill"
              cx="${size / 2}"
              cy="${size / 2}"
              r="${radius}"
              fill="none"
              stroke-width="${strokeWidth}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}"
              style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
            />
          </svg>
          <div class="ring-text">
            <div class="ring-value">${value !== null ? value : Math.round(percent) + '%'}</div>
            ${label ? `<div class="ring-label">${label}</div>` : ''}
          </div>
        </div>
      `;

      // 动画触发
      requestAnimationFrame(() => {
        setTimeout(() => {
          const fill = container.querySelector('.ring-fill');
          if (fill) {
            fill.style.strokeDashoffset = offset;
          }
        }, 100);
      });
    },

    // ============================================================
    // 热力图渲染
    // ============================================================

    /**
     * 渲染学习热力图（类似 GitHub 贡献图）
     * @param {HTMLElement} container
     * @param {Array} data - [{date, count, level}]
     */
    renderHeatmap(container, data) {
      if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无学习数据</div>';
        return;
      }

      // 按周分组
      const weeks = [];
      let currentWeek = [];

      // 找到第一天是星期几
      const firstDate = new Date(data[0].date);
      const firstDayOfWeek = firstDate.getDay();

      // 填充第一周前面的空白
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(null);
      }

      data.forEach((day) => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });

      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      const levelColors = [
        'var(--chip-bg)',
        'rgba(56, 225, 255, 0.3)',
        'rgba(56, 225, 255, 0.55)',
        'rgba(91, 140, 255, 0.75)',
        'rgba(139, 92, 246, 0.95)',
      ];

      let html = `
        <div class="heatmap" style="display:flex;gap:3px;overflow-x:auto;padding:8px 0">
          ${weeks
            .map(
              (week) => `
            <div style="display:flex;flex-direction:column;gap:3px">
              ${week
                .map(
                  (day) =>
                    `<div 
                  class="heatmap-cell"
                  style="width:12px;height:12px;border-radius:3px;background:${
                    day ? levelColors[day.level] || levelColors[0] : 'transparent'
                  }"
                  title="${day ? day.date + '：学习 ' + day.count + ' 张卡片' : ''}"
                ></div>`
                )
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:var(--muted);justify-content:flex-end">
          <span>少</span>
          ${levelColors
            .map(
              (c) =>
                `<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${c}"></span>`
            )
            .join('')}
          <span>多</span>
        </div>
      `;

      container.innerHTML = html;
    },

    // ============================================================
    // 确认弹窗（轻量）
    // ============================================================

    /**
     * 显示确认对话框
     * @param {string} message
     * @returns {Promise<boolean>}
     */
    confirmDialog(message) {
      return new Promise((resolve) => {
        this.modal.show({
          title: '确认',
          content: `<p style="color:var(--text-secondary)">${message}</p>`,
          confirmText: '确定',
          cancelText: '取消',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },

    // ============================================================
    // 数字增长动画
    // ============================================================

    /**
     * 数字滚动动画
     * @param {HTMLElement} element
     * @param {number} target
     * @param {number} duration
     */
    animateNumber(element, target, duration = 1000) {
      const start = 0;
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (target - start) * eased);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    },

    // ============================================================
    // 初始化通用组件
    // ============================================================

    init() {
      // 添加 toast 动画样式
      if (!document.getElementById('lv-toast-style')) {
        const style = document.createElement('style');
        style.id = 'lv-toast-style';
        style.textContent = `
          @keyframes toastIn {
            from { opacity: 0; transform: translateY(-12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes toastOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-8px); }
          }
        `;
        document.head.appendChild(style);
      }
    },
  };

  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LVComponents.init());
  } else {
    LVComponents.init();
  }

  global.LVComponents = LVComponents;
})(window);
