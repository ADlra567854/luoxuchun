/* AI 学院 · AI 经典论文必读清单（数据文件）
 * 所有条目均经 WebSearch 逐条核实，url 为 arxiv.org/abs/xxx 或官方出版社链接。
 * 更新日期：2026-08-28
 */
window.AI_PAPERS = {
  updated: "2026-08-28",
  papers: [
    {
      title: "Attention Is All You Need",
      authors: "Vaswani 等",
      year: "2017",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/1706.03762",
      why: "提出自注意力机制的 Transformer 架构，完全摒弃循环与卷积，奠定现代大语言模型的基础，是当今几乎所有大模型的始祖。"
    },
    {
      title: "Deep Residual Learning for Image Recognition",
      authors: "He（何恺明）等",
      year: "2015",
      venue: "CVPR",
      url: "https://arxiv.org/abs/1512.03385",
      why: "提出残差连接与跳层捷径，解决深层网络退化与梯度消失问题，使训练百层以上网络成为可能，是计算机视觉最常用的骨干架构。"
    },
    {
      title: "ImageNet Classification with Deep Convolutional Neural Networks",
      authors: "Krizhevsky, Sutskever, Hinton",
      year: "2012",
      venue: "NeurIPS",
      url: "https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks",
      why: "首个在大规模图像识别上碾压传统方法的深度卷积网络，引入 ReLU、Dropout 与 GPU 训练，点燃 2012 年深度学习革命。"
    },
    {
      title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      authors: "Devlin 等",
      year: "2018",
      venue: "NAACL",
      url: "https://arxiv.org/abs/1810.04805",
      why: "提出掩码语言模型的深度双向预训练，确立『预训练+微调』范式，刷新 11 项 NLP 任务纪录，深刻影响后续所有语言模型。"
    },
    {
      title: "Improving Language Understanding by Generative Pre-Training",
      authors: "Radford 等",
      year: "2018",
      venue: "OpenAI（GPT-1）",
      url: "https://openai.com/research/language-unsupervised",
      why: "首次证明用 Transformer 在无标注文本上生成式预训练、再微调即可通吃多任务，开创生成式预训练路线，是 GPT 系列的起点。"
    },
    {
      title: "Language Models are Few-Shot Learners",
      authors: "Brown 等",
      year: "2020",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/2005.14165",
      why: "1750 亿参数规模实验揭示涌现式少样本学习，仅靠提示即可完成多种任务，开启大模型与 in-context learning 时代。"
    },
    {
      title: "LoRA: Low-Rank Adaptation of Large Language Models",
      authors: "Hu 等",
      year: "2021",
      venue: "ICLR",
      url: "https://arxiv.org/abs/2106.09685",
      why: "冻结预训练权重、注入低秩矩阵实现参数高效微调，训练参数量降低约万倍，成为大模型微调与部署的行业标配。"
    },
    {
      title: "Training language models to follow instructions with human feedback",
      authors: "Ouyang 等",
      year: "2022",
      venue: "NeurIPS（InstructGPT/RLHF）",
      url: "https://arxiv.org/abs/2203.02155",
      why: "用人类反馈强化学习（RLHF）让模型对齐人类意图，训练出更听话、更真实的对话模型，是 ChatGPT 的技术源头。"
    },
    {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      authors: "Lewis 等",
      year: "2020",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/2005.11401",
      why: "将检索与生成结合，让模型在生成时引用外部知识库，缓解幻觉并支持知识更新，是知识密集型应用的经典范式。"
    },
    {
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      authors: "Yao 等",
      year: "2022",
      venue: "ICLR",
      url: "https://arxiv.org/abs/2210.03629",
      why: "让大模型在推理与调用外部工具之间交替，形成『思考-行动-观察』循环，是当前 Agent 智能体架构的理论基石。"
    },
    {
      title: "High-Resolution Image Synthesis with Latent Diffusion Models",
      authors: "Rombach 等",
      year: "2022",
      venue: "CVPR",
      url: "https://arxiv.org/abs/2112.10752",
      why: "把扩散模型搬到潜空间并用交叉注意力做文本条件，大幅降低算力需求，成就开源文生图模型 Stable Diffusion。"
    },
    {
      title: "Denoising Diffusion Probabilistic Models",
      authors: "Ho 等",
      year: "2020",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/2006.11239",
      why: "系统化去噪扩散概率模型，用加噪-去噪的马尔可夫链生成高质量图像，是所有主流图像、视频扩散模型的基石。"
    },
    {
      title: "You Only Look Once: Unified, Real-Time Object Detection",
      authors: "Redmon 等",
      year: "2016",
      venue: "CVPR",
      url: "https://arxiv.org/abs/1506.02640",
      why: "把目标检测重构为单网络回归问题，整图一次前向即输出框与类别，实现 45fps 实时检测，开启 YOLO 系列。"
    },
    {
      title: "Mastering the game of Go with deep neural networks and tree search",
      authors: "Silver 等",
      year: "2016",
      venue: "Nature",
      url: "https://www.nature.com/articles/nature16961",
      why: "将深度神经网络与蒙特卡洛树搜索结合，首次击败人类职业棋手，向世界展示深度学习与强化学习的威力。"
    },
    {
      title: "Highly accurate protein structure prediction with AlphaFold",
      authors: "Jumper 等",
      year: "2021",
      venue: "Nature",
      url: "https://www.nature.com/articles/s41586-021-03819-2",
      why: "以深度学习端到端预测蛋白质三维结构，精度接近实验水平，攻克困扰生物学 50 年的蛋白质折叠问题。"
    },
    {
      title: "Efficient Estimation of Word Representations in Vector Space",
      authors: "Mikolov 等",
      year: "2013",
      venue: "ICLR Workshop",
      url: "https://arxiv.org/abs/1301.3781",
      why: "提出 CBOW 与 Skip-gram 高效词向量训练法，让词成为可运算的向量（王-男+女≈女王），奠定词嵌入研究。"
    },
    {
      title: "Learning Transferable Visual Models From Natural Language Supervision",
      authors: "Radford 等",
      year: "2021",
      venue: "ICML",
      url: "https://arxiv.org/abs/2103.00020",
      why: "用 4 亿图文对做对比预训练，让视觉模型可用自然语言描述做零样本分类，成为多模态与文生图的基础。"
    },
    {
      title: "Generative Adversarial Networks",
      authors: "Goodfellow 等",
      year: "2014",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/1406.2661",
      why: "提出生成器与判别器对抗博弈的训练框架，无需显式密度即可生成逼真数据，开启生成式模型研究浪潮。"
    }
  ]
};
