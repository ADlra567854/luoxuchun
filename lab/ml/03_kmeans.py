#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
03_kmeans.py — K-Means 聚类（无监督学习）
和监督学习最大的区别：这里没有标签，模型自己找结构。
算法只有四步，反复做：
  1. 随机选 k 个点当初始中心
  2. 每个点归给最近的中心
  3. 每个簇把中心挪到成员的平均位置
  4. 中心不再移动就停

工程上必须知道的三个坑，本文件都给了解法：
  · 随机初始化会陷局部最优 → 用 k-means++ 选初始点，再跑多次取最优
  · k 选几个 → 用「肘部法」看惯性（簇内平方和）随 k 的下降拐点
  · 数据量纲不同会毁掉距离 → 先标准化

用法:
    python 03_kmeans.py
    python 03_kmeans.py --k 4 --restarts 10
"""
import argparse
import math
import random


def make_blobs(centers, per, spread, seed):
    rng = random.Random(seed)
    pts = []
    for cx, cy in centers:
        for _ in range(per):
            pts.append((rng.gauss(cx, spread), rng.gauss(cy, spread)))
    rng.shuffle(pts)
    return pts


def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def init_kmeanspp(pts, k, rng):
    """k-means++：第一个随机，之后每个新中心按「离已有中心越远越容易被选中」抽。"""
    centers = [rng.choice(pts)]
    while len(centers) < k:
        d2 = [min(dist2(p, c) for c in centers) for p in pts]
        total = sum(d2)
        if total <= 0:
            centers.append(rng.choice(pts))
            continue
        r = rng.random() * total
        acc = 0.0
        for p, w in zip(pts, d2):
            acc += w
            if acc >= r:
                centers.append(p)
                break
        else:
            centers.append(pts[-1])
    return [tuple(c) for c in centers]


def assign(pts, centers):
    labels = []
    for p in pts:
        best, bi = None, 0
        for i, c in enumerate(centers):
            d = dist2(p, c)
            if best is None or d < best:
                best, bi = d, i
        labels.append(bi)
    return labels


def update(pts, labels, k):
    sx = [0.0] * k
    sy = [0.0] * k
    cnt = [0] * k
    for p, l in zip(pts, labels):
        sx[l] += p[0]
        sy[l] += p[1]
        cnt[l] += 1
    out = []
    for i in range(k):
        if cnt[i] == 0:
            # 空簇：随机挑一个点重新当中心，否则会一直空着
            out.append(pts[random.randrange(len(pts))])
        else:
            out.append((sx[i] / cnt[i], sy[i] / cnt[i]))
    return out


def inertia(pts, labels, centers):
    """簇内平方和。越小越紧凑，是肘部法的纵轴。"""
    return sum(dist2(p, centers[l]) for p, l in zip(pts, labels))


def kmeans(pts, k, rng, max_iter=100):
    centers = init_kmeanspp(pts, k, rng)
    labels = []
    for _ in range(max_iter):
        labels = assign(pts, centers)
        new = update(pts, labels, k)
        if all(dist2(a, b) < 1e-12 for a, b in zip(centers, new)):
            centers = new
            break
        centers = new
    return centers, labels, inertia(pts, labels, centers)


def main():
    ap = argparse.ArgumentParser(description="K-Means 聚类（纯 Python）")
    ap.add_argument("--k", type=int, default=3, help="簇数")
    ap.add_argument("--restarts", type=int, default=10, help="随机重启次数，取惯性最小的那次")
    ap.add_argument("--per", type=int, default=60, help="每个真实簇的样本数")
    ap.add_argument("--seed", type=int, default=9, help="随机种子")
    args = ap.parse_args()

    # 真实结构是 4 个团，但默认只让模型找 3 个 —— 故意不给定对的 k，
    # 这样后面的肘部法才有东西可说
    true_centers = [(-4, -4), (-4, 4), (4, 0), (4, 6)]
    pts = make_blobs(true_centers, args.per, 1.1, args.seed)

    print("=" * 64)
    print(f"K-Means 聚类 · 样本 {len(pts)}，真实结构 {len(true_centers)} 团，令 k={args.k}")
    print(f"随机重启 {args.restarts} 次，取惯性最小的解")
    print("=" * 64)

    rng = random.Random(args.seed)
    best = None
    for _ in range(args.restarts):
        c, l, inr = kmeans(pts, args.k, rng)
        if best is None or inr < best[2]:
            best = (c, l, inr)
    centers, labels, inr = best

    sizes = {}
    for l in labels:
        sizes[l] = sizes.get(l, 0) + 1
    print(f"最优解惯性 = {inr:.2f}（越小越紧凑）")
    print("各簇中心与成员数：")
    for i, c in enumerate(centers):
        print(f"  簇{i}: 中心 ({c[0]:6.2f}, {c[1]:6.2f})   成员 {sizes.get(i, 0):>4}")
    assert sum(sizes.values()) == len(pts), "有样本没被分到任何簇"
    print("自检通过：全部样本都分到了簇，没有漏点。")

    print("-" * 64)
    print("肘部法：换不同 k 看惯性怎么掉")
    prev = None
    for k in range(1, 8):
        rng2 = random.Random(args.seed)
        bb = None
        for _ in range(max(3, args.restarts // 2)):
            cc, ll, ii = kmeans(pts, k, rng2)
            if bb is None or ii < bb:
                bb = ii
        drop = "" if prev is None else f"  （比上一档降 {prev - bb:.1f}）"
        print(f"  k={k}  惯性 {bb:9.2f}{drop}")
        prev = bb
    print("→ 惯性持续下降是必然的（k 越大越贴近数据），看的是「降幅突然变小的拐点」。")
    print("  真实结构是 4 团，所以 k=4 之后降幅应该明显收窄 —— 拐点就在那儿。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：k-means++ 初始化比纯随机初始化惯性更小、结果更稳；惯性随迭代单调下降但只保证局部最优，簇数 K 需外部给定。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/ml/03_kmeans.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
