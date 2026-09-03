/**
 * 白驹品牌标识 · 参数化矢量生成器
 * ---------------------------------------------------------------
 * 设计方法：人工几何构造（非 AI 位图描摹）
 *   1. 在 512x512 坐标系内以折线顶点定义「马头 + 颈」剪影
 *   2. 在剪影内部布置神经网络节点（圆）与连线（线段）
 *   3. 三个变体共享同一组坐标参数：
 *      - bw    黑白稿（商标申请主图样：黑剪影 + 白挖空）
 *      - color 彩色渐变（站点主视觉）
 *      - mono  单色 currentColor（站内组件，自动适配亮/暗主题）
 * 输出：assets/brand/vector/*.svg
 * ---------------------------------------------------------------
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'assets', 'brand', 'vector');

/* ============ 1. 马头剪影轮廓 ============
 * 构图：脸轴近水平（略上扬 ~20°），马头朝左，颈部向右下延伸
 * 比例依据（马侧脸）：头宽 / 头长 ≈ 0.43；耳朵细长尖锐；
 *                    下颌角与喉部之间保留清晰折角（马的核心识别特征）
 * 顺时针：鼻头上 -> 鼻梁 -> 额凸 -> 耳 -> 鬃毛 -> 颈背 -> 颈底 -> 喉 -> 下颌 -> 嘴 -> 闭合
 */
const RAW_OUTLINE = [
  [62, 296],   //  1 鼻头上（最前）
  [128, 272],  //  2 鼻梁中
  [196, 248],  //  3 颧骨
  [248, 216],  //  4 额凸（眼上方最前凸点）
  [286, 208],  //  5 耳前根
  [308, 122],  //  6 耳尖（细长尖三角）
  [334, 210],  //  7 耳后根
  [366, 222],  //  8 鬃毛 1
  [396, 262],  //  9 鬃毛 2
  [416, 336],  // 10 颈背
  [446, 462],  // 11 颈后底（画布下缘，平切）
  [340, 462],  // 12 颈前底（底部平切 —— 颈部不收成尖，避免观感像尾巴）
  [318, 402],  // 13 喉凹（下颌与颈之间的内凹）
  [300, 352],  // 14 下颌角（关键折角）
  [215, 360],  // 15 下颌中
  [138, 352],  // 16 下颌前
  [86, 332],   // 17 嘴下
  [58, 318],   // 18 嘴前
];

/* ============ 2. 神经网络：节点（关键解剖位 + 中心枢纽） ============
 * 注：网络层由 clipPath 限制在剪影内部，故坐标允许略微贴边，
 *     被裁切后形成「神经网络被颅骨轮廓约束」的观感，同时杜绝溢出。
 */
const RAW_NODES = [
  { id: 'N1', x: 238, y: 258, r: 13 }, // 额
  { id: 'N2', x: 172, y: 286, r: 13 }, // 眼
  { id: 'N3', x: 112, y: 302, r: 12 }, // 鼻
  { id: 'N4', x: 208, y: 324, r: 13 }, // 下颌
  { id: 'N5', x: 282, y: 300, r: 13 }, // 颊后
  { id: 'N6', x: 352, y: 282, r: 13 }, // 鬃毛
  { id: 'N7', x: 368, y: 356, r: 13 }, // 颈
  { id: 'C',  x: 255, y: 296, r: 17 }, // 中心枢纽（大脑）
];

/* 网络连线策略：
 *   仅保留「中心枢纽 -> 各节点」的放射线，不画外环。
 *   理由：① 语义上更贴合「全局大脑 / 中枢调度」；
 *         ② 线条数量从 11 降到 7，内部更透气，小尺寸不糊；
 *         ③ 商标审查中，简洁图形的显著性更容易被认可。
 */
const RING = [];
const SPOKES = [['C','N1'],['C','N2'],['C','N3'],['C','N4'],['C','N5'],['C','N6'],['C','N7']];

/* ============ 3. 工具函数：包围盒归一化（自动居中 + 填满画布） ============ */
const SIZE = 512;
const PAD = 26; // 画布内边距（px）

function normalize(points, extraScale = 1) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const box = SIZE - PAD * 2;
  const s = (box / Math.max(w, h)) * extraScale;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const mid = SIZE / 2;
  return points.map(([x, y]) => [
    +(mid + (x - cx) * s).toFixed(1),
    +(mid + (y - cy) * s).toFixed(1),
  ]);
}

/** 节点圆有半径，归一化时需把边缘纳入包围盒 */
function normalizeNodes(nodes, srcPts, dstPts) {
  const xs = [], ys = [];
  nodes.forEach((n, i) => {
    const [dx, dy] = dstPts[i];
    xs.push(dx - n.r, dx + n.r);
    ys.push(dy - n.r, dy + n.r);
  });
  return nodes.map((n, i) => ({ ...n, x: dstPts[i][0], y: dstPts[i][1] }));
}

