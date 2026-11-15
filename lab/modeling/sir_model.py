#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sir_model.py — SIR 传染病模型的四阶龙格-库塔求解

本文件的代码与《数学建模入门》页里给出的示例完全一致，
可以直接对照页面阅读。S/I/R 分别是易感者、感染者、康复者，
三人群体总和恒为 N：

    dS/dt = -beta * S * I / N
    dI/dt =  beta * S * I / N - gamma * I
    dR/dt =  gamma * I

基本再生数 R0 = beta/gamma（初始时刻按 S0/N 修正）。
R0 > 1 疫情扩散，R0 < 1 自行消退。

用法:
    python sir_model.py
"""

import math


def sir_derivs(state, beta, gamma, N):
    """返回 (dS/dt, dI/dt, dR/dt)"""
    S, I, R = state
    dS = -beta * S * I / N
    dI = beta * S * I / N - gamma * I
    dR = gamma * I
    return (dS, dI, dR)


def rk4_sir(state0, beta, gamma, N, h, n_steps):
    """向量形式的四阶龙格-库塔，求解 SIR 模型"""
    S, I, R = state0
    history = [(0.0, S, I, R)]
    for k in range(n_steps):
        def f(state):  # 统一封装为 f(state) -> 导数向量
            return sir_derivs(state, beta, gamma, N)

        # 计算 4 个斜率（每个都是三元组）
        k1 = f((S, I, R))
        k2 = f((S + h / 2 * k1[0], I + h / 2 * k1[1], R + h / 2 * k1[2]))
        k3 = f((S + h / 2 * k2[0], I + h / 2 * k2[1], R + h / 2 * k2[2]))
        k4 = f((S + h * k3[0], I + h * k3[1], R + h * k3[2]))
        S = S + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
        I = I + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
        R = R + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
        history.append(((k + 1) * h, S, I, R))
    return history


if __name__ == "__main__":
    N = 10000.0          # 总人口
    beta = 0.3           # 传染率
    gamma = 0.1          # 康复率（平均病程 1/gamma = 10 天）
    S0, I0, R0 = 9990.0, 10.0, 0.0
    R_naught = beta * S0 / (gamma * N)
    print(f"基本再生数 R0 = {R_naught:.3f}")
    hist = rk4_sir((S0, I0, R0), beta, gamma, N, h=0.1, n_steps=2000)
    # 打印几个关键时间点的结果
    print(f"{'t':>6} {'S':>10} {'I':>10} {'R':>10}")
    for t, S, I, R in hist[::200]:   # 每 200 步(20天)取一次
        print(f"{t:>6.0f} {S:>10.0f} {I:>10.0f} {R:>10.0f}")
    # 最终疫情规模
    _, S_end, I_end, R_end = hist[-1]
    print(f"\n疫情结束时：康复者 R = {R_end:.0f}，占比 {R_end/N:.1%}")

    # --- 页面「第 5 步：模型检验」里承诺的三项自检，这里真的跑一遍 ---
    # 1. 守恒：任何时候 S+I+R 都应等于 N
    worst = max(abs(S + I + R - N) for _, S, I, R in hist)
    print(f"\n[检验] 人口守恒最大偏差 = {worst:.3e}")
    assert worst < 1e-6, "S+I+R 不守恒，数值积分出问题了"

    # 2. 非负
    assert all(S >= -1e-9 and I >= -1e-9 and R >= -1e-9 for _, S, I, R in hist), "出现负人数"
    print("[检验] 三人群体始终非负 ✓")

    # 3. 退化特例：beta=0 时无传染，I(t) = I0 * e^(-gamma t)
    hist2 = rk4_sir((9990.0, 10.0, 0.0), 0.0, 0.1, N, h=0.1, n_steps=2000)
    I_end2 = hist2[-1][2]
    exact = 10.0 * math.exp(-0.1 * 200.0)
    print(f"[检验] beta=0 时 I(200天) 数值 {I_end2:.6e} vs 解析 {exact:.6e}")
    assert abs(I_end2 - exact) < 1e-6, "与解析解不符"
    print("[检验] 退化特例与解析解一致 ✓")

# ── 白驹 · 数据实验室 · 结论（结构化，供站内清单与每日巡检抽取）──────────
# 结论：RK4 解 SIR 得 S/I/R 三条曲线；基本再生数 R0=β/γ 决定是否出现疫情峰，R0≤1 时感染人数单调下降。
# 依据：本脚本 main() 的实测输出；改参数后运行 `python lab/modeling/sir_model.py` 可复现，不引用第三方数据。
# 出处：本站自有脚本 · 白驹全局大脑 · ccowork（非第三方转载）
# 许可：本站原创 · 可用于学习与教学，保留署名即可
# 采集/核验：随每日清单重生成（见 data/design/code-manifest.json）· 状态：有效 · 失效标记：无
# ────────────────────────────────────────────────────────────────────────
