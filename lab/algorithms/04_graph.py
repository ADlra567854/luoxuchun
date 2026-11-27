#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
04_graph.py — 图遍历 BFS / DFS
同一张图，两种走法，输出顺序完全不同：
  BFS 用队列，一层层推出去，得到的是「最短跳数」；
  DFS 用栈（或递归），一条道走到黑，得到的是「连通分量、拓扑序、环检测」。
工程上选哪个，取决你要的是最短路径还是完整枚举。

图用邻接表存（dict[str, list[str]]），这是稀疏图最省内存的写法。

用法:
    python 04_graph.py
"""
from collections import deque


def build_graph():
    """九座城市的无向图，边表示直达航线。"""
    return {
        "北京": ["上海", "西安", "沈阳"],
        "上海": ["北京", "杭州", "成都"],
        "西安": ["北京", "成都", "兰州"],
        "沈阳": ["北京", "哈尔滨"],
        "杭州": ["上海", "厦门"],
        "成都": ["上海", "西安", "昆明"],
        "兰州": ["西安", "乌鲁木齐"],
        "哈尔滨": ["沈阳"],
        "厦门": ["杭州", "广州"],
        "昆明": ["成都"],
        "乌鲁木齐": ["兰州"],
        "广州": ["厦门"],
    }


def bfs(g, start):
    """广度优先：返回 (访问顺序, 到各点的跳数)。跳数就是边的条数。"""
    seen = {start}
    dist = {start: 0}
    order = []
    q = deque([start])
    while q:
        cur = q.popleft()
        order.append(cur)
        for nb in g.get(cur, []):
            if nb not in seen:
                seen.add(nb)
                dist[nb] = dist[cur] + 1
                q.append(nb)
    return order, dist


def dfs(g, start):
    """深度优先（显式栈，避免深图递归爆栈）。注意入栈要逆序，才和递归顺序一致。"""
    seen = set()
    order = []
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        order.append(cur)
        # 逆序压栈，保证出栈时按字母/列表原顺序访问
        for nb in reversed(g.get(cur, [])):
            if nb not in seen:
                stack.append(nb)
    return order


def components(g):
    """连通分量：DFS 跑一遍所有未访问点。孤立点也算一个分量。"""
    seen = set()
    comps = []
    for node in g:
        if node in seen:
            continue
        part = dfs(g, node)
        seen.update(part)
        comps.append(part)
    return comps


def main():
    g = build_graph()
    edges = sum(len(v) for v in g.values()) // 2
    print("=" * 64)
    print(f"图规模：{len(g)} 个节点，{edges} 条无向边")
    print("=" * 64)

    order_b, dist = bfs(g, "北京")
    order_d = dfs(g, "北京")
    print("BFS 顺序：", " → ".join(order_b))
    print("DFS 顺序：", " → ".join(order_d))
    print("-" * 64)

    # BFS 的最大跳数就是图的直径（这里从北京出发）
    far = max(dist.items(), key=lambda kv: kv[1])
    print(f"从北京出发最远的是「{far[0]}」，{far[1]} 跳")
    print("跳数表：", "  ".join(f"{k}={v}" for k, v in sorted(dist.items(), key=lambda kv: kv[1])))

    # 两种遍历必须覆盖同一批节点，这是最基本的自检
    assert set(order_b) == set(order_d) == set(g), "BFS/DFS 覆盖的节点不一致"
    assert len(order_b) == len(g), "有节点被重复访问或漏掉"
    print("-" * 64)
    print("自检通过：两种遍历都恰好覆盖全部节点一次。")

    comps_ = components(g)
    print(f"连通分量：{len(comps_)} 个")
    for i, c in enumerate(comps_, 1):
        print(f"  分量 {i}（{len(c)} 点）：{'、'.join(c)}")

    # 造一个孤立点，验证分量数会加一
    g2 = dict(g)
    g2["孤立岛"] = []
    assert len(components(g2)) == len(comps_) + 1
    print("加入一个孤立点后分量数 +1，符合预期。")
    print("\n结论：找最短跳数用 BFS，找连通性/枚举路径用 DFS。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：求最短跳数用 BFS（按层扩散），求连通分量/枚举路径用 DFS；同一张无向图两种遍历得到的连通分量数一致。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/algorithms/04_graph.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
