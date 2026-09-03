#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02_spring_mass_damper.py — 弹簧-质量-阻尼系统仿真
二阶系统： m·ÿ + c·ẏ + k·y = 0 ，自由振动，初位移 y₀。
欧拉积分（拆成两个一阶方程）求解，观察振荡周期与阻尼比。

理论对照:
    固有频率  ωn = sqrt(k/m)，阻尼比 ζ = c / (2·sqrt(m·k))
    ζ < 1 欠阻尼振荡 | ζ = 1 临界阻尼 | ζ > 1 过阻尼

用法:
    python 02_spring_mass_damper.py
    python 02_spring_mass_damper.py --m 1 --c 0.5 --k 10
"""
import argparse
import math


def simulate(m, c, k, y0=1.0, v0=0.0, dt=0.001, t_max=20.0):
    """欧拉积分（状态空间法）: y' = v, v' = -(c·v + k·y)/m"""
    t, y, v = 0.0, y0, v0
    ts, ys = [], []
    n = int(t_max / dt)
    for _ in range(n):
        a = -(c * v + k * y) / m
        y = y + v * dt
        v = v + a * dt
        t += dt
        ts.append(t)
        ys.append(y)
    return ts, ys


def analyze(m, c, k):
    wn = math.sqrt(k / m)
    zeta = c / (2.0 * math.sqrt(m * k))
    if zeta < 1:
        wd = wn * math.sqrt(1 - zeta * zeta)   # 有阻尼角频率
        period = 2 * math.pi / wd
    else:
        period = float("inf")
    return wn, zeta, period


def main():
    ap = argparse.ArgumentParser(description="弹簧-质量-阻尼系统仿真")
    ap.add_argument("--m", type=float, default=1.0, help="质量 kg")
    ap.add_argument("--c", type=float, default=0.5, help="阻尼系数 N·s/m")
    ap.add_argument("--k", type=float, default=10.0, help="刚度 N/m")
    ap.add_argument("--y0", type=float, default=1.0, help="初位移 m")
    args = ap.parse_args()

    wn, zeta, period = analyze(args.m, args.c, args.k)
    ts, ys = simulate(args.m, args.c, args.k, args.y0)

    # 峰值间距估测实测周期（取前几个极大值）
    peaks = [ys[0]]
    for i in range(1, len(ys) - 1):
        if ys[i] > ys[i - 1] and ys[i] >= ys[i + 1]:
            peaks.append((ts[i], ys[i]))
            if len(peaks) >= 4:
                break
    if len(peaks) >= 2 and math.isfinite(period):
        measured = peaks[2][0] - peaks[1][0]
    else:
        measured = float("nan")

    print("=" * 56)
    print("弹簧-质量-阻尼 · 自由振动（m·ÿ + c·ẏ + k·y = 0）")
    print("=" * 56)
    print(f"m = {args.m:g} kg   c = {args.c:g} N·s/m   k = {args.k:g} N/m")
    print(f"固有频率 ωn = {wn:.4f} rad/s")
    print(f"阻尼比  ζ  = {zeta:.4f}  →  "
          + ("欠阻尼(振荡)" if zeta < 1 else "临界阻尼" if abs(zeta - 1) < 1e-9 else "过阻尼(无振荡)"))
    if math.isfinite(period):
        print(f"理论周期 T  = {period:.4f} s  实测周期 ≈ {measured:.4f} s")
    print(f"10 s 后幅值  = {ys[-1] if len(ys) > 10000 else max(abs(v) for v in ys[-1000:]):.4f}")


if __name__ == "__main__":
    main()
