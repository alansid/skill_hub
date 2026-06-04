# Feature: Publishing Safety（Phase 9）

## Context

SKILL.md 會被 AI 工具直接當作 system prompt 或執行指令，公開上傳等同開放所有人把任意指令注入到其他使用者的 AI 工作階段。
本 Phase 在「允許任何人發布」的前提下，加入最低限度的安全機制：
1. **靜態內容掃描** — 上傳時自動偵測高危模式（危險系統指令、script injection）
2. **自動審核狀態機** — PENDING → 24h 後自動升 APPROVED，除非被舉報
3. **社群舉報機制** — 任何登入使用者可舉報，超過閾值自動暫停
4. **前端狀態可見性** — SkillCard/詳情頁顯示 PENDING / SUSPENDED 狀態提示

## System Boundary

**In scope：**
- 後端：`Skill.status` enum（PENDING / APPROVED / REJECTED / SUSPENDED）
- 後端：`ContentScanService` — pattern-based 靜態掃描
- 後端：`SkillReport` entity + `POST /api/v1/skills/{slug}/report`
- 後端：Scheduler — 每小時自動 approve（>24h PENDING）+ 自動 suspend（reportCount >= 5）
- 前端：SkillCard status badge（PENDING / SUSPENDED chip）
- 前端：詳情頁 SUSPENDED 警告 banner + 舉報按鈕 + 舉報 Dialog
- 前端：Publish 成功後顯示「已提交，等待審核」提示（非即時 APPROVED）
- CLI：push 後若 status=PENDING，輸出 `⏳ Published ... (pending review)`

**Out of scope（此 Phase）：**
- 管理員後台審核 Dashboard（Phase 10）
- AI-based semantic content moderation（Phase 10）
- 舉報分類（spam / malicious / inappropriate）細化
- 作者驗證章（verified badge）

## Domain Model

### SkillStatus Enum

```java
enum SkillStatus { PENDING, APPROVED, REJECTED, SUSPENDED }
```

### Skill Entity 新增欄位

```java
SkillStatus status;    // default: PENDING
int reportCount;       // default: 0
```

### SkillReport Entity

```java
// entity/SkillReport.java
SkillReport {
  id          String         // UUID
  skill       Skill          // ManyToOne
  reporter    User           // ManyToOne
  reason      String         // max 500，必填
  createdAt   LocalDateTime
  // unique constraint: (skill_id, reporter_id) — 每人只能舉報一次
}
```

### ContentScanService 規則

| 風險等級 | 規則 | 後端行為 |
|---------|------|---------|
| HIGH | `rm -rf`、`del /f`、`format C:`、`<script>`、`javascript:`、`eval(` | 422 Unprocessable Content，技能不儲存 |
| HIGH | content 超過 50KB | 422 Unprocessable Content |
| LOW | 含外部 URL（`curl https://`、`fetch('https://`、`wget https://`） | 正常儲存，status=PENDING，回傳 warning 訊息 |
| SAFE | 其他 | 正常儲存，status=PENDING |

> 備注：SAFE / LOW 上傳後都是 PENDING，差別只在 warning 訊息是否出現

### 狀態機

```
上傳 → PENDING
  → （24h 後，無 reportCount 觸發）→ APPROVED
  → （reportCount >= 5）→ SUSPENDED
  → （管理員手動，Phase 10）→ REJECTED
```

## Interfaces / API Contract

### 修改：POST /api/v1/skills（publishSkill）

```
既有 endpoint，新增行為：
- 上傳前呼叫 ContentScanService.scan(content)
- HIGH 風險 → HTTP 422 { "error": "Content rejected: <reason>" }
- LOW 風險 → HTTP 201 + SkillPublishResponse（status: "PENDING", warning: "<message>"）
- SAFE → HTTP 201 + SkillPublishResponse（status: "PENDING"）
```

**SkillPublishResponse 新增欄位：**

```java
record SkillPublishResponse(
  String slug, String name, String version, String author,
  String status,    // "PENDING"
  String warning    // nullable，LOW 風險時的說明
) {}
```

### 新增：POST /api/v1/skills/{slug}/report

```
POST /api/v1/skills/{slug}/report    Bearer required
  Body: { "reason": "string（max 500）" }
  Response 200: { "reported": true }
  Response 400: { "error": "Reason is required" }
  Response 404: { "error": "Skill not found" }
  Response 409: { "error": "Already reported" }
```

### SkillSummaryDto / SkillDetailDto 新增欄位

```java
String status   // "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"
```

### Scheduler（每小時執行）

```
- approveExpiredPending：UPDATE skill SET status=APPROVED WHERE status=PENDING AND createdAt <= now()-24h
- suspendOverReported：UPDATE skill SET status=SUSPENDED WHERE reportCount >= 5 AND status=APPROVED
```

## Acceptance Criteria

### Scenario: 上傳含危險指令（Backend）
**Given** 已登入使用者  
**When** POST /api/v1/skills，content 含 `rm -rf /`  
**Then** HTTP 422，`{ "error": "Content rejected: Potentially dangerous command detected" }`，技能未儲存

