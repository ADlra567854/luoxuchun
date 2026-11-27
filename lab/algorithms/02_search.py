#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02_search.py — 线性查找 vs 二分查找
两者差的不是「写法」，是前提：二分要求先有序。
所以真正的对比不是「谁快」，而是「排序 + 二分」和「一路线性找」在
多次查询场景下谁更划算。本脚本把这三个时间都测出来。

用法:
    python 02_search.py
    python 02_search.py --n 300000 --queries 300

注意：线性查找的成本是 n × 查询次数，参数调大时它会先变慢，
这不是卡死。默认参数控制在两秒内跑完。
"""
import argparse
import random
import time


def linear_search(a, x):
    """线性查找：逐个比对，O(n)。不要求有序。"""
    for i, v in enumerate(a):
        if v == x:
            return i
    return -1


def binary_search(a, x):
    """二分查找：有序数组上折半，O(log n)。"""
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


def main():
    ap = argparse.ArgumentParser(description="线性查找 vs 二分查找")
    ap.add_argument("--n", type=int, default=100000, help="数组规模（线性查找成本 ≈ n × 查询次数，别调太大）")
    ap.add_argument("--queries", type=int, default=400, help="查询次数")
    ap.add_argument("--seed", type=int, default=11, help="随机种子")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    data = [rng.randint(0, 10 ** 7) for _ in range(args.n)]

    # 拿目标值：一半是数组里真实存在的，一半是故意的「找不到」
    targets = []
    for i in range(args.queries):
        if i % 2 == 0:
            targets.append(data[rng.randrange(len(data))])
        else:
            targets.append(-1)          # 保证为负，肯定不存在

    print("=" * 60)
    print(f"查找对比 · n = {args.n:,}，查询 {args.queries:,} 次（种子 {args.seed}）")
    print(f"预计比较次数：线性约 {args.n * args.queries:,} 次，二分约 {args.queries * 17:,} 次")
    print("=" * 60)

    # --- 场景 A：数据本来就有序，直接二分 ---
    t0 = time.perf_counter()
    srt = sorted(data)
    t_sort = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    hit_a = sum(1 for x in targets if binary_search(srt, x) >= 0)
    t_bin = (time.perf_counter() - t0) * 1000

    # --- 场景 B：数据无序，只能线性 ---
    t0 = time.perf_counter()
    hit_b = sum(1 for x in targets if linear_search(data, x) >= 0)
    t_lin = (time.perf_counter() - t0) * 1000

    print(f"先排序（一次性）        {t_sort:9.1f} ms")
    print(f"排序后二分 {args.queries:,} 次    {t_bin:9.1f} ms")
    print(f"线性查找 {args.queries:,} 次      {t_lin:9.1f} ms")
    print("-" * 60)
    assert hit_a == hit_b, "两种查找命中数不一致，说明有 bug"
    print(f"命中数一致（{hit_a} 次找到），所以耗时差异来自算法。")

    total_ab = t_sort + t_bin
    print(f"\n「排序 + 二分」总成本 = {total_ab:.1f} ms")
    print(f"「直接线性」总成本   = {t_lin:.1f} ms")
    if total_ab < t_lin:
        print(f"→ 这个规模下，先排一次序再二分更划算（省 {t_lin - total_ab:.1f} ms）。")
    else:
        print(f"→ 这个规模下只查一次的话，线性反而更省（省 {total_ab - t_lin:.1f} ms）。")
    print("查询次数越多、n 越大，二分越压倒性 —— 因为 log n 几乎不涨。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：线性查找 O(n) 不要求有序，二分查找 O(log n) 但必须先排序；n 越大二分优势越明显，小规模反而排序成本不划算。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/algorithms/02_search.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
