#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
03_projectile.py — 抛体运动仿真（含线性空气阻力）
方程: v' = -g·ŷ - b·v（阻力沿速度反方向），欧拉积分追踪 x-y 轨迹。

无阻力理论: 射程 R = v₀²·sin(2θ)/g，飞行时间 T = 2·v₀·sinθ/g
有阻力后射程显著缩短，且最佳抛射角 < 45°。

用法:
    python 03_projectile.py
    python 03_projectile.py --v 30 --angle 45 --b 0.01
"""
import argparse
import math


def simulate(v0, angle_deg, b, g=9.8, dt=0.001, t_max=30.0):
    a0 = math.radians(angle_deg)
    x, y = 0.0, 0.0
    vx, vy = v0 * math.cos(a0), v0 * math.sin(a0)
    t = 0.0
    traj = [(x, y)]
    while y >= 0 and t < t_max:
        speed = math.hypot(vx, vy)
        ax = -b * speed * vx
        ay = -g - b * speed * vy
        vx = vx + ax * dt
        vy = vy + ay * dt
        x = x + vx * dt
        y = y + vy * dt
        t += dt
        traj.append((x, y))
        if y < 0:  # 越过地面后线性内插落点
            x = x - vx * dt
            y = 0.0
            traj.append((x, y))
            break
    return traj, t


def main():
    ap = argparse.ArgumentParser(description="抛体运动仿真（线性阻力）")
    ap.add_argument("--v", type=float, default=30.0, help="初速度 m/s")
    ap.add_argument("--angle", type=float, default=45.0, help="发射角 度")
    ap.add_argument("--b", type=float, default=0.01, help="阻力系数 kg/s")
    args = ap.parse_args()

    g = 9.8
    traj, t_flight = simulate(args.v, args.angle, args.b, g)
    xs = [p[0] for p in traj]
    ys = [p[1] for p in traj]
    x_range = max(xs)
    y_max = max(ys)

    a0 = math.radians(args.angle)
    R_ideal = args.v ** 2 * math.sin(2 * a0) / g
    T_ideal = 2 * args.v * math.sin(a0) / g

    print("=" * 56)
    print("抛体运动仿真（欧拉积分 · 含空气阻力 F = -b·v）")
    print("=" * 56)
    print(f"v₀ = {args.v:g} m/s    θ = {args.angle:g}°    b = {args.b:g}")
    print("-" * 56)
    print(f"飞行时间    : {t_flight:.2f} s   （无阻力理论 {T_ideal:.2f} s）")
    print(f"射程        : {x_range:.2f} m   （无阻力理论 {R_ideal:.2f} m）")
    print(f"最大高度    : {y_max:.2f} m")
    print("-" * 56)
    print("观察: b > 0 时射程小于理论值; 阻力越大，最佳抛射角越小于 45°。")
    print("把 --b 调成 0 即可复现无阻力理论值，验证欧拉积分正确性。")


if __name__ == "__main__":
    main()
