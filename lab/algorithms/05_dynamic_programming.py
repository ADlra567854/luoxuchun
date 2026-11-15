#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
05_dynamic_programming.py — 记忆化斐波那契 + 0/1 背包
动态规划的核心只有一句话：把算过的答案存下来，别再算第二遍。
本文件用两个例子把这句话摊开：

1. 斐波那契 —— 展示「朴素递归 → 记忆化 → 自底向上」三档的差距。
   朴素递归是 O(2^n)，n=35 就已经卡住；记忆化之后是 O(n)。
2. 0/1 背包 —— 二维转移方程压成一维，是「倒序遍历容量」这个经典技巧。
   这个技巧写错的人非常多，所以下面同时给出朴素二维版做对拍。

用法:
    python 05_dynamic_programming.py
    python 05_dynamic_programming.py --n 80 --capacity 20
"""
import argparse
import time


def fib_naive(n):
    """朴素递归：同一子问题被反复重算，n=35 就是上亿次调用。"""
    if n < 2:
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)


def fib_memo(n, memo=None):
    """记忆化递归：自顶向下 + 缓存。"""
    if memo is None:
        memo = {}
    if n < 2:
        return n
    if n in memo:
        return memo[n]
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]


def fib_bottom_up(n):
    """自底向上：只要前两项，空间 O(1)。"""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def knapsack_2d(items, cap):
    """朴素二维版。dp[i][c] = 前 i 件、容量 c 时的最大价值。"""
    n = len(items)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w, v = items[i - 1]
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]                       # 不拿第 i 件
            if c >= w:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)   # 拿
    return dp[n][cap]


def knapsack_1d(items, cap):
    """一维压滚版。关键：容量必须倒序遍历，否则同一件会被拿多次。"""
    dp = [0] * (cap + 1)
    for w, v in items:
        for c in range(cap, w - 1, -1):     # ← 倒序！正序就变成完全背包
            if dp[c - w] + v > dp[c]:
                dp[c] = dp[c - w] + v
    return dp[cap]


def knapsack_wrong(items, cap):
    """故意写错的版本（容量正序），用来说明为什么必须倒序。
    它算出来的是「完全背包」——每件可以无限拿，值会偏大。"""
    dp = [0] * (cap + 1)
    for w, v in items:
        for c in range(w, cap + 1):         # 正序 = 错
            if dp[c - w] + v > dp[c]:
                dp[c] = dp[c - w] + v
    return dp[cap]


def main():
    ap = argparse.ArgumentParser(description="记忆化斐波那契 + 0/1 背包")
    ap.add_argument("--n", type=int, default=30, help="斐波那契项数（朴素递归上限建议 32 以内）")
    ap.add_argument("--capacity", type=int, default=15, help="背包容量")
    args = ap.parse_args()

    print("=" * 62)
    print(f"一、斐波那契 · 三种解法对比（n = {args.n}）")
    print("=" * 62)

    t0 = time.perf_counter()
    v1 = fib_naive(args.n)
    t_naive = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    v2 = fib_memo(args.n)
    t_memo = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    v3 = fib_bottom_up(args.n)
    t_bu = (time.perf_counter() - t0) * 1000

    assert v1 == v2 == v3, "三种解法结果不一致"
    print(f"朴素递归      {t_naive:9.3f} ms   fib({args.n}) = {v1}")
    print(f"记忆化递归    {t_memo:9.3f} ms   一致")
    print(f"自底向上      {t_bu:9.3f} ms   一致，空间 O(1)")
    print("-" * 62)
    print("三者结果完全相同（已断言）。朴素递归慢，只因为它把同一步算了几百万遍。")
    print("你可以把 --n 调到 33、34 看朴素递归怎么突然变慢 —— 那是 2^n 开始咬人。")

    # 背包
    items = [(2, 3), (3, 4), (4, 5), (5, 8), (9, 10), (6, 7)]
    cap = args.capacity
    print("\n" + "=" * 62)
    print(f"二、0/1 背包（{len(items)} 件，容量 {cap}）")
    print("=" * 62)
    print("物品（重量, 价值）：", ", ".join(f"({w},{v})" for w, v in items))

    best2d = knapsack_2d(items, cap)
    best1d = knapsack_1d(items, cap)
    wrong = knapsack_wrong(items, cap)

    print(f"二维 DP（标准答案）  {best2d}")
    print(f"一维滚动（倒序遍历）  {best1d}")
    print(f"一维滚动（正序遍历）  {wrong}   ← 这是完全背包的值")
    assert best2d == best1d, "一维压滚与二维结果不一致，倒序写错了"
    print("-" * 62)
    print("前两者必须相等（已断言）。第三个更大，正好证明：容量正序会让同一件被重复拿。")

    # 边界自检
    assert knapsack_1d([], cap) == 0, "空物品应得 0"
    assert knapsack_1d([(99, 100)], cap) == 0, "装不下的物品应得 0"
    print("边界自检通过：空物品 = 0，单件超重 = 0。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：记忆化把斐波那契从指数级降到 O(n)；0/1 背包用滚动数组把空间从 O(nW) 压到 O(W)，但必须倒序更新，正序会变成完全背包。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/algorithms/05_dynamic_programming.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
