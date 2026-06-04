# Feature: Skill 詳情頁（Phase 2）

## Context

使用者在 Marketplace 首頁點擊 SkillCard 後進入詳情頁，可完整閱讀技能說明、查看 SKILL.md 內容、確認相容工具，並（Phase 2 僅展示）觸發「安裝」動作。

## System Boundary

**In scope：**
- 詳情頁路由 `/skills/:slug`
- 技能完整資訊展示（含 SKILL.md content）
- 安裝次數、24h 安裝數統計
- 相關技能推薦（同 category，最多 4 個）
- 「複製安裝指令」功能

**Out of scope（Phase 2）：**
- 真正的一鍵安裝執行（Phase 3）
- 評論 / 評分系統（Phase 4）
- 版本歷史（Phase 5）

## API Contract

```
GET /api/v1/skills/{slug}
  Response 200: SkillDetailDto
  Response 404: { "error": "Skill not found" }

GET /api/v1/skills/{slug}/related
  Response 200: { "skills": SkillSummaryDto[] }   // 同 category，排除自身，最多 4 筆
```

### SkillDetailDto

```java
record SkillDetailDto(
  String id, String slug, String name, String description,
  CategoryDto category, List<TagDto> tags,
  String author, String version,
  int installCount, int installs24h,
  List<String> compatibleTools,
  String content,      // SKILL.md 原始 Markdown
  String createdAt, String updatedAt
) {}
```

## Implementation TODO

### Backend
- [x] SkillDetailDto（含 content, installs24h, updatedAt）
- [x] SkillRepository.findBySlug(String slug)
- [x] SkillService.getSkillBySlug / getRelatedSkills
- [x] SkillController: GET /api/v1/skills/{slug} 與 GET /api/v1/skills/{slug}/related
- [x] Integration tests: GET /api/v1/skills/{slug} → 200 + SkillDetailDto schema
- [x] Integration tests: GET /api/v1/skills/{slug} 不存在 → 404
- [x] Integration tests: GET /api/v1/skills/{slug}/related → 最多 4 筆同分類、排除自身

### Frontend
- [x] SkillDetail model（extends SkillSummary + content, installs24h, updatedAt）
- [x] SkillService.getSkillDetail(slug) + getRelatedSkills(slug)
- [x] SkillDetailComponent（features/skill-detail/）
- [x] Routing: /skills/:slug → SkillDetailComponent（lazy）
- [x] SkillCardComponent 加入 (click) → router.navigate(['/skills', skill.slug])
- [x] 「複製安裝指令」按鈕（Clipboard API）
- [x] Unit test: SkillDetailComponent（skill-detail.component.spec.ts）

## Acceptance Criteria

- **Given** slug 存在 **When** GET /api/v1/skills/{slug} **Then** HTTP 200 + 完整 SkillDetailDto
- **Given** slug 不存在 **When** GET /api/v1/skills/{slug} **Then** HTTP 404
- **Given** 使用者點擊 SkillCard **When** 點擊 **Then** 路由跳轉至 /skills/:slug
- **Given** 詳情頁載入 **When** 使用者進入 **Then** 顯示技能名稱、描述、content、安裝數、相容工具
- **Given** 詳情頁有相關技能 **When** 載入 **Then** 顯示最多 4 個同分類技能卡片
