#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
01_linear_regression.py — 线性回归 + 梯度下降
不用 numpy，纯 Python 手写，目的是让每一步都看得见：
  y = w*x + b，损失用均方误差 MSE，
  梯度就是对 w 和 b 各求一次偏导，然后沿负梯度挪一小步。

为什么要手写：sklearn 一行就出来了，但你不知道它内部在干什么。
手写一遍之后再看 sklearn，参数含义、学习率为什么会导致发散、
标准化为什么必要，都能对上号。

用法:
    python 01_linear_regression.py
    python 01_linear_regression.py --lr 0.05 --epochs 300
"""
import argparse
import random


def make_data(n, true_w, true_b, noise, seed):
    """造一批带噪声的样本。真实关系是 y = true_w*x + true_b。"""
    rng = random.Random(seed)
    xs, ys = [], []
    for _ in range(n):
        x = rng.uniform(-3, 3)
        y = true_w * x + true_b + rng.gauss(0, noise)
        xs.append(x)
        ys.append(y)
    return xs, ys


def mse(xs, ys, w, b):
    return sum((w * x + b - y) ** 2 for x, y in zip(xs, ys)) / len(xs)


def train(xs, ys, lr, epochs, log_every=0):
    """对 MSE 做梯度下降。返回 (w, b, 损失历史)。"""
    w, b = 0.0, 0.0
    n = len(xs)
    history = []
    for ep in range(1, epochs + 1):
        # 先算偏导：dMSE/dw = 2/n * Σ x*(wx+b-y)
        #            dMSE/db = 2/n * Σ   (wx+b-y)
        gw = gb = 0.0
        for x, y in zip(xs, ys):
            err = w * x + b - y
            gw += x * err
            gb += err
        gw *= 2.0 / n
        gb *= 2.0 / n
        w -= lr * gw
        b -= lr * gb
        loss = mse(xs, ys, w, b)
        history.append(loss)
        if log_every and ep % log_every == 0:
            print(f"  epoch {ep:>4}  loss={loss:8.4f}  w={w:7.4f}  b={b:7.4f}")
        if loss != loss or loss > 1e12:     # NaN / 爆炸保护
            print(f"  ! 第 {ep} 轮发散，学习率太大了")
            break
    return w, b, history


def r2_score(xs, ys, w, b):
    """判定系数：1 表示完美拟合，0 表示和「直接猜均值」一样好。"""
    ybar = sum(ys) / len(ys)
    ss_res = sum((y - (w * x + b)) ** 2 for x, y in zip(xs, ys))
    ss_tot = sum((y - ybar) ** 2 for y in ys)
    return 1 - ss_res / ss_tot if ss_tot else 0.0


def main():
    ap = argparse.ArgumentParser(description="线性回归 + 梯度下降（纯 Python）")
    ap.add_argument("--lr", type=float, default=0.05, help="学习率")
    ap.add_argument("--epochs", type=int, default=300, help="迭代轮数")
    ap.add_argument("--n", type=int, default=200, help="样本数")
    ap.add_argument("--noise", type=float, default=0.5, help="噪声标准差")
    ap.add_argument("--seed", type=int, default=3, help="随机种子")
    args = ap.parse_args()

    TRUE_W, TRUE_B = 2.5, -1.0
    xs, ys = make_data(args.n, TRUE_W, TRUE_B, args.noise, args.seed)

    print("=" * 62)
    print(f"线性回归梯度下降 · n={args.n}  lr={args.lr}  epochs={args.epochs}")
    print(f"真实关系：y = {TRUE_W}*x + ({TRUE_B})，噪声 σ={args.noise}")
    print("=" * 62)

    w, b, hist = train(xs, ys, args.lr, args.epochs, log_every=max(1, args.epochs // 6))

    print("-" * 62)
    print(f"学到的参数：w = {w:.4f}   b = {b:.4f}")
    print(f"真实参数  ：w = {TRUE_W:.4f}   b = {TRUE_B:.4f}")
    print(f"参数误差  ：Δw = {abs(w - TRUE_W):.4f}   Δb = {abs(b - TRUE_B):.4f}")
    print(f"损失      ：{hist[0]:.4f} → {hist[-1]:.4f}")
    print(f"R²        ：{r2_score(xs, ys, w, b):.4f}（越接近 1 越好）")
    print("-" * 62)
    print("噪声在，所以参数不会精确等于真实值 —— 这是对的，不是 bug。")
    print("把 --noise 调小，参数会贴得更近；把 --lr 调到 0.5 以上，可能直接发散。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：梯度下降收敛到与最小二乘一致的解；学习率过小收敛慢、过大发散，R² 用来量化拟合优度。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/ml/01_linear_regression.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
