# User Playbooks 产生机制详解

## 概述

**User Playbooks（用户知识库/用户剧本）** 是 Reflexio 系统中用于存储用户级行为规则的核心实体。它们从用户与 Agent 的交互中自动提取，帮助 Agent 在未来做出更好的决策。

**核心概念**: User Playbooks 的产生采用 **Config-driven Batch Processing（配置驱动批处理）** 模式，而非实时逐条生成。

---

## 产生流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         User Playbook 产生流程                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 交互发布 (Publish Interaction)                                           │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  POST /api/publish_interaction                                    │   │
│     │  • 用户交互数据入库 (interactions 表)                              │   │
│     │  • 触发延迟学习/提取计划 (deferred learning plan)                   │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  2. Playbook Extractor (剧本提取器) - Configurable 定时触发                  │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • 由 user_playbook_extractor_config 配置控制                       │   │
│     │  • 通过 stride_size/window_size 策略定期运行                        │   │
│     │  • 分析 interaction 窗口中的用户-Agent 对话                        │   │
│     │  • LLM 提取结构化剧本 (trigger/content/rationale)                  │   │
│     │  • 保存为 "提取型" user_playbook (pending 状态)                      │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  3. Playbook Optimizer/Aggregator (聚合器) - Background                     │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • 自动触发 (post-commit scheduler)                                │   │
│     │  • 将多个相关 playbook 合并/优化                                  │   │
│     │  • 生成更精炼的 user_playbook                                     │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  4. 生命周期管理 (手动触发或自动升级)                                         │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  POST /api/upgrade_user_playbooks                                   │   │
│     │  • pending → current (升级)                                      │   │
│     │  • current → archived (降级)                                     │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心组件详解

### 1. Playbook Extractor (`reflexio/server/services/playbook/components/extractor.py`)

| 属性 | 说明 |
|------|------|
| **触发方式** | **NOT 每次 learn 后自动产生**，而是按 `stride_size` 批量处理 |
| **运行机制** | 通过 `user_playbook_extractor_config` 配置的 `stride_size` 和 `window_size` 控制 |
| **输入** | 窗口内的 interactions（用户-Agent 对话记录） |
| **输出** | 结构化 playbook 条目，包含三个核心字段：<br>• `trigger`: 触发条件<br>• `content`: 规则内容<br>• `rationale`: 原理说明 |
| **初始状态** | `pending`（待审批） |

### 2. Aggregation Trigger (`reflexio/server/services/playbook/aggregation_trigger.py`)

- **运行方式**: 异步后台线程 (`threading.Thread`)
- **触发时机**: Playbook Extractor 完成写入后自动触发
- **功能**: 将多个相似的 raw playbook 合并/优化为精炼版本
- **特点**: 不阻塞主流程，通过 `operation_limiter` 控制并发

### 3. Playbook Generation Service (`reflexio/server/services/playbook/service.py`)

继承 `BaseGenerationService`，采用与 Profile Generation 相同的批处理机制：

| 特性 | Profile Generation | User Playbook Generation |
|------|---------------------|---------------------------|
| **粒度** | 用户级 (user_id) | 用户级 (user_id) |
| **数据源** | Interactions | Interactions |
| **触发策略** | Config stride | Config stride |
| **提取器** | Profile Extractor | Playbook Extractor |

---

## 配置详解

### user_playbook_extractor_config 配置项

位于 `reflexio/models/config_schema.py`:

```yaml
user_playbook_extractor_config:
  enabled: true                    # 是否启用提取
  stride_size: 100                 # 每累积100条交互触发一次提取
  window_size: 50                  # 每次分析最近50条交互
  source_filter: "claude"          # 只处理特定来源的交互
  manual_trigger: false            # 是否仅手动触发
  aggregation_config:              # 聚合优化配置
    enabled: true
    scheduler_jitter_seconds: 300  # 调度抖动（避免热点）
  playwright_config:                 # 回放测试配置（可选）
    enabled: false
```

### 关键配置参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `stride_size` | int | 控制提取频率。每累积 N 条 eligible interactions 触发一次提取 |
| `window_size` | int | 控制提取上下文。每次提取分析最近 N 条交互 |
| `source_filter` | str | 过滤特定来源的交互，如 "claude", "api", 或 null（全部） |
| `manual_trigger` | bool | 为 true 时，只通过手动 API 触发，不自动运行 |

