#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
04_rc_circuit.py — RC 电路暂态仿真
充电方程: dVc/dt = (V₀ - Vc)/τ ，τ = R·C
解析解:   Vc(t) = V₀·(1 - exp(-t/τ))
关键时间点: t=τ 达 63.2%，t=3τ 达 95.0%，t=5τ 达 99.3%

用法:
    python 04_rc_circuit.py
    python 04_rc_circuit.py --r 1000 --c 1e-6 --v 5
"""
import argparse
import math


def simulate(r, c, v0, dt=None, t_max=None):
    tau = r * c
    dt = dt or tau / 100.0
    t_max = t_max or 6 * tau
    t, vc = 0.0, 0.0
    curve = []
    while t <= t_max:
        vc = vc + ((v0 - vc) / tau) * dt
        curve.append((t, vc))
        t += dt
    return tau, curve


def main():
    ap = argparse.ArgumentParser(description="RC 电路暂态仿真")
    ap.add_argument("--r", type=float, default=1000.0, help="电阻 Ω")
    ap.add_argument("--c", type=float, default=1e-6, help="电容 F")
    ap.add_argument("--v", type=float, default=5.0, help="电源电压 V")
    args = ap.parse_args()

    tau, curve = simulate(args.r, args.c, args.v)
    # 抽样关键时间点（最接近 τ/3τ/5τ 的采样值）
    picks = []
    for k in (1, 3, 5):
        target = k * tau
        nearest = min(curve, key=lambda p: abs(p[0] - target))
        picks.append((k, nearest))

    print("=" * 56)
    print("RC 电路暂态 · 充电（τ = R·C）")
    print("=" * 56)
    print(f"R = {args.r:g} Ω    C = {args.c:g} F    V₀ = {args.v:g} V")
    print(f"时间常数 τ = {tau:.4g} s")
    print("-" * 56)
    print(f"t = τ     → Vc = {picks[0][1][1]:.4f} V  （理论 {args.v * 0.632:.3f} V, 63.2%）")
    print(f"t = 3τ    → Vc = {picks[1][1][1]:.4f} V  （理论 {args.v * 0.950:.3f} V, 95.0%）")
    print(f"t = 5τ    → Vc = {picks[2][1][1]:.4f} V  （理论 {args.v * 0.993:.3f} V, 99.3%）")
    print("-" * 56)
    print("工程惯例: 经过 5τ 认为电路进入稳态，故 τ 越小响应越快。")


if __name__ == "__main__":
    main()
