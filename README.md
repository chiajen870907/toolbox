# Toolbox

Toolbox 是代理 App 的本機腳本設定介面。開啟 `https://toolbox.com/` 後，由 Rewrite 回應網頁和設定 API。

- `toolbox.js` 接收請求、驗證表單並寫入代理 App 的本機儲存。
- `web/toolbox.html` 包含獨立的介面，由 jsDelivr 下載。下載失敗時使用本機快取。
- `modules/` 放置可選的 JSON 表單範例。第三方模組自行安裝，執行腳本由各代理 App 設定。

## 安裝

- **Quantumult X**：將 `config/quantumult-x.conf` 加入重寫資源，啟用 Rewrite 和 MITM。
- **Shadowrocket／Surge**：匯入 `config/toolbox.sgmodule` 並啟用對應的腳本與 MITM。
- 配置和網頁從 GitHub 公開檔案提供。兩種執行介面有本機模擬測試，Shadowrocket 和 Surge 尚需實機驗證。

## 匯入本機模組

在 Toolbox 點「＋」，從 iCloud Drive 或「檔案」選一份 `.toolbox.json`。再次匯入相同 ID 時會保留已儲存的設定。

只含設定表單的模組可匯入單一 manifest。含頁面或原生配置的 JSON 由 `manifest` 和 `localFiles` 組成。依 manifest 宣告，在 `localFiles` 放入 `app.js`、`rewrite.conf` 或 `tasks.json` 的文字內容。

模組設定頁會顯示要加入 QX 的 Rewrite、MITM 和 Task 配置。QX 從 `Scripts/modules/<目錄>/` 執行 `auth.js` 和 `task.js`。自訂頁面由 Toolbox 使用匯入的 `app.js` 開啟。

收藏、備份、會話和資料頁仍需接上管理 API。
