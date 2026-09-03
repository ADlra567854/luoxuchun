import fs from 'node:fs';
import path from 'node:path';

// emoji codepoint ranges (排除中文标点)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2A00}-\u{2AFF}\u{200D}\u{20E3}\u{2139}]/gu;

// emoji -> cc-ic 图标名（仅用已注册且存在的图标）
const ICON = {
  '📋':'copy','📑':'copy','🔊':'volume-2','🔈':'volume-2','⏹':'square','⏯':'play','▶':'play','▶️':'play',
  '✅':'check-circle','✓':'check','❌':'x','✕':'x','⚠':'alert-circle','⚠️':'alert-circle','💡':'lightbulb',
  '⭐':'star','★':'star','🌟':'star','→':'arrow-right','➜':'arrow-right','➡':'arrow-right','👉':'arrow-right',
  '←':'arrow-left','⬅':'arrow-left','↑':'arrow-up','⬆':'arrow-up','↓':'arrow-down','⬇':'arrow-down',
  '🚀':'rocket','✏️':'pencil','✏':'pencil','🔗':'link','📄':'file-text','📃':'file-text','📁':'folder','🗂':'folder',
  '🔍':'search','🔎':'search','⚙️':'settings','⚙':'settings','🎯':'target','💬':'message-circle','🌐':'globe',
  '🔔':'bell','📌':'pin','✨':'sparkles','🧠':'brain','⏳':'alarm-clock','⌛':'alarm-clock','📈':'trending-up',
  '📉':'trending-down','💰':'banknote','🛡':'shield','🔐':'lock','🔒':'lock','📧':'mail','✉':'mail','📨':'mail',
  '🌙':'moon','☀':'sun','☀️':'sun','🎬':'play','🖼':'image','📷':'camera','🎵':'music','🎶':'music',
  '🏆':'trophy','👍':'thumbs-up','📝':'clipboard-list','🗒':'clipboard-list','🗑':'trash-2','➕':'plus','✖':'x',
  '❓':'help-circle','❗':'alert-circle','🤖':'bot','📚':'book-open','🔧':'wrench','🛠':'wrench','🔥':'flame',
  '🏷':'tag','🎨':'palette','⚡':'zap','💻':'code','🌍':'globe','🎓':'graduation-cap','🏫':'school','📊':'chart-bar',
  '📦':'box','🎁':'gift','🔑':'lock','🧪':'flask','🔬':'search','🧭':'compass','🗺':'map','📍':'map-pin',
  '🔖':'bookmark','❤':'heart','❤️':'heart','🔄':'refresh-cw','🔁':'refresh-cw','💾':'download','📥':'download',
  '📤':'upload','🌟':'star','🎮':'gamepad-2','🕹':'gamepad-2','🌈':'rainbow','☁':'cloud','⛅':'cloud','🌤':'cloud',
  '🌧':'cloud','⛈':'cloud','🌨':'cloud','❄':'snowflake','☃':'snowman','🌬':'wind','💨':'wind','🌪':'wind',
  '🌫':'cloud','🌞':'sun','🌝':'moon','🌚':'moon','🌛':'moon','🌜':'moon','💫':'sparkles','🔥':'flame','🌋':'flame',
  '🛎':'bell','🧳':'luggage','💼':'briefcase','👜':'briefcase','👝':'briefcase','👛':'wallet','👓':'glasses',
  '🕶':'sun','🥽':'glasses','🔍':'search','🔎':'search','🧿':'ban','🎯':'target','🎲':'dice','🎰':'slot',
  '🎳':'bowling','🚧':'alert-circle','🛑':'ban','⛔':'ban','🚫':'ban','💢':'alert-circle','💥':'zap','💣':'bomb',
  '💬':'message-circle','💭':'message-circle','🗯':'message-circle','♠':'club','♣':'club','♥':'heart','♦':'diamond',
  '♟':'chess','🃏':'joker','🀄':'mahjong','🌸':'flower','💐':'flower','🌷':'flower','🌹':'flower','🌺':'flower',
  '🌻':'flower','🌼':'flower','🌱':'sprout','🌲':'tree','🌳':'tree','🌴':'tree','🌵':'cactus','🌾':'herb',
  '🌿':'herb','🍀':'clover','🍁':'maple','🍂':'leaf','🍃':'leaf','🍄':'mushroom','🌰':'chestnut','🐴':'horse',
  '🐎':'horse','🦄':'horse','🐝':'bug','🐛':'bug','🦋':'bug','🐌':'bug','📡':'radio','📶':'bar-chart-3',
  '🔆':'sun','🔅':'sun','🎙':'mic','🎚':'sliders-horizontal','🎛':'sliders-horizontal','🔭':'telescope',
  '🔋':'battery','🔌':'plug','💡':'lightbulb','🔦':'flashlight','🕯':'candle','🪔':'lamp','🧨':'flame',
  '🎇':'sparkles','🎆':'sparkles','💈':'scissors','🧱':'layers','📐':'square-pen','✂':'square-pen','🩹':'heart',
  '🧯':'flame','🚩':'flag','⚑':'flag','🏁':'flag','🎌':'flag','🔰':'shield','♻':'refresh-cw','✳':'sparkles',
  '❇':'sparkles','💠':'sparkles','🔹':'square','🔸':'square','▪':'square','▫':'square','🔺':'triangle',
  '🔻':'triangle','⏪':'arrow-left','⏩':'arrow-right','⏫':'arrow-up','⏬':'arrow-down','🔼':'arrow-up',
  '🔽':'arrow-down','➿':'refresh-cw','〰':'wave','🌈':'rainbow','📰':'newspaper','🗞':'newspaper','📺':'tv',
  '📻':'radio','🎚':'sliders-horizontal','🧠':'brain','🚧':'alert-circle','🛑':'ban','💢':'alert-circle',
  '⚡':'zap','🌍':'globe','🌎':'globe','🌏':'globe','💞':'heart','💗':'heart','💓':'heart','💕':'heart',
  '💖':'heart','💘':'heart','💝':'heart','💟':'heart','♥':'heart','❣':'heart','⭕':'circle','✔':'check',
  '☑':'check','✒':'pencil','✍':'pencil','✍️':'pencil','🖌':'brush','🖊':'pencil','📰':'newspaper','🗞':'newspaper',
  '🌸':'flower','💐':'flower','🔭':'telescope','🧭':'compass','🗺':'map','📍':'map-pin','🔖':'bookmark',
  '🎥':'film','🎞':'film','📽':'film','🎟':'ticket','🎫':'ticket','🏷️':'tag','📌':'pin','🔑':'lock',
  '🗝':'key','🔨':'wrench','🪛':'wrench','🔧':'wrench','🔩':'wrench','⚙️':'settings','🛠':'wrench','💡':'lightbulb',
  '🧯':'flame','🪣':'bucket','🧹':'broom','🧺':'basket','🧻':'toilet-paper','🚽':'toilet','🪠':'plunger',
  '🪥':'toothbrush','🪥':'toothbrush','🧼':'soap','🪒':'razor','🧴':'lotion','🧷':'safety-pin','🩹':'heart',
  '🩺':'stethoscope','🩻':'x-ray','💊':'pill','💉':'syringe','🩸':'droplet','🦠':'bug','🧬':'dna','🔬':'search',
  '🔭':'telescope','📡':'radio','💻':'code','⌨':'keyboard','🖥':'monitor','🖨':'printer','🖱':'mouse',
  '🖲':'trackball','💽':'disk','💾':'download','💿':'cd','📀':'dvd','🧮':'abacus','🎥':'film','🎞':'film',
  '📽':'film','🎦':'cinema','📺':'tv','📷':'camera','📸':'camera','📹':'video-camera','📼':'videocassette',
  '🔍':'search','🔎':'search','🧿':'ban','🪄':'wand','🔮':'crystal-ball','🎯':'target','🪅':'pinata',
  '🪆':'nesting-dolls','🎲':'dice','🎰':'slot','🎳':'bowling','🎯':'target','🏀':'basketball','🏈':'football',
  '⚽':'soccer','⚾':'baseball','🥎':'softball','🏐':'volleyball','🏉':'rugby','🥏':'frisbee','🎾':'tennis',
  '🥏':'frisbee','🎱':'billiards','🏓':'ping-pong','🏸':'badminton','🥅':'goal','🏒':'hockey','🏑':'field-hockey',
  '🥍':'lacrosse','🏏':'cricket','⚾':'baseball','🏹':'bow-arrow','🎣':'fishing','🤿':'diving-mask',
  '🥊':'boxing','🥋':'martial-arts','🎽':'running-shirt','🛹':'skateboard','🛼':'roller-skate','🛷':'sled',
  '⛸':'ice-skate','🥌':'curling','🎿':'ski','⛷':'skier','🏂':'snowboard','🏋':'weightlifter','🤼':'wrestling',
  '🤸':'cartwheel','🤺':'fencer','🤾':'handball','🏌':'golfer','🏇':'horse-racing','🧘':'lotus','🏄':'surfer',
  '🏊':'swimmer','🤽':'water-polo','🚣':'rowboat','🧗':'climber','🚵':'mountain-biker','🚴':'biker','🏆':'trophy',
  '🥇':'medal','🥈':'medal','🥉':'medal','🏅':'medal','🎖':'medal','🏵':'rosette','🎗':'reminder-ribbon',
  '🎫':'ticket','🎟':'ticket','🎪':'circus','🤹':'juggler','🎭':'performing-arts','🎨':'palette','🎤':'microphone',
  '🎧':'headphones','🎼':'music','🎹':'piano','🥁':'drum','🎷':'saxophone','🎺':'trumpet','🎸':'guitar',
  '🎻':'violin','🪇':'maracas','🪘':'long-drum','🎚':'sliders-horizontal','🎛':'sliders-horizontal',
  '📱':'smartphone','📲':'calling','☎':'phone','📞':'phone','📟':'pager','📠':'fax','🔋':'battery','🔌':'plug',
  '💡':'lightbulb','🔦':'flashlight','🕯':'candle','🪔':'lamp','🧯':'flame','🛢':'oil-drum','💸':'money',
  '💵':'dollar','💴':'yen','💶':'euro','💷':'pound','💰':'banknote','💳':'credit-card','💎':'gem','⚖':'scale',
  '🧰':'toolbox','🧲':'magnet','🪜':'ladder','🧯':'flame','🪝':'hook','🛒':'cart','🛍':'shopping-bags',
  '🛅':'luggage','💼':'briefcase','📦':'package','📫':'mailbox','📪':'mailbox','📬':'mailbox','📭':'mailbox',
  '📮':'postbox','🗳':'ballot','✏️':'pencil','✒':'pencil','🖋':'pen-nib','🖊':'pen','🖌':'paintbrush',
  '🖍':'crayon','📝':'memo','📁':'folder','📂':'open-folder','🗂':'dividers','📅':'calendar','📆':'calendar',
  '🗓':'calendar','📇':'card-index','📈':'chart-up','📉':'chart-down','📊':'bar-chart','📋':'clipboard',
  '📌':'pin','📍':'pin','📎':'paperclip','🖇':'paperclip','📏':'ruler','📐':'triangle-ruler','✂':'scissors',
  '🗃':'file-cabinet','🗄':'file-cabinet','🗑':'wastebasket','🔒':'lock','🔓':'unlock','🔏':'lock',
  '🔐':'lock','🔑':'key','🗝':'key','🔨':'hammer','🪓':'axe','⛏':'pick','⚒':'hammer','🛠':'tools',
  '🗜':'clamp','🔧':'wrench','🔩':'nut','⚙':'gear','🧱':'brick','⚗':'alembic','⚛':'atom','🔭':'telescope',
  '🔥':'fire','🌡':'thermometer','♨':'hot-springs','🎈':'balloon','🎉':'tada','🎊':'confetti','🎎':'dolls',
  '🎏':'carp-streamer','🎐':'wind-chime','🎑':'moon-viewing','🧧':'red-envelope','🎀':'ribbon','🎁':'gift',
  '🎂':'cake','🍰':'shortcake','🍴':'fork-knife','🍽':'plate','🥄':'spoon','🔪':'knife','🏺':'amphora',
};
// 过滤掉不存在的图标名（保险）
function hasIcon(name){ return fs.existsSync(path.join(process.cwd(),'assets/icons/'+name+'.svg')); }
for(const k of Object.keys(ICON)){ if(!hasIcon(ICON[k])) ICON[k]=null; }

