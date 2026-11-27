#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
06_single_pendulum.py — 单摆（非线性）仿真
方程: θ'' = -(g/L)·sinθ （小角度线性化则为 θ'' = -(g/L)·θ）
大角度下周期显著变长，小角度近似 T₀ = 2π·sqrt(L/g)。

理论对照（大角度周期修正，椭圆积分近似）:
    T ≈ T₀ · (1 + θ₀²/16)   （θ₀ 为弧度初角，一阶修正）

用法:
    python 06_single_pendulum.py
    python 06_single_pendulum.py --L 1 --a0 60 --t 20
"""
import argparse
import math


def simulate(L, a0_deg, dt=0.001, t_max=20.0):
    g = 9.8
    th = math.radians(a0_deg)
    w = 0.0
    t = 0.0
    zero_crossings = []
    prev = th
    curve = []
    while t < t_max:
        alpha = -(g / L) * math.sin(th)
        w = w + alpha * dt
        th = th + w * dt
        # 检测过零点（摆到竖直位置，半周期）
        if prev * th < 0:
            zero_crossings.append(t)
        prev = th
        curve.append((t, th))
        t += dt
    return zero_crossings, curve


def main():
    ap = argparse.ArgumentParser(description="单摆非线性仿真")
    ap.add_argument("--L", type=float, default=1.0, help="摆长 m")
    ap.add_argument("--a0", type=float, default=60.0, help="初始角度 度")
    ap.add_argument("--t", type=float, default=20.0, help="仿真时长 s")
    args = ap.parse_args()

    g = 9.8
    t0 = 2 * math.pi * math.sqrt(args.L / g)
    th0 = math.radians(args.a0)
    t_linear = t0 * (1 + th0 * th0 / 16.0)   # 一阶修正

    zero_crossings, _ = simulate(args.L, args.a0, t_max=args.t)
    if len(zero_crossings) >= 2:
        measured = 2 * (zero_crossings[1] - zero_crossings[0])  # 半周期×2
    else:
        measured = float("nan")

    print("=" * 56)
    print(f"单摆仿真 · L = {args.L:g} m，θ₀ = {args.a0:g}°（非线性 sinθ）")
    print("=" * 56)
    print(f"小角度周期 T₀        : {t0:.4f} s")
    print(f"一阶修正 T(θ₀)       : {t_linear:.4f} s")
    print(f"仿真实测周期 T        : {measured:.4f} s")
    print("-" * 56)
    print(f"周期延长比 {measured / t0:.4f}（θ₀ 越大越明显）")
    print("验证: 把 --a0 调成 5 度，实测周期将逼近 T₀，线性近似成立。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：小角度近似 T≈2π√(L/g) 只在大摆幅下失效；振幅增大周期变长。非线性模型无耗散时能量应守恒，数值积分会有微小漂移。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/simulation/06_single_pendulum.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
