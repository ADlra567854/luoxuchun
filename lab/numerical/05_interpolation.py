#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
05_interpolation.py — 拉格朗日插值
给定 n 个点，存在唯一的 n-1 次多项式穿过它们 —— 拉格朗日插值直接把这个
多项式写出来，不用解方程组：

    L(x) = Σ y_i · Π_{j≠i} (x - x_j) / (x_i - x_j)

它的优点是「精确过点、公式直白」，缺点是：
  · 每加一个点，整个多项式都要重算（没有增量性）
  · 点一多就剧烈振荡（龙格现象），这是最容易被忽略的坑

所以本文件不只演示「能插值」，更演示「什么时候不能用它」：
在 [-1,1] 上取等距节点插值 Runge 函数 1/(1+25x²)，节点越多，
边界振荡越离谱 —— 这不是数值误差，是方法本身的性质。

用法:
    python 05_interpolation.py
"""
import math


def lagrange(xs, ys, x):
    """在 x 处求拉格朗日插值多项式的值。"""
    n = len(xs)
    total = 0.0
    for i in range(n):
        term = ys[i]
        for j in range(n):
            if i != j:
                term *= (x - xs[j]) / (xs[i] - xs[j])
        total += term
    return total


def runge(x):
    """龙格函数：等距插值的经典反例。"""
    return 1.0 / (1.0 + 25.0 * x * x)


def chebyshev_nodes(n, a, b):
    """切比雪夫节点：往两端加密，能显著压住龙格现象。"""
    out = []
    for k in range(n):
        c = math.cos(math.pi * (2 * k + 1) / (2 * n))
        out.append((a + b) / 2 + (b - a) / 2 * c)
    return sorted(out)


def max_err(xs, ys, f, a, b, samples=400):
    """在 [a,b] 上密集采样，返回插值与真值的最大偏差。"""
    worst = 0.0
    for i in range(samples + 1):
        x = a + (b - a) * i / samples
        worst = max(worst, abs(lagrange(xs, ys, x) - f(x)))
    return worst


def main():
    print("=" * 70)
    print("一、基本用法：用 4 个点插值，验证「精确过点」")
    print("=" * 70)
    xs = [0.0, 1.0, 2.0, 3.0]
    ys = [1.0, 3.0, 2.0, 5.0]
    print("已知点：", ", ".join(f"({x}, {y})" for x, y in zip(xs, ys)))
    print("插值结果：")
    for x in (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0):
        mark = "  ← 已知点" if x in xs else ""
        print(f"  L({x:>4}) = {lagrange(xs, ys, x):10.6f}{mark}")
    for x, y in zip(xs, ys):
        assert abs(lagrange(xs, ys, x) - y) < 1e-10, "插值没有精确过已知点"
    print("自检通过：4 个已知点上误差为 0，多项式次数为 3。")

    print("\n" + "=" * 70)
    print("二、龙格现象：等距节点越多，反而越不准")
    print("=" * 70)
    print("插值目标：Runge 函数 1/(1+25x²)，区间 [-1, 1]")
    print(f"{'节点数':>8}{'最大误差':>18}{'评价'}")
    print("-" * 70)
    prev = None
    for n in (5, 9, 13, 17, 21):
        nx = [-1 + 2 * i / (n - 1) for i in range(n)]
        ny = [runge(x) for x in nx]
        e = max_err(nx, ny, runge, -1, 1)
        verdict = ""
        if prev is not None:
            verdict = "误差变小" if e < prev else "误差反而变大 ←"
        print(f"{n:>8}{e:>18.4f}   {verdict}")
        prev = e
    print("-" * 70)
    print("节点从 5 加到 21，误差没有收敛，反而在恶化。这就是龙格现象：")
    print("等距节点的插值多项式在区间两端会出现剧烈振荡，节点越多振幅越大。")

    print("\n" + "=" * 70)
    print("三、解法一：换切比雪夫节点（两端加密）")
    print("=" * 70)
    print(f"{'节点数':>8}{'等距最大误差':>18}{'切比雪夫最大误差':>20}")
    print("-" * 70)
    for n in (5, 9, 13, 17, 21):
        ux = [-1 + 2 * i / (n - 1) for i in range(n)]
        ue = max_err(ux, [runge(x) for x in ux], runge, -1, 1)
        cx = chebyshev_nodes(n, -1, 1)
        ce = max_err(cx, [runge(x) for x in cx], runge, -1, 1)
        print(f"{n:>8}{ue:>18.4f}{ce:>20.4f}")
    print("-" * 70)
    print("同样多的节点，切比雪夫节点的误差从「爆炸」变成「可控」。")
    print("所以区间两端加密不是玄学，是有原因的：端点振荡是误差的主要来源。")

    print("\n" + "=" * 70)
    print("四、解法二：别用高阶多项式，改用分段插值")
    print("=" * 70)

    def piecewise_linear(xs, ys, x):
        """分段线性：找 x 落在哪一段，直线上取点。绝不会振荡。"""
        for i in range(len(xs) - 1):
            if xs[i] <= x <= xs[i + 1]:
                t = (x - xs[i]) / (xs[i + 1] - xs[i])
                return ys[i] * (1 - t) + ys[i + 1] * t
        return ys[-1] if x > xs[-1] else ys[0]

    n = 21
    ux = [-1 + 2 * i / (n - 1) for i in range(n)]
    uy = [runge(x) for x in ux]
    worst = 0.0
    for i in range(401):
        x = -1 + 2 * i / 400
        worst = max(worst, abs(piecewise_linear(ux, uy, x) - runge(x)))
    print(f"分段线性（21 个节点）最大误差：{worst:.4f}")
    print("精度不如切比雪夫，但绝不会振荡，而且计算量极小 —— 工程上最常用的其实是它。")

    print("\n" + "=" * 70)
    print("结论：插值不是「次数越高越好」。三个正确姿势：")
    print("  1. 节点选切比雪夫（两端加密），别用等距")
    print("  2. 或者干脆分段（线性 / 三次样条），把高阶多项式拆掉")
    print("  3. 数据本身有噪声时，插值就是错的 —— 该用拟合（最小二乘）")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：插值不是次数越高越好：等距高次会出现 Runge 振荡，改用 Chebyshev 节点能显著压低最大误差。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/numerical/05_interpolation.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
