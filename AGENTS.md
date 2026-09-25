# AGENTS.md

光埔店專屬叫貨系統。React、TypeScript、Vite PWA。沒有登入與後端。

## 套件管理

使用 npm。不要改用其他套件管理工具。

## 目錄

- `src/lib/calculate.ts`：原料合併、到貨天數、安全備用與短缺計算
- `src/lib/units.ts`：公克、公斤、毫升、公升、個與採購規格換算
- `src/lib/storage.ts`：IndexedDB
- `src/lib/seed.ts`：僅供比對舊示範資料，App 不會自動寫入
- `src/lib/forms.ts`：麵包與原料表單驗證
- `public/_redirects`：Cloudflare Pages 的 SPA fallback
- `src/pages`：今日叫貨、配方、原料、歷史紀錄、設定
- `public/pwa-192.png`、`public/pwa-512.png`、`public/apple-touch-icon.png`：安裝圖示

## 驗證

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
