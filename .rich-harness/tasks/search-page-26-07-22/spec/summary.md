# 统一搜索页面 — 开发总结

## 1. 需求概述

在 Reflexio docs 前端新增统一搜索页面，调用已有 `POST /api/search` 端点，放在侧边导航栏的首个位置。后端 API 已完整实现，支持跨 Profiles、Agent Playbooks、User Playbooks 三种实体类型的混合语义搜索。

## 2. 变更文件列表及说明

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `docs/app/search/page.tsx` | 新增 | 搜索页面主体，包含搜索表单、三组结果分组卡片、loading/error/empty 状态处理 |
| `docs/app/search/use-search-data.ts` | 新增 | 搜索状态管理 Hook |
| `docs/lib/search-api.ts` | 新增 | POST /api/search API 客户端 |
| `docs/lib/types.ts` | 修改 | 新增 UnifiedSearchViewResponse 接口 |
| `docs/components/layout/sidebar.tsx` | 修改 | 导航首位添加 Search 链接 |
| `docs/lib/i18n/locales.ts` | 修改 | 新增 nav.search 和 searchPage 类型 |
| `docs/lib/i18n/en.ts` | 修改 | 英文翻译 |
| `docs/lib/i18n/zh.ts` | 修改 | 中文翻译 |

## 3. 跳过项及原因

- local-acceptance：框架 unknown 不匹配 provider
- 高级搜索参数 UI：首次迭代保持简洁
- LLM reformulation UI 控制：暂不暴露

## 4. 用户介入决策点

- Workflow：auto（用户选择）
- 技术设计：用户确认后进入实现

## 5. 部署结果

无远程部署。本地构建验证通过。

## 6. 验收证据

code-reviewer Gate：通过，全部 6 个 AC 覆盖。npm run build exit 0，零 type errors。
