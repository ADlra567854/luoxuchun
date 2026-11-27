#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
01_python_basics.py — Python 入门全示例

《编程与计算机学习路线》里写的是「本目录 01_python_basics.py 全示例；
把每个示例改写一遍」。所以这个文件把八个主题各给一段可直接跑的代码：

    1 变量与类型   2 条件   3 循环   4 函数
    5 类           6 文件读写   7 异常   8 常用内置（推导式/排序/字典）

每段都打印结果，边跑边看。不要只读 —— 把每段的数字和字符串改掉再跑，
看输出怎么变，这才是「改写一遍」的意思。

用法:
    python 01_python_basics.py
    python 01_python_basics.py --section 4    # 只跑第 4 段
"""
import argparse
import os
import tempfile


def section(n, title):
    print("\n" + "=" * 62)
    print(f"{n}. {title}")
    print("=" * 62)


def demo_vars():
    """变量与类型。Python 是动态类型，但类型是真实存在的。"""
    i = 42
    f = 3.14
    s = "白驹"
    b = True
    none_v = None
    lst = [1, 2, 3]
    tup = (1, 2)
    d = {"k": "v"}
    st = {1, 2, 2, 3}          # 集合自动去重

    for name, v in (("int", i), ("float", f), ("str", s), ("bool", b),
                    ("NoneType", none_v), ("list", lst), ("tuple", tup),
                    ("dict", d), ("set", st)):
        print(f"  {name:<10} = {v!r:<16} type={type(v).__name__}")

    print("\n  运算注意：")
    print(f"    7 / 2  = {7 / 2}      ← 真除法，结果是 float")
    print(f"    7 // 2 = {7 // 2}     ← 整除，向下取整")
    print(f"    -7 // 2 = {-7 // 2}    ← 注意是 -4，不是 -3")
    print(f"    2 ** 10 = {2 ** 10}   ← 幂用 **，不是 ^")
    print(f"    0.1 + 0.2 = {0.1 + 0.2}  ← 浮点误差，比较要用 abs(a-b) < 1e-9")


def demo_cond():
    """条件分支。elif 从上往下短路，顺序会影响结果。"""
    score = 78
    if score >= 90:
        level = "优"
    elif score >= 75:
        level = "良"
    elif score >= 60:
        level = "及格"
    else:
        level = "不及格"
    print(f"  分数 {score} → {level}")

    # 三元表达式
    print(f"  是否及格：{'是' if score >= 60 else '否'}")

    # 常见的坑：and/or 返回的是操作数本身，不一定是 True/False
    print(f"  0 or '默认值' = {0 or '默认值'!r}   ← 常用于给默认值")
    print(f"  '' and 'x'  = {'' and 'x'!r}     ← 空串为假，直接短路")

    # 链式比较，Python 特有
    x = 5
    print(f"  0 < x < 10 → {0 < x < 10}")


def demo_loop():
    """循环。for 是迭代器协议，range 只是最常见的一种。"""
    print("  for + range(3):", end=" ")
    for i in range(3):
        print(i, end=" ")
    print()

    print("  enumerate 拿下标:", end=" ")
    for idx, ch in enumerate("abc"):
        print(f"{idx}{ch}", end=" ")
    print()

    print("  zip 并行遍历:", end=" ")
    for a, b in zip([1, 2, 3], ["x", "y", "z"]):
        print(f"{a}{b}", end=" ")
    print()

    # while + break/continue
    n, total = 0, 0
    while True:
        n += 1
        if n % 2 == 0:
            continue           # 偶数跳过
        total += n
        if n >= 9:
            break
    print(f"  1~9 的奇数和 = {total}")

    # for-else：循环正常走完才执行 else，被 break 打断则不执行
    for v in [2, 4, 6]:
        if v % 2 == 1:
            print(f"  找到奇数 {v}")
            break
    else:
        print("  for-else：列表里没有奇数")


def demo_func():
    """函数。默认参数、关键字参数、可变参数、返回值。"""
    def add(a, b=1):
        return a + b

    def stats(*nums, **opts):
        """*nums 收集位置参数，**opts 收集关键字参数。"""
        if not nums:
            return {}
        out = {"min": min(nums), "max": max(nums),
               "sum": sum(nums), "n": len(nums)}
        if opts.get("mean"):
            out["mean"] = sum(nums) / len(nums)
        return out

    print(f"  add(2) = {add(2)}   add(2, 5) = {add(2, 5)}   add(b=10, a=1) = {add(b=10, a=1)}")
    print(f"  stats(1,2,3,4, mean=True) = {stats(1, 2, 3, 4, mean=True)}")

    # 默认参数的经典陷阱：默认值只算一次
    def bad(v, acc=[]):
        acc.append(v)
        return acc

    print(f"  bad(1) = {bad(1)}")
    print(f"  bad(2) = {bad(2)}   ← 累加了！默认参数是可变对象就会这样")
    print("  正确写法：def good(v, acc=None): acc = acc or []")


def demo_class():
    """类。属性、方法、类属性、继承、__repr__。"""
    class Animal(object):
        kind = "animal"                     # 类属性，所有实例共享

        def __init__(self, name):
            self.name = name                # 实例属性
            self._secret = "内部用"          # 约定：下划线开头表示内部

        def speak(self):
            return "..."

        def __repr__(self):
            return f"<{type(self).__name__} {self.name}>"

    class Dog(Animal):
        kind = "dog"

        def __init__(self, name, breed="中华田园"):
            super().__init__(name)          # 调父类构造
            self.breed = breed

        def speak(self):
            return f"{self.name}：汪！"

    a, d = Animal("某动物"), Dog("旺财", "柴犬")
    print(f"  {a!r} speak={a.speak()}  kind={a.kind}")
    print(f"  {d!r} speak={d.speak()}  kind={d.kind}  breed={d.breed}")
    print(f"  isinstance(d, Animal) = {isinstance(d, Animal)}  ← 子类是父类的实例")


def demo_file():
    """文件读写。用临时目录，跑完自动清理，不留垃圾。"""
    tmpdir = tempfile.mkdtemp(prefix="pybasic_")
    path = os.path.join(tmpdir, "demo.txt")
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write("第一行\n第二行\n")
            f.write("中文写入要指定 encoding='utf-8'\n")
        print(f"  写入 {path}")

        with open(path, encoding="utf-8") as f:
            content = f.read()
        print(f"  一次读完：{len(content)} 字符")

        with open(path, encoding="utf-8") as f:
            lines = [ln.rstrip("\n") for ln in f]   # 按行读，大文件必须这样
        print(f"  按行读：{lines}")
    finally:
        # 不管上面成功与否，都清理
        if os.path.exists(path):
            os.remove(path)
        os.rmdir(tmpdir)
    print("  临时文件已清理")


def demo_except():
    """异常。捕获要具体，别用裸 except 把真问题吞掉。"""
    def risky(divisor):
        return 10 / divisor

    for d in (2, 0, "x"):
        try:
            print(f"  10 / {d!r} = {risky(d)}")
        except ZeroDivisionError:
            print(f"  10 / {d!r} → 除零，已捕获")
        except TypeError as e:
            print(f"  10 / {d!r} → 类型错误：{e}")

    # 自定义异常 + finally 一定执行
    class MyError(Exception):
        pass

    try:
        try:
            raise MyError("业务错误")
        except MyError as e:
            print(f"  捕获自定义异常：{e}")
            raise                     # 重新抛出，交给上层
        finally:
            print("  finally 执行了（无论是否继续抛）")
    except MyError:
        print("  上层再次捕获到了")


def demo_builtin():
    """常用的内置工具：推导式、排序 key、字典操作。"""
    nums = [3, 1, 4, 1, 5, 9, 2, 6]
    print(f"  原列表 {nums}")
    print(f"  升序 {sorted(nums)}   降序 {sorted(nums, reverse=True)}")
    print(f"  平方推导式 {[x * x for x in nums[:5]]}")
    print(f"  带条件推导式 {[x for x in nums if x % 2 == 0]}")

    people = [{"name": "阿罗", "age": 30}, {"name": "小白", "age": 25},
              {"name": "老陈", "age": 42}]
    by_age = sorted(people, key=lambda p: p["age"])
    print(f"  按年龄排 {[p['name'] for p in by_age]}")
    print(f"  max 取最大 {max(people, key=lambda p: p['age'])['name']}")

    d = {"a": 1, "b": 2}
    d.setdefault("c", []).append(3)
    print(f"  setdefault 常用法 {d}")
    print(f"  遍历 items {[(k, v) for k, v in d.items()]}")

    words = "the quick brown fox jumps over the lazy dog".split()
    from collections import Counter
    print(f"  Counter 词频 Top3 {Counter(words).most_common(3)}")


DEMOS = [demo_vars, demo_cond, demo_loop, demo_func,
         demo_class, demo_file, demo_except, demo_builtin]
TITLES = ["变量与类型", "条件", "循环", "函数",
          "类", "文件读写", "异常", "常用内置"]


def main():
    ap = argparse.ArgumentParser(description="Python 入门全示例")
    ap.add_argument("--section", type=int, default=0,
                    help="只跑某一段（1~8），默认全部")
    args = ap.parse_args()

    indices = range(len(DEMOS))
    if args.section:
        if not 1 <= args.section <= len(DEMOS):
            raise SystemExit(f"--section 只能是 1~{len(DEMOS)}")
        indices = [args.section - 1]

    print("=" * 62)
    print("Python 入门全示例 · 共 %d 段" % len(DEMOS))
    print("=" * 62)

    for i in indices:
        section(i + 1, TITLES[i])
        DEMOS[i]()

    print("\n" + "=" * 62)
    print("全部跑完。练习：把每一段的数字、字符串改掉再跑一次，")
    print("看输出怎么变。能预测结果，才算真的看懂了。")


if __name__ == "__main__":
    main()

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：覆盖变量、分支、循环、函数、类、文件读写与异常处理八组入门示例；定位是语法速查，不是性能基准。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/programming/01_python_basics.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
