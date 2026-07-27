# Session 与 Request 的模型关系

本文梳理 Reflexio 中 Session 和 Request 两个核心概念的设计、实现及前端对应关系。

## 概念定位

Session（会话）和 Request（请求）是 Reflexio 数据模型的两个基本抽象：

- **Request** 是代理响应的原子工作单元。用户每次输入（单轮或多轮中的一轮）对应一个 Request。
- **Session** 是隐式概念，没有独立的数据表或模型。它完全通过 Request 上的 `session_id` 字段将多个 Request 分组派生而来。

三者的层级关系为：`Session（隐式）→ Request（多个）→ Interaction（多个）`。

相关前端页面位于：

- `web/app/sessions/page.tsx`
- `web/app/sessions/use-sessions-data.ts`
- `web/lib/sessions-api.ts`
- `web/lib/methods/requests-sessions.ts`
- `web/lib/types.ts`

相关后端核心路径：

- `reflexio/models/api_schema/domain/entities.py`（Request、Interaction 模型）
- `reflexio/models/api_schema/retriever_schema.py`（Session、SessionView API 模型）
- `reflexio/models/api_schema/internal_schema.py`（RequestInteractionDataModel）
- `reflexio/server/services/storage/storage_base/_requests.py`（基类逻辑）
- `reflexio/server/services/storage/sqlite_storage/_requests.py`（SQLite 实现）
- `reflexio/server/services/storage/sqlite_storage/_base.py`（DDL 建表语句）
- `reflexio/server/routes/interactions.py`（API 路由）
- `reflexio/lib/_search.py`（搜索层）

## 实现详情

### 1. 数据模型定义

#### Request（entities.py#L222）

```python
class Request(BaseModel):
    request_id: str
    user_id: str
    created_at: int        # Unix 纪元秒
    source: str            # 来源标签（集成名称等）
    agent_version: str     # 处理该请求的代理版本
    session_id: NonEmptyStr  # 所属会话 ID（强制非空）
    evaluation_only: bool  # 是否仅用于评估
```

Request 是持久化的核心实体。`session_id` 字段标记该请求属于哪个会话。同一个 `session_id` 的多个 Request 构成一个多轮会话。

#### Interaction（entities.py#L195）

```python
class Interaction(BaseModel):
    interaction_id: int
    user_id: str
    request_id: str         # 外键，关联到 Request
    created_at: int
    role: str               # "User" 或 "Assistant"
    content: str
    tools_used: list[ToolUsed]
    citations: list[Citation]
    retrieved_learnings: list[RetrievedLearning]
    embedding: EmbeddingVector
```

Interaction 是 Request 的子实体，通过 `request_id` 关联到父 Request。一个 Request 可以有多个 Interaction。

### 2. 数据库存储（SQLite）

**无 `sessions` 表。** 会话完全通过 `requests.session_id` 列聚合得到。

```sql
-- requests 表
CREATE TABLE IF NOT EXISTS requests (
    request_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    agent_version TEXT NOT NULL DEFAULT '',
    session_id TEXT NOT NULL CHECK (trim(session_id) != ''),
    evaluation_only INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_requests_session_id ON requests(session_id);
CREATE INDEX IF NOT EXISTS idx_requests_session_created_at_asc
    ON requests(session_id, created_at ASC, request_id ASC);
```

```sql
-- interactions 表（通过 request_id 引用 requests）
CREATE TABLE IF NOT EXISTS interactions (
    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    request_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User',
    ...
);
```

### 3. 会话分组逻辑

核心方法 `get_sessions()` 定义于 `storage_base/_requests.py#L74`，由 `sqlite_storage/_requests.py#L167` 实现。

分组流程：

```
┌─────────────────────────────────────────────────────────┐
│                    get_sessions()                        │
│                                                          │
│  1. SELECT session_id, MAX(created_at) AS latest         │
│     FROM requests                                        │
│     WHERE user_id = ? [AND 其他过滤条件]                   │
│     GROUP BY session_id                                  │
│     ORDER BY latest DESC, session_id DESC                │
│     LIMIT ? OFFSET ?                                     │
│          │                                               │
│          ▼                                               │
│  2. 对于返回的 session_id 列表，查询对应的所有 Request      │
│                                                          │
│  3. 对于每个 Request，查询其所有 Interaction               │
│                                                          │
│  4. 返回 dict[session_id, list[RequestInteractionData]]   │
│                                                          │
│  返回结果按每个会话一个分页条目组织（top_k 是会话数）         │
└─────────────────────────────────────────────────────────┘
```

