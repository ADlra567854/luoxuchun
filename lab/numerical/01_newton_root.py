#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
01_newton_root.py — 牛顿迭代法求根
把「求 f(x)=0」变成「沿切线滑到 x 轴」，每次迭代
    x_{n+1} = x_n - f(x_n) / f'(x_n)
根附近是二阶收敛（误差平方级下降），但代价是要导数，且初值选不好会跑飞。

本文件三个部分：
  1. 牛顿法 vs 二分法：同一道题，比较迭代次数和收敛速度
  2. 牛顿法的二次收敛现象：误差是怎么一步一个平方缩下去的
  3. 两个反面教材：初值落在 f'=0 上会直接崩；振荡函数会跑到别的根

用法:
    python 01_newton_root.py
"""
import math

TOL = 1e-12


def newton(f, df, x0, tol=TOL, max_iter=100):
    """牛顿迭代。返回 (根, 迭代次数, 每步误差历史, 是否收敛)。"""
    x = x0
    hist = []
    for i in range(max_iter):
        fx = f(x)
        hist.append(abs(fx))
        if abs(fx) < tol:
            return x, i, hist, True
        d = df(x)
        if abs(d) < 1e-15:
            # 切线水平，除下去就爆了。这是牛顿法最典型的失败方式。
            return x, i, hist, False
        x = x - fx / d
    return x, max_iter, hist, False


def bisect(f, a, b, tol=TOL, max_iter=200):
    """二分法兜底：只要有 f(a)*f(b)<0 就一定能收敛，只是慢（线性收敛）。"""
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("区间两端同号，二分法不能保证有根")
    for i in range(max_iter):
        m = (a + b) / 2.0
        fm = f(m)
        if abs(fm) < tol or (b - a) / 2 < tol:
            return m, i, True
        if fa * fm < 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2, max_iter, False


def main():
    # 目标方程：x³ - 2x - 5 = 0，经典测试题，真根约 2.0945514815
    f = lambda x: x ** 3 - 2 * x - 5
    df = lambda x: 3 * x ** 2 - 2
    TRUE_ROOT = 2.0945514815423265

    print("=" * 64)
    print("一、牛顿法 vs 二分法 · 解 x³ - 2x - 5 = 0")
    print("=" * 64)

    root_n, it_n, hist_n, ok_n = newton(f, df, x0=2.0)
    root_b, it_b, ok_b = bisect(f, 2.0, 3.0)

    print(f"牛顿法（初值 2.0）  根 = {root_n:.15f}  迭代 {it_n} 次  收敛={ok_n}")
    print(f"二分法（区间 2~3）  根 = {root_b:.15f}  迭代 {it_b} 次  收敛={ok_b}")
    print(f"参考真值            根 = {TRUE_ROOT:.15f}")
    print(f"牛顿法误差 {abs(root_n - TRUE_ROOT):.2e}   二分法误差 {abs(root_b - TRUE_ROOT):.2e}")
    print("-" * 64)
    print(f"牛顿法用了 {it_n} 次，二分法用了 {it_b} 次。二分法每次只砍掉一半区间，")
    print("想再精确一位就要多迭代三四次；牛顿法在根附近误差是平方级缩小的。")

    print("\n" + "=" * 64)
    print("二、二次收敛长什么样（看 |f(x)| 每步怎么掉）")
    print("=" * 64)
    for i, e in enumerate(hist_n):
        print(f"  第 {i} 步  |f(x)| = {e:.3e}")
    if len(hist_n) >= 3:
        r1 = hist_n[1] / max(hist_n[0], 1e-300)
        r2 = hist_n[2] / max(hist_n[1], 1e-300)
        print(f"  相邻比值：{r1:.2e} → {r2:.2e}，比值本身也在变小，这就是「平方级」的直观样子。")

    print("\n" + "=" * 64)
    print("三、两个反面教材")
    print("=" * 64)

    # 反面 1：初值落在 f'=0 上。x²-1=0 的导数 2x，在 x=0 处为 0
    g = lambda x: x ** 2 - 1
    dg = lambda x: 2 * x
    _, it, _, ok = newton(g, dg, x0=0.0)
    print(f"① 初值落在导数为 0 的点（x²-1=0，x0=0）")
    print(f"   结果：收敛={ok}，迭代停下时 {it} 次。切线水平 → 除零 → 迭代卡死。")
    print("   工程对策：给初值，或改用带阻尼的牛顿法 / 二分法兜底。")

    # 反面 2：振荡函数，初值稍偏就收敛到另一个根
    h = lambda x: math.sin(x)
    dh = lambda x: math.cos(x)
    for x0 in (3.0, 3.2):
        r, _, _, _ = newton(h, dh, x0=x0)
        print(f"② sin(x)=0，初值 {x0} → 收敛到 {r:.6f}（{r / math.pi:.3f}π）")
    print("   同一方程有无数个根，初值决定了你去哪一个。这不是 bug，是牛顿法的天性。")

    print("\n" + "=" * 64)
    print("一句话结论：牛顿法快但挑初值，二分法稳但慢。工程上常见做法是")
    print("先用二分法框定区间，再用牛顿法快速精修。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：牛顿法二次收敛但挑初值，二分法线性收敛但只要有根区间就一定收敛；工程上常先用二分缩区间再切牛顿。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/numerical/01_newton_root.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
