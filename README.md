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
