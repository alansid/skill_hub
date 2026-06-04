# Feature: Skill Publishing（Phase 5）

## Context

已登入的使用者可以將自己製作的技能（SKILL.md 格式）上傳至 SkillHub，讓所有人都能在
Marketplace 發現並安裝。

本 Phase 完成後，平台從「純下載」市集升級為「雙向交流」生態：任何人都能貢獻技能。

## System Boundary

**In scope：**
- 後端：`POST /api/v1/skills`（需驗證）建立新技能
- 前端：`/publish` 路由——技能發布表單頁（需登入）
- CLI：`skillhub push <path>` 指令——讀取本機 SKILL.md 並上傳

**Out of scope（此 Phase）：**
- 更新 / 刪除已發布技能（Phase 7）
- 版本衝突處理（Phase 7）
- 管理員審核流程
- 私人（private）技能
- 圖片 / 資產上傳
- 付費 / Credits 機制

## Domain Model

### SkillPublishRequest（POST body）

```json
{
  "slug":            "string (unique, kebab-case)",
  "name":            "string",
  "description":     "string",
  "categorySlug":    "string (must match existing category)",
  "tagSlugs":        ["string"],
  "version":         "string (semver)",
  "compatibleTools": ["string"],
  "content":         "string (SKILL.md 完整 Markdown)"
}
```

> `author` 欄位由後端從 JWT 取得已登入使用者名稱自動填入，不由前端傳入。

### SkillPublishResponse（成功回應）

```json
{
  "slug":    "string",
  "name":    "string",
  "version": "string",
  "author":  "string"
}
```

## Interfaces / API Contract

### REST Endpoint（Backend）

```
POST /api/v1/skills
  Authorization: Bearer <jwt>
  Body: SkillPublishRequest
  Response 201: SkillPublishResponse
  Response 400: { "error": "...", "fields": { "<field>": "<message>" } }
  Response 401: (missing / invalid JWT)
  Response 409: { "error": "Slug already exists" }
```

**後端驗證規則：**
- `slug`：必填、唯一、符合 `^[a-z0-9]+(-[a-z0-9]+)*$`
- `name`：必填、最長 100 字元
- `description`：必填、最長 1000 字元
- `version`：必填、semver 格式（`^\d+\.\d+\.\d+$`）
- `categorySlug`：必填、對應現有 Category
- `content`：必填

### CLI Interface

```bash
skillhub push <path>                     # 上傳 <path>/SKILL.md（或 <path> 若直接指向檔案）
skillhub push <path> --token <token>     # 指定 auth token
skillhub push <path> --force             # slug 已存在時覆蓋（後端 Phase 7 實現前顯示提示）
```

**Token 解析順序：**
1. `--token <token>` 旗標
2. 環境變數 `SKILLHUB_TOKEN`
3. 未找到則錯誤退出，提示使用者先登入

**SKILL.md 解析：** CLI 從檔案前置 YAML frontmatter 或第一個 `# 標題` 萃取 `name`、`version`、
`description`；若無法解析則要求使用者補充。

### Frontend Route

| 路由       | 元件                  | Guard  |
|------------|----------------------|--------|
| `/publish` | `PublishSkillComponent` | Auth（需登入） |

**表單欄位：**

| 欄位           | 輸入型別            | 驗證               |
|----------------|--------------------|--------------------|
| Name           | text               | 必填, max 100      |
| Slug           | text（自動從 name 推導，可覆蓋） | 必填, kebab-case 格式 |
| Description    | textarea           | 必填, max 1000     |
| Version        | text               | 必填, semver       |
| Category       | dropdown（現有 categories） | 必填          |
| Compatible Tools | chip input        | 至少 1 個          |
| Tags           | chip input（現有 tags） | 選填           |
| SKILL.md Content | textarea / file upload | 必填         |

**發布成功後：** 導向 `/skills/<slug>` 詳情頁，並顯示 snackbar「技能已發布！」

## Acceptance Criteria

### Scenario: 成功發布技能（Backend）
**Given** 已登入使用者（JWT 有效），且 slug `my-new-skill` 不存在  
**When** POST /api/v1/skills，body 含全部必填欄位  
**Then** HTTP 201，資料庫新增技能記錄，author = 已登入使用者名稱

