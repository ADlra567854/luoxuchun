import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || '.');
// emoji codepoint ranges (excluding CJK punctuation)
const RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2A00}-\u{2AFF}\u{200D}]/gu;
// skip dirs
const SKIP = new Set(['node_modules','_archive','_internal','deploy','book','blog','novel','data','docs','assets','.git','_corpus','templates']);

function walk(dir, out){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir,e.name);
    if(e.isDirectory()){ if(!SKIP.has(e.name)) walk(p,out); continue; }
    if(e.name.endsWith('.html')) out.push(p);
  }
}

const files=[];
walk(ROOT,files);
// also root index/404
for(const f of ['index.html','404.html']){
  const p=path.join(ROOT,f);
  if(fs.existsSync(p) && !files.includes(p)) files.push(p);
}

const rows=[];
for(const f of files){
  const s=fs.readFileSync(f,'utf8');
  const m=s.match(RE);
  if(m) rows.push([path.relative(ROOT,f), m.length]);
}
rows.sort((a,b)=>b[1]-a[1]);
console.log('TOTAL_FILES_WITH_EMOJI:',rows.length);
console.log('TOTAL_EMOJI:',rows.reduce((a,r)=>a+r[1],0));
for(const [f,c] of rows) console.log(String(c).padStart(5), f);
