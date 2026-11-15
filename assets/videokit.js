/* 通用视频教程组件（白驹站点共享）
 * 读取 window.DEPLOY_VIDEOS（data/deploy-videos.js，真实 B站教程）
 * 用法：在页面放 <div id="vkHere"></div>，再调用
 *   renderVideoSection('#vkHere', { categories:['DeepSeek','Ollama'], title:'部署教程' });
 * 仅嵌入官方播放器，不转存视频；移动端关自动播避免唤 App。
 */
(function () {
  const DATA = window.DEPLOY_VIDEOS || [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* —— 站内弹层播放 —— */
  let modal;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'vk-modal';
    modal.innerHTML =
      '<div class="vk-backdrop" data-close></div>' +
      '<div class="vk-box">' +
      '  <button class="vk-x" data-close aria-label="关闭">✕</button>' +
      '  <div class="vk-stage"></div>' +
      '  <div class="vk-cap"></div>' +
      '</div>';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    return modal;
  }
  function openModal(v) {
    const m = ensureModal();
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || innerWidth < 700;
    const ap = isMobile ? 0 : 1;
    m.querySelector('.vk-stage').innerHTML =
      '<iframe src="' + v.embed + '&autoplay=' + ap + '" scrolling="no" frameborder="no" ' +
      'allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>';
    m.querySelector('.vk-cap').innerHTML =
      '<b>' + esc(v.title) + '</b><br>' +
      '<span class="vk-meta">' + esc(v.source || '') + ' · ' + esc(v.date || '') + '</span> · ' +
      '<a href="' + esc(v.watch) + '" target="_blank" rel="noopener">' +
      (isMobile ? '站内播被拦？点这里网页版播放（最稳）↗' : '在 B站看原视频 ↗') + '</a>';
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (modal) { modal.style.display = 'none'; modal.querySelector('.vk-stage').innerHTML = ''; document.body.style.overflow = ''; }
  }

  /* —— 渲染视频区 —— */
  window.renderVideoSection = function (sel, opts) {
    opts = opts || {};
    const box = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!box) return;
    let list = DATA;
    const cats = opts.categories || [];
    if (cats.length) list = DATA.filter(function (v) { return cats.indexOf(v.tag) !== -1; });
    if (!list.length) {
      if (!DATA.length) box.innerHTML = '<p class="vk-empty">⚠ 视频数据加载失败（data/deploy-videos.js 未加载）。请刷新页面或稍后再试。</p>';
      else box.innerHTML = '<p class="vk-empty">该分类暂无匹配视频，可切换上方分类查看。</p>';
      return;
    }

    const uniq = {};
    list.forEach(function (v) { uniq[v.tag] = 1; });
    const chips = Object.keys(uniq);

    let html = '';
    if (opts.title) html += '<h3 class="vk-title">' + esc(opts.title) + '</h3>';
    html += '<div class="vk-chips">';
    chips.forEach(function (c) { html += '<button class="vk-chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; });
    html += '</div><div class="vk-grid"></div>';
    box.innerHTML = html;

    const grid = box.querySelector('.vk-grid');
    function draw(cat) {
      const arr = cat ? list.filter(function (v) { return v.tag === cat; }) : list;
      grid.innerHTML = arr.map(function (v) {
        return '<div class="vk-card" data-bv="' + esc(v.bvid) + '">' +
          '<div class="vk-thumb"><img class="vk-thumb-img" loading="lazy" referrerpolicy="no-referrer" src="' + esc(v.thumb) + '" alt="' + esc(v.title) + '"><span class="vk-play">▶</span></div>' +
          '<div class="vk-info"><span class="vk-tag">' + esc(v.tag) + '</span>' +
          '<h4>' + esc(v.title) + '</h4>' +
          '<p class="vk-meta">' + esc(v.source || '') + ' · ' + esc(v.date || '') + '</p></div></div>';
      }).join('');
    }
    draw(null);

    box.querySelectorAll('.vk-chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        box.querySelectorAll('.vk-chip').forEach(function (x) { x.classList.remove('cur'); });
        ch.classList.add('cur');
        draw(ch.getAttribute('data-cat'));
      });
    });
    grid.addEventListener('click', function (e) {
      const card = e.target.closest('.vk-card'); if (!card) return;
      const v = list.filter(function (x) { return x.bvid === card.getAttribute('data-bv'); })[0];
      if (v) openModal(v);
    });
  };

  /* —— 样式注入（一次） —— */
  if (!document.getElementById('vk-style')) {
    const st = document.createElement('style');
    st.id = 'vk-style';
    st.textContent =
      '.vk-title{font-size:16px;font-weight:800;margin:0 0 12px;color:var(--text,#1e293b)}' +
      '.vk-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
      '.vk-chip{padding:7px 13px;border-radius:18px;border:1px solid var(--line,#e2e8f0);background:#fff;color:var(--muted,#64748b);font-size:13px;font-weight:700;cursor:pointer;transition:.15s}' +
      '.vk-chip.cur{background:#eef4ff;color:#b45309;border-color:#cfe0ff}' +
      '.vk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}' +
      '.vk-card{cursor:pointer;border:1px solid var(--line,#e2e8f0);border-radius:14px;overflow:hidden;background:var(--card,#fff);transition:.18s;display:flex;flex-direction:column}' +
      '.vk-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(31,45,77,.12);border-color:#cfe0ff}' +
      '.vk-thumb{position:relative;aspect-ratio:16/9;background-color:#0b1220;overflow:hidden}' +
      '.vk-thumb-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}' +
      '.vk-play{position:absolute;inset:0;margin:auto;width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;transition:.18s}' +
      '.vk-card:hover .vk-play{background:rgba(37,99,235,.9);transform:scale(1.08)}' +
      '.vk-info{padding:10px 12px 13px;display:flex;flex-direction:column;gap:4px}' +
      '.vk-tag{display:inline-block;align-self:flex-start;font-size:11px;font-weight:800;color:#b45309;background:#fff7e6;border:1px solid #ffe2a8;border-radius:6px;padding:1px 7px}' +
      '.vk-info h4{font-size:14px;line-height:1.4;margin:2px 0 0;color:var(--text,#1e293b);font-weight:700}' +
      '.vk-meta{font-size:12px;color:var(--muted,#64748b);margin:0}' +
      '.vk-empty{color:var(--muted,#64748b);font-size:13px;padding:10px 0}' +
      '#vk-modal .vk-backdrop{position:absolute;inset:0;background:rgba(8,12,22,.72);backdrop-filter:blur(3px)}' +
      '#vk-modal .vk-box{position:relative;width:min(900px,94vw);aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}' +
      '#vk-modal .vk-stage{position:absolute;inset:0}' +
      '#vk-modal .vk-x{position:absolute;top:10px;right:12px;z-index:2;width:34px;height:34px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:16px;cursor:pointer}' +
      '#vk-modal .vk-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:10px 14px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#fff;font-size:13px}' +
      '#vk-modal .vk-cap a{color:#7dd3fc}' +
      '@media(max-width:640px){#vk-modal .vk-box{aspect-ratio:4/3}#vk-modal .vk-cap a{display:block;text-align:center;padding:9px 0;margin-top:6px;background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.3);border-radius:10px;font-weight:600}}';
    document.head.appendChild(st);
  }
})();
