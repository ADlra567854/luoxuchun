/* ==========================================================================
 * 白驹 · 统一矢量图标系统（唯一真源 / Single Source of Truth）
 *
 * 设计规范（全部图标必须遵守，才叫"统一"）：
 *   · 画布  24 × 24，安全区 20 × 20（四周留 2px 呼吸）
 *   · 描边  stroke-width 2，stroke-linecap/linejoin = round
 *           ── 与 assets/icons/*.svg（317 个 CSS mask 图标）保持完全一致
 *           注：本站 316 个 SVG 的既有标准是 2.0，此前本文件用 1.7，
 *           导致引用本文件的 2 个页面图标偏细、与全站不一致。现统一为 2.0。
 *   · 颜色  一律 currentColor（跟随文字色，自动适配双主题）
 *   · 填充  仅"指示点/眼点"类微元素允许实心，其余一律描边
 *   · 命名  语义化小写，族前缀用 _ 连接（如 ability_chat / ind_game）
 *
 * 用法：
 *   BJI.svg('search')                 → <svg …>
 *   BJI.svg('chip', 'lg')             → 附加 class
 *   BJI.label('type', '大模型')        → 该类型对应的图标名
 *   BJI.brand(28)                     → 品牌标（矢量，非 emoji）
 *
 * 替换对象：本页原有 36 处 emoji、21 种杂图标全部下线。
 * ========================================================================== */
