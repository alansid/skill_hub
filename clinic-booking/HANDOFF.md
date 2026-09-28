# 任老師 預約系統 — 交接說明（給接手的 AI）

> 這份文件是給接手的 AI 助理看的，整理系統現況、業務規則、部署方式與待辦事項。
> 最後更新：2026-09-27，版本 **beta-0.0.3**。

## 0. 先讀這裡：與使用者合作的方式

- 使用者**不是工程師**。請全程用**繁體中文**，**一步一步**說明，少用術語。
- 使用者會把改動直接拿去用，每次改完都要：跑測試 → 打包 → 本機模擬實測 → 推送 → 部署 → 用 API 確認部署成功，最後清楚回報。
- **不要要求使用者把 API 權杖或密碼貼在對話裡。** 權杖請使用者設定成環境變數（見第 6 節）。
- 本文件**刻意不記錄**管理密碼、API 權杖、帳號 ID，也不記錄客人的個資。需要時請向使用者確認。

## 1. 系統是什麼

一家小型個人工作室（「任老師」）的線上預約系統，用來取代手寫預約本。

| 頁面 | 網址（目前的測試站） | 使用者 |
|---|---|---|
| 客人預約頁 | `https://ren-clinic.pages.dev/` | 客人：選日期、時段，填姓名、電話 |
| 管理頁 | `https://ren-clinic.pages.dev/admin` | 管理員：登記本、搜尋、備份、休息日設定 |

- 目前的站架在**使用者自己的 Cloudflare 帳號，只是測試用**，裡面的資料都可以丟掉。
- 正式站**即將改部署到「對方」（工作室）的 Cloudflare 帳號**，見第 7 節。
- 來客量很小（一天遠少於 50 人），Cloudflare 免費方案綽綽有餘，不會產生費用。

## 2. 程式碼位置

- 儲存庫：`alansid/skill_hub`，資料夾 `clinic-booking/`
- **最新程式在分支 `claude/stoic-bohr-mfm59z`。** 這個分支是從 `claude/chinese-medicine-booking-site-kbod8t` 開出來的，後面多了 6 個 commit（第 9 節）。原分支**沒有**這些修改，之後要以哪個分支為主，請先和使用者確認。

## 3. 架構

| 部分 | 技術 |
|---|---|
| 前端 | React 19 + TypeScript + Vite（`src/`），兩個入口：`index.html`（客人）、`admin.html`（管理） |
| 後端 | Cloudflare Pages Functions：`functions/api/[[path]].ts` → `server/router.ts` |
| 資料庫 | Cloudflare D1（SQLite），繫結名稱 **`DB`** |
| 管理密碼 | Pages 的 Secret **`ADMIN_PASSWORD`** |
| 示範模式 | `npm run dev` 時資料存在瀏覽器 localStorage（`src/data/demoApi.ts`、`src/patient/api.ts`），密碼 `demo1234` |

### 重要檔案

| 檔案 | 內容 |
|---|---|
| `src/lib/rules.ts` | 客人預約規則（**前端示範模式與後端共用**） |
| `src/lib/schedule.ts` | 預設設定 `DEFAULT_SETTINGS`、時段、各星期的營業時段、`scheduleFor()` |
| `src/lib/phone.ts` | 電話驗證 `isBookingPhone()`、顯示格式 `formatPhone()` |
| `src/data/types.ts` | 型別，包括 `ClinicSettings`（所有可調設定） |
| `server/router.ts` | 所有 API |
| `server/schema.ts` | 資料表定義（每次啟動用 `CREATE ... IF NOT EXISTS` 自動建立，不用手動 migrate） |
| `server/store.ts` | 讀取設定：`DEFAULT_SETTINGS` 與資料庫 `settings.data`（JSON）做淺層合併 |
| `src/version.ts` | 頁面最下面顯示的版號 |

### 資料表

`settings`、`day_overrides`、`bookings`、`sessions`、`login_attempts`、`lookup_log`、`meta`

- 預約只會「取消」，不會刪除。
- 唯一索引保證同一天同一時段只有一筆有效、非加號的預約。

### API

- 公開：`GET /api/public/config`、`GET /api/public/availability`、`POST /api/public/book`、`POST /api/public/my-bookings`、`POST /api/public/cancel`
- 管理（需登入）：`POST /api/admin/login`、`/logout`、`/me`、`/version`、`/settings`、`/overrides`（GET/PUT/DELETE）、`/bookings`（GET/POST/PATCH）、`/search`、`/export`

