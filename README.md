# 光埔店專屬叫貨系統

下班前使用的麵包店原料叫貨工具。依各款麵包的預計製作量與配方，合併原料需求、扣除庫存，產生叫貨清單。資料存在這台裝置的 IndexedDB。

目前的 App icon 是黑底白字「叫貨」的暫用圖，不是店家官方 Logo。取得授權的 PNG、SVG 或 PDF 後再替換，不要從社群或搜尋結果下載。

## 環境

- Node.js 22 以上
- npm

## 電腦啟動

在專案資料夾執行：

```bash
npm install
npm run dev
```

開發模式會在終端機顯示本機網址，通常是 `http://localhost:5173`。這適合在電腦上改畫面、試算與調資料。開發模式有熱更新，Service Worker 與「加入主畫面」的行為和正式安裝不完全相同。

正式建置與預覽：

```bash
npm run build
npm run preview
```

`npm run build` 會產生 `dist/`，並產生可離線使用的 Service Worker。`npm run preview` 用正式產物開一個本機網站，較接近安裝後的 PWA。請用這個方式確認離線與安裝，不要只靠 `npm run dev`。

## 檢查

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## 手機測試

先分清楚兩件事：

- **同網路瀏覽測試**：電腦執行 `npm run dev` 或 `npm run preview` 後，手機和電腦連同一個 Wi-Fi，用終端機裡的 Network 網址（例如 `http://192.168.x.x:5173`）在手機瀏覽器打開。這可以試操作與版面。區網的 `http://` 位址通常不是安全來源。
- **正式加入主畫面測試**：需要 HTTPS，或在電腦自己的 `localhost` 上測試。只執行本機開發伺服器，不能保證 iPhone 能完整安裝。尚未部署前，請不要把區網網址當成正式安裝方式。

資料只存在目前這台裝置的瀏覽器。換手機、換瀏覽器或清除網站資料後不會自動同步。換機或清除前，請到「設定」按「匯出全部資料」，下載 JSON 備份；另一台裝置再用「從 JSON 匯入」。

## iPhone／iPad 加入主畫面

1. 用 Safari 打開可安裝的網址。必須是 HTTPS，或電腦上的 `localhost`。不要用 Chrome 或其他瀏覽器做這一步。
2. 點下方或上方的分享按鈕。
3. 往下選「加入主畫面」。
4. 確認名稱是「光埔店叫貨」。目前 icon 是黑底白字「叫貨」的暫用圖，不是店家官方 Logo。
5. 回到主畫面，點「光埔店叫貨」開啟。它會以獨立視窗執行，而不是留在 Safari 分頁。

## Android 加入主畫面

1. 用 Chrome 打開可安裝的 HTTPS 網址。
2. 點瀏覽器右上角選單。
3. 選「安裝應用程式」或「加入主畫面」。不同版本的文字可能略有不同。
4. 確認名稱與 icon 後完成安裝。
5. 從主畫面的圖示開啟。

## Cloudflare Pages

這次只準備設定，尚未部署。正式網站必須用 HTTPS。

1. 將專案放到 GitHub。
2. 在 Cloudflare Workers & Pages 建立 Pages 專案。
3. 連接 GitHub repository。
4. Build command 設為 `npm run build`。
5. Output directory 設為 `dist`。Node.js 使用 22（見 `.nvmrc`）。
6. 完成第一次部署。
7. 用 `pages.dev` 網址測試畫面、計算與離線。
8. 測試加入主畫面與重新整理不會 404。`public/_redirects` 會在建置時複製到 `dist`，內容是 `/* /index.html 200`。
9. 確認沒問題後再設定自訂網域，例如 `order.example.xyz`。
10. 修改 DNS 前先確認網域擁有權與目前用途。

PWA 的 `start_url` 與 `scope` 是網站根目錄，適合自訂網域。沒有 Pages Functions，也沒有後端。

第一次開啟不會放入示範麵包或原料。資料只存在目前裝置。換機前請在設定頁匯出 JSON，到新裝置再匯入。App 更新前也建議先備份。正式使用前要由師傅確認配方與採購規格。