(function () {
  var P = {
    /* ---------- 基础 UI ---------- */
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20.2 20.2l-3.8-3.8"/>',
    'filter': '<path d="M3 5.5h18M6.5 12h11M10 18.5h4"/>',
    'sort': '<path d="M8 4.5v15M8 19.5l-3.2-3.2M8 19.5l3.2-3.2"/><path d="M16 19.5v-15M16 4.5l-3.2 3.2M16 4.5l3.2 3.2"/>',
    'close': '<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'moon': '<path d="M20.2 14.6A8.6 8.6 0 019.4 3.8a8.6 8.6 0 1010.8 10.8z"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    'chev_down': '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
    'chev_up': '<path d="M6.5 14.5L12 9l5.5 5.5"/>',
    'chev_right': '<path d="M9.5 6.5l5.5 5.5-5.5 5.5"/>',
    'chev_left': '<path d="M14.5 6.5L9 12l5.5 5.5"/>',
    'arrow_right': '<path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5"/>',
    'arrow_left': '<path d="M20 12H4.5M10 6.5L4.5 12l5.5 5.5"/>',
    'arrow_up': '<path d="M12 20V4.5M6.5 10L12 4.5l5.5 5.5"/>',
    'external': '<path d="M14 4.2h5.8V10"/><path d="M19.8 4.2L11 13"/><path d="M18 14.2v4.4a2 2 0 01-2 2H5.6a2 2 0 01-2-2V8.2a2 2 0 012-2H10"/>',
    'download': '<path d="M12 3.5v11.5M7.6 10.6L12 15l4.4-4.4"/><path d="M4.2 19.2h15.6"/>',
    'check': '<path d="M5 12.6l4.6 4.6L19 7"/>',
    'plus': '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    'minus': '<path d="M5.2 12h13.6"/>',
    'star': '<path d="M12 3.4l2.72 5.62 6.14.9-4.46 4.32 1.06 6.16L12 17.48l-5.46 2.92 1.06-6.16-4.46-4.32 6.14-.9z"/>',
    'star_fill': '<path d="M12 3.4l2.72 5.62 6.14.9-4.46 4.32 1.06 6.16L12 17.48l-5.46 2.92 1.06-6.16-4.46-4.32 6.14-.9z" fill="currentColor" stroke="none"/>',
    'copy': '<rect x="8.8" y="8.8" width="11" height="11" rx="2.2"/><path d="M15.2 5.2H6.4a2.2 2.2 0 00-2.2 2.2v8.8"/>',
    'refresh': '<path d="M3.6 12a8.4 8.4 0 0114.4-5.9"/><path d="M18.4 3.6v6h-6"/><path d="M20.4 12a8.4 8.4 0 01-14.4 5.9"/><path d="M5.6 20.4v-6h6"/>',
    'pin': '<path d="M12 21.2s6.8-6.1 6.8-10.9a6.8 6.8 0 10-13.6 0c0 4.8 6.8 10.9 6.8 10.9z"/><circle cx="12" cy="10.2" r="2.4"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3.1 2.6 14.9 0 18M12 3c-2.6 3.1-2.6 14.9 0 18"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5.2l3.6 2.1"/>',
    'eye': '<path d="M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
    'layers': '<path d="M12 3.2l9 4.6-9 4.6-9-4.6z"/><path d="M3 12.2l9 4.6 9-4.6"/><path d="M3 16.6l9 4.6 9-4.6"/>',
    'list': '<path d="M8.4 6H21M8.4 12H21M8.4 18H21"/><path d="M3.6 6h.01M3.6 12h.01M3.6 18h.01"/>',
    'grid': '<rect x="3.2" y="3.2" width="7.4" height="7.4" rx="1.8"/><rect x="13.4" y="3.2" width="7.4" height="7.4" rx="1.8"/><rect x="3.2" y="13.4" width="7.4" height="7.4" rx="1.8"/><rect x="13.4" y="13.4" width="7.4" height="7.4" rx="1.8"/>',
    'table': '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.2"/><path d="M3.2 9.4h17.6M9.4 9.4v10M15 9.4v10"/>',
    'target': '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    'scale': '<path d="M12 3.4v17.2"/><path d="M4.6 7.4h14.8"/><path d="M7.8 7.4l-3.2 6.2h6.4z"/><path d="M16.2 7.4L13 13.6h6.4z"/><path d="M8.4 20.6h7.2"/>',
    'play': '<path d="M8.4 5.4l10 6.6-10 6.6z"/>',
    'book': '<path d="M4.2 5.6A2.4 2.4 0 016.6 3.2H19v15H6.6A2.4 2.4 0 004.2 20.6z"/><path d="M4.2 18.4A2.4 2.4 0 016.6 16H19"/><path d="M8.4 7.4h6.4"/>',
    'bookmark': '<path d="M6.4 3.4h11.2v17.2L12 16.4l-5.6 4.2z"/>',
    'heart': '<path d="M12 20.2S3.6 15.4 3.6 9.6A4.6 4.6 0 0112 7a4.6 4.6 0 018.4 2.6c0 5.8-8.4 10.6-8.4 10.6z"/>',
    'lock': '<rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.4"/><path d="M8.2 10.4V7.6a3.8 3.8 0 017.6 0v2.8"/>',
    'user': '<circle cx="12" cy="8.4" r="3.6"/><path d="M4.8 20.4a7.2 7.2 0 0114.4 0"/>',
    'compass': '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    'sparkle': '<path d="M11 3.4l1.75 4.85L17.6 10l-4.85 1.75L11 16.6 9.25 11.75 4.4 10l4.85-1.75z"/><path d="M18.2 15.2l.75 2.05 2.05.75-2.05.75-.75 2.05-.75-2.05-2.05-.75 2.05-.75z"/>',
    'code': '<path d="M9.2 7.4L4.6 12l4.6 4.6M14.8 7.4L19.4 12l-4.6 4.6"/>',
    'cpu': '<rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/><path d="M10.2 3.4v3.8M13.8 3.4v3.8M10.2 16.8v3.8M13.8 16.8v3.8M3.4 10.2h3.8M3.4 13.8h3.8M16.8 10.2h3.8M16.8 13.8h3.8"/>',
    'chat': '<path d="M20.4 11.6c0 4-3.8 7.2-8.4 7.2a10 10 0 01-2.6-.34L5 20.4l1.3-3.5A6.9 6.9 0 013.6 11.6c0-4 3.8-7.2 8.4-7.2s8.4 3.2 8.4 7.2z"/>',
    'send': '<path d="M20.6 3.6L3.6 10.4l6.4 2.6 2.6 6.4z"/><path d="M20.6 3.6l-10.4 9.4"/>',
    'eye_off': '<path d="M4 4.4l16 15.2"/><path d="M9.6 6.2A9.6 9.6 0 0112 6c5.9 0 9.4 6 9.4 6a17 17 0 01-3.4 4"/><path d="M6.2 8.2A17.5 17.5 0 002.6 12s3.5 6 9.4 6a9.9 9.9 0 003.4-.6"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.4M12 7.9h.01"/>',
    'warn': '<path d="M12 3.6l8.6 15.2H3.4z"/><path d="M12 9.4v4.2M12 16.6h.01"/>',
    'pages': '<rect x="3.2" y="3.2" width="18" height="18" rx="2.6"/><path d="M8 8.4h8M8 12h8M8 15.6h4.6"/>',
    'spark': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.2 6.2l2.8 2.8M15 15l2.8 2.8M17.8 6.2L15 9M9 15l-2.8 2.8"/>',

    /* ---------- 类型（5 类主体形态） ---------- */
    'type_model': '<circle cx="12" cy="4.8" r="2.1"/><circle cx="4.8" cy="17.4" r="2.1"/><circle cx="19.2" cy="17.4" r="2.1"/><circle cx="12" cy="12" r="2.4"/><path d="M11.1 6.7l.6 3.1M12.9 10.2l4.5 5.4M10.2 11.1L6.6 15.8"/>',
    'type_app': '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.6"/><path d="M3.2 9h17.6"/><path d="M7.4 12.6h5.6M7.4 16h3.6"/>',
    'type_platform': '<path d="M12 3.2l8.6 4.4-8.6 4.4-8.6-4.4z"/><path d="M3.4 12l8.6 4.4 8.6-4.4"/><path d="M3.4 16.4L12 20.8l8.6-4.4"/>',
    'type_opensource': '<circle cx="6.4" cy="6" r="2.3"/><circle cx="6.4" cy="18" r="2.3"/><circle cx="17.8" cy="12" r="2.3"/><path d="M6.4 8.3v7.4"/><path d="M8.7 6h2.9a4.4 4.4 0 014.4 4.4v0"/>',
    'type_hardware': '<rect x="6.8" y="6.8" width="10.4" height="10.4" rx="2"/><path d="M10 3.2v3.6M14 3.2v3.6M10 17.2v3.6M14 17.2v3.6M3.2 10h3.6M3.2 14h3.6M17.2 10h3.6M17.2 14h3.6"/>',

    /* ---------- 支持端（6 端） ---------- */
    'end_web': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3.1 2.6 14.9 0 18M12 3c-2.6 3.1-2.6 14.9 0 18"/>',
    'end_ios': '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="3"/><path d="M10.4 5.2h3.2"/><path d="M12 18.4h.01"/>',
    'end_android': '<path d="M5.4 11.4a6.6 6.6 0 0113.2 0z"/><circle cx="9.4" cy="8.6" r=".85" fill="currentColor" stroke="none"/><circle cx="14.6" cy="8.6" r=".85" fill="currentColor" stroke="none"/><path d="M7.2 10.2L5.6 6.6M16.8 10.2l1.6-3.6"/><path d="M5.2 13.4h13.6v4a2.2 2.2 0 01-2.2 2.2H7.4a2.2 2.2 0 01-2.2-2.2z"/>',
    'end_desktop': '<rect x="2.6" y="4" width="18.8" height="12.6" rx="2.2"/><path d="M8 20h8M12 16.6V20"/>',
    'end_miniapp': '<path d="M9.4 4.6c3.5 0 6.4 2.2 6.4 4.9s-2.9 4.9-6.4 4.9c-.7 0-1.4-.1-2-.3L4.4 15.6l.8-2.3A4.6 4.6 0 013 9.5c0-2.7 2.9-4.9 6.4-4.9z"/><path d="M16.2 9.4c2.6.2 4.8 2 4.8 4.2 0 1.3-.7 2.4-1.8 3.2l.6 1.9-2.1-1.1c-.5.1-1 .2-1.6.2-1.9 0-3.6-.8-4.5-2"/>',
    'end_api': '<path d="M8.6 3.6H6.4a2.2 2.2 0 00-2.2 2.2v3a2.2 2.2 0 01-2.2 2.2 2.2 2.2 0 012.2 2.2v3a2.2 2.2 0 002.2 2.2h2.2"/><path d="M15.4 3.6h2.2a2.2 2.2 0 012.2 2.2v3a2.2 2.2 0 002.2 2.2 2.2 2.2 0 00-2.2 2.2v3a2.2 2.2 0 01-2.2 2.2h-2.2"/>',

    /* ---------- 免费策略 ---------- */
    'free_full': '<circle cx="12" cy="12" r="9"/><path d="M8.4 12.2l2.6 2.6 4.6-5.4"/>',
    'free_tier': '<circle cx="12" cy="12" r="9"/><path d="M12 7.6v4.8l3.4 2"/>',
    'free_trial': '<circle cx="12" cy="12" r="9"/><path d="M12 7.6v9M9.4 10.2h5.2M9.4 13.8h5.2"/>',
    'free_paid': '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M9.6 10.6h4.2M9.6 13.4h4.2"/>',

    /* ---------- 能力族 ---------- */
    'ab_chat': '<path d="M20.4 11.6c0 4-3.8 7.2-8.4 7.2a10 10 0 01-2.6-.34L5 20.4l1.3-3.5A6.9 6.9 0 013.6 11.6c0-4 3.8-7.2 8.4-7.2s8.4 3.2 8.4 7.2z"/>',
    'ab_sparkle': '<path d="M11 3.4l1.75 4.85L17.6 10l-4.85 1.75L11 16.6 9.25 11.75 4.4 10l4.85-1.75z"/><path d="M18.2 15.2l.75 2.05 2.05.75-2.05.75-.75 2.05-.75-2.05-2.05-.75 2.05-.75z"/>',
    'ab_code': '<path d="M9.2 7.4L4.6 12l4.6 4.6M14.8 7.4L19.4 12l-4.6 4.6"/><path d="M12.8 5l-1.6 14"/>',
    'ab_cpu': '<rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/><path d="M10.2 3.4v3.8M13.8 3.4v3.8M10.2 16.8v3.8M13.8 16.8v3.8M3.4 10.2h3.8M3.4 13.8h3.8M16.8 10.2h3.8M16.8 13.8h3.8"/>',
    'ab_globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3.1 2.6 14.9 0 18M12 3c-2.6 3.1-2.6 14.9 0 18"/>',

    /* ---------- 行业 ---------- */
    'ind_game': '<rect x="2.4" y="8" width="19.2" height="9.6" rx="4"/><path d="M7.2 11v3.6M5.4 12.8h3.6"/><circle cx="16" cy="11.6" r=".9" fill="currentColor" stroke="none"/><circle cx="18.4" cy="13.8" r=".9" fill="currentColor" stroke="none"/>',
    'ind_medical': '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><path d="M12 7.8v8.4M7.8 12h8.4"/>',
    'ind_science': '<path d="M9.4 3.2h5.2"/><path d="M10.4 3.2v5.4L6 16.8a2.4 2.4 0 002.1 3.6h7.8A2.4 2.4 0 0018 16.8l-4.4-8.2V3.2"/><path d="M7.6 14h8.8"/>',
    'ind_education': '<path d="M2.6 8.6L12 4.2l9.4 4.4L12 13z"/><path d="M6.2 10.6v5.2c0 1.5 2.6 2.8 5.8 2.8s5.8-1.3 5.8-2.8v-5.2"/><path d="M21.4 8.6v5.8"/>',
    'ind_finance': '<path d="M4 19.4h16"/><path d="M7 19.4v-6.2M12 19.4V7.6M17 19.4v-8.4"/><path d="M4 8.4l5-3.2 3.6 2.6L19.4 3.6"/>',
    'ind_manu': '<path d="M3.2 20V10l4.8 2.8V10l4.8 2.8V10l4.8 2.8V20z"/><path d="M3.2 20h17.6"/><path d="M7.4 17h.01M12 17h.01M16.6 17h.01"/>',
    'ind_home': '<path d="M3.8 11L12 4.2 20.2 11"/><path d="M5.8 9.8v10h12.4v-10"/><path d="M10.4 19.8v-5.4h3.2v5.4"/>',
    'ind_logistics': '<rect x="2.4" y="7.2" width="11.2" height="8.6" rx="1.6"/><path d="M13.6 10h3.8l3.2 3.2v2.6h-7z"/><circle cx="6.4" cy="18" r="1.9"/><circle cx="17.2" cy="18" r="1.9"/>',
    'ind_transport': '<path d="M5 16l1.3-5.6A2.1 2.1 0 018.3 8.8h7.4a2.1 2.1 0 012 1.6L19 16"/><rect x="3.2" y="15.4" width="17.6" height="4.2" rx="1.6"/><circle cx="7.4" cy="17.5" r=".95" fill="currentColor" stroke="none"/><circle cx="16.6" cy="17.5" r=".95" fill="currentColor" stroke="none"/>',
    'ind_law': '<path d="M12 3.4v17.2"/><path d="M4.6 7.4h14.8"/><path d="M7.8 7.4l-3.2 6.2h6.4z"/><path d="M16.2 7.4L13 13.6h6.4z"/><path d="M8.4 20.6h7.2"/>',

    /* ---------- 教程分类 ---------- */
    'cat_intro': '<path d="M4.2 5.6A2.4 2.4 0 016.6 3.2H19v15H6.6A2.4 2.4 0 004.2 20.6z"/><path d="M4.2 18.4A2.4 2.4 0 016.6 16H19"/><path d="M8.4 7.4h6.4"/>',
    'cat_prompt': '<path d="M4.6 19.6L13.8 10.4"/><path d="M16.4 4.2l.86 2.16L19.4 7.2l-2.14.84L16.4 10.2l-.86-2.16L13.4 7.2l2.14-.84z"/><path d="M19.6 13.4l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
    'cat_handson': '<path d="M12 3.2c3.2 1.6 5.2 5.2 5.2 9.4L14.6 15.2H9.4L6.8 12.6c0-4.2 2-7.8 5.2-9.4z"/><circle cx="12" cy="10" r="1.7"/><path d="M9.4 15.2L6.6 20.8l3.4-1.7M14.6 15.2l2.8 5.6-3.4-1.7"/>',
    'cat_local': '<rect x="3.2" y="3.6" width="17.6" height="6.6" rx="2"/><rect x="3.2" y="13.8" width="17.6" height="6.6" rx="2"/><path d="M7 6.9h.01M7 17.1h.01"/><path d="M15.4 6.9h2.2M15.4 17.1h2.2"/>',
    'cat_build': '<path d="M14.6 4.6l4.8 4.8-8.8 8.8H5.8v-4.8z"/><path d="M12.2 7l4.8 4.8"/>',
    'cat_train': '<path d="M3.4 17.4l4.6-5.6 3.6 2.8 4.6-6.4 4.4 4.2"/><circle cx="8" cy="11.8" r="1.3"/><path d="M3.4 20.6h17.2"/>',
    'cat_creation': '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.6"/><circle cx="8.6" cy="10" r="1.8"/><path d="M3.2 17.2l5-4 4 3 3-2.4 5.6 4.2"/>',
    'cat_ship': '<rect x="3.2" y="10.4" width="17.6" height="9.8" rx="2.2"/><path d="M12 3.4v7.4M8.6 6.8L12 3.4l3.4 3.4"/><path d="M7.4 14.4h9.2"/>',
    'cat_security': '<path d="M12 3.2l7.6 3v5.6c0 4.5-3.2 8.4-7.6 9.6-4.4-1.2-7.6-5.1-7.6-9.6V6.2z"/><path d="M9.2 12.1l2.2 2.2 3.6-4.2"/>',
    'cat_industry': '<path d="M3.2 20V10l4.8 2.8V10l4.8 2.8V10l4.8 2.8V20z"/><path d="M3.2 20h17.6"/><path d="M7.4 17h.01M12 17h.01M16.6 17h.01"/>',
    'cat_career': '<rect x="3.2" y="7.4" width="17.6" height="12.2" rx="2.4"/><path d="M8.6 7.4V5.8a2 2 0 012-2h2.8a2 2 0 012 2v1.6"/><path d="M3.2 12.4h17.6"/>',
    'cat_watch': '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.6"/><path d="M7.4 9h6.2M7.4 12.4h9.2M7.4 15.8h5.6"/>',
    'cat_quiz': '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.6a2.7 2.7 0 015.2.9c0 1.8-2.6 2.4-2.6 4"/><path d="M12 17.6h.01"/>',

    /* ---------- 资料类型 ---------- */
    'res_paper': '<path d="M6.2 3.2h7.6l4.4 4.4v13.2H6.2z"/><path d="M13.8 3.2v4.4h4.4"/><path d="M9.2 12.4h5.6M9.2 15.8h3.8"/>',
    'res_dataset': '<ellipse cx="12" cy="6.2" rx="7" ry="3"/><path d="M5 6.2v11.6c0 1.66 3.13 3 7 3s7-1.34 7-3V6.2"/><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3"/>',
    'res_model': '<circle cx="12" cy="4.8" r="2.1"/><circle cx="4.8" cy="17.4" r="2.1"/><circle cx="19.2" cy="17.4" r="2.1"/><circle cx="12" cy="12" r="2.4"/>',
    'res_compute': '<rect x="6.8" y="6.8" width="10.4" height="10.4" rx="2"/><path d="M10 3.2v3.6M14 3.2v3.6M10 17.2v3.6M14 17.2v3.6M3.2 10h3.6M3.2 14h3.6M17.2 10h3.6M17.2 14h3.6"/>',
    'res_demo': '<rect x="2.6" y="4.4" width="18.8" height="13" rx="2.4"/><path d="M8 20.4h8"/><path d="M10.6 8.2l4.4 2.7-4.4 2.7z"/>',
    'res_code': '<path d="M9.2 7.4L4.6 12l4.6 4.6M14.8 7.4L19.4 12l-4.6 4.6"/>',
    'res_blog': '<path d="M5.4 4.2h8.4l4.8 4.8v10.8H5.4z"/><path d="M13.8 4.2v4.8h4.8"/><path d="M8.6 13h6.4M8.6 16.4h4.2"/>',
    'res_report': '<path d="M4 20.4h16"/><path d="M7.2 20.4v-10M12 20.4V4.2M16.8 20.4v-6.6"/>',
    'res_rank': '<path d="M4.2 18.6h4V10h-4zM10 18.6h4V4.6h-4zM15.8 18.6h4v-6.6h-4z"/><path d="M4 21h16"/>',
    'res_spec': '<path d="M6.2 3.2h11.6v17.6l-2.9-1.9-2.9 1.9-2.9-1.9-2.9 1.9z"/><path d="M9.4 8.2h5.2M9.4 12h5.2"/>',
    'res_community': '<circle cx="9.2" cy="9" r="3"/><path d="M3.4 19.2a5.8 5.8 0 0111.6 0"/><path d="M16.2 6.6a3 3 0 010 5.6"/><path d="M17.6 14.4a5.8 5.8 0 013 4.8"/>',
    'res_tool': '<path d="M14.8 6.2a3.6 3.6 0 004.8 4.8l-8.2 8.2a2.6 2.6 0 11-3.7-3.7z"/><path d="M6.4 5.6l3 3"/>',
    'res_compliance': '<path d="M6.2 3.2h7.6l4.4 4.4v13.2H6.2z"/><path d="M13.8 3.2v4.4h4.4"/><path d="M9.4 14.2l1.9 1.9 3.4-4"/>',

    /* ---------- 资讯类型 ---------- */
    'news_official': '<path d="M4.4 4.6h15.2v14.8H4.4z"/><path d="M7.6 8.4h8.8M7.6 12h8.8M7.6 15.4h5.2"/>',
    'news_media': '<circle cx="12" cy="12" r="2.6"/><path d="M7.6 7.6a6.4 6.4 0 000 8.8M16.4 7.6a6.4 6.4 0 010 8.8"/><path d="M4.6 4.6a10.4 10.4 0 000 14.8M19.4 4.6a10.4 10.4 0 010 14.8"/>',
    'news_research': '<path d="M9.4 3.2h5.2"/><path d="M10.4 3.2v5.4L6 16.8a2.4 2.4 0 002.1 3.6h7.8A2.4 2.4 0 0018 16.8l-4.4-8.2V3.2"/>',
    'news_report': '<path d="M4 20.4h16"/><path d="M7.2 20.4v-10M12 20.4V4.2M16.8 20.4v-6.6"/>',
    'news_rank': '<path d="M4.2 18.6h4V10h-4zM10 18.6h4V4.6h-4zM15.8 18.6h4v-6.6h-4z"/>',
    'news_letter': '<rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4"/><path d="M4 6.6l8 5.8 8-5.8"/>',

    /* ---------- 专题 ---------- */
    'topic_agent': '<circle cx="12" cy="12" r="3"/><path d="M12 3.4v3M12 17.6v3M3.4 12h3M17.6 12h3M5.9 5.9l2.1 2.1M16 16l2.1 2.1M18.1 5.9L16 8M8 16l-2.1 2.1"/>',
    'topic_opensource': '<circle cx="6.4" cy="6" r="2.3"/><circle cx="6.4" cy="18" r="2.3"/><circle cx="17.8" cy="12" r="2.3"/><path d="M6.4 8.3v7.4"/><path d="M8.7 6h2.9a4.4 4.4 0 014.4 4.4"/>',
    'topic_multimodal': '<path d="M11 3.4l1.75 4.85L17.6 10l-4.85 1.75L11 16.6 9.25 11.75 4.4 10l4.85-1.75z"/><path d="M18.2 15.2l.75 2.05 2.05.75-2.05.75-.75 2.05-.75-2.05-2.05-.75 2.05-.75z"/>',
    'topic_compute': '<rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/><path d="M10.2 3.4v3.8M13.8 3.4v3.8M10.2 16.8v3.8M13.8 16.8v3.8M3.4 10.2h3.8M3.4 13.8h3.8M16.8 10.2h3.8M16.8 13.8h3.8"/>',
    'topic_knowledge': '<path d="M4.2 5.6A2.4 2.4 0 016.6 3.2H19v15H6.6A2.4 2.4 0 004.2 20.6z"/><path d="M4.2 18.4A2.4 2.4 0 016.6 16H19"/><path d="M12 6.6v5.2M9.4 9.2h5.2"/>',
    'topic_governance': '<path d="M12 3.2l7.6 3v5.6c0 4.5-3.2 8.4-7.6 9.6-4.4-1.2-7.6-5.1-7.6-9.6V6.2z"/><path d="M12 8.6v4.2M12 15.6h.01"/>',
    'topic_robot': '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4.2v3.8"/><circle cx="12" cy="3" r="1.4"/><circle cx="9.2" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M9.6 16.4h4.8"/>',
    'topic_edge': '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="3"/><path d="M10.4 5.2h3.2"/><path d="M12 18.4h.01"/>',

    /* ---------- 品牌标：白驹马头（描边式，5 个候选里辨识度最高，18px 仍成立） ---------- */
    'brand_mark': '<path d="M8 28c.4-5 1.4-9.2 3-12.4 1-2 1.8-5.4 2-8.8l1.6-4.4 2.8 5.8c2.2.8 4.2 2 6.4 3.4 2 .8 3.8 1.2 5.6 1.8"/><path d="M20 16.6c2.4-.6 4.6-.2 6.6 1 .7.4.8 1.3.3 1.9-.7.9-1.7 1.2-2.8 1.1-1.9-.1-3.6.5-5.1 1.6-1 .8-1.6 2.3-1.8 4.4L17 28"/>',

    /* ---------- 2026-10-07 补齐：全站审计发现的 16 个高频缺口 ----------
       audit-icons.mjs 比对全站 data-ic 引用与本真源，发现 130 个引用名不存在。
       其中 16 个语义无法降级到现有图标，必须补齐 —— 例如把「对勾 + 外圈」映射成
       「纯对勾」，在「已完成」这类状态标识上会造成语义误导。
       风格对齐：24×24 画布、安全区 20×20、stroke-width 1.7、圆角端点、currentColor。 */
    'check_circle': '<circle cx="12" cy="12" r="8.8"/><path d="M8 12.2l2.8 2.8L16.2 9.6"/>',
    'circle': '<circle cx="12" cy="12" r="8.8"/>',
    'circle_help': '<circle cx="12" cy="12" r="8.8"/><path d="M9.6 9.4a2.4 2.4 0 014.6.8c0 1.8-2.4 2.2-2.4 3.8"/><path d="M12 17.2h.01" stroke-width="2"/>',
    'clapperboard': '<path d="M3.4 8.6h17.2v11a2 2 0 01-2 2H5.4a2 2 0 01-2-2z"/><path d="M3.4 8.6l1.8-3.4 15.4 4.2-1.6 3"/>',
    'box': '<path d="M12 3.2l8.2 4.2v9.2L12 20.8l-8.2-4.2V7.4z"/><path d="M3.8 7.4L12 11.6l8.2-4.2M12 11.6v9.2"/>',
    'package_open': '<path d="M12 3.4l8.2 4v4.2"/><path d="M20.2 11.6v9L12 20.4l-8.2-3.4V7.4z"/><path d="M3.8 7.4L12 11.4l8.2-4"/><path d="M8 14.8l4-1.8 4 1.8"/>',
    'award': '<circle cx="12" cy="9.2" r="5.6"/><path d="M8.6 13.6L7.2 21l4.8-2.8 4.8 2.8-1.4-7.4"/>',
    'trophy': '<path d="M7.4 4.2h9.2v5.4a4.6 4.6 0 01-9.2 0z"/><path d="M7.4 6.2H4.6v1.8a3.2 3.2 0 003.2 3.2M16.6 6.2h2.8v1.8a3.2 3.2 0 01-3.2 3.2"/><path d="M10 14.4h4M9.6 20.6h4.8l-.6-3.4h-3.6z"/>',
    'cloud': '<path d="M7.4 18.6h9.8a4.4 4.4 0 00.6-8.76 5.6 5.6 0 00-10.7-1.4A4.6 4.6 0 007.4 18.6z"/>',
    'cloud_sun': '<circle cx="7.6" cy="6.8" r="2.8"/><path d="M7.6 2.4v1.2M3.3 6.8h1.2M4.4 3.6l.9.9M10.8 3.6l-.9.9"/><path d="M9.4 19.4h7.4a3.8 3.8 0 00.4-7.58 4.8 4.8 0 00-9.2-1.2 3.9 3.9 0 001.4 8.78z"/>',
    'keyboard': '<rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2.2"/><path d="M6.4 9.8h.01M9.6 9.8h.01M12.8 9.8h.01M16 9.8h.01M6.4 12.8h.01M9.6 12.8h.01M12.8 12.8h.01M16 12.8h.01M8.4 15.6h7.2"/>',
    'shopping_bag': '<path d="M4.6 8.2h14.8l-1.2 11.2a2 2 0 01-2 1.8H7.8a2 2 0 01-2-1.8z"/><path d="M8.6 8.2V6.6a3.4 3.4 0 016.8 0v1.6"/>',
    'radiation': '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V5.4M14.1 10.8l4.2-2.4M14.1 13.2l4.2 2.4M12 14.2v4.4M9.9 13.2l-4.2 2.4M9.9 10.8L5.7 8.4"/>',
    'traffic_cone': '<path d="M12 3.4L6.8 18.8h10.4z"/><path d="M4.6 20.6h14.8"/><path d="M9.6 13.4h4.8"/>',
    'audio_lines': '<path d="M3.6 10.4v3.2M7.4 7.4v9.2M11.2 4.6v14.8M15 8v8M18.8 10.4v3.2M22 12.6v.8"/>',
    'wind': '<path d="M3.4 8.4h9.2a2.6 2.6 0 10-2.6-2.6"/><path d="M3.4 15.6h12.4a2.6 2.6 0 11-2.6 2.6"/><path d="M3.4 12h16.4"/>',
  };

  /* 词表 → 图标名 */
  var MAP = {
    type: { '大模型': 'type_model', '应用产品': 'type_app', '开发平台': 'type_platform', '开源项目': 'type_opensource', '算力硬件': 'type_hardware' },
    end: { 'Web': 'end_web', 'iOS': 'end_ios', 'Android': 'end_android', '桌面': 'end_desktop', '小程序': 'end_miniapp', 'API': 'end_api' },
    free: { '完全免费': 'free_full', '有免费额度': 'free_tier', '免费试用': 'free_trial', '付费为主': 'free_paid' },
    abilityFamily: { '交互': 'ab_chat', '生成': 'ab_sparkle', '开发': 'ab_code', '模型': 'ab_cpu', '生态': 'ab_globe' },
    industry: {
      '游戏': 'ind_game', '医疗': 'ind_medical', '科研': 'ind_science', '教育': 'ind_education', '金融': 'ind_finance',
      '制造': 'ind_manu', '家居': 'ind_home', '物流': 'ind_logistics', '交通出行': 'ind_transport', '法律': 'ind_law'
    },
    tutorialCat: {
      '入门认知': 'cat_intro', '提示词': 'cat_prompt', '模型上手': 'cat_handson', '本地部署': 'cat_local',
      '应用开发': 'cat_build', '模型训练': 'cat_train', '多模态创作': 'cat_creation', '工程部署': 'cat_ship',
      '安全合规': 'cat_security', '行业落地': 'cat_industry', '职业发展': 'cat_career', '行业观察': 'cat_watch'
    },
    resourceKind: {
      '论文': 'res_paper', '数据集': 'res_dataset', '模型': 'res_model', '算力': 'res_compute', '演示': 'res_demo',
      '代码': 'res_code', '教程': 'book', '博客': 'res_blog', '报告': 'res_report', '榜单': 'res_rank',
      '规范': 'res_spec', '安全': 'cat_security', '合规': 'res_compliance', '社区': 'res_community', '工具': 'res_tool'
    },
    newsKind: { '官方博客': 'news_official', '中文媒体': 'news_media', '研究机构': 'news_research', '报告': 'news_report', '榜单': 'news_rank', '通讯': 'news_letter' }
  };

  function svg(name, cls, size) {
    var inner = P[name];
    if (!inner) inner = P['info'];
    var vb = (name === 'brand_mark') ? '0 0 32 32' : '0 0 24 24';
    var stroke = (name === 'brand_mark') ? '' : '';
    return '<svg class="bj-ic' + (cls ? ' ' + cls : '') + '" viewBox="' + vb + '"' +
      (size ? ' width="' + size + '" height="' + size + '"' : '') +
      ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  function label(group, key) {
    var g = MAP[group]; if (!g) return 'info';
    return g[key] || 'info';
  }

  /** 品牌标：圆角渐变方块 + 矢量白驹马头（非 emoji，非第三方品牌） */
  function brand(size) {
    var s = size || 30;
    var id = 'bjg' + Math.random().toString(36).slice(2, 7);
    return '<svg class="bj-brand" width="' + s + '" height="' + s + '" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#4f8cff"/><stop offset=".5" stop-color="#38e1ff"/><stop offset="1" stop-color="#8b5cf6"/>' +
      '</linearGradient></defs>' +
      '<rect x="0" y="0" width="32" height="32" rx="9.5" fill="url(#' + id + ')"/>' +
      '<g fill="none" stroke="#fff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.86) translate(2.6,2.6)">' +
      P['brand_mark'] +
      '</g></svg>';
  }

  window.BJI = { svg: svg, label: label, brand: brand, map: MAP, has: function (n) { return !!P[n] }, names: Object.keys(P) };
})();
