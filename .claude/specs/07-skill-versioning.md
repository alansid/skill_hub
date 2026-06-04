# Feature: Skill Versioning（Phase 7）

## Context

目前 `skillhub push --force` 是空殼指令（後端遇到重複 slug 一律回傳 409）。
技能一旦發布就無法修改或刪除，作者無法修正錯誤、更新內容或下架自己的作品。
本 Phase 完成後，平台從「發布後不可更動」升級為「完整生命週期管理」：作者可更新版本、查看歷史、刪除技能。

## System Boundary

**In scope：**
- 後端：`PUT /api/v1/skills/{slug}`（更新技能，只有作者可呼叫）
- 後端：`DELETE /api/v1/skills/{slug}`（刪除技能，只有作者可呼叫）
- 後端：`GET /api/v1/skills/{slug}/versions`（查看版本歷史，公開）
- 後端：`SkillVersion` entity — 每次 update 時快照舊版本
- CLI：`skillhub push --force` 實際呼叫 PUT endpoint
- 前端：技能詳情頁「Edit」/ 「Delete」按鈕（作者登入時才顯示）
- 前端：`/skills/:slug/edit` 路由（複用 PublishSkillComponent 表單，需登入且為作者）
- 前端：詳情頁側欄「Version History」collapsible 區塊

**Out of scope（此 Phase）：**
- `skillhub pull <slug>@<version>` 指定版本下載（Phase 9）
- 管理員強制刪除技能（Phase 9）
- 私人技能（不在 roadmap）

## Domain Model

### SkillVersion Entity

```java
// entity/SkillVersion.java
SkillVersion {
  id          String         // UUID
  skill       Skill          // ManyToOne（技能 FK）
  version     String         // semver，此快照的版本號
  content     String         // TEXT — 舊版 SKILL.md 原文
  createdAt   LocalDateTime
  createdBy   String         // userId（執行更新者）
}
```

### Skill Entity 變更
- `authorId` 新欄位 `String`（FK → User.id），與現有 `author`（display name 字串）並存；發布時從 JWT 取得並存入

> `author` 欄位（display name 字串）保留，用於公開顯示；`authorId` 用於權限驗證。

### SkillUpdateRequest DTO

```java
record SkillUpdateRequest(
  @NotBlank String name,
  String description,          // nullable = 不更新
  @Pattern(regexp = "^\\d+\\.\\d+\\.\\d+$") String version,  // 必填
  String categorySlug,         // nullable = 不更新
  List<String> tagSlugs,       // nullable = 不更新
  List<String> compatibleTools,// nullable = 不更新
  String content               // nullable = 不更新
) {}
```

### SkillVersionDto

```java
record SkillVersionDto(
  String id,
  String version,
  String createdAt,
  String createdBy   // displayName
) {}
```

## Interfaces / API Contract

### REST Endpoints（Backend）

```
PUT /api/v1/skills/{slug}                 Bearer required
  Body: SkillUpdateRequest
  Response 200: SkillDetailDto
  Response 403: { "error": "Not the author" }
  Response 409: { "error": "Version must be higher than current" }
  Response 404: { "error": "Skill not found" }

DELETE /api/v1/skills/{slug}              Bearer required
  Response 204: (no content)
  Response 403: { "error": "Not the author" }
  Response 404: { "error": "Skill not found" }

GET /api/v1/skills/{slug}/versions        公開
  Response 200: { "versions": SkillVersionDto[] }  // 由新到舊排序
  Response 404: { "error": "Skill not found" }
```

**版本遞增規則（後端驗證）：**
- 新 version 必須在 semver 比較上 > 現有 version，否則回傳 409

### CLI Interface

```bash
skillhub push <path> --force    # slug 已存在時呼叫 PUT 更新（而非顯示錯誤）
```

- `--force` 時呼叫 `PUT /api/v1/skills/{slug}`
- 仍需 token（同 push 無 --force）
- 成功輸出：`✓ Updated my-skill v1.0.0 → v1.1.0`

### Frontend Routes

| 路由 | 元件 | Guard |
|------|------|-------|
| `/skills/:slug/edit` | `EditSkillComponent`（複用 PublishSkillComponent） | Auth + IsAuthor |

**詳情頁新增：**
- 「Edit」按鈕：僅在 `currentUser.id === skill.authorId` 時顯示，點擊跳至 `/skills/:slug/edit`
- 「Delete」按鈕：同上，點擊後顯示確認 Dialog，確認後呼叫 DELETE，成功跳回首頁
- 「Version History」區塊（collapsible MatExpansionPanel）：顯示 SkillVersionDto[]，每筆含版本號 + 日期

