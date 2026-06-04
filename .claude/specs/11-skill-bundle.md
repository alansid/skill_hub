# Feature: Skill Bundle（多檔支援）（Phase 11）

## Context

現有的上傳 / 下載只支援單一 `SKILL.md` 檔案。但本專案已安裝的技能（如 `spec-test-driven-development`）使用了 `references/` 子目錄存放多份 Markdown 參考文件，SKILL.md 內部以相對路徑引用這些檔案。

目前若用 `skillhub push` 上傳這類技能，`references/` 全部遺失；`pull` 下來也只有 `SKILL.md`，技能功能不完整。

本 Phase 讓技能可以攜帶任意數量的附加檔案，push / pull / download API 都支援多檔傳輸。

## System Boundary

**In scope：**
- 後端：`SkillFile` entity（技能附加檔案）
- 後端：`POST /api/v1/skills` 接受 `files[]`（optional）
- 後端：`GET /api/v1/skills/{slug}/download` 回傳 `files[]`
- 後端：`GET /api/v1/skills/{slug}/files` 列出附加檔案清單
- CLI：`push` 自動掃描 SKILL.md 所在目錄，收集所有子目錄 `.md` 檔案
- CLI：`pull` 依 `files[]` 寫入對應子路徑
- MCP：`skillhub_pull` tool 同步支援多檔

**Out of scope（此 Phase）：**
- 圖片 / 二進位資產支援（僅支援文字 .md 檔案）
- ZIP 打包傳輸（直接用 JSON array）
- 前端發布表單的 references/ UI（Phase 12）

## Domain Model

### SkillFile Entity

```java
// entity/SkillFile.java
@Entity
@Table(name = "skill_files")
SkillFile {
  id       String   // UUID PK
  skill    Skill    // ManyToOne（FK → skills.id）
  path     String   // 相對路徑，如 "references/tdd-loop.md"（不含 SKILL.md 本身）
  content  String   // TEXT
}
```

**路徑規則：**
- 相對於技能根目錄（SKILL.md 所在位置）
- 只接受以字母、數字、連字號、底線、斜線組成的路徑（禁止 `../`、絕對路徑、Windows 路徑）
- 路徑最大長度：255 字元

### SkillFileInput DTO（上傳時）

```java
record SkillFileInput(
  @Pattern(regexp = "^[a-zA-Z0-9_\\-/]+\\.md$") String path,
  @NotBlank String content
) {}
```

### SkillFileDto（回傳時）

```java
record SkillFileDto(String path, String content) {}
```

### SkillPublishRequest 擴展

```java
record SkillPublishRequest(
  // ... 現有欄位不變 ...
  @Size(max = 20) List<SkillFileInput> files   // optional，最多 20 個附加檔案
) {}
```

### SkillDownloadResponse 擴展

```java
record SkillDownloadResponse(
  String slug,
  String name,
  String version,
  String content,                  // SKILL.md 原文（不變）
  List<SkillFileDto> files         // 附加檔案（若無則空 list）
) {}
```

## Interfaces / API Contract

### 修改：POST /api/v1/skills（publishSkill）

Request body 新增 `files` 欄位（optional）：
```json
{
  "slug": "spec-tdd",
  "name": "Spec TDD",
  // ... 其他欄位 ...
  "files": [
    { "path": "references/tdd-loop.md", "content": "# TDD Loop\n..." },
    { "path": "references/anti-patterns.md", "content": "# Anti Patterns\n..." }
  ]
}
```

後端驗證：
- `files` 陣列最多 20 個元素
- 每個 `path` 符合 `^[a-zA-Z0-9_\-/]+\.md$`（禁止 `../`）
- 每個 `content` 不得為空，且個別 content ≤ 50KB
- `path` 在同一技能內不得重複

### 修改：GET /api/v1/skills/{slug}/download

```
Response 200: SkillDownloadResponse（含 files[]）
```

### 新增：GET /api/v1/skills/{slug}/files

```
Response 200: { "files": SkillFileDto[] }
Response 404: { "error": "Skill not found" }
```

### CLI：`skillhub push` 自動掃描

```bash
skillhub push <path>
```

**掃描邏輯：**
1. 找到 `<path>/SKILL.md`（或 `<path>` 直接是 SKILL.md）
2. 掃描同目錄下所有 `**/*.md` 檔案（排除 SKILL.md 本身）
3. 計算相對路徑（如 `references/tdd-loop.md`）
4. 收集成 `files[]` 一起上傳
5. 若無附加 `.md` 檔案則 `files: []`

### CLI：`skillhub pull` 多檔寫入

