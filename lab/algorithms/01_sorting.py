#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
01_sorting.py — 冒泡 / 快排 / 归并，含耗时对比
三种排序放在同一个文件里，用同一份随机数据跑一遍，直接把耗时打出来，
这样「O(n²) 和 O(n log n) 差多少」不用背，看数字就行。

顺带把内置 sorted() 也测一遍 —— 它是 Timsort，混合了插入与归并，
比手写快排更快，这也是为什么工程里永远用它而不是自己写。

用法:
    python 01_sorting.py
    python 01_sorting.py --n 3000 --seed 7
"""
import argparse
import random
import time


def bubble_sort(a):
    """冒泡：相邻逆序就交换。稳定性好，但 O(n²)。"""
    a = a[:]
    n = len(a)
    for i in range(n - 1):
        swapped = False
        # 每轮过后，末尾 i+1 个已经就位，内层可以少扫一段
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:          # 已经有序就提前收工
            break
    return a


def quick_sort(a):
    """快排：取中位为轴，分三段递归。平均 O(n log n)，最坏 O(n²)。"""
    if len(a) <= 1:
        return a
    pivot = a[len(a) // 2]
    less = [x for x in a if x < pivot]
    equal = [x for x in a if x == pivot]
    greater = [x for x in a if x > pivot]
    return quick_sort(less) + equal + quick_sort(greater)


def merge_sort(a):
    """归并：对半分、各自排好再合并。稳定，且最坏也是 O(n log n)。"""
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:   # 用 <= 保证稳定
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out


def timed(fn, data):
    t0 = time.perf_counter()
    out = fn(data)
    return out, (time.perf_counter() - t0) * 1000.0


def main():
    ap = argparse.ArgumentParser(description="三种排序 + 内置 sorted 的耗时对比")
    ap.add_argument("--n", type=int, default=1500, help="数据规模（冒泡在 n>3000 时会明显变慢）")
    ap.add_argument("--seed", type=int, default=7, help="随机种子，保证可复现")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    data = [rng.randint(0, 10 ** 6) for _ in range(args.n)]

    print("=" * 60)
    print(f"排序耗时对比 · n = {args.n:,}（种子 {args.seed}）")
    print("=" * 60)

    results = {}
    for name, fn in (("冒泡 bubble", bubble_sort),
                     ("快排 quick", quick_sort),
                     ("归并 merge", merge_sort),
                     ("内置 sorted", sorted)):
        out, ms = timed(fn, data)
        results[name] = (out, ms)
        print(f"{name:<14} {ms:9.2f} ms")

    # 三条正确性断言：结果对了，耗时对比才有意义
    base = results["内置 sorted"][0]
    for name, (out, _) in results.items():
        assert out == base, f"{name} 结果与 sorted 不一致"
    print("-" * 60)
    print("四种实现输出完全一致（已断言），所以差异只来自算法本身。")

    fast = results["快排 quick"][1] or 1e-9
    slow = results["冒泡 bubble"][1]
    print(f"冒泡 / 快排 ≈ {slow / fast:.1f} 倍。n 再翻 10 倍，这个倍数还会明显变大。")
    print("工程结论：排序一律用内置 sorted / list.sort，别自己写。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：冒泡 O(n²)、快排/归并 O(n log n)；数据一大规模差距即拉开。工程上直接用内置 sorted / list.sort，别自己造轮子。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/algorithms/01_sorting.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
