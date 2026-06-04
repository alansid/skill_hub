# Feature: Pull Skill to Local（Phase 6 – CLI Pull）

## Context

使用者在 Marketplace 發現技能後，需要簡單的方式將技能下載到本機 AI 工具的技能目錄
（例如 Claude Code 的 `.claude/skills/`），讓技能立即可用。

目前 Phase 2 的詳情頁僅有「複製安裝指令」（純文字複製），使用者還需手動建立目錄與
檔案。本功能透過 CLI 指令 `skillhub pull` 一步完成下載 + 安裝。

## System Boundary

**In scope：**
- CLI 指令 `skillhub pull <slug> [options]`
- 後端 API endpoint：`GET /api/v1/skills/{slug}/download`（回傳 SKILL.md 原始內容）
- 本機寫入邏輯：依目標 agent 決定安裝路徑
- Dry-run 模式：僅印出路徑預覽，不實際寫入
- --force 旗標：強制覆蓋已有技能
- --global 旗標：安裝至使用者全域目錄
- 詳情頁 UI 更新：「複製安裝指令」改為顯示 CLI pull 指令
- --agent 支援逗號分隔多 agent：`--agent claude,opencode`
- Config 檔：`~/.skillhubrc.json`，儲存 `defaultAgent`
- `skillhub config set default-agent <agent>` 指令
- `skillhub config get default-agent` 指令

**Out of scope（此 Phase）：**
- 版本衝突解決 / 多版本並存（Phase 7）
- 自動偵測已安裝 AI 工具（Desktop App）
- `skillhub push`（上傳本機技能）（Phase 7）
- 需認證的私人技能

## Domain Model

### Config 檔

| 欄位 | 型別 | 說明 |
|------|------|------|
| `defaultAgent` | `string` | pull 時的預設 agent，未設定則為 `claude` |

路徑：`~/.skillhubrc.json`（可用 `SKILLHUB_CONFIG_PATH` 環境變數覆寫）

### 本機安裝路徑（per agent）

| Agent          | Project-level 路徑                        | Global 路徑                        |
|----------------|------------------------------------------|------------------------------------|
| `claude`（預設）| `.claude/skills/<slug>/SKILL.md`         | `~/.claude/skills/<slug>/SKILL.md` |
| `copilot`      | `.github/copilot/skills/<slug>/SKILL.md` | N/A（Phase 6 暫不支援）            |
| `codex`        | `.codex/skills/<slug>/SKILL.md`          | N/A                                |
| `opencode`     | `.opencode/skills/<slug>/SKILL.md`       | N/A                                |

### SkillDownloadResponse

```json
{
  "slug": "string",
  "name": "string",
  "version": "string",
  "content": "string"
}
```

## Interfaces / API Contract

### REST Endpoint（Backend）

```
GET /api/v1/skills/{slug}/download
  Response 200: SkillDownloadResponse
  Response 404: { "error": "Skill not found" }
```

```java
record SkillDownloadResponse(
  String slug,
  String name,
  String version,
  String content   // SKILL.md 完整 Markdown 原文
) {}
```

### CLI Interface

```bash
skillhub pull <slug>                               # 使用 defaultAgent（預設 claude）
skillhub pull <slug> --agent claude                # 單一 agent
skillhub pull <slug> --agent claude,opencode       # 多 agent，同時安裝
skillhub pull <slug> --global                      # 安裝至使用者全域目錄
skillhub pull <slug> --dry-run                     # 只印路徑，不寫入
skillhub pull <slug> --force                       # 強制覆蓋已有技能

skillhub config set default-agent opencode        # 設定預設 agent
skillhub config get default-agent                 # 查看目前設定
```

**預設行為：**
- `--agent` 未指定時讀取 `~/.skillhubrc.json` 的 `defaultAgent`，再無設定才用 `claude`
- 目錄不存在時自動建立（mkdir -p）
- 技能已存在：顯示確認提示（Yes/No）
- 多 agent 時逐一安裝，部分失敗不中止，全部跑完後 exit code 1

## Acceptance Criteria

### Scenario: 成功下載並安裝技能
**Given** slug `code-review` 的技能存在
**When** CLI 執行 `skillhub pull code-review`
**Then** `.claude/skills/code-review/SKILL.md` 被建立，內容與 API content 相同，exit code 0

### Scenario: 技能不存在
**Given** slug `unknown-skill` 不存在
**When** CLI 執行 `skillhub pull unknown-skill`
**Then** CLI 印出錯誤訊息，exit code 1，無任何檔案被建立

