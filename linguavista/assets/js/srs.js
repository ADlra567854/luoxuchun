/**
 * 环球语堂 · SRS 间隔重复算法模块
 * MVP 使用简化版 SM-2 算法
 * 预留 FSRS 升级接口
 *
 * SM-2 算法核心参数：
 * - interval: 复习间隔（天）
 * - repetitions: 连续正确次数
 * - easeFactor: 易度因子（初始 2.5，最低 1.3）
 *
 * 评分等级：
 * - 0 (Again): 完全不记得，重新学习
 * - 1 (Hard): 勉强记得，难度较大
 * - 2 (Good): 正常难度，记得
 * - 3 (Easy): 太简单了
 */

(function (global) {
  'use strict';

  const SRS = {
    /**
     * 默认参数
     */
    defaults: {
      initialEaseFactor: 2.5,
      minEaseFactor: 1.3,
      easeBonus: 0.1, // easy 时增加的易度因子
      easePenalty: 0.15, // hard 时减少的易度因子
      againPenalty: 0.2, // again 时减少的易度因子
      firstInterval: 1, // 第一次正确后间隔 1 天
      secondInterval: 6, // 第二次正确后间隔 6 天
      fuzzFactor: 0.05, // 随机扰动范围（±5%），避免卡片扎堆
    },

    /**
     * 计算下一次复习时间
     * @param {object} card - 卡片数据
     * @param {number} quality - 评分 (0-3)
     * @returns {object} 更新后的卡片数据
     */
    getNextReview(card, quality) {
      const opts = this.defaults;
      let {
        interval = 0,
        repetitions = 0,
        easeFactor = opts.initialEaseFactor,
        lapses = 0,
        status = 'new',
      } = card;

      const now = Date.now();
      const DAY_MS = 86400000;

      // 处理不同评分
      if (quality === 0) {
        // Again - 忘记了，重置
        repetitions = 0;
        interval = 0; // 立即复习
        easeFactor = Math.max(opts.minEaseFactor, easeFactor - opts.againPenalty);
        lapses += 1;
        status = 'relearning';
      } else if (quality === 1) {
        // Hard - 比较难
        if (repetitions === 0) {
          interval = 1; // 第一次答错（hard 也算认识），第二天复习
        } else if (repetitions === 1) {
          interval = Math.max(1, Math.round(opts.secondInterval * 0.6));
        } else {
          interval = Math.max(1, Math.round(interval * easeFactor * 0.8));
        }
        easeFactor = Math.max(opts.minEaseFactor, easeFactor - opts.easePenalty);
        status = repetitions < 3 ? 'learning' : 'review';
        repetitions = Math.max(1, repetitions);
      } else if (quality === 2) {
        // Good - 正常
        if (repetitions === 0) {
          interval = opts.firstInterval;
        } else if (repetitions === 1) {
          interval = opts.secondInterval;
        } else {
          interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
        status = repetitions < 3 ? 'learning' : 'review';
      } else if (quality === 3) {
        // Easy - 太简单了
        if (repetitions === 0) {
          interval = opts.secondInterval;
        } else if (repetitions === 1) {
          interval = Math.round(opts.secondInterval * 1.5);
        } else {
          interval = Math.round(interval * easeFactor * 1.3);
        }
        easeFactor += opts.easeBonus;
        repetitions += 1;
        status = repetitions < 2 ? 'learning' : 'review';

        // 足够多次且间隔较长，标记为已掌握
        if (repetitions >= 5 && interval >= 30) {
          status = 'mastered';
        }
      }

      // 添加随机扰动，避免卡片扎堆
      if (interval > 1) {
        const fuzz = interval * opts.fuzzFactor * (Math.random() * 2 - 1);
        interval = Math.max(1, Math.round(interval + fuzz));
      }

      // 计算下次复习时间
      const nextReview = now + interval * DAY_MS;

      return {
        interval,
        repetitions,
        easeFactor: Math.round(easeFactor * 100) / 100,
        lapses,
        status,
        nextReview,
        lastReview: now,
      };
    },

    /**
     * 更新卡片（便捷方法）
     * @param {object} card
     * @param {number} quality
     * @returns {object} 完整的更新后卡片
     */
    updateCard(card, quality) {
      const updates = this.getNextReview(card, quality);
      return {
        ...card,
        ...updates,
      };
    },

    /**
     * 计算记忆保持率（理论值）
     * 基于 SM-2 的简化模型：R = e^(-t / S)
     * 其中 t 是距上次复习的天数，S 是稳定性（≈ interval）
     *
     * @param {number} interval - 当前间隔（天）
     * @param {number} daysSinceReview - 距上次复习天数
     * @returns {number} 0-1 之间的保持率
     */
    calculateRetention(interval, daysSinceReview) {
      if (interval <= 0) return 0;
      const stability = interval; // 简化：用间隔作为稳定性指标
      const retention = Math.exp(-daysSinceReview / stability);
      return Math.max(0, Math.min(1, retention));
    },

    /**
     * 计算卡片难度等级
     * @param {object} card
     * @returns {'new'|'learning'|'review'|'mastered'}
     */
    getDifficultyLevel(card) {
      if (!card.status || card.status === 'new') return 'new';
      return card.status;
    },

    /**
     * 获取评分对应的下次复习时间描述
     * @param {object} card
     * @param {number} quality
     * @returns {string} 人类可读的时间描述
     */
    getNextReviewText(card, quality) {
      const result = this.getNextReview(card, quality);
      return this._formatInterval(result.interval);
    },

    /**
     * 格式化时间间隔
     * @param {number} days
     * @returns {string}
     */
    _formatInterval(days) {
      if (days <= 0) return '现在';
      if (days === 1) return '1 天';
      if (days < 30) return `${days} 天`;
      if (days < 365) {
        const months = Math.round(days / 30);
        return `${months} 个月`;
      }
      const years = (days / 365).toFixed(1);
      return `${years} 年`;
    },

    // ============================================================
    // FSRS 升级预留接口
    // 未来可在此实现完整的 FSRS v5 算法
    // ============================================================

    /**
     * FSRS 算法占位（MVP 暂未实现）
     * 预留接口，便于后期升级
     */
    fsrs: {
      /**
       * FSRS 参数（默认值）
       */
      params: {
        // FSRS v5 默认参数
        w: [
          0.4, 0.9, 2.3, 10.9, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
          0.05, 0.34, 1.26, 0.29, 2.61,
        ],
        requestRetention: 0.9,
        maximumInterval: 36500,
      },

      /**
       * 检查 FSRS 是否启用
       */
      isEnabled() {
        try {
          const settings = JSON.parse(
            localStorage.getItem('linguavista.settings') || '{}'
          );
          return settings.srsAlgorithm === 'fsrs';
        } catch (e) {
          return false;
        }
      },

      /**
       * FSRS 调度（占位，返回 SM-2 结果作为 fallback）
       */
      schedule(card, rating) {
        console.warn('[SRS] FSRS 算法暂未实现，使用 SM-2 回退');
        return SRS.getNextReview(card, rating - 1); // FSRS rating 是 1-4，转成 0-3
      },
    },

    /**
     * 根据设置选择算法并计算下次复习
     * @param {object} card
     * @param {number} quality - 评分 (0-3 for SM-2, 1-4 for FSRS)
     */
    schedule(card, quality) {
      if (this.fsrs.isEnabled()) {
        return this.fsrs.schedule(card, quality + 1);
      }
      return this.getNextReview(card, quality);
    },

    /**
     * 评分等级常量
     */
    Rating: {
      AGAIN: 0,
      HARD: 1,
      GOOD: 2,
      EASY: 3,
    },

    /**
     * 卡片状态常量
     */
    State: {
      NEW: 'new',
      LEARNING: 'learning',
      REVIEW: 'review',
      RELEARNING: 'relearning',
      MASTERED: 'mastered',
    },
  };

  // 导出到全局
  global.LVSRS = SRS;
})(window);