```bash
skillhub pull <slug>
```

**寫入邏輯（修改 `pullSkill()`）：**
1. 呼叫 GET /download，取得 `files[]`
2. 先寫入 `SKILL.md`（同現有邏輯）
3. 對每個 `SkillFileDto`：
   - 計算 `installDir/file.path`（如 `.claude/skills/spec-tdd/references/tdd-loop.md`）
   - `mkdir -p` 父目錄
   - 寫入 content

### MCP：`skillhub_pull` tool

同 CLI 邏輯，從 download response 的 `files[]` 逐一寫入。

## Acceptance Criteria

### Scenario: push 含 references/ → 成功上傳多檔（Backend）
**Given** `./spec-tdd/SKILL.md` + `./spec-tdd/references/tdd-loop.md` + `./spec-tdd/references/anti-patterns.md`  
**When** `skillhub push ./spec-tdd`  
**Then** API 回傳 201，資料庫 `skill_files` 新增 2 筆記錄，path 分別為 `references/tdd-loop.md` / `references/anti-patterns.md`

### Scenario: push 無附加檔案 → 向下相容（Backend）
**Given** `./my-skill/SKILL.md`（無 references/）  
**When** `skillhub push ./my-skill`  
**Then** API 回傳 201，`skill_files` 無新記錄，行為與原有一致

### Scenario: 路徑包含 `../`（Backend）
**Given** 上傳 files 含 `{ "path": "../etc/passwd", "content": "..." }`  
**When** POST /api/v1/skills  
**Then** HTTP 400，驗證錯誤

### Scenario: download 含 files[]（Backend）
**Given** `spec-tdd` 有 2 個附加檔案  
**When** GET /api/v1/skills/spec-tdd/download  
**Then** HTTP 200，response.files 長度為 2，content 與上傳一致

### Scenario: pull 後 references/ 完整還原（CLI）
**Given** API download 回傳含 2 個 files  
**When** `skillhub pull spec-tdd`  
**Then** `.claude/skills/spec-tdd/SKILL.md` 存在，`.claude/skills/spec-tdd/references/tdd-loop.md` 存在，`.claude/skills/spec-tdd/references/anti-patterns.md` 存在

### Scenario: pull 無附加檔案 → 向下相容（CLI）
**Given** API download 回傳 `files: []`  
**When** `skillhub pull simple-skill`  
**Then** 只有 `.claude/skills/simple-skill/SKILL.md` 被建立，無錯誤

### Scenario: MCP pull 含多檔（MCP）
**Given** `skillhub_pull({ slug: "spec-tdd", agent: "claude" })` via MCP  
**When** API 回傳含 files[]  
**Then** 所有附加檔案寫入正確路徑，回傳 `{ success: true }`

## Implementation TODO

### Backend
- [ ] `SkillFile` entity + `SkillFileRepository`
- [ ] `SkillFileInput` DTO（含路徑 pattern validation）
- [ ] `SkillFileDto` DTO
- [ ] `SkillPublishRequest` 新增 `files` 欄位（optional，`@Valid @Size(max=20)`）
- [ ] `SkillDownloadResponse` 新增 `files` 欄位
- [ ] `SkillService.publishSkill()`：儲存 `files[]` → `SkillFile` entities
- [ ] `SkillService.getSkillDownload()`：JOIN 取出 `SkillFile` 一起回傳
- [ ] `SkillController`：GET /api/v1/skills/{slug}/files endpoint
- [ ] Integration tests（5 scenarios：push 多檔、push 零檔、路徑攻擊、download 含 files、download 零檔）

### CLI
- [ ] `cli/src/commands/push.ts`：掃描目錄收集 `*.md`（排除 SKILL.md），組成 `files[]` 一起上傳
- [ ] `cli/src/commands/pull.ts`：收到 `files[]` 後逐一寫入子路徑（`mkdir -p` + `writeFile`）
- [ ] Unit tests：push 多檔掃描、pull 多檔寫入（mock API + temp dir）

### MCP
- [ ] `mcp/src/tools/pull.ts`：同 CLI，逐一寫入 `files[]`
- [ ] `mcp/src/api.ts`：`SkillDownload` interface 新增 `files: SkillFileDto[]`
- [ ] Tests：pull 多檔（mock API + temp dir）

## Open Questions
- [ ] 附加檔案是否隨技能版本更新一起快照到 `SkillVersion`？（暫定：是，Phase 7 SkillVersion 應含 files[]）
- [ ] 附加檔案是否有個別大小限制？（暫定：每個 content ≤ 50KB，總量 ≤ 200KB）
