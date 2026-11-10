# 登入頁背景影片

`public/login-hero.webm` (和封面 `login-hero.jpg`) 是這裡錄出來的: 用 `public/models/` 的車型模型搭一個倉庫場景,
在無頭 Chrome 裡逐格算圖、用 WebCodecs 編成 VP9。

```sh
cd scripts/login-hero
npm install          # 只有 webm-muxer; three / esbuild 用 dashboard 的 node_modules
npm run still        # 每個鏡頭出一張 still_*.jpg, 調分鏡時先看這個 (幾秒)
npm run video        # 重錄整支影片, 軟體算圖約 10 分鐘
```

- 分鏡在 `scene.ts` 的 `SHOTS` (每個鏡頭自己擺車和攝影機), 燈光、貨架、後製也都在同一個檔。
- 封面圖: `W=1600 H=900 node run.mjs still 1.6`, 再把 `still_1.6.jpg` 複製成 `public/login-hero.jpg`。
- `run.mjs` 用 `--remote-debugging-pipe` 驅動 Chrome, 不開連接埠; 需要系統有 `google-chrome`。
