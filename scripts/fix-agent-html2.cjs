// agent.html 收尾：清理导出 markdown 内容与代码注释里的残留 emoji（非 UI，但追求全站零 emoji）
const fs = require('fs');
const F = 'website/agent.html';
let s = fs.readFileSync(F, 'utf8');
const before = s;
// 导出 markdown 标题/角色标识去 emoji
s = s.split("var lines = ['# 🤖 AI 创作纪元 · 智能体对话', '', '导出时间：' + new Date().toLocaleString('zh-CN'), '']")
    .join("var lines = ['# AI 创作纪元 · 智能体对话（导出）', '', '导出时间：' + new Date().toLocaleString('zh-CN'), '']");
s = s.split("lines.push('## ' + (m.role==='user' ? '🧑‍🎓 用户' : '🤖 智能体'), '', m.content, '')")
    .join("lines.push('## ' + (m.role==='user' ? '用户' : '智能体'), '', m.content, '')");
// 注释 / 字符串里的 → 箭头（不影响显示，清掉更干净）
s = s.split("// 仅作「模型id→provider」映射；真实 Key 存本地(CC)，不再写死前端")
    .join("// 仅作「模型id 到 provider」的映射；真实 Key 存本地(CC)，不再写死前端");
s = s.split("// 代理失败 → 自动降级直连").join("// 代理失败则自动降级直连");
s = s.split("// 云端直连失败 → 回落本地代理").join("// 云端直连失败则回落本地代理");
fs.writeFileSync(F, s, 'utf8');
console.log('agent.html2 changed:', before !== s);