function repl(m){
  const ic=ICON[m[0]];
  if(ic) return '<i class="cc-ic" data-ic="'+ic+'" aria-hidden="true"></i>';
  return '';
}

// 除 href/src 外的所有属性值里的 emoji 直接剥离（避免破坏 URL）
const ATTR = /([a-zA-Z_:][\w:.-]*)=(?:"([^"]*)"|'([^']*)')/gi;
function clearAttr(tag){
  return tag.replace(ATTR, (full, name, dq, sq)=>{
    const low=name.toLowerCase();
    if(low==='href'||low==='src') return full;
    const val = dq!==undefined?dq:sq;
    const cleaned = val.replace(EMOJI,'');
    const q = dq!==undefined?'"':"'";
    return name+'='+q+cleaned+q;
  });
}

// 1) 把 script/style/comment 整块抽成占位符，避免被标签分割干扰
function protectBlocks(html){
  const blocks=[];
  html = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, (m)=>{
    blocks.push(m); return '\u0000B'+(blocks.length-1)+'\u0000';
  });
  return {html, blocks};
}
// 4) 还原被保护的块，并对其中 emoji 仅剥离（不注入图标，安全）
function restoreBlocks(html, blocks){
  return html.replace(/\u0000B(\d+)\u0000/g, (m,n)=> blocks[+n].replace(EMOJI,''));
}
// 2) 处理可见 HTML：标签部分清属性，文本部分映射图标/剥离
function processVisible(html){
  const parts = html.split(/(<[^>]+>)/g);
  const out=[];
  for(const p of parts){
    if(p.startsWith('<')) out.push(clearAttr(p));
    else out.push(p.replace(EMOJI, repl));
  }
  return out.join('');
}
function clearHtml(html){
  const {html:h, blocks}=protectBlocks(html);
  const vis=processVisible(h);
  return restoreBlocks(vis, blocks);
}

