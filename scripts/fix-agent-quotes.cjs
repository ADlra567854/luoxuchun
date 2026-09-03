// 修复 agent.html 中 JS 字符串里 <i class="cc-ic"> 缺前导单引号的语法 bug
const fs = require('fs');
const F = 'website/agent.html';
let s = fs.readFileSync(F, 'utf8');
const b = s;
s = s.split('innerHTML = <i class="cc-ic"').join("innerHTML = '<i class=\"cc-ic\"");
s = s.split("'ai', <i class=\"cc-ic\"").join("'ai', '<i class=\"cc-ic\"");
fs.writeFileSync(F, s, 'utf8');
console.log('fixed quotes:', b !== s);
console.log('innerHTML = <i (无引号残留):', (s.match(/innerHTML = <i/g) || []).length);
console.log("'ai', <i (无引号残留):", (s.match(/'ai', <i/g) || []).length);
