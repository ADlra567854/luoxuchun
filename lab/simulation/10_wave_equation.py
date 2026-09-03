#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
10_wave_equation.py — 一维波动方程（中心差分）
方程: ∂²u/∂t² = c²·∂²u/∂x² ，两端固定，初始为三角形/高斯脉冲。
中心差分格式: u(t+1) = 2u(t) - u(t-1) + (c·dt/dx)²·[u(i+1) - 2u(i) + u(i-1)]
稳定性条件: c·dt/dx ≤ 1（CFL 条件）。

观察: 初始脉冲分裂为左右两个波包，在端点反射，振幅不衰减（无耗散）。

用法:
    python 10_wave_equation.py
    python 10_wave_equation.py --nx 200 --t 800
"""
import argparse


def simulate(nx=200, t_steps=800, c=1.0):
    dx = 1.0 / (nx - 1)
    dt = 0.5 * dx / c           # CFL 安全值 < 1
    r = (c * dt / dx) ** 2

    u0 = [0.0] * nx
    mid = nx // 2
    width = max(2, nx // 20)
    for i in range(mid - width, mid + width + 1):
        u0[i] = math_pulse(i - mid, width)

    u_prev = u0[:]                       # 初始静止: u(t=0) = u(t=-dt) → 零初速度
    u_cur = u0[:]
    area0 = sum(u0)
    frames = []
    for step in range(1, t_steps + 1):
        u_next = [0.0] * nx
        for i in range(1, nx - 1):
            u_next[i] = 2 * u_cur[i] - u_prev[i] + r * (u_cur[i + 1] - 2 * u_cur[i] + u_cur[i - 1])
        u_prev, u_cur = u_cur, u_next
        if step % (t_steps // 4) == 0:
            frames.append((step, max(u_cur), sum(u_cur)))
    return u_cur, frames, r, area0


def math_pulse(d, width):
    """三角形脉冲: 顶点 1.0，向两侧线性降到 0。"""
    return max(0.0, 1.0 - abs(d) / float(width))


def main():
    ap = argparse.ArgumentParser(description="一维波动方程中心差分")
    ap.add_argument("--nx", type=int, default=200, help="空间网格数")
    ap.add_argument("--t", type=int, default=800, help="时间步数")
    args = ap.parse_args()

    u, frames, r, area0 = simulate(args.nx, args.t)
    print("=" * 56)
    print("一维波动方程 · 中心差分（两端固定，三角脉冲初值）")
    print("=" * 56)
    print(f"nx = {args.nx}   r = (c·dt/dx)² = {r:.4f}（CFL 须 ≤ 1）")
    print(f"初始波面面积 = {area0:.1f}（无耗散判据：|面积| 守恒）")
    for step, mx, s in frames:
        print(f"  第 {step:>4} 步: 峰值 {mx:6.3f}   面积 {s:7.2f}")
    print("-" * 56)
    print("观察: 脉冲分裂为左右波包 → 端点反射（固定端相位反转，")
    print("      波峰变波谷，故反相段峰值接近 0）→ 回到中心重新叠加。")
    print("      面积守恒 = 方程无耗散；对比 08 热传导方程能量持续衰减。")


if __name__ == "__main__":
    main()
