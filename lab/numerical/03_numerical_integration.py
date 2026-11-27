#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
03_numerical_integration.py — 数值积分：梯形法 vs 辛普森法
有些函数没有初等原函数（比如 e^(-x²)），有些只有离散采样点，
这时只能数值积分。

  梯形法：把区间切成小梯形，误差 O(h²)
  辛普森法：每两个小区间用一条抛物线拟合，误差 O(h⁴)

本文件用三个被积函数做对比，其中一个（e^(-x²)）故意选了没有初等原函数的，
用高精度参考值来核对 —— 不给真值就没法判断谁算得准。

用法:
    python 03_numerical_integration.py
    python 03_numerical_integration.py --n 200
"""
import argparse
import math


def trapezoid(f, a, b, n):
    """梯形法。n 个区间，取 n+1 个点。"""
    h = (b - a) / n
    s = 0.5 * (f(a) + f(b))
    for i in range(1, n):
        s += f(a + i * h)
    return s * h


def simpson(f, a, b, n):
    """辛普森法。n 必须是偶数，否则段数不是 2 的倍数，公式对不上。"""
    if n % 2 == 1:
        n += 1                      # 悄悄补一段，比直接报错友好
    h = (b - a) / n
    s = f(a) + f(b)
    for i in range(1, n):
        s += (4 if i % 2 == 1 else 2) * f(a + i * h)
    return s * h / 3.0


def main():
    ap = argparse.ArgumentParser(description="梯形法 vs 辛普森法")
    ap.add_argument("--n", type=int, default=100, help="区间数（越大越准）")
    args = ap.parse_args()

    # 三个被积函数，都给了可核对的参考值
    cases = [
        ("∫₀¹ x² dx",       lambda x: x * x,                 0.0, 1.0, 1.0 / 3.0,
         "解析解 1/3"),
        ("∫₀^π sin x dx",   math.sin,                        0.0, math.pi, 2.0,
         "解析解 2"),
        ("∫₀¹ e^(-x²) dx",  lambda x: math.exp(-x * x),      0.0, 1.0,
         0.7468241328124271, "无初等原函数，参考值为高精度数值结果"),
    ]

    print("=" * 74)
    print(f"数值积分对比 · 每个区间 n = {args.n}")
    print("=" * 74)
    print(f"{'被积函数':<20}{'梯形法':>16}{'辛普森':>16}{'真值':>16}")
    print("-" * 74)

    rows = []
    for name, f, a, b, truth, how in cases:
        t = trapezoid(f, a, b, args.n)
        s = simpson(f, a, b, args.n)
        rows.append((name, t, s, truth))
        print(f"{name:<20}{t:>16.10f}{s:>16.10f}{truth:>16.10f}")

    print("\n绝对误差对比：")
    print(f"{'被积函数':<20}{'梯形法误差':>18}{'辛普森误差':>18}{'倍数':>10}")
    print("-" * 74)
    for name, t, s, truth in rows:
        et, es = abs(t - truth), abs(s - truth)
        ratio = (et / es) if es > 1e-15 else float('inf')
        print(f"{name:<20}{et:>18.3e}{es:>18.3e}{ratio:>10.0f}×")

    print("-" * 74)
    print("辛普森普遍比梯形准一到几个量级。原因：梯形用直线连点，")
    print("辛普森用抛物线连点，对被积函数的弯曲更贴合。")

    print("\n" + "=" * 74)
    print("收敛阶测试：区间数翻倍，误差应分别缩小 4 倍（梯形）与 16 倍（辛普森）")
    print("=" * 74)
    f = lambda x: math.exp(-x * x)
    truth = 0.7468241328124271
    print(f"{'n':>6}{'梯形误差':>16}{'缩小':>8}{'辛普森误差':>16}{'缩小':>8}")
    print("-" * 74)
    prev_t = prev_s = None
    for n in (25, 50, 100, 200, 400):
        et = abs(trapezoid(f, 0, 1, n) - truth)
        es = abs(simpson(f, 0, 1, n) - truth)
        rt = "" if prev_t is None else f"{prev_t / et:7.1f}×"
        rs = "" if prev_s is None else f"{prev_s / es:7.1f}×"
        print(f"{n:>6}{et:>16.3e}{rt:>8}{es:>16.3e}{rs:>8}")
        prev_t, prev_s = et, es
    print("-" * 74)
    print("梯形每翻倍约缩 4 倍（O(h²)），辛普森约 16 倍（O(h⁴)）。")
    print("辛普森的误差很快会撞上双精度浮点的底噪，之后就再也不降了 —— 这不是 bug。")

    print("\n" + "=" * 74)
    print("实操提醒：辛普森要求「等距采样且段数为偶数」。")
    print("如果你手上只有实验测得的散点（不等距），两个公式都用不了，")
    print("得先插值或在非等距上做加权（比如用梯形法的非等距版本）。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：梯形法 O(h²)、辛普森法 O(h⁴)；同一精度下辛普森所需划分数显著更少，但要求被积函数足够光滑。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/numerical/03_numerical_integration.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
