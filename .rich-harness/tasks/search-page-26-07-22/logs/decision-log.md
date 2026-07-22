# 上下文：search-page-26-07-22

## 研发环境

- yuyanId: null
- 应用：docs
- 仓库：https://github.com/ishenli/reflexio.git
- 工作目录：/Users/michael.sl/GitHub/reflexio
- 仓库根目录：/Users/michael.sl/GitHub/reflexio
- 个人分支：haomo-modify
- 雨燕迭代：null（null）
- 迭代分支：null
- Dima 链接：null

## Phase 2 决策

- Workflow: auto（用户选择）
- Steps: gen-tech-design → code-impl → code-reviewer
- `local-acceptance` 被跳过：框架 unknown 不匹配 bigfish/smallfish-component provider
- 跳过项：无

## gen-tech-design 方案摘要

- Goal: 3 个（G-1 侧边栏首位 Search 链接, G-2 搜索页面调用 /api/search, G-3 状态处理）
- AC: 6 个（覆盖侧边栏、搜索交互、loading/error/empty）
- 新增文件：`app/search/page.tsx`, `app/search/use-search-data.ts`, `lib/search-api.ts`
- 修改文件：`sidebar.tsx`, `types.ts`, `locales.ts`, `en.ts`, `zh.ts`
- 排除项：高级参数（top_k/threshold/entity_types/search_mode）不暴露 UI、reformulation 等 LLM 功能跳过