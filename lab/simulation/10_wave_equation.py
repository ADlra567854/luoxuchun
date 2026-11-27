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

    # 零初速度的正确写法是 u(-dt) = u(0)。写成 u_prev = [0]*nx 相当于把弦
    # 从静止「弹」到初始形状，会注入一份额外能量，峰值能涨到 17 以上。
    u_prev = u0[:]
    u_cur = u0[:]
    peak0 = max(abs(v) for v in u0)
    peak_max = peak0                    # 全程峰值（绝对值），用来验证无增长
    frames = []
    for step in range(1, t_steps + 1):
        u_next = [0.0] * nx
        for i in range(1, nx - 1):
            u_next[i] = 2 * u_cur[i] - u_prev[i] + r * (u_cur[i + 1] - 2 * u_cur[i] + u_cur[i - 1])
        u_prev, u_cur = u_cur, u_next
        peak_max = max(peak_max, max(abs(v) for v in u_cur))
        if step % (t_steps // 4) == 0:
            frames.append((step, max(abs(v) for v in u_cur), sum(u_cur)))
    return u_cur, frames, r, peak0, peak_max


def math_pulse(d, width):
    """三角形脉冲: 顶点 1.0，向两侧线性降到 0。"""
    return max(0.0, 1.0 - abs(d) / float(width))


def main():
    ap = argparse.ArgumentParser(description="一维波动方程中心差分")
    ap.add_argument("--nx", type=int, default=200, help="空间网格数")
    ap.add_argument("--t", type=int, default=800, help="时间步数")
    args = ap.parse_args()

    u, frames, r, peak0, peak_max = simulate(args.nx, args.t)
    print("=" * 56)
    print("一维波动方程 · 中心差分（两端固定，三角脉冲初值）")
    print("=" * 56)
    print(f"nx = {args.nx}   r = (c·dt/dx)² = {r:.4f}（CFL 须 ≤ 1）")
    print(f"初始峰值 = {peak0:.3f}   全程峰值 = {peak_max:.3f}（不应超过初值）")
    for step, mx, s in frames:
        print(f"  第 {step:>4} 步: 峰值 {mx:6.3f}   面积 {s:7.2f}")
    print("-" * 56)
    print("观察: 脉冲分裂为左右波包 → 端点反射（固定端相位反转，")
    print("      波峰变波谷，故反相段峰值接近 0）→ 回到中心重新叠加。")
    print("      判据是【峰值不增长】而不是面积：∫u dx 不是守恒量，")
    print("      波在固定端反射时整块面积会反号（+10 → −10 → +10），")
    print("      中间还会落在 1.0 附近，拿它当无耗散判据会得出错误结论。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：一维波动方程用中心差分推进，CFL 数 cΔt/Δx≤1 才稳定；两端反射会形成驻波，能量不能拿单点幅值当无耗散判据。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/simulation/10_wave_equation.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
