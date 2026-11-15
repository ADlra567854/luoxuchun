#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02_knn.py — K 近邻分类（监督学习）
KNN 是「懒惰学习」的典型：训练阶段什么都不做，把样本存下来；
预测时才去算距离。所以它没有「训练时间」，只有「预测时间」。

本文件手写欧氏距离 + 多数投票，在一个人造的二分类数据集上跑，
并输出混淆矩阵 —— 只看准确率会被不平衡数据骗，混淆矩阵不会。

顺带做两件事：
  1. 扫一遍不同的 k，看准确率怎么变（k=1 容易过拟合，k 太大又变糊）
  2. 演示「标准化前 vs 标准化后」，说明量纲不统一会毁掉距离度量

用法:
    python 02_knn.py
"""
import argparse
import math
import random


def make_blobs(n, seed):
    """造两类点，两类主要靠 y 区分，x 只是均匀噪声。

    这样设计是刻意的：如果两类在 x 上也分得开，后面「把 x 放大 100 倍」
    的实验就不会失败，量纲问题演示不出来。真实数据里最难缠的恰恰是
    「有个和标签无关的大数值特征」这种情况。
    """
    rng = random.Random(seed)
    data = []
    for _ in range(n // 2):
        data.append((rng.uniform(-1, 1), rng.gauss(-1.0, 1.2), "A"))
    for _ in range(n - n // 2):
        data.append((rng.uniform(-1, 1), rng.gauss(1.0, 1.2), "B"))
    rng.shuffle(data)
    return data


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def knn_predict(train, x, k):
    """取最近的 k 个邻居，多数投票。平票时按距离加权：越近权重越大。"""
    near = sorted(train, key=lambda p: dist(x, p))[:k]
    votes = {}
    for p in near:
        votes[p[2]] = votes.get(p[2], 0) + 1
    best = max(votes.items(), key=lambda kv: (kv[1], kv[0]))
    if len(votes) == 1:
        return best[0]
    # 平票：用距离倒数加权再决一次
    weight = {}
    for p in near:
        d = dist(x, p) or 1e-9
        weight[p[2]] = weight.get(p[2], 0.0) + 1.0 / d
    return max(weight.items(), key=lambda kv: kv[1])[0]


def evaluate(train, test, k):
    tp = fp = tn = fn = 0
    for x in test:
        pred = knn_predict(train, (x[0], x[1]), k)
        real = x[2]
        if real == "B" and pred == "B":
            tp += 1
        elif real == "A" and pred == "B":
            fp += 1
        elif real == "A" and pred == "A":
            tn += 1
        else:
            fn += 1
    total = len(test)
    acc = (tp + tn) / total if total else 0
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    return acc, prec, rec, (tp, fp, tn, fn)


def standardize(train, test):
    """按训练集算均值与标准差，再同时作用到训练集和测试集。
    顺序千万别反 —— 用测试集信息去算均值，就是数据泄漏。"""
    xs = [p[0] for p in train]
    ys = [p[1] for p in train]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sx = (sum((v - mx) ** 2 for v in xs) / len(xs)) ** 0.5 or 1.0
    sy = (sum((v - my) ** 2 for v in ys) / len(ys)) ** 0.5 or 1.0
    f = lambda arr: [((p[0] - mx) / sx, (p[1] - my) / sy, p[2]) for p in arr]
    return f(train), f(test)


def main():
    ap = argparse.ArgumentParser(description="K 近邻分类（纯 Python）")
    ap.add_argument("--n", type=int, default=200, help="总样本数")
    ap.add_argument("--k", type=int, default=5, help="邻居数")
    ap.add_argument("--seed", type=int, default=5, help="随机种子")
    args = ap.parse_args()

    data = make_blobs(args.n, args.seed)
    split = int(len(data) * 0.7)
    train, test = data[:split], data[split:]

    print("=" * 62)
    print(f"KNN 二分类 · 总样本 {len(data)}，训练 {len(train)} / 测试 {len(test)}")
    print("=" * 62)

    acc, prec, rec, cm = evaluate(train, test, args.k)
    tp, fp, tn, fn = cm
    print(f"k = {args.k}")
    print(f"  准确率 Accuracy  {acc:.3f}")
    print(f"  精确率 Precision {prec:.3f}")
    print(f"  召回率 Recall    {rec:.3f}")
    print("  混淆矩阵（正类 = B）：")
    print(f"                   预测A   预测B")
    print(f"    实际A（负）    {tn:>5}   {fp:>5}")
    print(f"    实际B（正）    {fn:>5}   {tp:>5}")

    print("-" * 62)
    print("扫不同 k 的准确率：")
    best_k, best_acc = None, -1
    for k in (1, 3, 5, 9, 15, 25):
        a, _, _, _ = evaluate(train, test, k)
        mark = ""
        if a > best_acc:
            best_k, best_acc = k, a
            mark = "  ← 目前最好"
        print(f"  k={k:<3} 准确率 {a:.3f}{mark}")
    print(f"→ 本数据上 k={best_k} 最准（{best_acc:.3f}）。k 太小时对噪声敏感，太大时把边界抹平。")

    print("-" * 62)
    # 量纲实验：x 本来是均匀噪声（和标签无关），放大 100 倍后它会统治距离
    scale = [(p[0] * 100, p[1], p[2]) for p in data]
    tr_s, te_s = scale[:split], scale[split:]
    a_raw, _, _, _ = evaluate(tr_s, te_s, args.k)
    tr_z, te_z = standardize(tr_s, te_s)
    a_std, _, _, _ = evaluate(tr_z, te_z, args.k)
    print("量纲实验（x 与标签无关，但把它放大 100 倍）：")
    print(f"  不标准化  准确率 {a_raw:.3f}")
    print(f"  标准化后  准确率 {a_std:.3f}")
    if a_raw < a_std - 0.05:
        print(f"  放大后掉了 {(a_std - a_raw) * 100:.0f} 个百分点 —— 距离被无关的大数值特征吃掉了。")
    print("  这就是做 KNN 前必须标准化的原因：距离算法对量纲极其敏感。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：K 太小对噪声敏感（过拟合）、太大会抹平类别边界（欠拟合）；距离度量前先标准化，否则量纲大的特征会主导结果。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/ml/02_knn.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
