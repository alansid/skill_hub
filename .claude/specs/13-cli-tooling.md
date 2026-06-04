# Feature: CLI Tooling 補齊（Phase 13）

## Context

兩個小功能補完 CLI 工具鏈：

1. **`skillhub init`** — scaffold 新技能目錄，降低貢獻門檻
2. **安裝統計回報** — `pull` 成功後自動回報，讓 Trending 數字有意義

## System Boundary

### Feature A：`skillhub init`

**In scope：**
- CLI 指令：`skillhub init [name] [--dir <path>]`
- 互動式問答（readline）產生 SKILL.md 骨架 + frontmatter
- 可選擇是否建立 `references/` 子目錄

**Out of scope：**
- 後端無需變更
- 不連接 API

### Feature B：安裝統計回報

**In scope：**
- 後端：`POST /api/v1/skills/{slug}/install`（原子性 +1 installCount / installs24h）
- 後端：每日 00:00 UTC 重置 `installs24h`（Scheduler）
- CLI：`pull` 成功後 fire-and-forget 呼叫 POST /install
- MCP：`skillhub_pull` 成功後 fire-and-forget 呼叫 POST /install
- 前端：無需改動（已顯示 installCount，數字自然更新）

**Out of scope：**
- IP 去重、防刷（Phase 14）
- Analytics dashboard

---

## Domain Model

### Feature A：無新 entity

### Feature B：無新 entity，修改 Skill entity 的現有欄位語意

| 欄位 | 現有 | 變更後 |
|------|------|--------|
| `installCount` | seeder 假資料 | 實際累計下載數 |
| `installs24h` | seeder 假資料 | 過去 24h 下載數，每日 UTC 00:00 重置 |

---

## Interfaces / API Contract

### Feature A：CLI Interface

```bash
skillhub init [name] [--dir <path>]
```

**互動問答流程（若 name 未提供才問）：**
```
? Skill name: My TDD Skill
? Slug (auto: my-tdd-skill): my-tdd-skill
? Description (max 500): Guides TDD workflow for any language
? Version (default: 1.0.0): 1.0.0
? Category slug (e.g. testing, frontend, devops): testing
? Compatible tools (comma-separated, e.g. claude,copilot): claude,copilot
? Create references/ folder? (Y/n): Y
```

**產生的目錄結構（`--dir` 未指定時用 slug 名稱）：**
```
my-tdd-skill/
├── SKILL.md
└── references/        （若使用者選 Y）
    └── .gitkeep
```

**SKILL.md 範本：**
```markdown
---
name: my-tdd-skill
description: Guides TDD workflow for any language
version: 1.0.0
categorySlug: testing
compatibleTools:
  - claude
  - copilot
---

# My TDD Skill

<!-- 說明此技能的目的與適用情境 -->

## When to Use

<!-- 描述應在什麼情況下啟動此技能 -->

## Instructions

<!-- 撰寫給 AI 的具體指令 -->
```

**Slug 自動推導規則：**
- name 轉小寫 → 空格換連字號 → 移除非 `[a-z0-9-]` 字元

### Feature B：REST Endpoint

```
POST /api/v1/skills/{slug}/install    公開（無需登入）
  Response 200: { "installCount": number }
  Response 404: { "error": "Skill not found" }
```

**原子性更新：**
```sql
UPDATE skills SET install_count = install_count + 1, installs_24h = installs_24h + 1
WHERE slug = :slug
```

**Scheduler（`InstallStatsScheduler`）：**
```java
@Scheduled(cron = "0 0 0 * * *")   // 每日 UTC 00:00
void resetDailyInstalls()           // UPDATE skills SET installs_24h = 0
```

**CLI 修改（`pull.ts`）：**
```ts
// 安裝成功後，不等待結果
void recordInstall(slug);
```

**MCP 修改（`tools/pull.ts`）：**
```ts
void recordInstall(input.slug);
```

---

## Acceptance Criteria

### Feature A：`skillhub init`

