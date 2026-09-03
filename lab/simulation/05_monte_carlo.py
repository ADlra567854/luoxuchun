#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
05_monte_carlo.py — 蒙特卡洛求 π 与定积分
在 [-1,1]² 内随机撒 N 点，落入单位圆的比例 × 4 即估算 π。
另外用同样的随机采样估算 ∫₀¹ x² dx 的定积分值。

误差规律: 蒙特卡洛误差 ~ 1/√N，采样数翻 4 倍误差减半。

用法:
    python 05_monte_carlo.py
    python 05_monte_carlo.py --n 1000000 --seed 42
"""
import argparse
import math
import random


def estimate_pi(n, rng):
    inside = 0
    for _ in range(n):
        x = rng.uniform(-1, 1)
        y = rng.uniform(-1, 1)
        if x * x + y * y <= 1.0:
            inside += 1
    return 4.0 * inside / n


def estimate_integral(n, rng):
    """∫₀¹ x² dx = 1/3 ≈ 0.3333"""
    total = 0.0
    for _ in range(n):
        x = rng.uniform(0, 1)
        total += x * x
    return total / n


def main():
    ap = argparse.ArgumentParser(description="蒙特卡洛求 π 与定积分")
    ap.add_argument("--n", type=int, default=200000, help="采样数")
    ap.add_argument("--seed", type=int, default=None, help="随机种子")
    args = ap.parse_args()
    rng = random.Random(args.seed)

    pi_est = estimate_pi(args.n, rng)
    int_est = estimate_integral(args.n, rng)

    print("=" * 56)
    print(f"蒙特卡洛仿真 · N = {args.n:,}（种子 {args.seed}）")
    print("=" * 56)
    print(f"估算 π      : {pi_est:.6f}")
    print(f"真实 π      : {math.pi:.6f}")
    print(f"绝对误差    : {abs(pi_est - math.pi):.6f}")
    print(f"相对误差    : {abs(pi_est - math.pi) / math.pi * 100:.4f} %")
    print("-" * 56)
    print(f"估算 ∫₀¹x²dx: {int_est:.6f}   （解析解 1/3 = {1/3:.6f}）")
    print("-" * 56)
    print("误差规律: ~1/√N。N=2e5 误差量级约 0.2%，N=2e7 可到 0.02%。")


if __name__ == "__main__":
    main()
