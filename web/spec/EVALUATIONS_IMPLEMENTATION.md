# Evaluations 功能实现梳理

本文梳理 Reflexio 当前 evaluations 功能的实现逻辑、页面功能设计，以及近期修复的问题。

## 功能定位

Evaluations 是 Reflexio 的评估与观测入口，用来回答几个核心问题：

- Agent 在一个 session 中是否成功完成用户目标。
- 如果失败，失败类型是什么，以及原因是什么。
- 本次交互中检索出来的 learning 是否相关，是否对回答产生正向、负向或中性影响。
- Reflexio 输出和 shadow 输出相比表现如何。
- 评估结果是否需要批量重跑，或对单个 session 立即评分。

页面入口位于：

- `docs/app/evaluations/page.tsx`
- `docs/app/evaluations/use-evaluations-data.ts`
- `docs/lib/evaluations-api.ts`
- `docs/lib/types.ts`

后端核心入口位于：

- `reflexio/server/routes/evaluation.py`
- `reflexio/server/services/agent_success_evaluation/runner.py`
- `reflexio/server/services/agent_success_evaluation/service.py`
- `reflexio/server/services/agent_success_evaluation/components/evaluator.py`
- `reflexio/server/services/agent_success_evaluation/components/retrieved_learning_evaluator.py`
- `reflexio/server/services/evaluation_overview/service.py`

## 后端实现逻辑

### 1. Session 级评估入口

核心 runner 是 `run_group_evaluation(...)`。

它以 `org_id + user_id + session_id + agent_version` 为单位执行评估，主要流程是：

1. 从 storage 拉取当前 session 的所有 requests。
2. 检查 session 是否已经完成。非强制重跑时，最新 request 必须超过配置的延迟窗口。
3. 检查 agent-success 是否已经评估过。若已评估，则跳过 agent-success，但仍可继续运行 retrieved-learning 评估。
4. 拉取 request 对应的 interactions。
5. 按 request 创建时间、interaction 创建时间排序，组装成 `RequestInteractionDataModel`。
6. 调用 `AgentSuccessEvaluationService.run(...)` 进行会话成功评估。
7. 评估结果保存成功后，写入 operation state：`evaluated=true`，防止重复评估。
8. 最后运行 retrieved-learning 评估。该阶段是 best-effort，失败不会回滚 agent-success 结果。

### 2. Agent Success Evaluation

Agent-success 评估判断的是：一个完整 session 中，agent 是否成功回应了用户。

实现思路：

- 从 `config.agent_success_config` 加载评估配置。
- 构造 `AgentSuccessEvaluator`。
- 将 session 内的 request/interactions、agent context、success definition prompt 交给 LLM judge。
- LLM 返回结构化输出 `AgentSuccessEvaluationOutput`。

主要输出字段：

- `is_success`: 是否成功。
- `failure_type`: 失败类型，可为 `missing_tool`、`wrong_tool`、`insufficient_info_from_tool`、`wrong_answer`。
- `failure_reason`: 失败原因和改进建议。
- `is_escalated`: 是否发生转人工或转其他 agent。

保存逻辑：

- `AgentSuccessEvaluationService._process_results(...)` 将结果写入 storage。
- 写入失败会按 backoff 重试。
- 最终保存失败会记录到 evaluation health，供健康检查观察。

### 3. Retrieved Learning Evaluation

Retrieved-learning 评估判断的是：某次交互中检索出来的 profile / user_playbook / agent_playbook 是否真的对回答有帮助。

实现思路：

1. storage 加载 bounded snapshot，包含 session transcript 和 interactions 上 attached 的 learning refs。
2. 根据 snapshot 计算 `session_fingerprint`。
3. 如果相同 fingerprint 已经存在 terminal state，则跳过重复评估。
4. 开始一个 retrieved-learning evaluation generation。
5. 重新加载 snapshot，确保评估的是 generation 分配后的数据。
6. 收集 canonical refs，并过滤非法 kind。
7. 解析原始 learning 内容。
8. 分 chunk 调用两个 judge：
   - relevance judge：learning 是否适用于当前 session。
   - impact judge：learning 对 agent 回答的影响是 `positive`、`negative` 还是 `neutral`。
