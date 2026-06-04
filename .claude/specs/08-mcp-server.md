# Feature: SkillHub MCP Server（Phase 8）

## Context

AI 工具（Claude、GitHub Copilot 等）可透過 MCP 協定直接呼叫 SkillHub API，
讓 AI 在對話中搜尋、瀏覽、安裝技能，不需離開 AI 介面。

## System Boundary

**In scope：**
- MCP Server（Node.js，`@modelcontextprotocol/sdk`）
- 4 個 MCP Tools（見下方 Tool 定義）
- 環境變數 `SKILLHUB_API_URL`（dev: localhost:8080，prod: skillhub.club）
- Monorepo `mcp/` 目錄，可透過 `npx` 或全域安裝啟動

**Out of scope：**
- MCP Resources / Prompts（Phase 9）
- 帳號認證 / 私人技能
- 技能發布

## Domain Model

MCP Server 以 stdio transport 啟動，AI client 透過標準輸入輸出通訊。

```
Claude ──MCP protocol──▶ skillhub-mcp ──HTTP──▶ SkillHub API
                         (stdio)                 (localhost or prod)
```

## Interfaces / API Contract

### MCP Tools

#### `skillhub_search`
```json
input:  {
  "q":        "string (optional)",
  "category": "string (optional)",
  "tag":      "string (optional)",
  "sort":     "trending | latest | top (optional, default trending)",
  "pageSize": "number (optional, default 10)"
}
output: {
  "skills": [{ "slug", "name", "description", "author",
               "version", "installCount", "compatibleTools" }],
  "total": "number"
}
```

#### `skillhub_get_skill`
```json
input:  { "slug": "string" }
output: { "slug", "name", "description", "author", "version",
          "content", "installCount", "compatibleTools" }
error:  { "error": "Skill not found" }
```

#### `skillhub_pull`
```json
input:  {
  "slug":   "string",
  "agent":  "claude | opencode | copilot | codex (optional, default claude)",
  "global": "boolean (optional, default false)",
  "force":  "boolean (optional, default false)"
}
output: { "success": true, "path": "string", "message": "string" }
error:  { "success": false, "message": "string" }
```

#### `skillhub_categories`
```json
input:  {}
output: { "categories": [{ "id", "name", "slug" }] }
```

### MCP Server 啟動設定（Claude Desktop / claude_desktop_config.json）

```json
{
  "mcpServers": {
    "skillhub": {
      "command": "node",
      "args": ["path/to/mcp/dist/index.js"],
      "env": {
        "SKILLHUB_API_URL": "http://localhost:8080"
      }
    }
  }
}
```

## Acceptance Criteria

### Scenario: AI 搜尋技能
**Given** MCP server 連到 SkillHub API
**When** AI 呼叫 `skillhub_search({ q: "TDD" })`
**Then** 回傳含 TDD 相關技能清單，每個 skill 含 slug、name、description

### Scenario: AI 取得技能完整內容
**Given** slug `tdd-starter` 存在
**When** AI 呼叫 `skillhub_get_skill({ slug: "tdd-starter" })`
**Then** 回傳含 `content`（SKILL.md 原文）的完整資訊

### Scenario: AI 安裝技能到本機
**Given** slug `tdd-starter` 存在
**When** AI 呼叫 `skillhub_pull({ slug: "tdd-starter", agent: "claude" })`
**Then** `.claude/skills/tdd-starter/SKILL.md` 被寫入，回傳 `success: true`

### Scenario: slug 不存在時回傳錯誤（不拋 exception）
**When** AI 呼叫 `skillhub_get_skill({ slug: "unknown-skill" })`
**Then** 回傳 `{ error: "Skill not found" }`，MCP server 不崩潰

### Scenario: pull 失敗時回傳錯誤（不拋 exception）
**When** API 無法連線
**Then** `skillhub_pull` 回傳 `{ success: false, message: "..." }`

### Scenario: 列出分類
**When** AI 呼叫 `skillhub_categories({})`
**Then** 回傳所有分類清單

## Implementation TODO

### MCP Server（`mcp/` 目錄）
- [x] 初始化套件（`@modelcontextprotocol/sdk`）
- [x] `src/api.ts`：SkillHub API client（共用邏輯）
- [x] `src/tools/search.ts`：skillhub_search handler
- [x] `src/tools/get-skill.ts`：skillhub_get_skill handler
- [x] `src/tools/pull.ts`：skillhub_pull handler（含本機寫入）
- [x] `src/tools/categories.ts`：skillhub_categories handler
- [x] `src/index.ts`：MCP server 主程式（stdio transport）
- [x] Tests: 各 tool handler（mock API + temp dir）

## Open Questions
- [ ] 正式站 API 是否需要 `SKILLHUB_API_KEY` 認證？（目前暫用 localhost 無需 key）
