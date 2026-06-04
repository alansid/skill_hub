# Feature: Ratings & Reviews（Phase 12）

## Context

公開市集需要信任機制。使用者在下載陌生作者的技能前，需要參考其他使用者的使用回饋。
本 Phase 加入 1–5 星評分 + 文字評論系統，並在 SkillCard 和詳情頁直接展示平均分與評分數。

## System Boundary

**In scope：**
- 後端：`SkillRating` entity（每位使用者對每個技能只能評一次）
- 後端：CRUD Endpoints（submit / update / delete my rating, get all ratings）
- 後端：`Skill.avgRating` / `Skill.ratingCount` 快取欄位（每次評分更新時同步計算）
- 前端：SkillCard 顯示星星平均分 + 評分數
- 前端：詳情頁評分摘要、評論列表（分頁）、登入使用者評分表單

**Out of scope（此 Phase）：**
- 評論「有用」投票（Phase 13）
- 評論排序（helpful / recent / rating）（Phase 13）
- 管理員刪除惡意評論（Phase 13）
- 購買/使用門檻（此平台免費）

## Domain Model

### SkillRating Entity

```java
// entity/SkillRating.java
@Entity
@Table(name = "skill_ratings",
    uniqueConstraints = @UniqueConstraint(columnNames = {"skill_id", "user_id"}))
SkillRating {
  id        String         // UUID
  skill     Skill          // ManyToOne
  user      User           // ManyToOne
  rating    int            // 1–5（@Min(1) @Max(5)）
  comment   String         // TEXT, nullable, max 1000 字元
  createdAt LocalDateTime
  updatedAt LocalDateTime
}
```

### Skill Entity 新增欄位

```java
double avgRating;    // 快取平均分（預設 0.0）
int ratingCount;     // 評分總數（預設 0）
```

> `avgRating` / `ratingCount` 在每次 submit / update / delete rating 時由 `SkillRatingService` 原子性重新計算並更新。

### RatingDto

```java
record RatingDto(
  String id,
  String userId,
  String displayName,
  int rating,
  String comment,       // nullable
  String createdAt,
  String updatedAt
) {}
```

### RatingSummaryDto

```java
record RatingSummaryDto(
  double avgRating,
  int ratingCount,
  Map<Integer, Long> distribution   // { 1: 2, 2: 0, 3: 5, 4: 12, 5: 31 }
) {}
```

## Interfaces / API Contract

### REST Endpoints（Backend）

```
GET /api/v1/skills/{slug}/ratings
  Query: page? (default 0), pageSize? (default 10)
  Response 200: {
    "ratings": RatingDto[],
    "total": number,
    "page": number,
    "pageSize": number,
    "summary": RatingSummaryDto
  }
  Response 404: { "error": "Skill not found" }

POST /api/v1/skills/{slug}/ratings      Bearer required
  Body: { "rating": 1–5, "comment": "string（optional, max 1000）" }
  Response 201: RatingDto
  Response 400: { "error": "Validation failed", "fields": {...} }
  Response 409: { "error": "Already rated" }

PUT /api/v1/skills/{slug}/ratings/me    Bearer required
  Body: { "rating": 1–5, "comment": "string（optional）" }
  Response 200: RatingDto
  Response 404: { "error": "Rating not found" }

DELETE /api/v1/skills/{slug}/ratings/me Bearer required
  Response 204: (no content)
  Response 404: { "error": "Rating not found" }
```

**`SkillSummaryDto` / `SkillDetailDto` 新增欄位：**

```java
double avgRating;
int ratingCount;
```

### Angular TypeScript Models

```ts
// 新增至 skill.model.ts
interface RatingDto {
  id: string;
  userId: string;
  displayName: string;
  rating: number;        // 1–5
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RatingSummaryDto {
  avgRating: number;
  ratingCount: number;
  distribution: Record<number, number>;  // { 1: 2, 2: 0, ... }
}

interface RatingsPageResponse {
  ratings: RatingDto[];
  total: number;
  page: number;
  pageSize: number;
  summary: RatingSummaryDto;
}
```

### Angular Service 新增方法

```ts
// core/services/rating.service.ts（新建）
getRatings(slug: string, page?: number): Observable<RatingsPageResponse>
submitRating(slug: string, rating: number, comment?: string): Observable<RatingDto>
updateRating(slug: string, rating: number, comment?: string): Observable<RatingDto>
deleteRating(slug: string): Observable<void>
```

## Acceptance Criteria

### Scenario: 成功提交評分（Backend）
**Given** 已登入使用者，`tdd-starter` 存在，使用者未評過  
**When** POST /api/v1/skills/tdd-starter/ratings，`{ "rating": 5, "comment": "Great!" }`  
**Then** HTTP 201，RatingDto 回傳，`tdd-starter.avgRating` 和 `ratingCount` 同步更新