## Acceptance Criteria

### Scenario: 作者成功更新技能（Backend）
**Given** 已登入作者，slug `my-skill` 存在，當前版本 `1.0.0`  
**When** PUT /api/v1/skills/my-skill，body 含 `version: "1.1.0"`  
**Then** HTTP 200，Skill 版本更新為 `1.1.0`，舊版快照存入 SkillVersion

### Scenario: 版本未遞增（Backend）
**Given** 當前版本 `1.0.0`  
**When** PUT，body 含 `version: "0.9.0"`  
**Then** HTTP 409，`{ "error": "Version must be higher than current" }`

### Scenario: 非作者嘗試更新（Backend）
**Given** 已登入使用者，但非該技能作者  
**When** PUT /api/v1/skills/{slug}  
**Then** HTTP 403，`{ "error": "Not the author" }`

### Scenario: 作者成功刪除技能（Backend）
**Given** 已登入作者  
**When** DELETE /api/v1/skills/{slug}  
**Then** HTTP 204，技能從資料庫移除

### Scenario: 查看版本歷史（Backend）
**Given** 技能 `my-skill` 曾被更新 2 次  
**When** GET /api/v1/skills/my-skill/versions  
**Then** HTTP 200，回傳 2 個 SkillVersionDto，由新到舊排序

### Scenario: CLI push --force 更新（CLI）
**Given** `SKILLHUB_TOKEN` 已設定，`my-skill` 已發布，SKILL.md version 為 `1.1.0`  
**When** `skillhub push ./my-skill --force`  
**Then** 呼叫 PUT，CLI 印出 `✓ Updated my-skill v1.0.0 → v1.1.0`，exit code 0

### Scenario: 前端 Edit 按鈕只對作者顯示（Frontend）
**Given** 登入使用者 A 查看自己發布的技能詳情頁  
**When** 頁面載入  
**Then** 顯示「Edit」和「Delete」按鈕

### Scenario: 非作者不見 Edit 按鈕（Frontend）
**Given** 登入使用者 B 查看使用者 A 的技能  
**When** 頁面載入  
**Then** 不顯示「Edit」和「Delete」按鈕

## Implementation TODO

### Backend
- [ ] `SkillVersion` entity + Repository
- [ ] `Skill` entity 新增 `authorId` 欄位（`publishSkill` 時填入 userId）
- [ ] `SkillUpdateRequest` DTO（含 semver pattern validation）
- [ ] `SkillVersionDto` DTO
- [ ] `SkillService.updateSkill(slug, req, userId)` — 驗證作者、版本遞增、快照舊版
- [ ] `SkillService.deleteSkill(slug, userId)` — 驗證作者、刪除
- [ ] `SkillService.getVersionHistory(slug)`
- [ ] `SkillController`: PUT、DELETE、GET /versions endpoints
- [ ] `SecurityConfig`：PUT/DELETE `/api/v1/skills/{slug}` 需 authenticated
- [ ] Integration tests（6 scenarios）

### CLI
- [ ] `cli/src/api.ts`：`updateSkill(slug, req, token)` — PUT /api/v1/skills/{slug}
- [ ] `cli/src/commands/push.ts`：`--force` 改呼叫 `updateSkill()`
- [ ] Unit tests：push --force 成功 / 版本衝突 / 非作者

### Frontend
- [ ] `SkillSummary` + `SkillDetail` model 新增 `authorId: string`
- [ ] `skill.service.ts`：`updateSkill(slug, req)`, `deleteSkill(slug)`, `getVersionHistory(slug)`
- [ ] `SkillDetailComponent`：Edit / Delete 按鈕（IsAuthor guard）
- [ ] Delete 確認 Dialog（MatDialog）
- [ ] `EditSkillComponent`（features/skill-detail/edit/ 或獨立 feature）
- [ ] 路由：`/skills/:slug/edit` with Auth Guard
- [ ] Version History MatExpansionPanel
- [ ] Unit tests：SkillDetailComponent（Edit/Delete 按鈕顯示條件）

## Open Questions
- [ ] Delete 是否要做軟刪除（status=DELETED）或硬刪除？（暫定硬刪除，已安裝的本機 skill 不受影響）
- [ ] 版本歷史是否顯示完整 content diff？（暫定僅顯示 metadata，不 diff）
