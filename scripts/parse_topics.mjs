/* parse_topics.mjs
 * 从 _topics/*.html 提取真实 GitHub 仓库（owner/repo、描述、stars、作者）
 * 输出 data/ai-projects.json（约100个，个人/团队分开）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TPL = path.resolve(__dirname, '..', '_topics')
const files = fs.readdirSync(TPL).filter(f => f.endsWith('.html'))

const ORGS = new Set(('openai microsoft google google-gemini google-deepmind google-research meta meta-llama facebookresearch huggingface '+
'langchain-ai langgenius n8n-io open-webui firecrawl supabase Comfy-Org ollama lm-sys vllm-project sgl-project mlc-ai qdrant chroma-core milvus-io weaviate '+
'pytorch tensorflow keras-team scikit-learn mlflow gradio-app streamlit getzep infiniflow run-llama stability-ai runwayml coqui-ai SYSTRAN PaddlePaddle '+
'OpenBMB hpcaitech crewAIInc flowiseai DLR-RM Significant-Gravitas openclaw modelscope baichuan-inc zhipu-ai InternLM ultralytics open-mmlab tesseract-ocr '+
'NVIDIA DataTalksClub anthropics cohere-ai xai-org mistralai QwenLM deepseek-ai AutoGPT-AI mcpdotnet agent-network-ai llmstack-ai langfuse axflow modelcontextprotocol '+
'microsoft-research label-studio heartexlabs composiohq bytedance pingcap github Kong opencv Lightning-AI AMAI-GmbH e2b-dev langflow-ai mem0ai netease-youdao d2l-ai '+
'NousResearch unslothai datawhalechina FoundationAgents headroomlabs-ai huginn 2noise explosion All-Hands-AI TauricResearch shareAI-lab jeecgboot GetBindu Upsonic RayVentura '+
'strands-agents aiwaves-cn campfirein spinabot wanikua usestrix openhands xAIDevHub apache').split(/\s+/))

function clean(s){ return (s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim() }

const seen = new Map()
for (const f of files) {
  const html = fs.readFileSync(path.join(TPL, f), 'utf8')
  const articles = html.match(/<article[\s\S]*?<\/article>/g) || []
  for (const a of articles) {
    const repoM = a.match(/href="\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)"[\s\S]*?>/)
    if(!repoM) continue
    const owner = repoM[1], repo = repoM[2]
    if(/^(topics|sponsors|collections|features|login|signup|search|settings|notifications|marketplace|orgs)$/.test(owner)) continue
    const key = owner + '/' + repo
    if(seen.has(key)) continue
    // 描述
    const descM = a.match(/<p class="[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const desc = clean(descM ? descM[1] : '').slice(0, 90)
    // stars
    const starM = a.match(/([\d.]+[kKmM]?)\s*stars/i)
    const starsRaw = starM ? starM[1] : ''
    let stars = 0
    if(starsRaw){ stars = parseFloat(starsRaw.replace(/[km]/i,'')) * (/[km]/i.test(starsRaw) ? (/[k]/i.test(starsRaw) ? 1000 : 1000000) : 1) }
    // 作者名
    const authorM = a.match(/alt="@([^"]+)"|title="@([^"]+)"/)
    const author = authorM ? (authorM[1]||authorM[2]) : owner
    seen.set(key, { repo, owner, author, desc, stars, org: ORGS.has(owner) ? 'team' : 'person' })
  }
}

const list = [...seen.values()]
  .filter(x => x.desc)                 // 要有描述
  .sort((a,b)=>b.stars-a.stars)
  .slice(0, 110)                        // 留余量
list.forEach((x,i)=>{ x.heat = i<20?5 : i<40?4 : i<60?3 : i<80?2 : 1 })

// 归类
const team = list.filter(x=>x.org==='team')
const person = list.filter(x=>x.org==='person')
// 若个人过少，把部分低星"未知组织"仍按 person
const out = [...team, ...person].slice(0, 100).map(x => ({
  name: x.repo,
  owner: x.owner,
  author: x.author,
  org: x.org,
  heat: x.heat,
  desc: x.desc,
  url: 'https://github.com/' + x.owner + '/' + x.repo
}))

fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'ai-projects.json'), JSON.stringify(out, null, 1), 'utf8')
const t = out.filter(x=>x.org==='team').length, p = out.filter(x=>x.org==='person').length
console.log('解析条目:', list.length, '| 输出:', out.length, '| 团队:', t, '| 个人:', p)
out.slice(0,10).forEach(x=>console.log('  ', x.org==='team'?'[团队]':'[个人]', x.owner+'/'+x.name, '★'+Math.round(x.stars/1000)+'k', '|', x.author))