9. 按 canonical candidates 生成 `RetrievedLearningEvaluationResult` rows。
10. 使用 generation + fingerprint 做原子替换，避免把过期 snapshot 写入结果表。

关键并发保护：

- generation 用于标识当前评估批次。
- fingerprint 用于确认写入时 session snapshot 未变化。
- replace 逻辑只在 fingerprint 仍匹配时提交结果。
- stale 时最多立即重试一次，否则留给下一次触发。

### 4. Evaluation Overview

Overview 是页面顶部趋势和聚合信息的来源。

接口：

- `POST /api/get_evaluation_overview`

它聚合指定时间窗口内的评估结果，返回：

- hero success trend
- context tiles
- rule attribution
- score distribution
- braintrust tiles
- shadow win-rate trend
- source-set comparison

页面中的趋势图主要使用 `overview.hero.buckets`。

### 5. Regenerate

Regenerate 用于批量重跑评估，适合以下场景：

- judge prompt 更新后，需要重新评分历史 session。
- 某些保存或 LLM 调用失败后，需要恢复结果。
- 需要针对某个时间窗口重建 overview 和评估明细。

接口：

- `POST /api/evaluations/regenerate`
- `GET /api/evaluations/regenerate/{job_id}`
- `DELETE /api/evaluations/regenerate/{job_id}`

页面逻辑：

1. 用户输入回看窗口，例如最近 48 小时。
2. 前端按当前时间计算 `from_ts` 和 `to_ts`。
3. 调用 start regenerate 接口。
4. 每 2 秒轮询 job status。
5. job 结束后刷新 evaluations 数据。

### 6. Grade on Demand

Grade on Demand 用于同步评估单个 session。

接口：

- `POST /api/evaluations/grade_on_demand`

输入：

- `session_id`
- `agent_version`

输出：

- `session_id`
- `result_id`
- `cached`
- `skipped_reason`
- `retrieved_learning_status`

该功能适合调试某个 session 或临时补评估。

## 前端页面实现逻辑

### 数据加载

`useEvaluationsData(apiEndpoint)` 负责集中加载页面数据。

它并行拉取：

- `fetchEvaluationOverview(...)`
- `fetchAgentSuccessEvalResults(...)`
- `fetchRetrievedLearningEvalResults(...)`
- `fetchRecentShadowComparisons(...)`

返回给页面的数据结构包括：

- `overview`
- `agentSuccessResults`
- `retrievedLearningResults`
- `shadowComparisons`
- `loading`
- `error`
- `regenerateJob`
- `startRegenerateJob`
- `cancelRegenerateJob`
- `gradeSession`
- `refresh`

### 页面模块

`docs/app/evaluations/page.tsx` 主要由以下模块组成：

- 顶部统计卡片：evaluated sessions、success rate、escalations、avg corrections。
- Overview 趋势图：展示 success rate bucket trend。
- Shadow Comparisons：展示 recent Reflexio vs shadow judge verdicts。
- Regenerate：启动和取消批量重跑。
- Grade on Demand：对单个 session 同步评分。
- Agent Success Results Table：展示 session 级评估明细。
- Retrieved Learning Results Table：展示 per-learning relevance/impact verdict。

### 数据展示关系

Agent Success 表格展示字段：

- result
- session
- agent version
- created date
- corrections
- escalated
- expanded JSON

Retrieved Learning 表格展示字段：

- learning id
- kind
- relevance verdict
- impact verdict
- interaction id
- evaluated date
- expanded JSON

## 本次修复的问题

### 1. 修复 retrieved-learning 前端字段和后端模型不匹配

问题：

前端原类型使用的是：

- `target_interaction_id`
- `target_kind`
- `target_id`
- `target_title`
- `relevance_score`
- `impact_score`
- `evaluation_status`

但后端实际返回的是：

- `agent_version`
- `interaction_id`
- `interaction_created_at`
- `kind`
- `learning_id`
- `is_relevant`
- `relevance_reason`
- `impact`
- `impact_reason`
- `created_at`