**Scenario: 互動式建立技能目錄**  
**Given** 使用者在空目錄執行 `skillhub init`  
**When** 依序回答問題  
**Then** 產生 `<slug>/SKILL.md`（含正確 frontmatter），若選 Y 則產生 `<slug>/references/.gitkeep`

**Scenario: 提供 name 參數跳過問答**  
**Given** `skillhub init "My Skill"`  
**When** 執行  
**Then** 只問 description、version、category、tools 等其他欄位（name 已確定）

**Scenario: --dir 指定輸出路徑**  
**Given** `skillhub init --dir ./output/my-skill`  
**When** 執行  
**Then** 在 `./output/my-skill/SKILL.md` 建立檔案

**Scenario: 目錄已存在**  
**Given** `./my-tdd-skill/` 已存在  
**When** `skillhub init "My TDD Skill"`  
**Then** 印出 `Directory ./my-tdd-skill already exists. Use --dir to specify a different path.`，exit code 1

**Scenario: 產生的 SKILL.md 可直接 push**  
**Given** `skillhub init` 產生的骨架，補上 Instructions 後  
**When** `skillhub push ./my-tdd-skill`（已設定 token）  
**Then** push 成功，無 frontmatter 解析錯誤

### Feature B：安裝統計

**Scenario: pull 後 installCount 遞增（Backend）**  
**Given** `tdd-starter` installCount = 100  
**When** `skillhub pull tdd-starter`  
**Then** `GET /api/v1/skills/tdd-starter` 回傳 `installCount = 101`

**Scenario: 每日重置 installs24h（Backend）**  
**Given** `tdd-starter` installs24h = 50  
**When** Scheduler resetDailyInstalls() 執行  
**Then** `installs24h = 0`

**Scenario: install endpoint 不需 JWT（Backend）**  
**Given** 無 Authorization header  
**When** POST /api/v1/skills/tdd-starter/install  
**Then** HTTP 200（不需登入）

**Scenario: CLI pull 失敗不影響統計（CLI）**  
**Given** recordInstall API 無法連線  
**When** `skillhub pull tdd-starter`（install 成功）  
**Then** pull 仍成功（exit code 0），統計失敗靜默忽略

---

## Implementation TODO

### Feature A：CLI init
- [ ] `cli/src/commands/init.ts`（新建）— readline 互動問答 + 產生目錄/檔案
- [ ] `cli/src/index.ts`：註冊 `init` 指令
- [ ] Unit tests：init（slug 推導邏輯、目錄衝突、--dir 參數）

### Feature B：安裝統計

#### Backend
- [ ] `SkillRepository.incrementInstallCount(slug)` — `@Modifying` JPQL
- [ ] `SkillRepository.resetInstalls24h()` — `@Modifying` JPQL
- [ ] `SkillService.recordInstall(slug)`
- [ ] `SkillService.resetDailyInstalls()`
- [ ] `SkillController`：POST /api/v1/skills/{slug}/install
- [ ] `SecurityConfig`：`POST /api/v1/skills/*/install` permitAll
- [ ] `InstallStatsScheduler`（`scheduler/` 目錄，`@EnableScheduling`）
- [ ] Integration tests（3 scenarios：200、404、scheduler reset）

#### CLI
- [ ] `cli/src/api.ts`：`recordInstall(slug)` — fire-and-forget
- [ ] `cli/src/commands/pull.ts`：安裝成功後 `void recordInstall(slug)`

#### MCP
- [ ] `mcp/src/api.ts`：`recordInstall(slug)` — fire-and-forget
- [ ] `mcp/src/tools/pull.ts`：安裝成功後 `void recordInstall(input.slug)`

## Open Questions
- [ ] `skillhub init` 是否需要 `--no-interactive` 模式（從 flags 直接指定全部欄位）？（暫定：否，Phase 14 再加）
- [ ] 安裝統計是否需要防止重複計數（同一使用者 1 小時內多次 pull）？（暫定：否，Phase 14 加 IP/user 去重）
