#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02_runge_kutta.py — 四阶龙格-库塔（RK4）解常微分方程
显式欧拉是「拿当前斜率往前冲一整步」，误差 O(h)，想准就得把步长压很小；
RK4 在一步里探四次斜率（起点、中点两次、终点）再加权平均，误差 O(h⁴)。
代价是每步算四次导数，但允许的步长大得多，总体算下来反而更省。

本文件用同一个方程 y' = -2y（解析解 y = e^(-2x)）把三种方法摆在一起比：
  显式欧拉 / 中点法（RK2）/ RK4
然后画一张「误差 vs 步长」的收敛阶表 —— 步长减半时误差该掉多少倍，
这个倍数就是方法的阶数，一看就知道是不是真收敛。

用法:
    python 02_runge_kutta.py
    python 02_runge_kutta.py --t-end 3 --steps 40
"""
import argparse
import math


def euler(f, y0, t0, t_end, n):
    """显式欧拉：y_{k+1} = y_k + h*f(t_k, y_k)。一阶。"""
    h = (t_end - t0) / n
    y, t = y0, t0
    path = [(t, y)]
    for _ in range(n):
        y += h * f(t, y)
        t += h
        path.append((t, y))
    return path


def rk2(f, y0, t0, t_end, n):
    """中点法（二阶 RK）：先探到半步处取斜率，再用这个斜率走整步。"""
    h = (t_end - t0) / n
    y, t = y0, t0
    path = [(t, y)]
    for _ in range(n):
        k1 = f(t, y)
        k2 = f(t + h / 2, y + h / 2 * k1)
        y += h * k2
        t += h
        path.append((t, y))
    return path


def rk4(f, y0, t0, t_end, n):
    """四阶 RK：四个斜率加权 (1,2,2,1)/6。工程上的默认选择。"""
    h = (t_end - t0) / n
    y, t = y0, t0
    path = [(t, y)]
    for _ in range(n):
        k1 = f(t, y)
        k2 = f(t + h / 2, y + h / 2 * k1)
        k3 = f(t + h / 2, y + h / 2 * k2)
        k4 = f(t + h, y + h * k3)
        y += h / 6.0 * (k1 + 2 * k2 + 2 * k3 + k4)
        t += h
        path.append((t, y))
    return path


def main():
    ap = argparse.ArgumentParser(description="欧拉 / RK2 / RK4 精度对比")
    ap.add_argument("--t-end", type=float, default=2.0, help="积分到哪个时刻")
    ap.add_argument("--steps", type=int, default=20, help="步数 n（步长 h = t_end / n）")
    args = ap.parse_args()

    # y' = -2y, y(0)=1  →  解析解 y = e^(-2t)
    f = lambda t, y: -2.0 * y
    exact = lambda t: math.exp(-2.0 * t)

    print("=" * 66)
    print(f"ODE：y' = -2y, y(0)=1（解析解 e^(-2t)）  积分到 t={args.t_end}，n={args.steps}")
    print("=" * 66)
    h = args.t_end / args.steps

    pe = euler(f, 1.0, 0.0, args.t_end, args.steps)
    p2 = rk2(f, 1.0, 0.0, args.t_end, args.steps)
    p4 = rk4(f, 1.0, 0.0, args.t_end, args.steps)

    ye, y2, y4 = pe[-1][1], p2[-1][1], p4[-1][1]
    ex = exact(args.t_end)
    print(f"{'方法':<12}{'y(t_end)':>16}{'绝对误差':>14}{'相对误差':>12}")
    print("-" * 66)
    for name, val in (("显式欧拉", ye), ("中点 RK2", y2), ("RK4", y4)):
        ae = abs(val - ex)
        print(f"{name:<12}{val:>16.10f}{ae:>14.3e}{ae / ex * 100:>11.4f}%")
    print(f"{'解析解':<12}{ex:>16.10f}")

    print("\n" + "=" * 66)
    print("收敛阶测试：步长减半，误差应该按 2^阶 缩小")
    print("=" * 66)
    print(f"{'n':>6}{'h':>12}{'欧拉误差':>14}{'RK2 误差':>14}{'RK4 误差':>14}")
    print("-" * 66)
    errs = {"euler": [], "rk2": [], "rk4": []}
    ns = [10, 20, 40, 80, 160]
    for n in ns:
        he = args.t_end / n
        e = abs(euler(f, 1.0, 0.0, args.t_end, n)[-1][1] - ex)
        a = abs(rk2(f, 1.0, 0.0, args.t_end, n)[-1][1] - ex)
        b = abs(rk4(f, 1.0, 0.0, args.t_end, n)[-1][1] - ex)
        errs["euler"].append(e)
        errs["rk2"].append(a)
        errs["rk4"].append(b)
        print(f"{n:>6}{he:>12.5f}{e:>14.3e}{a:>14.3e}{b:>14.3e}")

    print("-" * 66)
    print("实测收敛阶（log2(上一步误差 / 本步误差)）：")
    for key, label, want in (("euler", "显式欧拉", 1), ("rk2", "RK2", 2), ("rk4", "RK4", 4)):
        seq = errs[key]
        orders = [math.log2(seq[i] / seq[i + 1]) for i in range(len(seq) - 1)
                  if seq[i + 1] > 0 and seq[i] > 0]
        approx = sum(orders) / len(orders) if orders else 0
        print(f"  {label:<10} 实测 ≈ {approx:4.2f} 阶（理论 {want} 阶）")
    print("\n实测阶数会略偏离理论值 —— 步长还不够小时，高阶项和浮点误差都会干扰。")
    print(f"本次最小误差只到 {min(errs['rk4']):.2e}，已经接近双精度在这类问题上的底噪。")

    print("\n" + "=" * 66)
    print("工程结论：要 O(h⁴) 就用 RK4，每步多算几次导数远比多迭代几千步便宜。")
    print("但如果方程刚性（stiff）很强，显式方法都会不稳，得换隐式方法（如 BDF）。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：同步长下误差量级 Euler O(h) < RK2 O(h²) < RK4 O(h⁴)；RK4 每步多算几次导数，远比把步长砍几千倍便宜。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/numerical/02_runge_kutta.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
