// 精准修复 website/agent.html 的 emoji（纯字符串精确替换，无正则）
// A) 真按钮（JS 创建并 textContent 赋值）——改 innerHTML + <i class="cc-ic"> 图标
// B) textContent 渲染的元素（status/live/who/fileinfo/option/err 消息）——去 emoji 纯文字
// C) 同步修复依赖 emoji 的 JS 逻辑判断（indexOf('⏹') / indexOf('✅') / indexOf('❌')）
const fs = require('fs');
const F = 'website/agent.html';
let s = fs.readFileSync(F, 'utf8');
const before = s;
const I = (n) => '<i class="cc-ic" data-ic="' + n + '" aria-hidden="true"></i>';

// ---- A. 按钮 textContent -> innerHTML + 图标 ----
s = s.split("c1.textContent = '📋 复制'").join("c1.innerHTML = " + I('copy') + " 复制'");
s = s.split("c1.textContent='📋 复制'").join("c1.innerHTML='" + I('copy') + " 复制'");
s = s.split("c1.textContent='✅ 已复制'").join("c1.innerHTML='" + I('check') + " 已复制'");
s = s.split("c2.textContent = '🔊 朗读'").join("c2.innerHTML = " + I('volume-2') + " 朗读'");
s = s.split("c2.textContent='🔊 朗读'").join("c2.innerHTML='" + I('volume-2') + " 朗读'");
s = s.split("c2.textContent = '⏹ 停止朗读'").join("c2.innerHTML = " + I('square') + " 停止朗读'");
s = s.split("btn.textContent = '📋 复制'").join("btn.innerHTML = " + I('copy') + " 复制'");
s = s.split("stopButton.textContent = '⏹ 停止'").join("stopButton.innerHTML = " + I('square') + " 停止'");
s = s.split("stopButton.textContent = '⏹ 停止对比'").join("stopButton.innerHTML = " + I('square') + " 停止对比'");
s = s.split("c2.textContent.indexOf('⏹')").join("c2.textContent.indexOf('停止')");

// ---- B. 导航 / placeholder / option / 静态标签 ----
s = s.split('<a href="../index.html" style="color:var(--gold)">← 白驹总站</a>')
    .join('<a href="../index.html" style="color:var(--gold)">' + I('arrow-left') + ' 白驹总站</a>');
s = s.split('placeholder="🔍 搜索会话内容 / 标题…"').join('placeholder="搜索会话内容 / 标题…"');
s = s.split('对比模型（⚖）').join('对比模型');
s = s.split('<option value="book">📖 书稿《AI实战全书》</option>').join('<option value="book">书稿《AI实战全书》</option>');
s = s.split('<option value="guide">📋 指南与提示词</option>').join('<option value="guide">指南与提示词</option>');
s = s.split('<option value="lab">🔬 实验室与工具</option>').join('<option value="lab">实验室与工具</option>');
s = s.split('欢迎使用 <b>全能智能体</b> ✨<br>').join('欢迎使用 <b>全能智能体</b><br>');
s = s.split('/ 上传文档分析 / 🎤 语音提问').join('/ 上传文档分析 / 语音提问');
s = s.split('placeholder="🖼 AI 生图 / 🎬 生视频提示词（走豆包·方舟，如：赛博朋克风格的大学校园夜景）"')
    .join('placeholder="AI 生图 / 生视频提示词（走豆包·方舟，如：赛博朋克风格的大学校园夜景）"');
s = s.split("+ '<button class=\"del\" data-sid=\"' + s.id + '\" title=\"删除会话\">✕</button></div>'")
    .join("+ '<button class=\"del\" data-sid=\"' + s.id + '\" title=\"删除会话'>" + I('x') + "</button></div>'");
s = s.split("msgsEl2.innerHTML = '<div class=\"welcome\">新会话，说点什么吧 ✨</div>'")
    .join("msgsEl2.innerHTML = '<div class=\"welcome\">新会话，说点什么吧</div>'");
s = s.split("document.getElementById('msgs').innerHTML = '<div class=\"welcome\">对话已清空 ✨</div>'")
    .join("document.getElementById('msgs').innerHTML = '<div class=\"welcome\">对话已清空</div>'");
s = s.split("(m.vision?'👁 ':'💬 ') + m.name + '（自定义）'").join("(m.vision?'视觉 ':'对话 ') + m.name + '（自定义）'");

// ---- B2. fileinfo / status / live / net-status ----
s = s.split("fileinfo.textContent = '🖼 已附加图片：' + name").join("fileinfo.textContent = '已附加图片：' + name");
s = s.split("fileinfo.textContent = '📄 已附加文档：' + name + '（点「📄 分析文档」或直接提问）'")
    .join("fileinfo.textContent = '已附加文档：' + name + '（点「分析文档」或直接提问）'");
