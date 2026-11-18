# Toolbox 規格

Toolbox 以 `https://toolbox.com/` 為入口。代理 App 的單一 Rewrite 提供控制台、設定 API 和模組頁面。

## 匯入一份本機 JSON

使用者在 Safari 選取 iCloud Drive 或「檔案」裡的 `.toolbox.json`。普通 manifest 包含模組 ID、名稱與設定欄位。含程式資源的 JSON 使用 `{manifest, localFiles}`，檔案內容以字串存放。

| 宣告 | JSON 內的資源 | 安裝位置 |
|---|---|---|
| `pages` | `app.js` | Toolbox 本機儲存 |
| `auth: true` | `rewrite.conf` | QX 的 `[rewrite_local]` 和 `[mitm]` |
| `task: true` | `tasks.json` | QX 的 `[task_local]` |

相同模組 ID 再次匯入時保留欄位值。模組設定頁顯示每個 QX 配置區段的操作與複製按鈕。QX 從 `Scripts/modules/<目錄>/` 執行 `auth.js` 和 `task.js`。

## 模組頁面

`/app/<模組 ID>/<頁面 ID>` 使用已匯入的 `app.js`，只開放 manifest 宣告的頁面。腳本在隔離的 iframe 執行。原生腳本可在 `qx_panel_page_<模組 ID>:<頁面 ID>` 發布 `{source:"local",data}`。Toolbox 將該頁面的資料傳給 `window.toolboxData`。

## 驗收

- 匯入一份設定 JSON 或含頁面與配置的本機模組 JSON。
- 匯入後可開啟已宣告的頁面，並查看 QX 各區段的安裝方式。
- 本機頁面在上游下載失敗時仍可讀取。原生 Rewrite 和 Task 由 QX 執行。
