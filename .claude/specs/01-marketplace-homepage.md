# Feature: Marketplace 首頁（Phase 1）

## Context

首頁是 SkillHub 的核心入口。使用者來到首頁後能立即瀏覽技能、透過搜尋或篩選找到目標技能、查看精選 Collections，
以及按照 Trending / Latest / Top 排序瀏覽熱門或最新技能。

## System Boundary

**In scope：**
- 技能列表（SkillCard grid）
- 精選 Collections 橫向捲動區塊
- 關鍵字搜尋（full-text，非 embedding）
- 分類篩選（Category）
- 標籤篩選（Tool / Language）
- 排序 Tab：Trending（24h 安裝數）、Latest（createdAt）、Top（總安裝數）
- 技能資料的 REST API endpoints
- Prisma schema + seed 資料

**Out of scope（Phase 1）：**
- 個人化 Recommend tab（需帳號系統）
- Semantic / embedding search
- 一鍵安裝按鈕的實際執行（詳情頁 Phase 2）
- 收藏功能（需帳號系統 Phase 3）

## Domain Model

```ts
// Prisma schema 對應
Skill {
  id           String    // cuid
  slug         String    // unique, URL-friendly
  name         String
  description  String
  category     Category  // relation
  tags         Tag[]     // many-to-many
  author       String    // 暫時為純文字，Phase 3 改 User relation
  version      String    // semver, e.g. "1.0.0"
  installCount Int       // 累計安裝數
  installs24h  Int       // 24h 安裝數（Trending 用）
  compatibleTools String[] // ["claude", "copilot", "codex", "opencode"]
  content      String    // SKILL.md 的原始內容
  createdAt    DateTime
  updatedAt    DateTime
}

Category {
  id    String
  name  String  // e.g. "Frontend", "Testing", "DevOps"
  slug  String  // unique
}

Tag {
  id   String
  name String
  type TagType  // "tool" | "language" | "problem_space"
}

Collection {
  id          String
  name        String
  description String
  skills      Skill[]
  createdAt   DateTime
}
```

## Interfaces / API Contract

### REST Endpoints（Spring Boot Controllers）

```
GET  /api/v1/skills
  Query params:
    sort?: "trending" | "latest" | "top"  // default "trending"
    category?: string                      // category slug
    tag?: string                           // tag name
    q?: string                             // keyword search
    page?: number                          // default 0（Spring 0-based）
    pageSize?: number                      // default 24

  Response 200:
  {
    "skills": SkillSummaryDto[],
    "total": number,
    "page": number,
    "pageSize": number
  }

GET  /api/v1/skills/categories
  Response 200: { "categories": CategoryDto[] }

GET  /api/v1/skills/tags
  Response 200: { "tags": TagDto[] }

GET  /api/v1/collections
  Response 200: { "collections": CollectionDto[] }
```

### Java DTOs（backend/dto/）

```java
// SkillSummaryDto.java
record SkillSummaryDto(
  String id,
  String slug,
  String name,
  String description,
  CategoryDto category,
  List<TagDto> tags,
  String author,
  String version,
  int installCount,
  List<String> compatibleTools,
  String createdAt  // ISO 8601
) {}

// CollectionDto.java
record CollectionDto(
  String id,
  String name,
  String description,
  List<SkillSummaryDto> skills
) {}

// PagedSkillsResponse.java
record PagedSkillsResponse(
  List<SkillSummaryDto> skills,
  long total,
  int page,
  int pageSize
) {}
```

### Angular Components（公開 Inputs / Outputs）

```ts
// shared/components/skill-card/skill-card.component.ts
@Input() skill: SkillSummary

// shared/components/skill-grid/skill-grid.component.ts
@Input() skills: SkillSummary[]
@Input() loading = false

// shared/components/collection-carousel/collection-carousel.component.ts
@Input() collections: CollectionWithSkills[]

// shared/components/search-bar/search-bar.component.ts
@Output() search = new EventEmitter<string>()

// shared/components/filter-panel/filter-panel.component.ts
@Input()  categories: Category[]
@Input()  tags: Tag[]
@Output() categoryChange = new EventEmitter<string | null>()
@Output() tagChange      = new EventEmitter<string[]>()

// shared/components/sort-tabs/sort-tabs.component.ts
@Input()  value: 'trending' | 'latest' | 'top' = 'trending'
@Output() valueChange = new EventEmitter<'trending' | 'latest' | 'top'>()
```

### Angular TypeScript Models（frontend/src/app/shared/models/）

```ts
interface SkillSummary {
  id: string
  slug: string
  name: string
  description: string
  category: { id: string; name: string; slug: string }
  tags: { id: string; name: string; type: string }[]
  author: string
  version: string
  installCount: number
  compatibleTools: string[]
  createdAt: string
}

interface CollectionWithSkills {
  id: string
  name: string
  description: string
  skills: SkillSummary[]
}
```

### Angular Service