### Scenario: Slug 已存在（Backend）
**Given** slug `my-new-skill` 已存在  
**When** POST /api/v1/skills，body slug = `my-new-skill`  
**Then** HTTP 409，body `{ "error": "Slug already exists" }`

### Scenario: 缺少必填欄位（Backend）
**Given** 有效 JWT  
**When** POST /api/v1/skills，body 缺少 `name`  
**Then** HTTP 400，body 含 `fields.name` 錯誤訊息

### Scenario: 未驗證（Backend）
**Given** 無 Authorization header  
**When** POST /api/v1/skills  
**Then** HTTP 401

### Scenario: 前端成功發布（Frontend）
**Given** 使用者已登入，在 `/publish` 頁填完所有欄位  
**When** 點擊「Publish」按鈕  
**Then** 導向 `/skills/<slug>` 頁面，顯示 snackbar「技能已發布！」

### Scenario: 前端表單驗證（Frontend）
**Given** 使用者在 `/publish` 頁  
**When** Slug 欄位輸入含大寫字母的字串（如 `MySkill`）  
**Then** 顯示即時錯誤提示「Slug 僅允許小寫字母、數字與連字號」，Publish 按鈕禁用

### Scenario: 前端未登入存取（Frontend）
**Given** 使用者未登入  
**When** 直接訪問 `/publish`  
**Then** 被導向 `/auth/login`（Auth Guard 攔截）

### Scenario: CLI 成功上傳（CLI）
**Given** `SKILLHUB_TOKEN` 環境變數已設定，`./my-skill/SKILL.md` 存在且格式正確  
**When** CLI 執行 `skillhub push ./my-skill`  
**Then** API 回傳 201，CLI 印出「✓ Published my-skill v1.0.0」，exit code 0

### Scenario: CLI 無 Token（CLI）
**Given** 無 `--token` 旗標且 `SKILLHUB_TOKEN` 未設定  
**When** CLI 執行 `skillhub push ./my-skill`  
**Then** CLI 印出錯誤「No auth token. Set SKILLHUB_TOKEN or pass --token <token>.」，exit code 1

### Scenario: CLI Slug 衝突（CLI）
**Given** slug 已存在於 registry  
**When** CLI 執行 `skillhub push ./my-skill`（不含 `--force`）  
**Then** CLI 印出「Slug already exists. Use --force to overwrite (requires Phase 7).」，exit code 1

## Implementation TODO

### Backend
- [x] `SkillPublishRequest` DTO（含 Bean Validation 標註）
- [x] `SkillPublishResponse` DTO
- [x] `SkillService.publishSkill(SkillPublishRequest, String authorUsername)`
- [x] `SkillController`: POST /api/v1/skills（需登入）
- [x] Slug 唯一性檢查 → 409 ConflictException
- [x] `GlobalExceptionHandler` → 400 with field errors
- [x] Integration tests（5 scenarios: 201, 409, 400, 400 invalid slug, 401）

### Frontend
- [x] 新增路由 `/publish` → `PublishSkillComponent`（lazy loaded）
- [x] Auth Guard 套用至 `/publish`
- [x] `PublishSkillComponent`：Reactive Form 含全部欄位
- [x] Slug 從 Name 自動推導
- [x] Category dropdown + Compatible Tools chip input
- [x] SKILL.md Content：textarea + file upload
- [x] `SkillService.publishSkill(req)` → POST /api/v1/skills
- [x] 成功後導向 `/skills/<slug>`
- [x] Navbar「Publish」按鈕（已登入時顯示）
- [x] Unit tests：PublishSkillComponent

### CLI
- [x] `push` command（`cli/src/commands/push.ts`）
- [x] SKILL.md frontmatter 解析（含 BOM 處理）
- [x] Token 解析（`--token` → `SKILLHUB_TOKEN` → error）
- [x] `api.ts`：`publishSkill(req, token)` → POST /api/v1/skills
- [x] `index.ts`：註冊 `push` 指令
- [x] Unit tests（mock API + temp dir）

## Open Questions
- [ ] 是否需要在 Marketplace Navbar 加入「Publish」入口按鈕？（預設：是，已登入時顯示）
- [ ] SKILL.md frontmatter 格式是否有統一 schema？（CLI 解析依據）
