#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
07_dc_motor.py — 直流电机启动仿真（电气+机械耦合）
电气: L·di/dt = V - R·i - Ke·ω
机械: J·dω/dt = Kt·i - B·ω
欧拉积分同时推进电流与转速，观察启动过程与稳态转速。

稳态对照: ω_ss = V·Kt / (R·B + Kt·Ke)，i_ss = B·ω_ss / Kt

用法:
    python 07_dc_motor.py
    python 07_dc_motor.py --v 12 --r 2 --j 0.01
"""
import argparse


def simulate(v, r, l, ke, kt, j, b, dt=0.0001, t_max=None):
    """欧拉积分求解电机启动。t_max 缺省时按机电时间常数自适应取 8τ。"""
    tau_mech = j * r / (r * b + kt * ke)
    if t_max is None:
        t_max = max(2.0, 8 * tau_mech)
    i, w = 0.0, 0.0
    t = 0.0
    peak_i, peak_w, t_peak_w = 0.0, 0.0, 0.0
    n = int(t_max / dt)
    for step in range(n):
        di = (v - r * i - ke * w) / l
        dw = (kt * i - b * w) / j
        i = i + di * dt
        w = w + dw * dt
        t += dt
        if i > peak_i:
            peak_i = i
        if w > peak_w:
            peak_w = w
            t_peak_w = t
    return t, i, w, peak_i, peak_w, t_peak_w


def main():
    ap = argparse.ArgumentParser(description="直流电机启动仿真")
    ap.add_argument("--v", type=float, default=12.0, help="电枢电压 V")
    ap.add_argument("--r", type=float, default=2.0, help="电枢电阻 Ω")
    ap.add_argument("--l", type=float, default=0.01, help="电枢电感 H")
    ap.add_argument("--ke", type=float, default=0.05, help="反电动势常数 V·s/rad")
    ap.add_argument("--kt", type=float, default=0.05, help="转矩常数 N·m/A")
    ap.add_argument("--j", type=float, default=0.01, help="转动惯量 kg·m²")
    ap.add_argument("--b", type=float, default=0.001, help="粘滞摩擦 N·m·s/rad")
    args = ap.parse_args()

    t, i, w, peak_i, peak_w, t_peak_w = simulate(
        args.v, args.r, args.l, args.ke, args.kt, args.j, args.b)

    w_ss = args.v * args.kt / (args.r * args.b + args.kt * args.ke)
    i_ss = args.b * w_ss / args.kt
    tau_mech = args.j * args.r / (args.r * args.b + args.kt * args.ke)  # 机电时间常数

    print("=" * 56)
    print("直流电机启动仿真（电气+机械耦合）")
    print("=" * 56)
    print(f"V={args.v:g}V  R={args.r:g}Ω  L={args.l:g}H  J={args.j:g}kg·m²")
    print(f"Ke={args.ke:g}  Kt={args.kt:g}  B={args.b:g}")
    print("-" * 56)
    print(f"稳态转速 ω_ss    : {w_ss:.2f} rad/s （仿真 {w:.2f}）")
    print(f"稳态电流 i_ss    : {i_ss:.4f} A   （仿真 {i:.4f}）")
    print(f"启动峰值电流    : {peak_i:.2f} A（≈ V/R = {args.v/args.r:.2f}，堵转电流）")
    print(f"机电时间常数 τ  : {tau_mech:.4f} s（约 5τ 后达稳态）")
    print("-" * 56)
    print("观察: 启动瞬间电流冲击 ≈ V/R，随后反电动势建立、电流回落。")


if __name__ == "__main__":
    main()
