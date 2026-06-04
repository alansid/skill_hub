# SkillHub.club 完整功能清單

> 來源：https://www.skillhub.club/
> 整理日期：2026-05-30

---

## 一、網站頁面架構

| 頁面 | URL |
|------|-----|
| 首頁 | `/` |
| Playground | `/playground` |
| Skill 技能廣場（範例） | `/playground/superset-sh-superset-mobile` |
| 技能詳情頁 | `/skills/:skill-id` |
| Skills Guide | `/skills-guide` |
| API 文件 | `/docs/api` |
| 文件中心 | `/docs` |
| 服務條款 | `/terms-and-conditions` |

---

## 二、核心功能模組

### 2.1 Skills Marketplace（技能市集）

- 7,000–15,000+ AI 評估過的技能（持續增加）
- **相容平台**：Claude、GitHub Copilot、Codex、OpenCode
- 技能以 Markdown（`SKILL.md`）格式定義，包含 instructions、metadata、optional resources
- **一鍵安裝**：單一按鈕同時部署到所有已偵測的 AI 工具
- **安裝次數顯示**：opt-in telemetry 顯示安裝數
- **精選集合（Collections）**：人工挑選的技能組合（例如："TDD starter pack"、"Frontend review workflow"）
- **收藏技能**：加入個人收藏清單

### 2.2 搜尋 & 發現系統

- 語義搜尋（Semantic Search，embedding-based）
- 分類篩選（Category Filter）
- 標籤篩選（Tool、Language、Problem Space）
- **Trending**：24 小時熱門排行
- **Latest**：最新上架技能
- **Top**：全時段排行榜
- **Recommend**：個人化推薦
- 瀏覽精選 Collections

### 2.3 Playground（互動試用環境）

- 瀏覽器內直接測試技能，無需本地安裝
- 搭配 Claude Agent SDK 運行
- 從側邊欄選擇技能後即可開始聊天
- 使用 SkillHub Credits 或每日免費額度
- 支援「Bring Your Own Key（BYOK）」無限使用

### 2.4 四大基礎設施服務

| 模組 | 功能說明 |
|------|----------|
| **Mgmt** | 集中式 Registry、生命週期管理、語義版本控制（semver）、Team Namespace、RBAC 存取控制、Audit Log |
| **Extrax** | 高效技能提取、標準化執行環境 |
| **Evals** | 深度可觀測性（Observability）、Tracing、技能工作流效能評估 |
| **Evolve** | 持續技能優化、架構推理、Agent 能力進化 |

### 2.5 技能詳情頁（Skill Detail Page）

- 技能名稱、作者、版本號
- 安裝次數
- 相容 AI 工具清單
- 技能說明 / 適用情境
- 一鍵安裝按鈕
- 加入收藏 / Collections
- 相關技能推薦

---

## 三、API 系統

### 3.1 REST API

- **Base URL**：`https://www.skillhub.club/api/v1`
- **Anthropic 整合 Endpoint**：`https://www.skillhub.club/api/v1/anthropic`
- **認證方式**：
  - `Authorization: Bearer YOUR_API_KEY`
  - `x-api-key` header（推薦）

| Endpoint | Method | 說明 |
|----------|--------|------|
| `/api/v1/skills/search` | POST | 語義搜尋技能，支援 category filter |

**Rate Limit**

| 方案 | 限制 |
|------|------|
| 基本 | 60 req/min |
| 高階 | 100 req/min |

### 3.2 MCP Server

- **NPM 套件**：`@skillhub/mcp-server`
- **環境變數**：`SKILLHUB_API_KEY`
- **功能**：在 AI 助手內直接發現、搜尋、安裝技能
- **相容**：Claude、GitHub Copilot、Codex、OpenCode 等所有 MCP-compatible clients

### 3.3 SDK

- 官方 TypeScript/JS SDK
- 提供 SkillHub API types 與完整 client 封裝

---

## 四、CLI 工具（`@skill-hub/cli`）

### 安裝方式

```bash
# 方式一：npx（推薦，免安裝）
npx @skill-hub/cli install frontend-design --agent claude

# 方式二：全域安裝
npm install -g @skill-hub/cli
skillhub install frontend-design --agent claude
```