影响：

- Retrieved Learning 表格会显示 `undefined`。
- 状态 badge 无法正确渲染。
- relevance/impact 永远读不到正确值。

修复：

- 更新 `docs/lib/types.ts` 中的 `RetrievedLearningEvaluationResult`。
- 更新 `RetrievedLearningResultsTable`，按 `learning_id / kind / is_relevant / impact / interaction_id` 展示。
- 将文案从 “scores” 改为 “verdicts”，因为后端返回的是结构化判断，不是数值分数。

### 2. 修复 agent version 筛选和统计卡片不一致

问题：

页面原来只把 `selectedAgentVersion` 应用到表格，顶部统计仍基于全量 `agentSuccessResults`。

影响：

用户选择某个 agent version 后：

- 表格显示的是该 version。
- 顶部 success rate、escalations、avg corrections 仍是全部 version。

修复：

- 将 stats 的输入从 `data.agentSuccessResults` 改为 `filteredResults`。
- 顶部统计和当前表格筛选保持一致。

### 3. 修复 regenerate 完成后 overview 不刷新的问题

问题：

regenerate job 结束后，前端只调用 `loadResults()`。

影响：

- 表格明细更新。
- `Evaluation Overview` 趋势图和聚合卡片仍是旧数据。

修复：

- job terminal 状态后改为调用 `loadAll()`。
- 同时刷新 overview、agent-success 明细、retrieved-learning 明细和 shadow comparisons。

### 4. 修复 Grade on Demand 后页面不刷新

问题：

Grade on Demand 成功后，只显示接口返回 JSON，不刷新页面数据。

影响：

用户刚评分的 session 可能已经写入后端，但页面表格不会更新。

修复：

- `handleGradeSession` 在评分成功后调用 `refresh()`。
- 页面数据和单次评分结果保持一致。

### 5. 稳定默认 overview 时间窗口

问题：

`now` 和 `defaultFrom` 原先在 hook render 时直接计算，并进入 callback dependencies。

影响：

状态更新跨秒时，可能导致 `loadOverview`、`loadAll` identity 变化，引发额外请求。

修复：

- 使用 `useMemo` 固定默认 30 天窗口。
- 默认窗口在 hook 生命周期内保持稳定。

### 6. 同步 legacy dashboard hook

`docs/app/dashboard/evaluations/page.tsx` 当前只是 redirect 到 `/evaluations`。

但 `docs/app/dashboard/evaluations/use-evaluations-data.ts` 仍存在。为避免后续误用，已同步 hook 中 regenerate refresh 和默认窗口的修复。

## 验证情况

已执行定向 lint：

```bash
cd docs
npx eslint app/evaluations/page.tsx app/evaluations/use-evaluations-data.ts app/dashboard/evaluations/use-evaluations-data.ts lib/types.ts lib/evaluations-api.ts
```

结果：通过。

已执行全量 lint：

```bash
cd docs
npm run lint
```

结果：失败，但失败点位于既有无关文件，例如 dashboard/profiles、requests、settings、i18n context 等，不是本次 evaluations 改动引入。

已执行 build：

```bash
cd docs
npm run build
```

结果：

- Next production compile 成功。
- TypeScript 阶段失败在既有问题：`docs/app/user-playbooks/page.tsx` 使用了不存在的 `t.common.pendingItems`。
- 该失败和 evaluations 改动无关。

## 后续建议

短期建议：

- 为 `fetchRetrievedLearningEvalResults` 增加前端单元测试或 schema fixture，避免字段 drift 再次发生。
- 给 `/api/get_retrieved_learning_evaluation_results` 增加端到端展示测试。
- 修复 docs 全量 lint/build 中的既有无关问题，让后续前端改动更容易验证。

中期建议：

- 从后端 OpenAPI 或 Pydantic schema 自动生成 TypeScript 类型，减少手写类型和后端模型不一致的风险。
- Overview 支持页面筛选条件下的重新查询，而不仅是明细表筛选。
- Retrieved-learning 表格可以进一步展示 `relevance_reason` 和 `impact_reason` 的摘要，而不只依赖 expanded JSON。