### Scenario: 上傳超大內容（Backend）
**Given** content 超過 50KB  
**When** POST /api/v1/skills  
**Then** HTTP 422，`{ "error": "Content rejected: Content exceeds maximum allowed size (50KB)" }`

### Scenario: 正常上傳 → PENDING（Backend）
**Given** 已登入，content 正常  
**When** POST /api/v1/skills  
**Then** HTTP 201，`status: "PENDING"`

### Scenario: 24h 後自動 APPROVE（Backend）
**Given** 技能 `my-skill` status=PENDING，createdAt = 25 小時前  
**When** Scheduler 執行 approveExpiredPending()  
**Then** `my-skill` status 改為 APPROVED

### Scenario: 成功舉報（Backend）
**Given** 已登入使用者，技能 `my-skill` 存在且未被自己舉報過  
**When** POST /api/v1/skills/my-skill/report，body `{ "reason": "dangerous content" }`  
**Then** HTTP 200，`{ "reported": true }`，SkillReport 已建立，技能 reportCount +1

### Scenario: 重複舉報（Backend）
**Given** 使用者已舉報過 `my-skill`  
**When** 再次 POST /api/v1/skills/my-skill/report  
**Then** HTTP 409，`{ "error": "Already reported" }`

### Scenario: reportCount 達 5 → SUSPENDED（Backend）
**Given** 技能 reportCount = 5  
**When** Scheduler 執行 suspendOverReported()  
**Then** 技能 status 改為 SUSPENDED

### Scenario: CLI 上傳後顯示 PENDING 提示（CLI）
**Given** push 成功，後端回傳 `status: "PENDING"`  
**When** `skillhub push ./my-skill`  
**Then** CLI 印出 `⏳ Published my-skill v1.0.0 (pending review — auto-approved within 24h)`

### Scenario: SkillCard 顯示 PENDING badge（Frontend）
**Given** 技能 status=PENDING  
**When** 使用者瀏覽首頁  
**Then** SkillCard 顯示淡黃色「Pending」chip（APPROVED 技能不顯示任何 badge）

### Scenario: SUSPENDED 技能詳情頁警告（Frontend）
**Given** 技能 status=SUSPENDED  
**When** 使用者進入詳情頁  
**Then** 頁面頂部顯示橙色警告 banner「此技能因被多次舉報而暫停，請謹慎使用」

### Scenario: 詳情頁舉報流程（Frontend）
**Given** 已登入使用者查看詳情頁  
**When** 點擊「Report」按鈕  
**Then** 開啟 MatDialog，輸入理由後送出，顯示 snackbar「舉報已提交」

### Scenario: Publish 成功後顯示 PENDING 提示（Frontend）
**Given** 使用者填完 /publish 表單送出  
**When** API 回傳 201 + status=PENDING  
**Then** 顯示 snackbar「技能已提交，將於 24 小時內完成審核」

## Implementation TODO

### Backend
- [ ] `SkillStatus` enum（PENDING, APPROVED, REJECTED, SUSPENDED）
- [ ] `Skill` entity 新增 `status`（預設 PENDING）、`reportCount`（預設 0）
- [ ] `SkillReport` entity + `SkillReportRepository`
- [ ] `ContentScanService`（HIGH/LOW/SAFE 三級掃描）
- [ ] `SkillService.publishSkill()` 整合 ContentScanService + 設定初始 status=PENDING
- [ ] `SkillService.reportSkill(slug, reporterId, reason)` — unique check + reportCount +1
- [ ] `SkillService.autoApproveExpiredPending()` + `autoSuspendOverReported()`
- [ ] `SkillPublishResponse` 新增 `status`, `warning` 欄位
- [ ] `SkillSummaryDto` / `SkillDetailDto` 新增 `status` 欄位
- [ ] `SkillController`：POST /report endpoint
- [ ] `SecurityConfig`：`/api/v1/skills/*/report` 需 authenticated
- [ ] `InstallStatsScheduler`（或新 `ModerationScheduler`）加 hourly moderation 任務
- [ ] `DataSeeder`：seeder 假資料設定 status=APPROVED
- [ ] Integration tests（7 scenarios：422, 201-pending, report-200, report-409, scheduler approve, scheduler suspend）

### CLI
- [ ] `cli/src/commands/push.ts`：解析回傳的 `status` 欄位，PENDING 時輸出 `⏳` 提示

### Frontend
- [ ] `skill.model.ts`：`SkillStatus` type + `SkillSummary.status`
- [ ] `skill.service.ts`：`reportSkill(slug, reason)` — POST /report
- [ ] `skill-card.component.ts`：PENDING badge（MatChip）、SUSPENDED badge（MatChip orange）
- [ ] `skill-detail.component.ts`：SUSPENDED 警告 banner、舉報按鈕
- [ ] `ReportDialogComponent`（shared/components/report-dialog/）— MatDialog with reason textarea
- [ ] `publish-skill.component.ts`：成功 snackbar 訊息根據 status 分支
- [ ] Unit tests：SkillCardComponent badge 顯示條件、ReportDialogComponent

## Open Questions
- [ ] SUSPENDED 的技能是否仍可被搜尋？（暫定：仍顯示，但有警告 banner）
- [ ] 舉報閾值 5 是否應設為環境變數？（暫定：hardcode 5，Phase 10 改為可配置）
