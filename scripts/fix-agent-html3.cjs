// agent.html 收尾2：btn 反馈态 + hint 前缀
const fs = require('fs');
const F = 'website/agent.html';
let s = fs.readFileSync(F, 'utf8');
const before = s;
const I = (n) => '<i class="cc-ic" data-ic="' + n + '" aria-hidden="true"></i>';
s = s.split("btn.textContent='✅ 已复制'").join("btn.innerHTML='" + I('check') + " 已复制'");
s = s.split("btn.textContent='📋 复制'").join("btn.innerHTML='" + I('copy') + " 复制'");
s = s.split("hint = '⚠ 火山方舟不支持浏览器直连（云端/预览模式受限）。解决：① 本地运行 <code>node server.mjs</code> 后访问 <b>http://localhost:8787</b> 生图；② 手机连电脑同一 WiFi，访问 <code>电脑IP:8787</code> 即可全功能。提示词已自动复制，可粘贴到本地使用。'")
    .join("hint = '火山方舟不支持浏览器直连（云端/预览模式受限）。解决：① 本地运行 <code>node server.mjs</code> 后访问 <b>http://localhost:8787</b> 生图；② 手机连电脑同一 WiFi，访问 <code>电脑IP:8787</code> 即可全功能。提示词已自动复制，可粘贴到本地使用。'");
fs.writeFileSync(F, s, 'utf8');
console.log('agent.html3 changed:', before !== s);
