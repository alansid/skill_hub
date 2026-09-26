# 任老師中醫 預約系統

## 目前進度

- [x] 第一階段：診所管理頁（`/admin`）
- [x] 第二階段：病人預約頁（`/`）
- [x] 改用 Cloudflare（網站＋資料庫都在 Cloudflare）
- [ ] 第三階段：放上網路

## 架構

| 部分 | 使用 | 費用 |
|---|---|---|
| 網站 | Cloudflare Pages | 免費 |
| 後端程式 | Cloudflare Pages Functions（`functions/`、`server/`） | 免費（每天 10 萬次請求內） |
| 資料庫 | Cloudflare D1 | 免費（5GB 內） |

- 資料表會在網站第一次被使用時**自動建立**，不需要手動執行任何指令。
- 多台裝置同步：管理頁每 10 秒檢查一次資料有沒有變動，有變就自動更新畫面。

## 在自己電腦上試用

### 第一次準備（只需做一次）

1. 到 <https://nodejs.org> 下載並安裝 **LTS** 版本的 Node.js。
2. 到 GitHub 專案頁，分支選 `claude/chinese-medicine-booking-site-kbod8t`，按 **Code** → **Download ZIP**，解壓縮。
3. 打開終端機（Windows：PowerShell；Mac：終端機），輸入 `cd `（後面有空格），把 `clinic-booking` 資料夾拖進視窗，按 Enter。
4. 輸入 `npm install` 按 Enter。

### A. 示範模式（最簡單）

```
npm run dev
```

- 病人預約頁：<http://localhost:5173/>
- 診所管理頁：<http://localhost:5173/admin.html>（密碼 `demo1234`）
- 資料只存在這台電腦的瀏覽器裡。

### B. 模擬正式環境（有真的資料庫和登入）

```
npm run dev:cloud
```

- 病人預約頁：<http://localhost:8788/>
- 診所管理頁：<http://localhost:8788/admin>（密碼 `demo1234`）
- 資料存在 `.wrangler` 資料夾裡，刪掉這個資料夾就會清空。

要關掉網站時，在終端機按 Ctrl＋C。

## 放上網路（Cloudflare）

### 1. 建立資料庫

1. 登入 <https://dash.cloudflare.com>。
2. 左側選單 **Storage & Databases** → **D1 SQL Database** → **Create**（建立）。
3. 名稱填 `ren-clinic-db`，位置（Location）選 **Asia-Pacific**，按 **Create**。

### 2. 建立網站

1. 左側選單 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 選 GitHub 的 `skill_hub` 專案 → **Begin setup**。
3. 設定：

   | 欄位 | 填入 |
   |---|---|
   | Project name | `ren-clinic`（網址會是 `ren-clinic.pages.dev`） |
   | Production branch | `claude/chinese-medicine-booking-site-kbod8t` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `clinic-booking` |
   | 環境變數 | `NODE_VERSION` = `22` |

4. 按 **Save and Deploy**，等它完成。

### 3. 連結資料庫、設定管理密碼

1. 進入 `ren-clinic` 專案 → **Settings（設定）** → **Bindings（繫結）** → **Add** → **D1 database**：
   - Variable name：`DB`
   - D1 database：選 `ren-clinic-db`
2. **Settings** → **Variables and Secrets** → **Add**：
   - Type：**Secret**（密碼）
   - Variable name：`ADMIN_PASSWORD`
   - Value：診所的管理密碼（建議 10 個字以上，英文加數字）
3. 到 **Deployments（部署）**，在最新一筆右邊按 **⋯** → **Retry deployment**，讓設定生效。

### 4. 確認

- 病人預約頁：`https://ren-clinic.pages.dev`
- 診所管理頁：`https://ren-clinic.pages.dev/admin`

如果畫面出現「網站還沒有連結資料庫」或「還沒有設定管理密碼」，代表第 3 步還沒完成或還沒重新部署。

## 備份與還原

- 管理頁右上角的 **備份** 可以下載全部預約紀錄（CSV，可用 Excel 開啟）。
- Cloudflare D1 內建「時光機」（Time Travel），可以把資料庫還原到**過去 7 天內任何一個時間點**（免費方案）。
  需要時請工程師執行：`npx wrangler d1 time-travel restore ren-clinic-db --timestamp=<時間>`。

## 修改診所設定

設定都有預設值（看診星期、時段、可預約 90 天、看診前 30 分鐘內不能線上預約……）。
要修改時，到 Cloudflare → D1 → `ren-clinic-db` → **Console**，執行例如：

```sql
-- 同一支手機最多 5 筆線上預約
UPDATE settings SET data = json_set(data, '$.maxOnlinePerPhone', 5) WHERE id = 1;
-- 看診前 3 小時內不能線上取消
UPDATE settings SET data = json_set(data, '$.minHoursBeforeCancel', 3) WHERE id = 1;
```

可設定的項目見 `src/data/types.ts` 的 `ClinicSettings`。

## 資料安全設計

- 管理頁需要診所密碼；登入後這台裝置 30 天內不用再輸入。密碼連錯 5 次暫停 15 分鐘。
- 登入憑證只存在瀏覽器的安全 Cookie（HttpOnly、Secure、SameSite=Strict），網頁程式讀不到。
- 病人頁只能「查詢哪些時段有空」「送出預約」「用手機號碼查詢／取消自己的預約」，拿不到其他病人資料；
  查詢結果姓名只顯示部分（例如 王○明），同一個網路位置一小時內最多查詢 30 次。
- 預約只能「取消」不能刪除，紀錄永遠保留。
- 同一時段只允許一筆有效預約（加號除外），由資料庫保證，兩人同時搶位只有一人成功。
- 病人預約的限制：看診前 30 分鐘內不能線上預約、只能用手機號碼（09 開頭）、同一支手機同一天可以約多個時段。
  「同一支手機最多幾筆尚未到的線上預約」由設定 `maxOnlinePerPhone` 決定（目前設為 9999，等於不限制）。

## 給工程師的說明

- 前端：React + TypeScript + Vite（`src/`）。後端：Cloudflare Pages Functions（`functions/api/[[path]].ts` → `server/router.ts`），資料庫 D1。
- 病人預約規則在 `src/lib/rules.ts`，前端示範模式與後端共用。
- 資料表定義在 `server/schema.ts`，每次啟動時以 `CREATE ... IF NOT EXISTS` 自動建立。
- `npm test` 單元測試；`npm run build` 型別檢查＋打包；`npm run build:preview` 產生單一檔案的示範版。
- 之後功能的預留欄位：`bookings.cancel_token`、`bookings.reminder_sent_at`、`settings` 裡的各項時限。