### Scenario: 重複評分（Backend）
**Given** 使用者已對 `tdd-starter` 評分  
**When** POST /api/v1/skills/tdd-starter/ratings（相同使用者）  
**Then** HTTP 409，`{ "error": "Already rated" }`

### Scenario: 更新評分（Backend）
**Given** 使用者已評 4 星  
**When** PUT /api/v1/skills/tdd-starter/ratings/me，`{ "rating": 3 }`  
**Then** HTTP 200，評分更新為 3，`avgRating` 重新計算

### Scenario: 刪除評分（Backend）
**Given** 使用者已評分  
**When** DELETE /api/v1/skills/tdd-starter/ratings/me  
**Then** HTTP 204，`ratingCount` -1，`avgRating` 重新計算

### Scenario: 查詢評分列表（Backend）
**Given** `tdd-starter` 有 5 個評分  
**When** GET /api/v1/skills/tdd-starter/ratings  
**Then** HTTP 200，`ratings` 陣列長度 ≤ 10，`summary.ratingCount = 5`，`summary.distribution` 總和 = 5

### Scenario: rating 超出範圍（Backend）
**Given** 已登入使用者  
**When** POST /api/v1/skills/tdd-starter/ratings，`{ "rating": 6 }`  
**Then** HTTP 400，驗證錯誤

### Scenario: SkillCard 顯示評分（Frontend）
**Given** `tdd-starter` avgRating=4.3，ratingCount=52  
**When** 使用者瀏覽首頁  
**Then** SkillCard 顯示 4.3 ★ 和「52 ratings」

### Scenario: 詳情頁評分摘要（Frontend）
**Given** 詳情頁載入  
**When** 使用者進入 `/skills/tdd-starter`  
**Then** 顯示平均分（大字）+ 星星圖示 + 分佈長條圖（5 星到 1 星）+ 評論列表（10 筆/頁）

### Scenario: 已登入使用者提交評分（Frontend）
**Given** 已登入使用者，尚未評分  
**When** 在詳情頁點擊評分星星（選 5 星）並送出  
**Then** 評論出現在列表頂部，平均分即時更新

### Scenario: 已評分使用者修改評分（Frontend）
**Given** 已登入使用者，已評 4 星  
**When** 在詳情頁評分區看到「已評分」，點擊「修改」  
**Then** 表單切換為編輯模式，送出後評分更新

### Scenario: 未登入使用者看到 CTA（Frontend）
**Given** 未登入使用者查看詳情頁  
**When** 查看評分區塊  
**Then** 顯示「登入後可以評分」按鈕（導向 /auth/login）

## Implementation TODO

### Backend
- [ ] `SkillRating` entity + `SkillRatingRepository`（`findBySkillSlugAndUser_Id`, `findBySkillSlug`）
- [ ] `Skill` entity 新增 `avgRating`（double）、`ratingCount`（int）
- [ ] `RatingDto` / `RatingSummaryDto` DTOs
- [ ] `SkillRatingService`：`submitRating`, `updateRating`, `deleteRating`, `getRatings`
  - 每次 CRUD 後呼叫 `recalculateStats(skillId)` 更新 `avgRating` / `ratingCount`
- [ ] `SkillRatingController`（`/api/v1/skills/{slug}/ratings`）：4 個 endpoints
- [ ] `SkillSummaryDto` / `SkillDetailDto` 新增 `avgRating`, `ratingCount`
- [ ] `SkillService.toSummaryDto()` / `toDetailDto()` 補上新欄位
- [ ] `SecurityConfig`：POST/PUT/DELETE ratings 需 authenticated，GET 公開
- [ ] Integration tests（7 scenarios）

### Frontend
- [ ] `skill.model.ts`：`SkillSummary` / `SkillDetail` 新增 `avgRating`, `ratingCount`
- [ ] `rating.model.ts`（新建）：`RatingDto`, `RatingSummaryDto`, `RatingsPageResponse`
- [ ] `rating.service.ts`（新建）：4 個 API 方法
- [ ] `skill-card.component.ts`：星星評分 + 評分數顯示
- [ ] `skill-detail.component.ts`：
  - 評分摘要區（`RatingSummaryComponent`）
  - 評論列表（`RatingListComponent`，分頁）
  - 評分表單（`RatingFormComponent`）— 新增 / 編輯 / 刪除
- [ ] `shared/components/star-rating/`（新建）：可點擊 or 唯讀的星星元件
- [ ] Unit tests：RatingService、StarRatingComponent、RatingFormComponent

## Open Questions
- [ ] 評分列表預設排序？（暫定：最新優先）
- [ ] 匿名使用者是否看得到評分 userId？（暫定：只顯示 displayName，不暴露 userId）
- [ ] avgRating 是否四捨五入到小數後一位？（暫定：是）