s = s.split("fileinfo.textContent = '📄 已解析：' + name + '（' + text.length + ' 字，点「📄 分析文档」或直接提问）'")
    .join("fileinfo.textContent = '已解析：' + name + '（' + text.length + ' 字，点「分析文档」或直接提问）'");
s = s.split("fileinfo.textContent = '⚠ 解析失败：' + (err && err.message || err) + '。可复制文本粘贴输入。'")
    .join("fileinfo.textContent = '解析失败：' + (err && err.message || err) + '。可复制文本粘贴输入。'");
s = s.split("fileinfo.textContent = '⚠ 暂不支持 ' + (ext||'该格式') + '，支持：txt/md/csv/json/pdf/docx/zip/图片'")
    .join("fileinfo.textContent = '暂不支持 ' + (ext||'该格式') + '，支持：txt/md/csv/json/pdf/docx/zip/图片'");
s = s.split("if(!attached){ addMsg('err','⚠ 请先点击 📎 上传文档'); return; }")
    .join("if(!attached){ addMsg('err','请先点击「上传文档」'); return; }");
s = s.split("status.textContent = '❌ 失败'").join("status.textContent = '生成失败'");
s = s.split("status.textContent = '✅ 生成完成'").join("status.textContent = '生成完成'");
s = s.split("status.textContent = '⚠ 请先输入提示词'").join("status.textContent = '请先输入提示词'");
s = s.split("status.textContent = kind==='image' ? '🖼 生图中…' : '🎬 视频生成中（约 1~5 分钟）…'")
    .join("status.textContent = kind==='image' ? '生图中…' : '视频生成中（约 1~5 分钟）…'");
s = s.split("live.textContent = '✦ 正在输入'").join("live.textContent = '正在输入'");
s = s.split("st.textContent = '⚠ 直连模式（未检测到本地服务）'").join("st.textContent = '直连模式（未检测到本地服务）'");
s = s.split("st.textContent = '✅ 本地服务已连接 · ' + pb").join("st.textContent = '本地服务已连接 · ' + pb");
s = s.split("st.textContent = '⚠ 本地服务未运行：豆包需代理，DeepSeek 自动直连'")
    .join("st.textContent = '本地服务未运行：豆包需代理，DeepSeek 自动直连'");

// ---- C. err 消息（textContent 分支，去 ⚠ 前缀）----
s = s.split("'⚠ ' + msg").join('msg');
s = s.split("addMsg('err', hint || ('⚠ 生成失败：' + msg))").join("addMsg('err', hint || ('生成失败：' + msg))");
// ---- ai 消息（innerHTML 分支，可加图标）----
s = s.split("addMsg('ai', '✅ 已切换到 <b>' + modelSel.value + '</b> 模型。')")
    .join("addMsg('ai', " + I('check') + " + ' 已切换到 <b>' + modelSel.value + '</b> 模型。')");
s = s.split("addMsg('ai', '✅ 已保存 Key（仅本地）。本地运行 <b>node server.mjs</b> 时也可直接用服务端 Key，无需填写。')")
    .join("addMsg('ai', " + I('check') + " + ' 已保存 Key（仅本地）。本地运行 <b>node server.mjs</b> 时也可直接用服务端 Key，无需填写。')");
s = s.split("addMsg('ai', '<b>🎨 提示词：</b>'+prompt+'<br>'+tag)")
    .join("addMsg('ai', '<b>" + I('palette') + " 提示词：</b>'+prompt+'<br>'+tag)");
// ---- 对比模型 who（textContent，去 ⚖）----
s = s.split("addStreamingBubble('⚖ ' + modelName(m1), wrap, stopWrap)").join("addStreamingBubble('对比 · ' + modelName(m1), wrap, stopWrap)");
s = s.split("addStreamingBubble('⚖ ' + modelName(m2), wrap)").join("addStreamingBubble('对比 · ' + modelName(m2), wrap)");
// ---- 1284 状态清除判断（原依赖 ✅/❌ 字符，改为检测 '生成' 前缀）----
s = s.split("if(status.textContent.indexOf('✅')===0 || status.textContent.indexOf('❌')===0) status.textContent='';")
    .join("if(status.textContent.indexOf('生成')===0) status.textContent='';");
// ---- 注释里的 🔑 美化（不影响显示）----
s = s.split("// 🔑 设置 Key：").join("// 设置 Key：");

fs.writeFileSync(F, s, 'utf8');
console.log('agent.html changed:', before !== after);