### Scenario: Dry-run 不寫入
**Given** slug `code-review` 存在
**When** CLI 執行 `skillhub pull code-review --dry-run`
**Then** 印出安裝路徑預覽，檔案系統無變更

### Scenario: 技能已存在 — 使用者取消
**Given** `.claude/skills/code-review/SKILL.md` 已存在
**When** CLI 執行 `skillhub pull code-review`，使用者在提示中選「No」
**Then** 現有檔案不被覆蓋，exit code 0

### Scenario: --force 強制覆蓋
**Given** `.claude/skills/code-review/SKILL.md` 已存在
**When** CLI 執行 `skillhub pull code-review --force`
**Then** 技能被覆蓋，exit code 0

### Scenario: --global 安裝至全域
**Given** slug `code-review` 存在
**When** CLI 執行 `skillhub pull code-review --global`
**Then** `~/.claude/skills/code-review/SKILL.md` 被建立

### Scenario: API 回傳完整 SkillDownloadResponse
**Given** slug `code-review` 存在
**When** GET /api/v1/skills/code-review/download
**Then** HTTP 200 + JSON 含 slug、name、version、content

### Scenario: API 技能不存在
**Given** slug `unknown-skill` 不存在
**When** GET /api/v1/skills/unknown-skill/download
**Then** HTTP 404

### Scenario: 設定預設 agent
**Given** 使用者執行 `skillhub config set default-agent opencode`
**Then** `~/.skillhubrc.json` 的 `defaultAgent` 為 `opencode`

### Scenario: pull 使用預設 agent
**Given** `~/.skillhubrc.json` 中 `defaultAgent = opencode`
**When** `skillhub pull tdd-starter`（不帶 --agent）
**Then** `.opencode/skills/tdd-starter/SKILL.md` 被建立

### Scenario: 多 agent 同時安裝
**Given** slug `tdd-starter` 存在
**When** `skillhub pull tdd-starter --agent claude,opencode`
**Then** `.claude/skills/tdd-starter/SKILL.md` 被建立
**And** `.opencode/skills/tdd-starter/SKILL.md` 被建立

### Scenario: 多 agent 部分失敗
**Given** `--agent claude,opencode`，opencode 路徑無法寫入
**When** `skillhub pull tdd-starter --agent claude,opencode`
**Then** claude 安裝成功，opencode 印出錯誤，整體拋出錯誤

### Scenario: 詳情頁顯示 pull 指令
**Given** 使用者在 `/skills/code-review` 詳情頁
**When** 查看安裝區塊
**Then** 顯示可複製的指令 `npx @skill-hub/cli pull code-review`

## Implementation TODO

### Backend
- [x] `SkillDownloadResponse` DTO
- [x] `SkillService.getSkillDownload(slug)`
- [x] `SkillController`: GET /api/v1/skills/{slug}/download
- [x] Integration tests: API Acceptance Criteria（slug 存在 → 200, 不存在 → 404）

### Frontend
- [x] 詳情頁「安裝方式」區塊改為顯示 `npx @skill-hub/cli pull {slug}`
- [x] Unit test: 更新 SkillDetailComponent

### CLI（新 Node.js 套件，`cli/` 目錄）
- [x] 初始化套件（commander）
- [x] `pull` command 實作
- [x] SkillHub API client（呼叫 /download endpoint）
- [x] 本機路徑解析（per-agent mapping）
- [x] 檔案寫入（mkdir -p + writeFile）
- [x] --dry-run / --force / --global 旗標
- [x] 覆蓋確認提示（readline）
- [x] Integration tests（mock API + temp dir）
- [x] --agent 支援逗號分隔多 agent
- [x] 多 agent 逐一安裝，部分失敗不中止
- [x] `src/config.ts`：讀寫 `~/.skillhubrc.json`
- [x] `skillhub config set/get` 指令
- [x] pull 未指定 --agent 時讀 config defaultAgent
- [x] Tests: 多 agent、config set/get、defaultAgent

## Open Questions
- [x] CLI 套件放 monorepo（`cli/`）→ 已建立在 `cli/` 目錄
- [x] API base URL：環境變數 `SKILLHUB_API_URL`，預設 `http://localhost:8080`（dev）
- [ ] `--agent copilot/codex/opencode` 路徑規則需確認各工具 convention（Phase 7）