### 完整命令清單

#### 發現 & 安裝

| 命令 | 說明 |
|------|------|
| `install <skill>` | 安裝技能至指定 AI agent |
| `search <query>` | 語義搜尋技能 |
| `trending` | 顯示 24 小時熱門技能 |
| `latest` | 顯示最新上架技能 |
| `recommend` | 取得個人化推薦 |
| `top` | 全時段排行榜 |

#### 帳號 & 技能管理

| 命令 | 說明 |
|------|------|
| `login` | 帳號登入（OAuth） |
| `whoami` | 顯示目前登入使用者 |
| `init` | 建立新技能專案 |
| `push` | 同步本地技能至遠端 |
| `pull` | 下載遠端技能更新 |
| `status` | 比較本地與遠端版本差異 |
| `publish` | 公開發布技能 |
| `list` | 列出自己的技能 |

**支援 AI Agents（4）**：Claude、GitHub Copilot、Codex、OpenCode

**其他特性**：
- 個人級（global）或專案級安裝模式
- OAuth 認證 + 加密 token 儲存

---

## 五、Desktop App（SkillHub Desktop）

### 技術棧

| 層 | 技術 |
|----|------|
| 前端 | React 18、TypeScript、Tailwind CSS |
| 後端 | Rust、Tauri v2 |
| 狀態管理 | Zustand |
| 國際化 | react-i18next |
| 編輯器 | @uiw/react-md-editor |

### 功能清單

- 瀏覽 & 搜尋 SkillHub 技能目錄
- 一鍵安裝至多個 AI 工具
- AI 驅動的自訂技能生成
- AI 輔助編輯（擴展、簡化、重寫選取文字）
- 跨工具技能同步
- Collections 管理（分組 & 整理技能）
- 自動偵測已安裝的 AI 工具

### 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `⌘ + K` | 開啟命令面板 / 搜尋 |
| `⌘ + R` | 重新整理工具偵測 |
| `⌘ + ,` | 開啟設定 |

**多語言支援**：英文 / 中文

---

## 六、使用者帳號系統

- 帳號登入 / 註冊
- **Credits 系統**：儲值點數，永不過期，隨時加值
- **每日免費額度**（Playground 試用使用）
- **BYOK（Bring Your Own Key）**模式：自帶 API Key 無限使用
- 收藏清單 / 個人技能庫
- 發布 & 管理自己的技能
- API Key 管理

---


## 九、技能發布 / 創作者生態

- 技能以 `SKILL.md` 格式撰寫（instructions + metadata）
- 透過 CLI `publish` 命令公開上架
- 安裝次數追蹤（opt-in telemetry）
- 版本管理（語義版本 semver）
- 精選 Collections 入選機制

---

## 十、輔助頁面與社群

- Skills Guide（5 分鐘快速教學）
- API Documentation（完整 API 參考）
- 服務條款

---

## 開發優先建議

建議按以下順序實作，對應核心使用路徑：

1. **Marketplace 首頁**：技能列表、精選 Collections
2. **搜尋 / 篩選系統**：語義搜尋、分類、標籤、Trending
3. **Skill 詳情頁**：安裝次數、相容平台、一鍵安裝
4. **帳號系統**：登入 / 註冊、Credits、收藏
5. **Playground**：瀏覽器內試用環境
6. **技能發布流程**：創作者上架 & 版本管理
7. **API & CLI**：開發者整合工具
8. **Desktop App**：進階桌面管理工具

---

*資料來源：*
- [SkillHub 首頁](https://www.skillhub.club/)
- [SkillHub Playground](https://www.skillhub.club/playground)
- [Skills Tutorial](https://www.skillhub.club/skills-guide)
- [API Documentation](https://www.skillhub.club/docs/api)
- [Pricing](https://www.skillhub.club/pricing)
- [GitHub: skillhub-desktop](https://github.com/skillhub-club/skillhub-desktop)
- [GitHub: skillhub-club CLI](https://github.com/skillhub-club/cli)
- [GitHub: skillhub-club organization](https://github.com/skillhub-club)