---

## 常见问题澄清

### Q1: 是每次 /learn 自动产生吗？

**❌ 不是**。流程如下：
1. `/learn` 或 `/publish_interaction` 只是将交互数据入库
2. Playbook Extractor 按 `stride_size` 批量检查
3. 只有达到阈值时才会触发提取

### Q2: 是定时任务（Cron Job）吗？

**⚠️ 半定时**。特点：
- 没有独立的 Cron Job
- 依附于 `publish_interaction` 事件
- 但提取是按配置累积到一定数量后批量触发

### Q3: 可以手动产生吗？

**✅ 可以**。支持以下手动触发方式：

| API | 用途 |
|-----|------|
| `POST /api/manual_playbook_generation` | 手动触发特定用户/来源的剧本生成 |
| `POST /api/rerun_playbook_generation` | 针对时间窗口重新运行提取 |
| `POST /api/add_user_playbook` | 直接手动添加剧本（bypass 提取） |

### Q4: 产生后能立即使用吗？

**❌ 不能**。新产生的 playbook 初始状态为 `pending`，需要：
1. 手动调用 `POST /api/upgrade_user_playbooks` 升级
2. 或等待自动生命周期任务（如有配置）

**状态流转**:
```
pending → current → archived → (deleted)
   ↑        ↓
   └────────┘ (通过 downgrade/upgrape API)
```

---

## User Playbooks vs Agent Playbooks 对比

| 维度 | User Playbooks | Agent Playbooks |
|------|----------------|-----------------|
| **绑定对象** | 特定用户 (user_id) | Agent 版本 (agent_version) |
| **产生方式** | 自动从交互中提取 + Aggregation | 1. 手动创建<br>2. 从 User Playbooks 审批升级<br>3. Agent Playbook Extractor |
| **数据源** | User interactions | User Playbooks (审批后) / Agent 交互分析 |
| **审批流程** | Pending → Current / Archived | Pending → Approved → Rejected / Approved |
| **作用域** | 用户级（针对特定用户） | Agent 级（跨所有用户复用） |

---

## 数据流图示

```
Interactions (用户- Agent 对话)
    │
    ▼
┌─────────────────────┐
│ publish_interaction │  ← /learn, /tag, API 调用
└─────────────────────┘
    │
    ▼
Database (interactions 表)
    │
    ▼ (每 stride_size 条触发)
┌─────────────────────┐
│ Playbook Extractor  │  ← LLM 分析对话
│  • window_size      │     提取行为模式
│  • source_filter    │
└─────────────────────┘
    │
    ▼
User Playbooks (pending 状态)
    │
    ├────────────────────────┐
    │                        │
    ▼                        ▼
Aggregator (Background)   Manual API
    │                        │
    ▼                        │
Optimized Playbooks         │
    │                        │
    └──────────┬─────────────┘
               ▼
    Upgrade API / Auto-lifecycle
               │
               ▼
    User Playbooks (current) ← 可被 Agent 检索使用
               │
               ▼ (审批后)
    Agent Playbooks (approved) ← 跨用户复用
```

---

## 相关代码路径

| 组件 | 路径 |
|------|------|
| Playbook Extractor | `reflexio/server/services/playbook/components/extractor.py` |
| Aggregation Trigger | `reflexio/server/services/playbook/aggregation_trigger.py` |
| Playbook Service | `reflexio/server/services/playbook/service.py` |
| Base Generation Service | `reflexio/server/services/base_generation_service.py` |
| Routes (API) | `reflexio/server/routes/playbooks.py` |
| Config Schema | `reflexio/models/config_schema.py` |

---

## 总结

**User Playbooks 产生的核心特点**:

1. **批量驱动**: 由 `stride_size` 配置控制，非实时产生
2. **LLM 提取**: 通过 Playbook Extractor 分析交互并结构化
3. **后台优化**: Aggregation 线程自动合并精炼
4. **状态隔离**: 新产生的 playbook 需显式升级后才生效
5. **用户级绑定**: 每个 playbook 关联特定 user_id，支持跨 Agent 版本复用

**一句话概括**: User Playbooks 是"基于配置批量提取的、需显式升级生效的、用户级行为规则"。
