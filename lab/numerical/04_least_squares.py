#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
04_least_squares.py — 最小二乘拟合
「最小二乘」的意思是：让所有点的残差平方和最小。
残差平方和是凸函数，所以有唯一闭式解，用正态方程一步就能算出来：

    A^T A · x = A^T b      其中 A 是设计矩阵（每行一个样本）

本文件手写三个版本的多元线性拟合并互相对拍：
  1. 正态方程直接解（高斯消元）—— 教科书解法
  2. 梯度下降 —— 迭代解法，用来验证 1 的结果
  3. 单变量线性回归的特例公式 —— 就是课本上那个斜率公式

为什么要三个版本：正态方程很快，但 A^T A 的条件数是原来的平方，数据尺度
差距大时会严重失真；这时候要么标准化，要么直接用 QR/SVD。手写一遍比读十遍
更有感觉。

用法:
    python 04_least_squares.py
    python 04_least_squares.py --n 300 --noise 1.5
"""
import argparse
import random


def solve_linear(A, b):
    """高斯消元（带部分主元）解 A x = b。A 必须是方阵。"""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        # 部分主元：选绝对值最大的那行换上来，避免除以极小数
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        if abs(M[piv][col]) < 1e-14:
            raise ValueError("矩阵奇异，无法求解")
        M[col], M[piv] = M[piv], M[col]
        pv = M[col][col]
        for r in range(col + 1, n):
            factor = M[r][col] / pv
            if factor == 0:
                continue
            for c in range(col, n + 1):
                M[r][c] -= factor * M[col][c]
    # 回代
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / M[i][i]
    return x


def make_data(n, true_w, true_b, noise, seed):
    """y = w1*x1 + w2*x2 + b + 噪声"""
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        x1 = rng.uniform(0, 10)
        x2 = rng.uniform(-5, 5)
        y = true_w[0] * x1 + true_w[1] * x2 + true_b + rng.gauss(0, noise)
        rows.append((x1, x2, y))
    return rows


def normal_equation(rows):
    """构造 A^T A 与 A^T b，解出 [w1, w2, b]。"""
    # 设计矩阵每行 (x1, x2, 1)
    k = 3
    AtA = [[0.0] * k for _ in range(k)]
    Atb = [0.0] * k
    for x1, x2, y in rows:
        f = (x1, x2, 1.0)
        for i in range(k):
            Atb[i] += f[i] * y
            for j in range(k):
                AtA[i][j] += f[i] * f[j]
    return solve_linear(AtA, Atb)


def gradient_descent(rows, lr=1e-2, epochs=4000):
    """对残差平方和做梯度下降。要先标准化，否则 lr 极难调。

    lr 用 1e-2 而不是更小的值：特征已经标准化，量纲一致，
    学习率可以放大；lr 太小（如 1e-3）在 4000 轮内收敛不到双精度极限，
    和正态方程对拍时会差到 1e-3 量级，看起来像 bug，其实是没跑够。
    """
    xs = [(r[0], r[1]) for r in rows]
    ys = [r[2] for r in rows]
    n = len(rows)

    # 按列标准化（用训练数据的均值方差）
    mx1 = sum(p[0] for p in xs) / n
    mx2 = sum(p[1] for p in xs) / n
    sx1 = (sum((p[0] - mx1) ** 2 for p in xs) / n) ** 0.5 or 1.0
    sx2 = (sum((p[1] - mx2) ** 2 for p in xs) / n) ** 0.5 or 1.0
    my = sum(ys) / n

    w1 = w2 = b = 0.0
    for _ in range(epochs):
        g1 = g2 = gb = 0.0
        for (x1, x2), y in zip(xs, ys):
            z1 = (x1 - mx1) / sx1
            z2 = (x2 - mx2) / sx2
            err = w1 * z1 + w2 * z2 + b - (y - my)
            g1 += z1 * err
            g2 += z2 * err
            gb += err
        w1 -= lr * 2.0 / n * g1
        w2 -= lr * 2.0 / n * g2
        b -= lr * 2.0 / n * gb
    # 把标准化空间里的系数换回原始尺度
    W1 = w1 / sx1
    W2 = w2 / sx2
    B = my + b - W1 * mx1 - W2 * mx2
    return [W1, W2, B]


def simple_linear(rows):
    """只用 x1 的一元回归，闭式解：w = cov(x,y)/var(x)，b = ȳ - w x̄。"""
    n = len(rows)
    xs = [r[0] for r in rows]
    ys = [r[2] for r in rows]
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / n
    var = sum((x - mx) ** 2 for x in xs) / n
    w = cov / var if var else 0.0
    return w, my - w * mx


def r2(rows, coef):
    w1, w2, b = coef
    ys = [r[2] for r in rows]
    ybar = sum(ys) / len(ys)
    ss_res = sum((y - (w1 * x1 + w2 * x2 + b)) ** 2 for x1, x2, y in rows)
    ss_tot = sum((y - ybar) ** 2 for y in ys)
    return 1 - ss_res / ss_tot if ss_tot else 0.0


def main():
    ap = argparse.ArgumentParser(description="最小二乘拟合（纯 Python）")
    ap.add_argument("--n", type=int, default=200, help="样本数")
    ap.add_argument("--noise", type=float, default=1.0, help="噪声标准差")
    ap.add_argument("--seed", type=int, default=4, help="随机种子")
    args = ap.parse_args()

    TRUE_W = (3.0, -2.0)
    TRUE_B = 1.5
    rows = make_data(args.n, TRUE_W, TRUE_B, args.noise, args.seed)

    print("=" * 68)
    print(f"最小二乘拟合 · n={args.n}  noise={args.noise}")
    print(f"真实模型：y = {TRUE_W[0]}·x1 + ({TRUE_W[1]})·x2 + {TRUE_B}")
    print("=" * 68)

    c_ne = normal_equation(rows)
    c_gd = gradient_descent(rows)
    print(f"{'方法':<22}{'w1':>12}{'w2':>12}{'b':>12}{'R²':>10}")
    print("-" * 68)
    for name, c in (("正态方程", c_ne), ("梯度下降", c_gd)):
        print(f"{name:<22}{c[0]:>12.5f}{c[1]:>12.5f}{c[2]:>12.5f}{r2(rows, c):>10.5f}")
    print(f"{'真实值':<22}{TRUE_W[0]:>12.5f}{TRUE_W[1]:>12.5f}{TRUE_B:>12.5f}{'-':>10}")

    print("-" * 68)
    for i, nm in enumerate(("w1", "w2", "b")):
        d = abs(c_ne[i] - c_gd[i])
        print(f"{nm} 两种解法之差：{d:.3e}", end="")
        print("  （一致）" if d < 1e-6 else "  ← 差异偏大，检查收敛或条件数")
    assert all(abs(c_ne[i] - c_gd[i]) < 1e-4 for i in range(3)), \
        "正态方程与梯度下降结果不一致"

    print("\n" + "=" * 68)
    print("对照：只拿 x1 做一元回归会怎样？")
    print("=" * 68)
    w, b = simple_linear(rows)
    print(f"一元模型 y = {w:.5f}·x1 + {b:.5f}")
    print(f"真实关系里还有 {TRUE_W[1]}·x2 这一项被漏掉了。")
    print(f"一元模型 R² = {r2(rows, (w, 0.0, b)):.5f}，比二元模型低 —— 这就是遗漏变量的代价。")
    print(f"注意 x1 的系数从 {TRUE_W[0]} 变成 {w:.4f}，因为它被迫去「顶」x2 的作用。")

    print("\n" + "=" * 68)
    print("实操提醒：正态方程的条件数是 A^T A 的条件数平方。")
    print("如果某些特征的量级差几个数量级（比如收入 vs 年龄），先标准化再解。")
    print("更稳的做法是 QR 分解或 SVD，代价是代码更长。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：正规方程一步给出闭式解，梯度下降逐步逼近同一解；设计矩阵病态时正规方程数值不稳，梯度下降则需调学习率与迭代数。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/numerical/04_least_squares.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
