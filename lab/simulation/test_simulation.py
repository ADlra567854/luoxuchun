#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_simulation.py — 仿真脚本正确性校验（pytest）
用解析解/已知结果校验 01-10 号仿真脚本的核心数值，防止算法回归。
运行:  python -m pytest test_simulation.py -v    （或 pytest test_simulation.py -v）
"""
import math
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import importlib
m01 = importlib.import_module("01_pid_controller")
m02 = importlib.import_module("02_spring_mass_damper")
m03 = importlib.import_module("03_projectile")
m04 = importlib.import_module("04_rc_circuit")
m05 = importlib.import_module("05_monte_carlo")
m06 = importlib.import_module("06_single_pendulum")
m07 = importlib.import_module("07_dc_motor")
m08 = importlib.import_module("08_heat_equation")
m09 = importlib.import_module("09_lotka_volterra")
m10 = importlib.import_module("10_wave_equation")


def test_pid_pi_eliminates_steady_error():
    """PI 控制器应消除一阶对象稳态误差（|e_ss| < 0.01）。"""
    ts, ys, us = m01.simulate(kp=1.0, ki=2.0, kd=0.1)
    assert abs(ys[-1] - 1.0) < 0.01


def test_pid_p_only_has_offset():
    """纯 P 控制器必有稳态误差（有差调节）。"""
    ts, ys, us = m01.simulate(kp=1.0, ki=0.0, kd=0.0)
    assert ys[-1] < 0.99  # 明显低于目标 1.0


def test_spring_undamped_keeps_amplitude():
    """无阻尼弹簧系统幅值应保持（能量守恒近似）。"""
    ts, ys = m02.simulate(m=1.0, c=0.0, k=10.0, t_max=10.0)
    assert max(ys) > 0.98  # 无阻尼幅值几乎不衰减


def test_spring_period_matches_theory():
    """弹簧周期对照 ωn = sqrt(k/m)（有阻尼时用 wd，偏差 <1%）。"""
    wn, zeta, period = m02.analyze(m=1.0, c=0.5, k=10.0)
    wd = wn * math.sqrt(1 - zeta * zeta)
    assert abs(period - 2 * math.pi / wd) < 1e-6  # 与有阻尼解析周期一致
    assert abs(period - 2 * math.pi / math.sqrt(10.0)) / (2 * math.pi / math.sqrt(10.0)) < 0.01


def test_projectile_no_drag_matches_ideal():
    """无阻力抛体应复现理论射程（±2% 数值误差）。"""
    traj, t = m03.simulate(v0=30.0, angle_deg=45.0, b=0.0)
    x_range = max(p[0] for p in traj)
    ideal = 30.0 ** 2 * math.sin(math.radians(90.0)) / 9.8
    assert abs(x_range - ideal) / ideal < 0.02


def test_projectile_drag_shortens_range():
    """空气阻力应缩短射程。"""
    traj0, _ = m03.simulate(v0=30.0, angle_deg=45.0, b=0.0)
    traj1, _ = m03.simulate(v0=30.0, angle_deg=45.0, b=0.05)
    assert max(p[0] for p in traj1) < max(p[0] for p in traj0)


def test_rc_tau_is_632():
    """RC 充电在 t=τ 处应达 63.2% 电源电压。"""
    tau, curve = m04.simulate(r=1000.0, c=1e-6, v0=5.0)
    nearest = min(curve, key=lambda p: abs(p[0] - tau))
    assert abs(nearest[1] - 5.0 * 0.632) < 0.05


def test_monte_carlo_pi_accuracy():
    """20 万采样 π 误差应 < 1%。"""
    import random
    rng = random.Random(42)
    est = m05.estimate_pi(200000, rng)
    assert abs(est - math.pi) / math.pi < 0.01


def test_pendulum_small_angle_near_linear():
    """小角度摆周期应逼近线性公式（<1% 偏差）。"""
    zc, _ = m06.simulate(L=1.0, a0_deg=5.0, t_max=10.0)
    measured = 2 * (zc[1] - zc[0])
    t0 = 2 * math.pi * math.sqrt(1.0 / 9.8)
    assert abs(measured - t0) / t0 < 0.01


def test_dc_motor_steady_state():
    """直流电机稳态转速应匹配解析解（t_max 留空走自适应 8τ）。"""
    v, r, l, ke, kt, j, b = 12.0, 2.0, 0.01, 0.05, 0.05, 0.01, 0.001
    t, i, w, *_ = m07.simulate(v, r, l, ke, kt, j, b)
    w_ss = v * kt / (r * b + kt * ke)
    assert abs(w - w_ss) / w_ss < 0.01


def test_heat_equation_stability():
    """显式差分满足稳定性条件 r ≤ 0.5 时不应发散。"""
    T, profiles, r = m08.simulate(alpha=0.0001, nx=60, t_steps=500)
    assert r <= 0.5
    assert all(0 <= v <= 100.1 for v in T)


def test_lotka_volterra_periodic():
    """Lotka-Volterra 种群应呈振荡而非单调。"""
    xs, ys = m09.simulate(1.0, 0.1, 0.075, 1.5)
    assert max(xs) > min(xs) * 2  # 明显的峰谷波动


def test_wave_equation_no_decay():
    """波动方程无耗散：波面面积（绝对值）应守恒，不随时间衰减。"""
    u, frames, r, area0 = m10.simulate(nx=200, t_steps=800)
    assert r <= 1.0  # CFL 条件
    # 末段面积与初始面积偏差 < 3%（数值耗散极小）
    last_area = abs(frames[-1][2])
    assert abs(last_area - area0) / area0 < 0.03


if __name__ == "__main__":
    # 直接运行本文件时逐个执行测试并汇报
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in tests:
        try:
            fn()
            print(f"  ✅ {fn.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ {fn.__name__}: {e}")
    print(f"\n{passed}/{len(tests)} 通过")
    sys.exit(0 if passed == len(tests) else 1)
