#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plot_all.py — 一键重出 figs/ 下的 10 张图

本目录的 10 个仿真脚本都遵循「纯标准库、零依赖」的约定，只打印数字、不出图。
这个脚本用 numpy + matplotlib（无头 Agg 后端）复现同一批模型、同一组默认参数，
把曲线画成 PNG 存进 figs/，供《仿真脚本图文讲解》引用。

三条硬规矩：

1. 模型与参数逐字对齐各脚本的默认值 —— 图里的数必须和 `python 0X_xxx.py`
   打印的数对得上，对不上就是这里写错了。
2. 每张图画完都做一次理论校验（解析解 / 周期 / 守恒量），校验不过会在
   汇总表里报出来，不会静悄悄画一张错图。
3. 输出完全可复现：同一台机器重跑，像素级一致（随机数固定种子）。

用法:
    python plot_all.py              # 重出全部 10 张
    python plot_all.py 01 08        # 只重出指定编号
    python plot_all.py --out figs   # 指定输出目录（默认 figs）

依赖:
    pip install numpy matplotlib
    Windows 上会自动挑「微软雅黑」等中文字体；Linux 无中文字体会退化成方框，
    装一个 fonts-noto-cjk 即可。
"""
import argparse
import math
import os
import random

import matplotlib

matplotlib.use("Agg")           # 必须在 pyplot 之前设：无头后端，不弹窗、不需要显示器
import matplotlib.pyplot as plt
import numpy as np

# ---------------------------------------------------------------- 全局样式
# 中文字体：按优先级挑第一个装了的。缺字体会把中文画成方框，所以这里显式指定。
plt.rcParams["font.sans-serif"] = [
    "Microsoft YaHei", "SimHei", "DengXian", "Noto Sans CJK SC",
    "Source Han Sans SC", "DejaVu Sans",
]
plt.rcParams["axes.unicode_minus"] = False   # 负号用 ASCII，避免方框
plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.dpi"] = 120
plt.rcParams["axes.grid"] = True
plt.rcParams["grid.alpha"] = 0.3
plt.rcParams["grid.linestyle"] = "--"
plt.rcParams["axes.spines.top"] = False
plt.rcParams["axes.spines.right"] = False
plt.rcParams["font.size"] = 10

C1, C2, C3 = "#4C78A8", "#F58518", "#54A24B"   # 蓝 / 橙 / 绿，与前 9 张图保持同一套
C4, C5 = "#B279A2", "#E45756"

RESULTS = []      # [(编号, 文件名, 画了什么, 校验结论, 是否通过)]


def save(fig, out_dir, name):
    path = os.path.join(out_dir, name)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def record(no, name, what, check, ok):
    RESULTS.append((no, name, what, check, ok))


# ---------------------------------------------------------------- 01 PID
def fig_pid(out_dir):
    """复现 01_pid_controller.py：一阶对象 τ·ẏ + y = u，τ=0.5，单位阶跃。"""
    tau, dt, t_max = 0.5, 0.001, 8.0

    def sim(kp, ki, kd):
        y = integral = last_err = 0.0
        ts, ys = [], []
        for i in range(int(t_max / dt)):
            err = 1.0 - y
            integral += err * dt
            deriv = (err - last_err) / dt
            u = kp * err + ki * integral + kd * deriv
            y += ((u - y) / tau) * dt          # τ·ẏ + y = u  →  ẏ = (u - y)/τ
            last_err = err
            ts.append((i + 1) * dt)
            ys.append(y)
        return ts, ys

    runs = [
        ("P   (Kp=1, Ki=0, Kd=0)", sim(1.0, 0.0, 0.0), C1),
        ("PI  (Kp=1, Ki=2, Kd=0)", sim(1.0, 2.0, 0.0), C2),
        ("PID (Kp=1, Ki=2, Kd=0.1)", sim(1.0, 2.0, 0.1), C3),
    ]

    fig, ax = plt.subplots(figsize=(7, 4))
    for lab, (ts, ys), c in runs:
        ax.plot(ts, ys, color=c, lw=1.8, label=lab)
    ax.axhline(1.0, color="0.35", ls="--", lw=1, label="目标值 r = 1")

    # 标出 P 的稳态误差：只能爬到 0.5
    ax.annotate("P 只能到 0.5\n稳态误差 0.5", xy=(8.0, 0.5), xytext=(5.6, 0.36),
                fontsize=9, color=C1,
                arrowprops=dict(arrowstyle="->", color=C1, lw=1))
    # 标出 PID 的微分冲击：首步 deriv 用的是 (err-0)/dt，会踢一下
    ts_pid, ys_pid = runs[2][1]
    ax.annotate("首步微分冲击\nderivative kick", xy=(ts_pid[0], ys_pid[0]),
                xytext=(0.5, 0.30), fontsize=9, color=C3,
                arrowprops=dict(arrowstyle="->", color=C3, lw=1))

    ax.set_xlabel("时间 t (s)")
    ax.set_ylabel("输出 y")
    ax.set_title("PID 阶跃响应：P / PI / PID 对比")
    ax.set_ylim(-0.05, 1.15)
    ax.legend(loc="lower right", fontsize=9, framealpha=0.9)
    save(fig, out_dir, "01_pid.png")

    ss = [pair[1][-1] for _, pair, _c in runs]
    ok = abs(ss[0] - 0.5) < 1e-3 and abs(ss[1] - 1.0) < 1e-3 and abs(ss[2] - 1.0) < 1e-3
    record("01", "01_pid.png", "P/PI/PID 阶跃响应",
           "稳态值 %.4f / %.4f / %.4f（理论 0.5 / 1 / 1）" % tuple(ss), ok)


# ---------------------------------------------------------------- 02 弹簧
def fig_spring(out_dir):
    """复现 02_spring_mass_damper.py：m=1, c=0.5, k=10, y0=1（欠阻尼自由振动）。"""
    m, c, k, y0 = 1.0, 0.5, 10.0, 1.0
    dt, t_max = 0.001, 20.0

    t, y, v = 0.0, y0, 0.0
    ts, ys = [], []
    for _ in range(int(t_max / dt)):
        a = -(c * v + k * y) / m
        y, v = y + v * dt, v + a * dt
        t += dt
        ts.append(t)
        ys.append(y)

    wn = math.sqrt(k / m)
    zeta = c / (2.0 * math.sqrt(m * k))
    wd = wn * math.sqrt(1 - zeta * zeta)
    period = 2 * math.pi / wd

    ts_a = np.array(ts)
    env = np.exp(-zeta * wn * ts_a)

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(ts_a, ys, color=C1, lw=1.5, label="位移 y(t)")
    ax.plot(ts_a, env, color=C5, ls="--", lw=1, label="衰减包络 ±e^(−ζωₙt)")
    ax.plot(ts_a, -env, color=C5, ls="--", lw=1)
    ax.axhline(0, color="0.6", lw=0.8)

    # 峰值间距实测周期（与脚本用同一套判据）
    peaks = []
    for i in range(1, len(ys) - 1):
        if ys[i] > ys[i - 1] and ys[i] >= ys[i + 1] and ys[i] > 0:
            peaks.append((ts[i], ys[i]))
            if len(peaks) >= 4:
                break
    measured = peaks[2][0] - peaks[1][0] if len(peaks) >= 3 else float("nan")

    ax.set_xlim(0, 12)
    ax.set_xlabel("时间 t (s)")
    ax.set_ylabel("位移 y (m)")
    ax.set_title("弹簧-质量-阻尼自由振动（ζ = %.3f，欠阻尼）" % zeta)
    ax.legend(loc="upper right", fontsize=9)
    # 说明放在坐标区外：振荡曲线几乎铺满整个画布，框子放里面一定压线
    fig.text(0.5, -0.03,
             "ωₙ = %.4f rad/s    ωd = %.4f rad/s    理论周期 T = %.4f s"
             "    峰值实测 ≈ %.4f s" % (wn, wd, period, measured),
             ha="center", fontsize=9, color="0.3")
    save(fig, out_dir, "02_spring.png")

    ok = abs(measured - period) / period < 0.01
    record("02", "02_spring.png", "欠阻尼自由振动 + 包络",
           "峰值实测周期 %.4f s vs 理论 %.4f s（相对差 %.2f%%）"
           % (measured, period, abs(measured - period) / period * 100), ok)


# ---------------------------------------------------------------- 03 抛体
def fig_projectile(out_dir):
    """复现 03_projectile.py：v0=30 m/s，θ=45°，对比 b=0 与 b=0.01。"""
    g = 9.8

    def traj(v0, angle_deg, b, dt=0.001, t_max=30.0):
        a0 = math.radians(angle_deg)
        x = y = 0.0
        vx, vy = v0 * math.cos(a0), v0 * math.sin(a0)
        t = 0.0
        pts = [(x, y)]
        while y >= 0 and t < t_max:
            sp = math.hypot(vx, vy)
            vx += (-b * sp * vx) * dt
            vy += (-g - b * sp * vy) * dt
            x += vx * dt
            y += vy * dt
            t += dt
            pts.append((x, y))
        return pts, t

    p0, t0 = traj(30.0, 45.0, 0.0)
    p1, t1 = traj(30.0, 45.0, 0.01)
    R0, R1 = max(p[0] for p in p0), max(p[0] for p in p1)
    H0, H1 = max(p[1] for p in p0), max(p[1] for p in p1)
    R_th = 30.0 ** 2 * math.sin(math.radians(90.0)) / g

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot([p[0] for p in p0], [p[1] for p in p0], color=C1, lw=1.8,
            label="无阻力 b = 0（射程 %.2f m）" % R0)
    ax.plot([p[0] for p in p1], [p[1] for p in p1], color=C2, lw=1.8,
            label="有阻力 b = 0.01（射程 %.2f m）" % R1)
    ax.axhline(0, color="0.4", lw=0.9)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 26)

    ax.annotate("理论射程 %.2f m" % R_th, xy=(R_th, 0), xytext=(R_th - 4, 4.2),
                fontsize=9, color=C1, ha="center",
                arrowprops=dict(arrowstyle="->", color=C1, lw=1))
    ax.annotate("阻力把射程砍掉 %.1f%%" % ((1 - R1 / R0) * 100),
                xy=(R1, 0), xytext=(R1 + 4, 12), fontsize=9, color=C2,
                arrowprops=dict(arrowstyle="->", color=C2, lw=1))

    ax.set_xlabel("水平距离 x (m)")
    ax.set_ylabel("高度 y (m)")
    ax.set_title("抛体轨迹：无阻力 vs 线性空气阻力（v0 = 30 m/s，45°）")
    ax.legend(loc="upper right", fontsize=9)
    save(fig, out_dir, "03_projectile.png")

    ok = abs(R0 - R_th) < 0.05
    record("03", "03_projectile.png", "两条抛体轨迹对照",
           "b=0 射程 %.2f m vs 解析 %.2f m（差 %.2f m）；b=0.01 射程 %.2f m"
           % (R0, R_th, abs(R0 - R_th), R1), ok)


# ---------------------------------------------------------------- 04 RC
def fig_rc(out_dir):
    """复现 04_rc_circuit.py：R=1kΩ, C=1μF, V0=5V，欧拉 vs 解析解。"""
    r, c, v0 = 1000.0, 1e-6, 5.0
    tau = r * c
    dt = tau / 100.0
    t_max = 6 * tau

    t, vc = 0.0, 0.0
    pts = []
    while t <= t_max:
        vc += ((v0 - vc) / tau) * dt
        pts.append((t, vc))
        t += dt

    ts = np.array([p[0] / tau for p in pts])          # 横轴换成 t/τ，才好读
    vs = np.array([p[1] for p in pts])
    ana = v0 * (1 - np.exp(-ts))

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(ts, ana, color=C1, lw=1.8, label="解析解 V0(1 − e^(−t/τ))")
    ax.plot(ts, vs, color=C2, lw=1.4, ls="none", marker="o", ms=2.6,
            label="欧拉积分（dt = τ/100）")
    for kk, lab in ((1, "63.2%"), (3, "95.0%"), (5, "99.3%")):
        ax.axvline(kk, color="0.7", lw=0.8, ls=":")
        ax.plot([kk], [v0 * (1 - math.exp(-kk))], "o", color=C3, ms=6, zorder=5)
        ax.annotate("t = %dτ\n%s" % (kk, lab), xy=(kk, v0 * (1 - math.exp(-kk))),
                    xytext=(kk - 0.35, v0 * (1 - math.exp(-kk)) - 1.15),
                    fontsize=9, color=C3)
    ax.set_xlabel("时间 t / τ")
    ax.set_ylabel("电容电压 Vc (V)")
    ax.set_title("RC 充电暂态：欧拉积分与解析解重合（τ = %.4g s）" % tau)
    ax.set_ylim(-0.2, 5.4)
    ax.legend(loc="lower right", fontsize=9)
    save(fig, out_dir, "04_rc.png")

    i1 = min(range(len(pts)), key=lambda i: abs(pts[i][0] - tau))
    got = pts[i1][1]
    ok = abs(got / v0 - 0.632) < 0.01
    record("04", "04_rc.png", "RC 充电曲线 + 3 个关键时间点",
           "t=τ 时 Vc = %.4f V（理论 %.4f V，%.1f%%）"
           % (got, v0 * 0.632, got / v0 * 100), ok)


# ---------------------------------------------------------------- 05 蒙特卡洛
def fig_montecarlo(out_dir):
    """复现 05_monte_carlo.py：N=200000、种子 42，画撒点图 + 误差随 N 的收敛。"""
    n_def, seed = 200000, 42

    rng = random.Random(seed)
    inside_x, inside_y, outside_x, outside_y = [], [], [], []
    inside = 0
    for _ in range(n_def):
        x, y = rng.uniform(-1, 1), rng.uniform(-1, 1)
        if x * x + y * y <= 1.0:
            inside += 1
            if len(inside_x) < 3000:
                inside_x.append(x)
                inside_y.append(y)
        elif len(outside_x) < 1200:
            outside_x.append(x)
            outside_y.append(y)
    pi_est = 4.0 * inside / n_def

    # 误差随 N 的收敛：单次运行的误差是随机游走、抖得很厉害，
    # 所以每条 N 取 8 个种子做平均，才能看清 1/√N 的趋势。
    ns = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000]
    seeds = [42, 7, 1234, 99, 2026, 5, 888, 31337]
    errs = []
    for n in ns:
        acc = 0.0
        for sd in seeds:
            rr = random.Random(sd)
            k = 0
            for _ in range(n):
                x, y = rr.uniform(-1, 1), rr.uniform(-1, 1)
                if x * x + y * y <= 1.0:
                    k += 1
            acc += abs(4.0 * k / n - math.pi)
        errs.append(acc / len(seeds))

    fig = plt.figure(figsize=(10.5, 4.2))
    gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.05], wspace=0.26)

    ax1 = fig.add_subplot(gs[0, 0])
    ax1.plot(inside_x, inside_y, ".", ms=1.1, color=C1, alpha=0.55,
             label="圆内（%d 点）" % inside)
    ax1.plot(outside_x, outside_y, ".", ms=1.1, color=C2, alpha=0.45,
             label="圆外（%d 点）" % (n_def - inside))
    th = np.linspace(0, 2 * np.pi, 400)
    ax1.plot(np.cos(th), np.sin(th), color="0.25", lw=1.2)
    ax1.set_aspect("equal")
    ax1.set_xlim(-1.02, 1.02)
    ax1.set_ylim(-1.02, 1.02)
    ax1.set_xlabel("x")
    ax1.set_ylabel("y")
    ax1.set_title("撒点（为看清只画前 %d 点）" % (len(inside_x) + len(outside_x)))
    ax1.legend(loc="lower left", fontsize=8.5, markerscale=7, framealpha=0.9)

    ax2 = fig.add_subplot(gs[0, 1])
    ax2.loglog(ns, errs, "o-", color=C3, lw=1.5, ms=4,
               label="8 个种子的平均绝对误差")
    ref = errs[0] * np.sqrt(ns[0] / np.array(ns, float))
    ax2.loglog(ns, ref, "--", color="0.5", lw=1.2, label="1/√N 参考斜率")
    ax2.scatter([n_def], [abs(pi_est - math.pi)], s=70, color=C5, zorder=6,
                label="单次运行 N=20 万：误差 %.5f" % abs(pi_est - math.pi))
    ax2.set_xlabel("采样数 N")
    ax2.set_ylabel("|π 估计 − π|")
    ax2.set_title("误差随 N 收敛（平均后贴合 1/√N）")
    ax2.legend(loc="lower left", fontsize=8.5)

    save(fig, out_dir, "05_montecarlo.png")

    slope = np.polyfit(np.log(ns[-5:]), np.log(errs[-5:]), 1)[0]
    ok = abs(pi_est - math.pi) < 0.01 and -0.75 < slope < -0.25
    record("05", "05_montecarlo.png", "撒点图 + 误差收敛",
           "π ≈ %.6f（误差 %.6f）；末段 log-log 斜率 %.2f（理论 −0.5）"
           % (pi_est, abs(pi_est - math.pi), slope), ok)


# ---------------------------------------------------------------- 06 单摆
def fig_pendulum(out_dir):
    """复现 06_single_pendulum.py：L=1 m，θ0=60° 非线性 vs 小角度线性。"""
    g, L = 9.8, 1.0
    dt, t_max = 0.001, 10.0

    def sim(a0_deg):
        th, w = math.radians(a0_deg), 0.0
        t = 0.0
        prev = th
        zc = []
        ts, ths = [], []
        while t < t_max:
            w += (-(g / L) * math.sin(th)) * dt
            th += w * dt
            if prev * th < 0:
                zc.append(t)
            prev = th
            ts.append(t)
            ths.append(math.degrees(th))
            t += dt
        return zc, ts, ths

    zc60, ts, th60 = sim(60.0)
    _, _, th05 = sim(5.0)
    t0 = 2 * math.pi * math.sqrt(L / g)
    th0 = math.radians(60.0)
    t_corr = t0 * (1 + th0 * th0 / 16.0)
    measured = 2 * (zc60[1] - zc60[0]) if len(zc60) >= 2 else float("nan")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(ts, th60, color=C1, lw=1.6, label="θ0 = 60°（非线性 sinθ）")
    ax.plot(ts, th05, color=C2, lw=1.6, label="θ0 = 5°（近似简谐）")
    lin = [60.0 * math.cos(2 * math.pi * t / t_corr) for t in ts]
    ax.plot(ts, lin, color="0.45", lw=1.1, ls="--",
            label="小角度余弦（按修正周期 %.3f s 画）" % t_corr)
    ax.axhline(0, color="0.6", lw=0.8)
    ax.set_xlim(0, 8)
    ax.set_xlabel("时间 t (s)")
    ax.set_ylabel("摆角 θ (度)")
    ax.set_title("单摆：大角度非线性 vs 小角度简谐")
    ax.legend(loc="upper right", fontsize=9)
    fig.text(0.5, -0.03,
             "小角度周期 T0 = %.4f s    一阶修正 T(60°) = %.4f s"
             "    过零法实测 ≈ %.4f s（延长 %.1f%%）"
             % (t0, t_corr, measured, (measured / t0 - 1) * 100),
             ha="center", fontsize=9, color="0.3")
    save(fig, out_dir, "06_pendulum.png")

    ok = abs(measured - t_corr) / t_corr < 0.01
    record("06", "06_pendulum.png", "大角度 vs 小角度摆角曲线",
           "过零法实测周期 %.4f s vs 一阶修正 %.4f s（相对差 %.2f%%）"
           % (measured, t_corr, abs(measured - t_corr) / t_corr * 100), ok)


# ---------------------------------------------------------------- 07 直流电机
def fig_motor(out_dir):
    """复现 07_dc_motor.py：V=12, R=2, L=0.01, Ke=Kt=0.05, J=0.01, B=0.001。"""
    V, R, L, Ke, Kt, J, B = 12.0, 2.0, 0.01, 0.05, 0.05, 0.01, 0.001
    dt = 0.0001
    tau_mech = J * R / (R * B + Kt * Ke)
    t_max = max(2.0, 8 * tau_mech)

    i = w = 0.0
    t = 0.0
    ts, is_, ws = [], [], []
    for _ in range(int(t_max / dt)):
        di = (V - R * i - Ke * w) / L
        dw = (Kt * i - B * w) / J
        i += di * dt
        w += dw * dt
        t += dt
        ts.append(t)
        is_.append(i)
        ws.append(w)

    w_ss = V * Kt / (R * B + Kt * Ke)
    i_ss = B * w_ss / Kt

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(ts, is_, color=C2, lw=1.6, label="电枢电流 i (A)")
    ax.axhline(V / R, color=C2, ls=":", lw=1,
               label="堵转电流 V/R = %.2f A" % (V / R))
    ax.axhline(i_ss, color=C2, ls="--", lw=1,
               label="稳态电流 %.3f A" % i_ss)
    ax.set_xlabel("时间 t (s)")
    ax.set_ylabel("电流 i (A)", color=C2)
    ax.tick_params(axis="y", labelcolor=C2)
    ax.set_ylim(0, V / R * 1.25)

    ax2 = ax.twinx()
    ax2.spines["right"].set_visible(True)
    ax2.grid(False)
    ax2.plot(ts, ws, color=C1, lw=1.6, label="转速 ω (rad/s)")
    ax2.axhline(w_ss, color=C1, ls="--", lw=1)
    ax2.set_ylabel("转速 ω (rad/s)", color=C1)
    ax2.tick_params(axis="y", labelcolor=C1)
    ax2.set_ylim(0, w_ss * 1.3)

    h1, l1 = ax.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, loc="center right", fontsize=8.5, framealpha=0.92)
    ax.set_title("直流电机启动：电流先冲高、转速随后建立（τ_mech = %.2f s）"
                 % tau_mech)
    save(fig, out_dir, "07_dcmotor.png")

    ok = abs(w - w_ss) / w_ss < 0.005 and abs(i - i_ss) / i_ss < 0.005
    record("07", "07_dcmotor.png", "电流与转速双轴曲线",
           "仿真 ω = %.2f / 理论 %.2f rad/s；仿真 i = %.4f / 理论 %.4f A"
           % (w, w_ss, i, i_ss), ok)


# ---------------------------------------------------------------- 08 热传导
def fig_heat(out_dir):
    """复现 08_heat_equation.py：两端 0°C，中部初始 100°C，显式差分。"""
    alpha, nx, t_steps = 0.0001, 60, 500
    dx = 1.0 / (nx - 1)
    dt = 0.4 * dx * dx / alpha          # 稳定条件下限，r = 0.4
    r = alpha * dt / (dx * dx)

    T = [0.0] * nx
    mid = nx // 2
    T[mid - 3:mid + 3] = [100.0] * 6
    snaps = [(0, list(T))]
    for step in range(1, t_steps + 1):
        Tn = T[:]
        for j in range(1, nx - 1):
            Tn[j] = T[j] + r * (T[j + 1] - 2 * T[j] + T[j - 1])
        T = Tn
        if step % (t_steps // 4) == 0:
            snaps.append((step, list(T)))

    xs = np.linspace(0, 1, nx)
    fig, ax = plt.subplots(figsize=(7, 4))
    colors = [C1, C2, C3, C4, C5]
    for (step, prof), col in zip(snaps, colors):
        ax.plot(xs, prof, color=col, lw=1.7,
                label="第 %d 步（峰值 %.2f °C）" % (step, max(prof)))
    ax.fill_between(xs, 0, snaps[0][1], color=C1, alpha=0.07)
    ax.axhline(0, color="0.4", lw=0.9)
    ax.set_xlabel("位置 x")
    ax.set_ylabel("温度 u (°C)")
    ax.set_title("一维热传导：中部高温向两端扩散（两端恒为 0°C）")
    ax.set_ylim(-4, 108)
    ax.legend(loc="upper right", fontsize=8.5, framealpha=0.92)
    ax.text(0.02, 0.97,
            "α = %g m²/s   nx = %d   r = %.2f ≤ 0.5\n"
            "边界恒 0°C，热量从两端流走 → 峰值单调衰减"
            % (alpha, nx, r),
            transform=ax.transAxes, fontsize=8.5, va="top",
            bbox=dict(boxstyle="round,pad=0.4", fc="#F7F9FC", ec="0.8"))
    save(fig, out_dir, "08_heat.png")

    peaks = [max(p) for _, p in snaps]
    mono = all(peaks[i] >= peaks[i + 1] for i in range(len(peaks) - 1))
    ok = r <= 0.5 and mono
    record("08", "08_heat.png", "5 个时刻的温度剖面",
           "r = %.2f ≤ 0.5；峰值 %s（单调衰减）"
           % (r, " → ".join("%.2f" % p for p in peaks)), ok)


# ---------------------------------------------------------------- 09 LV
def fig_lotka(out_dir):
    """复现 09_lotka_volterra.py：α=1, β=0.1, δ=0.075, γ=1.5。"""
    alpha, beta, delta, gamma = 1.0, 0.1, 0.075, 1.5
    x, y = 10.0, 5.0
    dt, t_max = 0.001, 100.0

    def H(xx, yy):
        return (delta * xx - gamma * math.log(max(xx, 1e-12))
                + beta * yy - alpha * math.log(max(yy, 1e-12)))

    h0 = H(x, y)
    t = 0.0
    ts, xs, ys = [], [], []
    for _ in range(int(t_max / dt)):
        dx_ = alpha * x - beta * x * y
        dy_ = delta * x * y - gamma * y
        x = max(0.0, x + dx_ * dt)
        y = max(0.0, y + dy_ * dt)
        t += dt
        ts.append(t)
        xs.append(x)
        ys.append(y)

    # 峰值间距估周期（与脚本同一判据）
    pk = []
    mx = max(xs)
    for i in range(1, len(xs) - 1):
        if xs[i] > xs[i - 1] and xs[i] >= xs[i + 1] and xs[i] > mx * 0.5:
            pk.append(ts[i])
            if len(pk) >= 3:
                break
    period = (pk[2] - pk[1] + pk[1] - pk[0]) / 2 if len(pk) >= 3 else float("nan")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10.5, 4.0),
                                   gridspec_kw=dict(width_ratios=[1.5, 1], wspace=0.28))

    ax1.plot(ts, xs, color=C1, lw=1.4, label="猎物 x（兔子）")
    ax1.plot(ts, ys, color=C2, lw=1.4, label="捕食者 y（狐狸）")
    ax1.axhline(gamma / delta, color=C1, ls=":", lw=0.9)
    ax1.axhline(alpha / beta, color=C2, ls=":", lw=0.9)
    ax1.set_xlim(0, 40)
    ax1.set_xlabel("时间 t")
    ax1.set_ylabel("种群数量")
    ax1.set_title("种群振荡：捕食者相位滞后约 1/4 周期")
    ax1.legend(loc="upper right", fontsize=9)

    # 只画前若干个周期的相图，避免欧拉漂移把图压扁
    ax2.plot(xs[:20000], ys[:20000], color=C3, lw=1.2)
    ax2.plot([10.0], [5.0], "o", color=C5, ms=6, label="初值 (10, 5)")
    ax2.plot([gamma / delta], [alpha / beta], "*", color="0.3", ms=11,
             label="平衡点 (%.0f, %.0f)" % (gamma / delta, alpha / beta))
    ax2.set_xlabel("猎物 x")
    ax2.set_ylabel("捕食者 y")
    ax2.set_title("相图（前 20 s）")
    ax2.legend(loc="upper right", fontsize=8.5)

    save(fig, out_dir, "09_lotka.png")

    h_end = H(xs[-1], ys[-1])
    drift = abs(h_end - h0) / abs(h0) * 100
    ok = abs(period - 5.5) < 1.0
    record("09", "09_lotka.png", "时序曲线 + 相图",
           "峰值 %.1f/%.1f，周期 ≈ %.2f；守恒量 H 从 %.3f 漂到 %.3f（%.1f%%，欧拉耗散）"
           % (max(xs), max(ys), period, h0, h_end, drift), ok)


# ---------------------------------------------------------------- 10 波动
def fig_wave(out_dir):
    """复现 10_wave_equation.py：两端固定，三角脉冲，蛙跳格式。"""
    nx, t_steps, c = 200, 800, 1.0
    dx = 1.0 / (nx - 1)
    dt = 0.5 * dx / c
    r = (c * dt / dx) ** 2

    u0 = [0.0] * nx
    mid = nx // 2
    width = max(2, nx // 20)
    for j in range(mid - width, mid + width + 1):
        u0[j] = max(0.0, 1.0 - abs(j - mid) / float(width))

    u_prev = u0[:]        # 零初速度的正确写法：u(-dt) = u(0)
    u_cur = u0[:]
    area0 = sum(u0)
    peak0 = max(abs(v) for v in u0)
    peak_max = peak0
    snaps = [(0, u0[:])]
    for step in range(1, t_steps + 1):
        nxt = [0.0] * nx
        for j in range(1, nx - 1):
            nxt[j] = 2 * u_cur[j] - u_prev[j] + r * (u_cur[j + 1] - 2 * u_cur[j] + u_cur[j - 1])
        u_prev, u_cur = u_cur, nxt
        peak_max = max(peak_max, max(abs(v) for v in u_cur))
        if step in (200, 400, 600, 800):
            snaps.append((step, u_cur[:]))

    xs = np.linspace(0, 1, nx)
    fig, ax = plt.subplots(figsize=(7, 4))
    colors = [C1, C2, C3, C4, C5]
    for (step, prof), col in zip(snaps, colors):
        ax.plot(xs, prof, color=col, lw=1.5,
                label="第 %d 步（峰值 %.3f，面积 %+.2f）"
                      % (step, max(abs(v) for v in prof), sum(prof)))
    ax.axhline(0, color="0.4", lw=0.9)
    ax.set_xlim(0, 1)
    ax.set_xlabel("位置 x")
    ax.set_ylabel("位移 u")
    ax.set_title("一维波动方程：脉冲分裂 → 端点反射 → 回到中心")
    ax.legend(loc="upper right", fontsize=8, framealpha=0.92)
    ax.text(0.02, 0.03,
            "nx = %d   r = (c·dt/dx)² = %.3f ≤ 1（满足 CFL）\n"
            "峰值 %.3f → 全程最大 %.3f（不增长 = 无耗散）"
            % (nx, r, peak0, peak_max),
            transform=ax.transAxes, fontsize=8.5, va="bottom",
            bbox=dict(boxstyle="round,pad=0.4", fc="#F7F9FC", ec="0.8"))
    save(fig, out_dir, "10_wave.png")

    ok = r <= 1.0 and peak_max <= peak0 * 1.02
    record("10", "10_wave.png", "5 个时刻的波形快照",
           "r = %.3f；全程峰值 %.3f（初值 %.3f）→ 无增长；"
           "面积 %s（不是守恒量，反射时反号）"
           % (r, peak_max, peak0,
              " ".join("%+.1f" % sum(p) for _, p in snaps)), ok)


# ---------------------------------------------------------------- 主流程
FIGS = {
    "01": fig_pid, "02": fig_spring, "03": fig_projectile, "04": fig_rc,
    "05": fig_montecarlo, "06": fig_pendulum, "07": fig_motor,
    "08": fig_heat, "09": fig_lotka, "10": fig_wave,
}


def main():
    ap = argparse.ArgumentParser(description="一键重出 figs/ 下的 10 张图")
    ap.add_argument("only", nargs="*", default=[], help="只重出指定编号，如 01 08")
    ap.add_argument("--out", default="figs", help="输出目录（默认 figs）")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    todo = args.only or sorted(FIGS)
    bad = [k for k in todo if k not in FIGS]
    if bad:
        print("unknown id: %s（可选 %s）" % (", ".join(bad), " ".join(sorted(FIGS))))
        return 2

    print("=" * 78)
    print("重出仿真图 · 输出到 %s/" % args.out)
    print("=" * 78)
    for k in todo:
        FIGS[k](args.out)

    print()
    print("=" * 78)
    print("理论校验")
    print("=" * 78)
    nbad = 0
    for no, name, what, check, ok in RESULTS:
        print("%s %-2s %-18s %s" % ("OK  " if ok else "FAIL", no, name, what))
        if not ok:
            nbad += 1
    print("-" * 78)
    print("共 %d 张，校验未通过 %d 张" % (len(RESULTS), nbad))
    print("（校验的判据写在 plot_all.py 每个 fig_* 函数末尾，改模型时一并改）")
    return 0 if nbad == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：一键重出 10 张仿真图并记录每张图的校验结果；它是出图入口而非物理模型本身，结论以各编号脚本为准。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/simulation/plot_all.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
