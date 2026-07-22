# 搜索页面 执行清单

- 技术设计: `spec/tech-design.md`
- 框架类型: unknown (Next.js 16)
- 工作目录: `/Users/michael.sl/GitHub/reflexio`

| Task | Goal / AC | 文件 | 依赖 / Stage | 实现动作 | 验证去向 |
| --- | --- | --- | --- | --- | --- |
| T1 | G-1,G-2,G-3 / AC-1..AC-6 | `docs/lib/types.ts`, `docs/lib/i18n/locales.ts`, `docs/lib/i18n/en.ts`, `docs/lib/i18n/zh.ts` | 无 / 1 | 新增 `UnifiedSearchViewResponse` 类型；`nav.search` i18n 键和 `searchPage` 块 | typecheck |
| T2 | G-2,G-3 / AC-2..AC-6 | `docs/lib/search-api.ts` | T1 / 2 | `fetchUnifiedSearch()` — POST /api/search 封装 | typecheck |
| T3 | G-2,G-3 / AC-2..AC-6 | `docs/app/search/use-search-data.ts` | T2 / 2 | `useSearchData()` — 搜索状态管理 Hook | typecheck |
| T4 | G-1 / AC-1 | `docs/components/layout/sidebar.tsx` | T1 / 3 | 在导航列表最前面添加 Search 链接 | 构建验证 |
| T5 | G-2,G-3 / AC-2..AC-6 | `docs/app/search/page.tsx` | T2,T3 / 4 | 搜索页面主体：搜索框 + 结果分组展示 + loading/error/empty | 构建验证 |

## 执行约束

- 默认使用 `search_mode: "hybrid"`, `top_k: 5`, `threshold: 0.3`
- 不暴露高级参数（top_k/threshold/entity_types/search_mode/reformulation）的 UI 控制
- i18n 三文件（locales.ts/en.ts/zh.ts）必须同步更新