### 4. API 响应结构

`POST /api/get_requests` 端点（`interactions.py#L240`）返回：

```
GetRequestsViewResponse
  ├── sessions: list[SessionView]
  │     ├── session_id: str
  │     └── requests: list[RequestDataView]
  │           ├── request: Request
  │           └── interactions: list[InteractionView]
  ├── has_more: bool
  └── msg: str | None
```

分页以会话为单位（`top_k` 限制返回的会话数量），而非以 Request 为单位。

### 5. 前端消费

**`web/app/sessions/page.tsx`** — SessionsPage 组件：

- 通过 `useSessionsData(apiEndpoint)` 获取 `SessionView[]` 数据
- 统计看板：总会话数、总请求数、总交互数、唯一用户数
- 搜索过滤：按 session_id、user_id、source、agent_version、交互内容模糊匹配
- 支持展开/折叠每个会话内的请求和交互详情
- 支持删除会话（调用 `deleteSession()` API）

**`web/lib/types.ts`** — 前端类型定义：

- `SessionView` 接口：`session_id: string` + `requests: RequestDataView[]`
- `RequestDataView` 接口：`request: Request` + `interactions: InteractionView[]`

**`web/lib/sessions-api.ts`** — API 调用封装：

- `fetchSessions()` → `POST /api/get_requests`（以筛选条件获取会话列表）
- `deleteSession(sessionId)` → `POST /api/delete_session`

**`web/lib/methods/requests-sessions.ts`** — API 沙盒配置：

- 定义 `get_requests`、`delete_request`、`delete_session` 等方法的方法定义（MCP 沙盒用）

### 6. 生命周期示例

```
用户打开代理 → 发起第一轮对话
  │
  ├→ 创建 Request A（session_id="abc"）
  │   ├→ Interaction A1（User: "帮我查一下订单"）
  │   └→ Interaction A2（Assistant: "好的，查到订单 #123"）
  │
用户继续同一次对话 → 发起第二轮
  │
  ├→ 创建 Request B（session_id="abc"）
  │   ├→ Interaction B1（User: "这个订单是什么状态"）
  │   └→ Interaction B2（Assistant: "订单已发货"）
  │
此时，"session abc" 包含 2 个 Request 和 4 个 Interaction。
```

### 7. 会话相关操作

| 操作 | 方法 | 说明 |
|------|------|------|
| 列出会话 | `get_sessions()` | 按 session_id 分组，支持分页和筛选 |
| 按会话查请求 | `get_requests_by_session()` | 返回单个会话中的所有 Request |
| 删除会话 | `delete_session()` | 级联删除关联的 requests 和 interactions |
| 获取会话时间窗口 | `get_session_ids_in_window()` | 用于评估覆盖窗口的计算 |

删除操作的 SQL 顺序（SQLite 实现）：

```sql
-- 先删 interactions（通过 request_id 匹配）
DELETE FROM interactions WHERE request_id IN (
    SELECT request_id FROM requests WHERE session_id = ?
);

-- 再删 requests
DELETE FROM requests WHERE session_id = ?;

-- 最后更新 FTS/向量索引（自提交操作）
```

## 设计要点

1. **Session 是隐式的**：没有独立的 session 元数据（如会话标题、创建时间等）。会话识别完全依赖 `session_id` 字符串的相等比较。

2. **请求级的 evaluation_only 标记**：部分 Request 标记为 `evaluation_only = true`，用于会话级评估但不参与画像/剧本学习。

3. **分页以会话为单位**：`get_sessions()` 的 `top_k` 限制返回的会话数，而非请求数。每个会话内的所有请求一起返回。

4. **无外键约束**：`requests` 表和 `interactions` 表之间没有显式的外键约束，依赖应用层逻辑维护引用完整性。

## 待优化建议

- 如需要独立的会话元数据（标题、创建时间、标签等），可考虑引入 `sessions` 表
- 大会话（数十轮）的查询性能可以优化，当前实现加载会话内所有请求/交互
- 前端搜索目前是客户端过滤，大数据量时需考虑服务端搜索