## 4. 目前的業務規則

### 營業日與時段

| 星期 | 時段 |
|---|---|
| 週一、週五 | 休息 |
| 週二、三、四（平日） | **只有下午、晚上**：14:30、15:10、16:30、17:10、19:30、20:10 |
| 週六、日 | 全天：08:30、09:10、09:50、10:30、11:10 ＋ 上面 6 個 |

- 由 `ClinicSettings.weekdaySlots` 控制（key 是星期幾，0 = 星期日），預設值寫在 `src/lib/schedule.ts`。
- 管理員可以用「本日營業設定」臨時休息，或多開時段（寫入 `day_overrides`）。

### 客人線上預約

- 可預約今天起 90 天內；看診前 30 分鐘內不能線上預約。
- 電話：**台灣的手機或任何區碼的市話**，規則是 `0` 開頭、含區碼共 9～10 碼（`/^0\d{8,9}$/`）。
- **同一支電話同一天可以約多個時段**，不管姓名。「同一天只能約一個」的限制已經拿掉。
- 每支電話最多幾筆「還沒到的線上預約」，由設定 `maxOnlinePerPhone` 決定，**程式預設值是 `9999`（等於不限制）**，新帳號部署後不用另外設定。
- 客人可以用電話查詢、取消自己的預約；姓名會遮蔽（王○明）。同一個網路位置一小時最多查詢 30 次。

### 管理員

- 登入後 30 天內不用再輸入密碼。連續輸錯 5 次暫停 15 分鐘（依網路位置計算）。
- 管理員登記預約時**只有日期、時間、姓名是必填**，電話可以空白；時間可以不在固定時段上，也不受平日上午不開放的限制。
- 同一個時段要登記第二人時，要標成「加號」。
- 管理頁每 10 秒檢查一次資料有沒有更新；畫面在背景時會暫停。

## 5. 用字規範（使用者明確要求）

畫面上**不可以出現**醫療相關用字：

| 不要用 | 改用 |
|---|---|
| 看診 | 營業（例如「營業日」「恢復營業」）；「尚未看診」→「還沒到」 |
| 休診 | 休息 |
| 開診 | 營業 |
| 病人 | 客人 |
| 診所 | 管理員（語意不通時改寫句子） |
| 中醫、醫師、Clinic、掛號 | 拿掉或改寫；名稱就叫「任老師」 |

- 程式內部名稱（例如 `ClinicSettings`、`clinicName`、`cancelledBy: 'patient'`）和程式註解不用改，因為畫面上看不到。
- `README.md` 裡還留著一些舊用字（例如「診所管理頁」），但它只給工程師看。

## 6. 開發與部署

### 本機

```bash
cd clinic-booking
npm ci
npm test            # 單元測試（目前 28 項）
npm run build       # 型別檢查 + 打包到 dist/
npm run dev         # 示範模式 http://localhost:5173/ 、/admin.html（密碼 demo1234）
npm run dev:cloud   # 模擬正式環境 http://localhost:8788/（本機 D1，密碼 demo1234）
```

### 部署到 Cloudflare