// ---- 目标文件 ----
const ROOT = process.cwd();
const targets = [];
function addGlob(dir){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()){ if(!['node_modules','_archive','_internal','deploy','docs','assets','.git'].includes(e.name)) addGlob(p); } else if(e.name.endsWith('.html')) targets.push(p); } }
addGlob(path.join(ROOT,'website'));
addGlob(path.join(ROOT,'lab'));
addGlob(path.join(ROOT,'linguavista'));
addGlob(path.join(ROOT,'book'));
addGlob(path.join(ROOT,'blog'));
addGlob(path.join(ROOT,'novel'));
addGlob(path.join(ROOT,'data'));
addGlob(path.join(ROOT,'templates'));
for(const f of ['index.html','404.html']){ const p=path.join(ROOT,f); if(fs.existsSync(p)) targets.push(p); }
for(const f of ['.tmp_chat.html','.tmp_sl.html']){ const p=path.join(ROOT,f); if(fs.existsSync(p)) targets.push(p); }

let totalChanged=0, totalRemoved=0;
for(const f of targets){
  let s=fs.readFileSync(f,'utf8');
  const before=(s.match(EMOJI)||[]).length;
  s=clearHtml(s);
  const after=(s.match(EMOJI)||[]).length;
  if(before!==after){
    fs.writeFileSync(f,s);
    totalChanged++; totalRemoved+=before-after;
    console.log(`fixed ${path.relative(ROOT,f)}: ${before} -> ${after}`);
  }
}
console.log('---');
console.log('files processed:', targets.length, 'changed:', totalChanged, 'emoji removed:', totalRemoved);
