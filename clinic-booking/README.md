# 任老師中醫 預約系統

## 目前進度

- [x] 第一階段：診所管理頁（`admin.html`）
- [x] 第二階段：病人預約頁（`index.html`）
- [ ] 第三階段：放上網路

## 在自己電腦上試用

### A. 第一次準備（只需做一次）

1. 到 <https://nodejs.org> 下載並安裝 **LTS** 版本的 Node.js，安裝時一路按「下一步」就好。
2. 到 GitHub 的專案頁面，左上角分支選單選 `claude/chinese-medicine-booking-site-kbod8t`，
   按綠色的 **Code** → **Download ZIP**，下載後解壓縮。
3. 打開終端機：
   - Windows：按開始，搜尋「PowerShell」並打開
   - Mac：按 Command＋空白鍵，搜尋「終端機」並打開
4. 輸入 `cd `（cd 後面有一個空格），把解壓縮後資料夾裡的 `clinic-booking` 資料夾拖進視窗，按 Enter。
5. 輸入下面這行並按 Enter，會下載需要的元件（約 1 分鐘）：

   ```
   npm install
   ```

### B. 啟動網站

在同一個終端機視窗輸入：

```
npm run dev
```

看到 `http://localhost:5173/` 後，用瀏覽器打開：

- 診所管理頁：<http://localhost:5173/admin.html>
- 病人預約頁：<http://localhost:5173/>

要關掉網站時，在終端機按 Ctrl＋C。

### 示範模式

還沒連接資料庫時，網站會以「示範模式」執行：

- 登入帳號：`demo@example.com`，密碼：`demo1234`
- 資料只存在這台電腦的瀏覽器裡，不會上網，可以放心亂試。
- 同一台電腦開兩個分頁，可以體驗「一邊登記、另一邊自動更新」。
- 在病人預約頁預約後，管理頁會出現這筆預約，並標示「線上」。

## 連接正式資料庫（Supabase）

1. 到 <https://supabase.com> 註冊並建立新專案（New project）。
   - Region 選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**。
   - Database Password 請設一組強密碼並記下來。
2. 左側選單 **SQL Editor** → **New query**，打開本專案的 `supabase/01_schema.sql`，全部複製貼上。
   把最後一行的 `請改成診所的Email@example.com` 改成診所要用來登入的 Email，按 **Run**。
   接著再開一個 **New query**，貼上 `supabase/02_patient_booking.sql` 的全部內容，按 **Run**。
3. 左側選單 **Authentication** → **Users** → **Add user** → **Create new user**，
   填同一個 Email 和密碼，勾選 **Auto Confirm User**。
4. **Authentication** → **Sign In / Providers**，把 **Allow new users to sign up** 關掉
   （避免陌生人自己註冊帳號）。
5. **Project Settings** → **API**（或 **Data API**），複製 **Project URL** 和 **anon public** key。
6. 把 `clinic-booking` 資料夾裡的 `.env.example` 複製一份，改名為 `.env`，
   在兩個等號後面貼上剛才的兩個值。
7. 重新執行 `npm run dev`，登入畫面就會改用剛剛建立的帳號。

## 資料安全設計

- 未登入的人無法讀取任何資料；登入後也必須在 `staff`（診所人員）名單上才能看資料。
- 預約只能「取消」不能刪除，紀錄永遠保留。
- 同一時段只允許一筆有效預約（加號除外），由資料庫保證，兩人同時搶位只有一人成功。
- 病人預約頁只能「查詢哪些時段有空」和「送出預約」，拿不到任何病人資料。
- 病人預約的限制：只能預約手機號碼（09 開頭）、同一支手機同一天只能約一個時段、
  同一支手機最多同時有 3 筆尚未看診的線上預約（可在 `clinic_settings.max_online_per_phone` 調整）。
- 管理頁的「備份」按鈕可下載全部預約紀錄（CSV，可用 Excel 開啟）。

## 給工程師的說明

- React + TypeScript + Vite；資料庫 Supabase（PostgreSQL + Row Level Security + Realtime）。
- `src/data/types.ts` 定義資料操作介面，`supabaseApi.ts` 為正式實作，`demoApi.ts` 為瀏覽器示範實作。
- `npm test` 執行單元測試；`npm run build` 產生 `dist/`。
- 之後功能的預留欄位：`clinic_settings`（預約／取消時限、提醒開關）、`bookings.cancel_token`、`bookings.reminder_sent_at`。
