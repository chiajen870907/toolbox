# Toolbox

Toolbox 是代理 App 的本機腳本設定介面。開啟 `https://toolbox.com/` 後，由 Rewrite 回應網頁和設定 API。

- `toolbox.js` 接收請求、驗證表單並寫入代理 App 的本機儲存。
- `web/toolbox.html` 包含獨立的介面，由 jsDelivr 下載。下載失敗時使用本機快取。
- `modules/` 放置可選的 JSON 表單範例。第三方模組自行安裝，執行腳本由各代理 App 設定。

## 安裝

- **Quantumult X**：將 `config/quantumult-x.conf` 加入重寫資源，啟用 Rewrite 和 MITM。
- **Shadowrocket／Surge**：匯入 `config/toolbox.sgmodule` 並啟用對應的腳本與 MITM。
- 配置和網頁從 GitHub 公開檔案提供。兩種執行介面有本機模擬測試，Shadowrocket 和 Surge 尚需實機驗證。

以「新增應用」匯入 `.toolbox.json`，或貼上 GitHub Raw／jsDelivr 的 HTTPS JSON 訂閱連結。控制台、設定 API 和訂閱請求都經由同一條 Toolbox Rewrite。代理 App 下載並驗證訂閱，確認後才匯入。可在應用頁刷新、停用或移除來源，原有腳本設定會保留。

收藏、備份、會話和資料頁仍需接上管理 API。

## 模組頁面與 Quantumult X 安裝

含自訂頁面的模組會在設定頁顯示頁面連結，並經由同一條 Toolbox Rewrite 開啟。

- 本機模組從「新增應用 → 匯入本機模組」選取模組 JSON、`app.js`，以及它宣告的 `rewrite.conf` 或 `tasks.json`。Toolbox 使用匯入的 `app.js`。從模組設定頁查看並複製原生配置，加入 Quantumult X 現有的對應區段。`cookie.js` 和 `task.js` 由 QX 從 `Scripts/modules/<目錄>/` 執行。
- HTTPS 訂閱使用 manifest 同目錄的 `app.js` 和原生配置。可從模組設定頁開啟 Quantumult X 確認匯入。


本機模組也可選「匯入 .toolbox 壓縮檔」。可用 `node pack-module.cjs <模組 JSON> <輸出.toolbox>` 封裝一般模組 JSON 或內含 `manifest` 與 `localFiles` 的本機匯入 JSON。格式為 UTF-8 標頭 `TOOLBOX1\n` 接單一 gzip JSON，壓縮前後都以 512 KB 為限。