const OUTLINE = normalize(RAW_OUTLINE);
// 节点用与轮廓相同的变换（归一化后的轮廓坐标即节点目标坐标）
const NODES = RAW_NODES.map((n, i) => ({ ...n }));
{
  // 用轮廓的变换矩阵同步变换节点
  const xs = RAW_OUTLINE.map(p => p[0]);
  const ys = RAW_OUTLINE.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const box = SIZE - PAD * 2;
  const s = box / Math.max(w, h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const mid = SIZE / 2;
  NODES.forEach(n => {
    n.x = +(mid + (n.x - cx) * s).toFixed(1);
    n.y = +(mid + (n.y - cy) * s).toFixed(1);
    n.r = +(n.r * s).toFixed(1);
  });
}

const P = OUTLINE.map(p => p.join(' ')).join(' L ');
const pathD = `M ${P} Z`;
const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));

const lineD = (pairs) => pairs
  .map(([a, b]) => {
    const A = nodeById[a], B = nodeById[b];
    return `M ${A.x} ${A.y} L ${B.x} ${B.y}`;
  })
  .join(' ');

const circlesSVG = (fill) => NODES
  .map(n => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${fill}"/>`)
  .join('\n      ');

const NET_LINES = lineD([...RING, ...SPOKES]);
/* 线宽随归一化缩放（原始设计基于未缩放坐标，线宽 8 → 按同一 s 放大） */
{
  const xs = RAW_OUTLINE.map(p => p[0]);
  const ys = RAW_OUTLINE.map(p => p[1]);
  const s = (SIZE - PAD * 2) / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  globalThis.__STROKE = +(6 * s).toFixed(1);
}
const STROKE = globalThis.__STROKE;

/* ============ 4. 三个变体 ============ */

/* 4.1 黑白稿 —— 商标申请主图样：黑剪影 + 白色挖空（纯黑白，无灰度） */
const bw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="白驹 标识">
  <title>白驹 · 全局大脑（黑白稿 · 商标申请用）</title>
  <defs>
    <clipPath id="bjClipBW"><path d="${pathD}"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="#FFFFFF"/>
  <path d="${pathD}" fill="#000000"/>
  <g clip-path="url(#bjClipBW)">
    <path d="${NET_LINES}" fill="none" stroke="#FFFFFF" stroke-width="${STROKE}" stroke-linecap="round"/>
    ${circlesSVG('#FFFFFF')}
  </g>
</svg>
`;

/* 4.2 彩色稿 —— 站点主视觉：青蓝紫渐变剪影 + 半透明白网络 */
const color = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="白驹 标识">
  <title>白驹 · 全局大脑（彩色渐变）</title>
  <defs>
    <linearGradient id="bjGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38E1FF"/>
      <stop offset="0.48" stop-color="#5B8CFF"/>
      <stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
    <clipPath id="bjClipColor"><path d="${pathD}"/></clipPath>
  </defs>
  <path d="${pathD}" fill="url(#bjGrad)"/>
  <g clip-path="url(#bjClipColor)">
    <path d="${NET_LINES}" fill="none" stroke="#FFFFFF" stroke-width="${STROKE}" stroke-linecap="round" opacity="0.6"/>
    <g opacity="0.92">${circlesSVG('#FFFFFF')}</g>
  </g>
</svg>
`;

/* 4.3 单色稿 —— 站内组件：currentColor，自动适配主题；网络层用挖空实现 */
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="白驹 标识">
  <title>白驹 · 全局大脑（单色 currentColor）</title>
  <defs>
    <mask id="bjCut">
      <rect width="512" height="512" fill="#000"/>
      <path d="${pathD}" fill="#fff"/>
      <path d="${NET_LINES}" fill="none" stroke="#000" stroke-width="${STROKE}" stroke-linecap="round"/>
      ${circlesSVG('#000')}
    </mask>
  </defs>
  <rect width="512" height="512" fill="currentColor" mask="url(#bjCut)"/>
</svg>
`;

/* 4.4 简化版 —— 小尺寸（favicon / 16-32px）：仅剪影 + 中心节点，保证可识别 */
const markSmall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="白驹 标识 简化版">
  <title>白驹 · 全局大脑（简化版 · 小尺寸用）</title>
  <defs>
    <mask id="bjSmall">
      <rect width="512" height="512" fill="#000"/>
      <path d="${pathD}" fill="#fff"/>
      <circle cx="${nodeById.C.x}" cy="${nodeById.C.y}" r="${(nodeById.C.r * 1.5).toFixed(1)}" fill="#000"/>
    </mask>
  </defs>
  <rect width="512" height="512" fill="currentColor" mask="url(#bjSmall)"/>
</svg>
`;

/* ============ 5. 写出 ============ */
writeFileSync(join(OUT, 'baiju-mark-bw.svg'), bw, 'utf8');
writeFileSync(join(OUT, 'baiju-mark-color.svg'), color, 'utf8');
writeFileSync(join(OUT, 'baiju-mark-mono.svg'), mono, 'utf8');
writeFileSync(join(OUT, 'baiju-mark-small.svg'), markSmall, 'utf8');

console.log('written:');
console.log('  baiju-mark-bw.svg     商标黑白稿（申请用）');
console.log('  baiju-mark-color.svg  彩色渐变（主视觉）');
console.log('  baiju-mark-mono.svg   单色 currentColor（站内组件）');
console.log('  baiju-mark-small.svg  简化版（favicon / 小尺寸）');
console.log('outline vertices:', OUTLINE.length, '| nodes:', NODES.length, '| edges:', RING.length + SPOKES.length);
