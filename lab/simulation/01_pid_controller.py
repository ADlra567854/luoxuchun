#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
01_pid_controller.py — PID 控制器仿真
一阶被控对象： τ·ẏ + y = u ，τ = 0.5，单位阶跃响应（目标 y* = 1）。
欧拉积分在时间域内逐步求解，观察 P/PI/PID 的稳态误差与超调。

用法:
    python 01_pid_controller.py            # 默认参数，打印指标
    python 01_pid_controller.py --csv out.csv   # 输出曲线到 CSV（可用 Excel 画图）
零第三方依赖，Python 3.8+ 可直接运行。
"""
import argparse
import csv
import math


def simulate(kp, ki, kd, tau=0.5, dt=0.001, t_max=8.0):
    """欧拉积分求解闭环一阶系统，返回 (t_list, y_list, u_list)。"""
    t, y, u, integral, last_err = 0.0, 0.0, 0.0, 0.0, 0.0
    target = 1.0
    ts, ys, us = [], [], []
    n = int(t_max / dt)
    for _ in range(n):
        err = target - y
        integral += err * dt
        deriv = (err - last_err) / dt if dt > 0 else 0.0
        u = kp * err + ki * integral + kd * deriv
        # 一阶对象 τ·ẏ + y = u  =>  y' = (u - y) / τ
        y = y + ((u - y) / tau) * dt
        last_err = err
        t += dt
        ts.append(t)
        ys.append(y)
        us.append(u)
    return ts, ys, us


def metrics(ys, t_max):
    """提取稳态误差与最大超调。"""
    y_ss = ys[-1]
    err_ss = abs(1.0 - y_ss)
    overshoot = max(max(ys) - 1.0, 0.0) / 1.0 * 100.0
    settle_t = t_max
    for i in range(len(ys) - 1, -1, -1):
        if abs(ys[i] - y_ss) > 0.02:   # ±2% 带宽
            settle_t = i * 0.001
            break
    return err_ss, overshoot, settle_t


def main():
    ap = argparse.ArgumentParser(description="PID 控制器仿真（欧拉积分）")
    ap.add_argument("--kp", type=float, default=1.0, help="比例系数")
    ap.add_argument("--ki", type=float, default=2.0, help="积分系数")
    ap.add_argument("--kd", type=float, default=0.1, help="微分系数")
    ap.add_argument("--csv", type=str, default=None, help="输出曲线 CSV 路径")
    args = ap.parse_args()

    ts, ys, us = simulate(args.kp, args.ki, args.kd)
    err_ss, overshoot, settle_t = metrics(ys, ts[-1])

    print("=" * 56)
    print("PID 控制器仿真 · 一阶对象 τ·ẏ + y = u（τ=0.5）")
    print("=" * 56)
    print(f"Kp = {args.kp:g}   Ki = {args.ki:g}   Kd = {args.kd:g}")
    print("-" * 56)
    print(f"仿真时长       : {ts[-1]:.2f} s（步长 1 ms，{len(ts)} 步）")
    print(f"终值 y(∞)      : {ys[-1]:.4f}")
    print(f"稳态误差       : {err_ss:.4f}")
    print(f"最大超调       : {overshoot:.2f} %")
    print(f"稳定时间(±2%)  : {settle_t:.2f} s")
    print("-" * 56)
    print("经验对照: PI 消除稳态误差，但过大的 Ki 会引入超调与振荡;")
    print("         Kd 抑制超调，但噪声环境下过大的 Kd 反而放大抖动。")

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["t", "y", "u"])
            for t, y, u in zip(ts, ys, us):
                w.writerow([f"{t:.4f}", f"{y:.6f}", f"{u:.6f}"])
        print(f"\n曲线已写出: {args.csv}（可用 Excel / Origin 画图）")


if __name__ == "__main__":
    main()
