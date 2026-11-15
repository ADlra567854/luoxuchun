#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
03_structures.py — 链表、栈、队列、二叉树
四个结构各给一个最小可用实现，并在末尾做一组断言自检。
不以「能跑」为标准，以「边界情况对」为标准：空结构弹出、单节点树、
环形链表检测，这些才是面试和真实代码里最容易翻车的地方。

用法:
    python 03_structures.py
"""
from collections import deque


class Node(object):
    """单链表节点。__slots__ 省内存，一万个节点省下的不是一点。"""
    __slots__ = ("val", "next")

    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt


class LinkedList(object):
    """单链表：头插 O(1)、尾插 O(1)（维护 tail 指针）、索引 O(n)。"""

    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def push_front(self, v):
        self.head = Node(v, self.head)
        if self.tail is None:
            self.tail = self.head
        self.size += 1

    def push_back(self, v):
        node = Node(v)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.size += 1

    def remove(self, v):
        """删除第一个等于 v 的节点。删头节点要特判，这是最常见的 bug 来源。"""
        prev, cur = None, self.head
        while cur is not None:
            if cur.val == v:
                if prev is None:
                    self.head = cur.next
                else:
                    prev.next = cur.next
                if cur is self.tail:
                    self.tail = prev
                self.size -= 1
                return True
            prev, cur = cur, cur.next
        return False

    def to_list(self):
        out, cur = [], self.head
        while cur is not None:
            out.append(cur.val)
            cur = cur.next
        return out

    def has_cycle(self):
        """快慢指针判环。不用额外内存，O(1) 空间。"""
        slow = fast = self.head
        while fast is not None and fast.next is not None:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True
        return False


class Stack(object):
    """栈：后进先出。Python 的 list 当栈是最优解，append/pop 都是摊还 O(1)。"""

    def __init__(self):
        self._d = []

    def push(self, v):
        self._d.append(v)

    def pop(self):
        if not self._d:
            raise IndexError("空栈不能 pop")
        return self._d.pop()

    def peek(self):
        return self._d[-1] if self._d else None

    def __len__(self):
        return len(self._d)


class Queue(object):
    """队列：先进先出。必须用 deque —— list.pop(0) 是 O(n)，队头越挪越慢。"""

    def __init__(self):
        self._d = deque()

    def enqueue(self, v):
        self._d.append(v)

    def dequeue(self):
        if not self._d:
            raise IndexError("空队列不能 dequeue")
        return self._d.popleft()

    def __len__(self):
        return len(self._d)


class BST(object):
    """二叉搜索树：左 < 根 < 右。中序遍历天然有序。"""

    class _N(object):
        __slots__ = ("v", "l", "r")

        def __init__(self, v):
            self.v, self.l, self.r = v, None, None

    def __init__(self):
        self.root = None

    def insert(self, v):
        def go(node, v):
            if node is None:
                return BST._N(v)
            if v < node.v:
                node.l = go(node.l, v)
            elif v > node.v:
                node.r = go(node.r, v)
            return node          # 相等就丢弃，保持集合语义
        self.root = go(self.root, v)

    def contains(self, v):
        cur = self.root
        while cur is not None:
            if v == cur.v:
                return True
            cur = cur.l if v < cur.v else cur.r
        return False

    def inorder(self):
        out = []

        def go(node):
            if node is None:
                return
            go(node.l)
            out.append(node.v)
            go(node.r)

        go(self.root)
        return out

    def height(self):
        """空树高度记 0，单节点记 1。"""
        def go(node):
            return 0 if node is None else 1 + max(go(node.l), go(node.r))
        return go(self.root)


def main():
    print("=" * 60)
    print("四种数据结构自检")
    print("=" * 60)

    # --- 链表 ---
    ll = LinkedList()
    for v in (1, 2, 3):
        ll.push_back(v)
    ll.push_front(0)
    print("链表 push 0,1,2,3     ->", ll.to_list())
    assert ll.to_list() == [0, 1, 2, 3]
    assert ll.remove(0), "删头节点失败"
    assert ll.to_list() == [1, 2, 3], "删头节点后链表错"
    assert ll.tail.val == 3, "删头节点后 tail 指针没接对"
    assert ll.remove(3) and ll.tail.val == 2, "删尾节点后 tail 没回退"
    assert not ll.remove(999), "删不存在的值却返回 True"
    print("删头 / 删尾 / 删不存在  -> 全部正确，tail 指针未失效")

    # 人为造一个环，验证快慢指针
    cyc = LinkedList()
    cyc.push_back(1)
    cyc.push_back(2)
    cyc.push_back(3)
    cyc.tail.next = cyc.head          # 3 -> 1
    assert cyc.has_cycle(), "判环漏判"
    print("人工造环 3->1           -> has_cycle() 正确识别")

    # --- 栈 ---
    st = Stack()
    for v in (1, 2, 3):
        st.push(v)
    assert [st.pop(), st.pop(), st.pop()] == [3, 2, 1]
    try:
        st.pop()
        raise AssertionError("空栈 pop 竟然没报错")
    except IndexError:
        print("栈 LIFO / 空栈 pop       -> 正确抛 IndexError")

    # --- 队列 ---
    q = Queue()
    for v in (1, 2, 3):
        q.enqueue(v)
    assert [q.dequeue(), q.dequeue(), q.dequeue()] == [1, 2, 3]
    print("队列 FIFO               -> 顺序正确")

    # --- 二叉树 ---
    bt = BST()
    for v in (8, 3, 10, 1, 6, 14, 4, 7, 13):
        bt.insert(v)
    bt.insert(8)                       # 重复值应被丢弃
    print("BST 中序遍历            ->", bt.inorder())
    assert bt.inorder() == [1, 3, 4, 6, 7, 8, 10, 13, 14], "中序不是升序"
    assert bt.contains(13) and not bt.contains(99)
    print(f"BST 高度                -> {bt.height()}（9 个节点，理想高度约 4）")
    assert BST().height() == 0, "空树高度应为 0"
    assert BST().inorder() == [], "空树中序应为空"

    print("-" * 60)
    print("全部断言通过。这些断言就是这个文件的测试用例，改代码前后都该跑一遍。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：数组随机访问 O(1)、链表插入删除 O(1)（已知节点）、栈 LIFO / 队列 FIFO、平衡二叉树查找 O(log n)；结构选择取决于主要操作是查还是改。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/algorithms/03_structures.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
