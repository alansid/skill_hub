# Feature: Local Skill Management（Phase 10）

## Context

使用者可以用 `skillhub pull` 安裝技能，但目前沒有任何方式追蹤「我裝了哪些技能、裝了哪個版本、有沒有新版可更新」。
類比 npm 的 `package-lock.json`，本 Phase 引入 **lockfile** 記錄本機安裝狀態，並提供 `list / outdated / update / remove` 等指令完成技能生命週期管理。

## System Boundary

**In scope：**
- Lockfile：`~/.skillhub-lock.json`（全域）/ `.skillhub-lock.json`（專案目錄，與 agent 路徑同層）
- CLI 指令：`skillhub list`、`skillhub outdated`、`skillhub update`、`skillhub remove`
- `skillhub pull` 成功後自動寫入 lockfile

**Out of scope（此 Phase）：**
- Desktop App GUI 顯示已安裝清單（Phase 12）
- 自動背景更新（Phase 12）
- 多工作區 / monorepo lockfile 合併

## Domain Model

### Lockfile 格式（`~/.skillhub-lock.json` 或 `.skillhub-lock.json`）

```json
{
  "skills": {
    "tdd-starter": {
      "version": "1.0.0",
      "agent": "claude",
      "installedAt": "2026-06-04T10:00:00Z",
      "global": false,
      "path": ".claude/skills/tdd-starter/SKILL.md"
    },
    "code-review": {
      "version": "2.1.0",
      "agent": "claude",
      "installedAt": "2026-05-01T08:00:00Z",
      "global": true,
      "path": "/Users/user/.claude/skills/code-review/SKILL.md"
    }
  }
}
```

**Lockfile 路徑決策：**
- `--global` 安裝 → `~/.skillhub-lock.json`
- 專案安裝 → `<cwd>/.skillhub-lock.json`

### LockEntry 型別

```ts
interface LockEntry {
  version: string;
  agent: string;
  installedAt: string;   // ISO 8601
  global: boolean;
  path: string;          // 已安裝的 SKILL.md 絕對路徑
}

interface LockFile {
  skills: Record<string, LockEntry>;
}
```

## Interfaces / API Contract

### CLI Interface

```bash
skillhub list [--agent claude] [--global]
  # 讀 lockfile，列出已安裝技能
  # 輸出範例：
  #   tdd-starter    v1.0.0   claude   (project)   2026-06-04
  #   code-review    v2.1.0   claude   (global)    2026-05-01

skillhub outdated [--agent claude] [--global]
  # 對比 lockfile 版本 vs API 最新版本，列出可更新者
  # 輸出範例：
  #   tdd-starter    v1.0.0  →  v1.2.0   (update available)

skillhub update [<slug>] [--agent <agent>] [--all] [--global]
  # 更新單一或全部已安裝技能到最新版
  # --all：更新 lockfile 中全部技能
  # 無 slug 無 --all：顯示提示

skillhub remove <slug> [--agent <agent>] [--global]
  # 刪除本機技能檔案 + 從 lockfile 移除
  # 若技能有 references/ 子目錄，整個目錄一起刪除
```

### `cli/src/lockfile.ts` 模組介面

```ts
function readLock(global: boolean): LockFile
function writeLock(global: boolean, lock: LockFile): void
function addLockEntry(slug: string, entry: LockEntry, global: boolean): void
function removeLockEntry(slug: string, global: boolean): void
function getLockEntry(slug: string, global: boolean): LockEntry | undefined
```

### 修改：`skillhub pull` 加 lockfile 寫入

`pull` 成功安裝後：
```ts
addLockEntry(slug, {
  version: data.version,
  agent,
  installedAt: new Date().toISOString(),
  global: isGlobal,
  path: installPath
}, isGlobal);
```

### API 依賴

`list` 和 `outdated` 需要比對遠端最新版本，呼叫：
```
GET /api/v1/skills/{slug}   → SkillDetailDto.version
```

## Acceptance Criteria

### Scenario: pull 後 lockfile 有記錄
**Given** slug `tdd-starter` 存在  
**When** `skillhub pull tdd-starter`  
**Then** `.skillhub-lock.json` 新增 `tdd-starter` entry，version 與 API 回傳一致

### Scenario: list 顯示已安裝清單
**Given** lockfile 含 `tdd-starter v1.0.0`  
**When** `skillhub list`  
**Then** stdout 顯示 `tdd-starter   v1.0.0   claude   (project)   <date>`

### Scenario: list 空清單
**Given** lockfile 不存在或 skills 為空  
**When** `skillhub list`  
**Then** stdout 顯示 `No skills installed.`

### Scenario: outdated 找到過期版本
**Given** lockfile `tdd-starter v1.0.0`，API 最新 `v1.2.0`  
**When** `skillhub outdated`  
**Then** stdout 顯示 `tdd-starter   v1.0.0 → v1.2.0   (update available)`

### Scenario: outdated 全部最新
**Given** 所有 lockfile 版本 = API 最新版本  
**When** `skillhub outdated`  
**Then** stdout 顯示 `All skills are up to date.`

### Scenario: update 單一技能
**Given** lockfile `tdd-starter v1.0.0`，API 最新 `v1.2.0`  
**When** `skillhub update tdd-starter`  
**Then** `.claude/skills/tdd-starter/SKILL.md` 被更新，lockfile version 改為 `1.2.0`

### Scenario: update --all
**Given** lockfile 含 2 個過期技能  
**When** `skillhub update --all`  
**Then** 兩個技能都更新，lockfile 版本全部更新，exit code 0

### Scenario: remove 技能
**Given** `.claude/skills/tdd-starter/SKILL.md` 存在，lockfile 有 entry  
**When** `skillhub remove tdd-starter`  
**Then** 檔案（含目錄）被刪除，lockfile entry 移除，exit code 0

### Scenario: remove 不存在的技能
**Given** lockfile 無 `unknown-skill` entry  
**When** `skillhub remove unknown-skill`  
**Then** 印出 `unknown-skill is not installed.`，exit code 1

## Implementation TODO

### CLI
- [ ] `cli/src/lockfile.ts`：`readLock / writeLock / addLockEntry / removeLockEntry / getLockEntry`
- [ ] `cli/src/commands/pull.ts`：成功安裝後呼叫 `addLockEntry()`
- [ ] `cli/src/commands/list.ts`：讀 lockfile + 格式化輸出
- [ ] `cli/src/commands/outdated.ts`：讀 lockfile + 批次呼叫 API 比對版本
- [ ] `cli/src/commands/update.ts`：呼叫 `pullSkill()` + 更新 lockfile
- [ ] `cli/src/commands/remove.ts`：刪除檔案/目錄 + 更新 lockfile
- [ ] `cli/src/index.ts`：註冊 `list`, `outdated`, `update`, `remove` 指令
- [ ] `cli/src/api.ts`：`getSkillVersion(slug)` — GET /api/v1/skills/{slug}（取 version 欄位）
- [ ] Unit tests：lockfile read/write、list/outdated/update/remove 各指令（mock API + temp dir）

## Open Questions
- [ ] `update` 是否需要確認提示（類似 pull 的覆蓋確認）？（暫定：否，update 預設直接覆蓋）
- [ ] `remove` 是否刪除空的 `.claude/skills/` 父目錄？（暫定：否，只刪技能目錄）