網站採用**直接上傳**（Direct Upload），沒有接 GitHub，所以改程式後要手動部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name ren-clinic --branch main --commit-dirty=true
```

- 需要環境變數 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。權杖權限：Account → Cloudflare Pages: Edit、Account → D1: Edit。
- Pages 專案的 production 設定要有：D1 繫結 `DB`、Secret `ADMIN_PASSWORD`、`compatibility_date` = `2025-09-01`。
- **改了 `ADMIN_PASSWORD` 之後要重新部署一次才會生效。**
- 部署後用 API 確認 `GET /accounts/{id}/pages/projects/ren-clinic` 的 `canonical_deployment` 是 production、`success`，而且 `env_vars` 裡有 `ADMIN_PASSWORD`。

### 版號

- 改 `src/version.ts` 的 `APP_VERSION`（格式 `beta-0.0.X`），並用 `npm version 0.0.X-beta --no-git-tag-version` 同步 `package.json`。
- 使用者靠頁面最下面的版號確認手機上看到的是不是新版，所以**每次部署有畫面或行為變更時就升一版**。

### 已知的環境限制（Claude Code 雲端環境）

- 雲端環境的網路**連不到 `*.pages.dev`**，沒辦法直接測試正式站。替代做法：用同一份 `dist/` 跑 `wrangler pages dev` 在本機實測 API，再用 Cloudflare API 確認部署狀態，並請使用者用手機確認。
- `api.cloudflare.com` 可以連（D1 查詢、Pages 設定都走 API）。
- 直接修改或刪除正式資料庫的資料，可能會被安全檢查擋下；要先取得使用者明確同意。
- 環境變數改了之後，要開**新對話**才會生效。

## 7. 待辦事項

1. **部署到對方的 Cloudflare 帳號**（使用者預計近期進行）
   - 使用者把對方的權杖、帳號 ID 設成環境變數後，在新對話進行。
   - 先用 API 確認環境變數指到的是**新帳號**：舊測試帳號裡有 `ren-clinic`、`mrt-food`；如果看到這兩個，就代表還是舊帳號，請停下來問使用者。
   - 步驟：建立 D1 `ren-clinic-db`（`primary_location_hint: apac`）→ 建立 Pages 專案 `ren-clinic`（名稱被佔用時網址會不同）→ 接上 `DB` → 設 `ADMIN_PASSWORD`（新密碼和使用者確認）→ 部署 → 實測 → 把網址和密碼告訴使用者。
   - 舊測試站的資料**不用搬**。
2. ~~`maxOnlinePerPhone` 預設值~~：已在程式改成 9999（不限制）。
3. **匯入手寫預約本**：使用者要把手寫資料（今天以後的預約）匯入新站。
   - 使用者會在對話裡貼上 CSV（`date,time,name,phone,notes`）。已在舊測試站匯入過 15 筆，做法：每筆用 D1 API 執行 `INSERT ... SELECT`，同時段已有非加號預約就自動設 `is_extra = 1`，並用 `WHERE NOT EXISTS`（同日同時段同名、`source='admin'`）防止重複匯入；最後執行 `UPDATE meta SET value = value + 1 WHERE key = 'version'` 通知管理頁更新。匯入前先用 Python sqlite3 載入 `server/schema.ts` 的資料表定義，做一次模擬。
   - 另一種做法：使用者拍照 → AI 整理成表格（日期、時間、姓名、電話、備註）→ **使用者核對**（特別是電話）→ 用管理 API 或 D1 批次寫入，`source = 'admin'`。
   - 有些預約**沒留電話**：可以匯入，電話留空即可（客人就無法自己上網查詢或取消）。
   - 沒寫姓名的預約，先填「（未留姓名）」，再請使用者確認。
   - 同一個時段有兩人時，第二位設 `is_extra = 1`；時間不在固定時段上也照實登記。
   - 匯入前先在本機模擬跑一次。
4. 舊測試站的資料庫裡有 15 筆從紙本匯入的真實預約，其中 2 筆因為時段被測試預約佔住而成為加號。新站匯入時不會有這個問題。
5. 舊測試站（使用者帳號裡的 `ren-clinic` 與 `ren-clinic-db`）要不要刪除，使用者還沒明確決定；**沒有明確指示前不要刪**。
6. 分支整理：`claude/stoic-bohr-mfm59z` 要不要合併回 `claude/chinese-medicine-booking-site-kbod8t`，或開 PR 到 main，還沒決定。

## 8. 已確認的決定（不要再改回來）

- 同一支電話同一天可以約多個時段（使用者先選了「同名不可重複」，後來改成完全不限制）。
- 平日（週二、三、四）不開上午。
- 市話不限區碼。
- 畫面用字依照第 5 節。
- 部署方式用直接上傳，不接 GitHub。

## 9. 修改歷程（`claude/stoic-bohr-mfm59z`）

| Commit | 內容 |
|---|---|
| `c8f4acb` | 家人共用電話同一天可以各約一個（之後被 `190099d` 取代） |
| `ec0b5df` | 畫面改用中性用字；管理頁搜尋欄提示縮短（窄手機會被截斷） |
| `190099d` | 平日不開上午（新增 `weekdaySlots`）；拿掉同一天限制 |
| `9d7a268` | 頁面最下面顯示版號 beta-0.0.1 |
| `38d610e` | 可以用 02 市話預約（beta-0.0.2） |
| `beee92f` | 可以用任何區碼的市話；各地市話加分隔線顯示（beta-0.0.3） |