```ts
// core/services/skill.service.ts
getSkills(params: SkillQueryParams): Observable<PagedSkillsResponse>
getCategories(): Observable<{ categories: Category[] }>
getTags(): Observable<{ tags: Tag[] }>
getCollections(): Observable<{ collections: CollectionWithSkills[] }>
```

## Acceptance Criteria

### Scenario: 首頁顯示技能列表
**Given** 資料庫中有 30 個技能
**When** 使用者進入首頁 `/`
**Then** 畫面上顯示最多 24 個 SkillCard
**And** 每張 SkillCard 顯示技能名稱、描述摘要（前 120 字元）、作者、安裝次數、相容工具 icon

### Scenario: 分頁
**Given** 資料庫中有 30 個技能
**When** 使用者進入首頁並點擊「下一頁」
**Then** 顯示剩餘 6 個技能

### Scenario: 按 Trending 排序
**Given** 技能 A 在 24h 有 100 次安裝，技能 B 有 10 次
**When** 使用者選擇 Trending tab
**Then** 技能 A 排在技能 B 前面

### Scenario: 按 Latest 排序
**Given** 技能 A 建立於今天，技能 B 建立於昨天
**When** 使用者選擇 Latest tab
**Then** 技能 A 排在技能 B 前面

### Scenario: 按 Top 排序
**Given** 技能 A 總安裝數 5000，技能 B 總安裝數 500
**When** 使用者選擇 Top tab
**Then** 技能 A 排在技能 B 前面

### Scenario: 關鍵字搜尋
**Given** 資料庫中有技能名稱包含「TDD」的技能
**When** 使用者在搜尋框輸入「TDD」並提交
**Then** 只顯示名稱或描述中包含「TDD」的技能

### Scenario: 無搜尋結果
**Given** 搜尋關鍵字沒有匹配的技能
**When** 使用者提交搜尋
**Then** 顯示「找不到符合的技能」空狀態畫面

### Scenario: 分類篩選
**Given** 技能分屬不同 Category
**When** 使用者選擇「Frontend」分類
**Then** 只顯示 category 為 Frontend 的技能

### Scenario: 標籤篩選
**Given** 技能帶有不同 Tag
**When** 使用者選擇「TypeScript」標籤
**Then** 只顯示帶有 TypeScript 標籤的技能

### Scenario: 精選 Collections 顯示
**Given** 資料庫中有 3 個 Collection，各含 4–6 個技能
**When** 使用者進入首頁
**Then** Collections 區塊顯示 3 個 Collection 名稱、描述、技能縮圖

### Scenario: 精選 Collection 技能卡片點擊
**Given** 精選 Collections 區塊顯示技能名稱 pill
**When** 使用者點擊某個技能 pill
**Then** 路由跳轉至 /skills/:slug

### Scenario: API 回傳格式正確
**Given** 資料庫有技能資料
**When** 呼叫 GET /api/v1/skills?sort=trending&pageSize=10
**Then** 回傳 HTTP 200，body 符合 SkillSummary[] schema，total 欄位正確

## Implementation TODO

### Backend（Spring Boot）

- [x] JPA Entity：Skill, Category, Tag, Collection（含關聯）
- [x] Repository：SkillRepository（含關鍵字搜尋、sort、分頁）
- [x] DTOs：SkillSummaryDto, CollectionDto, PagedSkillsResponse
- [x] Service：SkillService（sort / filter / search 邏輯）
- [x] Controller：SkillController（4 個 endpoints）
- [x] CORS 設定（允許 frontend localhost:4200）
- [x] DataSeeder：50 筆假技能、3 個 Collections、5 個 Categories、10 個 Tags
- [x] Spring Boot Test：SkillController integration tests（13 tests, 全部 Acceptance Scenarios）

### Frontend（Angular）

- [x] Angular Material + Tailwind CSS v4 安裝與設定（via @tailwindcss/postcss）
- [x] Models：SkillSummary, CollectionWithSkills, SkillQueryParams, CategoryModel, TagModel
- [x] SkillService（HttpClient，對應 4 個 backend endpoints）
- [x] Component：SkillCardComponent
- [x] Component：SkillGridComponent（含 MatProgressSpinner + 空狀態）
- [x] Component：CollectionCarouselComponent（Material horizontal scroll）
- [x] Component：SearchBarComponent（MatInput + MatIcon）
- [x] Component：FilterPanelComponent（MatChipListbox for category + tags）
- [x] Component：SortTabsComponent（MatTabGroup）
- [x] Page：MarketplaceComponent（features/marketplace/）
- [x] Routing：/ → MarketplaceComponent（lazy loaded）
- [x] ~~Jest~~ Vitest unit tests：15 tests GREEN（Angular CLI 21 內建 Vitest）
- [ ] Playwright E2E：首頁載入、搜尋、篩選、切換排序（Phase 1 剩餘項目）

## Open Questions

- [ ] SkillCard 要顯示哪些相容工具的 icon？（暫定：Claude、Copilot、Codex、OpenCode 各一個 SVG icon）
- [ ] Trending 的 24h 安裝數是否需要真正的時間窗口計算？（Phase 1 暫用 `installs24h` 欄位靜態值）
