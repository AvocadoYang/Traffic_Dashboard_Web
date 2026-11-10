# 登入頁背景影片

`public/login-hero.webm` (和封面 `login-hero.jpg`) 是這裡錄出來的: 用 `public/models/` 的車型模型搭一個倉庫場景,
在無頭 Chrome 裡逐格算圖、用 WebCodecs 編成 VP9。

```sh
cd scripts/login-hero
npm install          # 只有 webm-muxer; three / esbuild 用 dashboard 的 node_modules
npm run still        # 每個鏡頭出一張 still_*.jpg (不做動態模糊, 幾秒), 調分鏡時先看這個
npm run video        # 重錄整支影片 (每格 5 個子影格做動態模糊), 軟體算圖約 1 小時
```

- 分鏡在 `scene.ts` 的 `SHOTS` (每個鏡頭自己擺車和攝影機), 燈光、貨架、後製也都在同一個檔。
- 封面圖: `W=1600 H=900 node run.mjs still 2.0`, 再把 `still_2.0.jpg` 複製成 `public/login-hero.jpg`。
  取開場揭幕中段那格 (暗的), 影片一開始也是暗的, 封面換成影片時才不會先亮再暗閃一下。
- `run.mjs` 用 `--remote-debugging-pipe` 驅動 Chrome, 不開連接埠; 需要系統有 `google-chrome`。

## 電影感 (`scene.ts` 的後製)

- **動態模糊**: 每格在快門開著的半格時間內 (180 度快門) 算 `MB` 次再平均, 車和鏡頭的移動都會有真實的拖影。
  網址參數 `mb` (`MB=1 node run.mjs ...`) 可以關掉, 預覽快很多。子影格不跨鏡頭, 切換處不會有殘影。
- **景深**: 每個鏡頭用 `focusOn(x, y, z, 模糊強度)` 對焦在主角車上; 自己寫的散景 (每個取樣點用自己的模糊半徑判斷,
  清楚的前景不會被背景滲到), 在 HDR 上做, 亮的燈會變成散景光斑。高角度全景只給很淺的景深, 太淺會像微縮模型。
- **開場光影揭幕**: 全黑 (`shotState.dark`), 一道細長的面光源 (`sweep`) 在叉車外殼前平行移動, 拉出一道滑過去的反光;
  掃完倉庫的燈才亮, 塔柱的燈和螢幕跟著點亮 (`shotState.lamps`)。揭幕時外殼底漆會暫時調成更亮面 (`shotState.gloss`),
  面光源不作用在清漆層上, 不調的話反光會散成一片。
- **空氣感**: 燈條下的光束 (兩片微微張開的漸層薄片) 與飄在空中的微塵 (位置照時間算, 每個子影格才對得上)。
- 畫面邊緣有很輕微的鏡頭色差 (調色 `grade` 裡)。

## 擬真材質 (`materials.ts`)

模型只有頂點色 (CAD 匯出時的零件色, 大多是隨便給的白灰色), 也沒有法線。`realize()` 依 `RULES` 把每個顏色群換成實際材質,
並重算法線 (36 度以內抹平; 調大的話低面數外殼的反光會出現皺摺)。對照的依據:

- 叉車、SW15: 實車照片 (使用者提供, 本機 `~/Pictures/real_agv/`)。叉車是紅色亮面外殼 + 黑色側板 / 門架 / 牙叉 / 塔柱、
  綠色充電板、米黃 PU 輪; SW15 是紅色鈑金 (模型裡兩端的白色櫃門實車也是紅的)、不鏽鋼滾筒、鋁側擋、黑色橡膠防撞條。
- MiR250: 官方產品圖。RAL 7011 鐵灰外殼、陽極處理鋁頂板、四角黑色護角和白色信號燈; 上下外殼中間的藍色 LED 燈帶模型裡沒有,
  由 `lightBand()` 從側面打射線找到縫的位置補上。

車身印字用貼花 (`stamp()` 從外面打射線, 打到的地方投影一張字的貼圖): 每台車都印白色 KENMEC (叉車在車尾外殼、SW15 和 MiR 在兩側長邊),
叉車兩側另有車號 (`NUMBERS`), 塔柱上有螢幕畫面。紙箱印 KENMEC 廣運、棧板是綠 / 藍塑膠, 也是照展場照片。

調材質時用 `node run.mjs img <輸出.jpg> '<運算式>'` 拍檢查圖:

```sh
# 某些顏色群在模型的哪裡 (洋紅色), 車種 fk / mir / m68, 參數: 水平角、俯角、顏色群、距離
W=800 H=600 node run.mjs img /tmp/a.jpg 'HERO.inspect("fk", 0.6, 0.25, ["#ff0000"])'
# 換好材質的車單獨放在走道中央, 用正式的燈光後製拍: 車種、水平角、俯角、距離、看的高度
W=800 H=450 node run.mjs img /tmp/b.jpg 'HERO.view("mir", 0.9, 0.18, 2.0, 0.15)'
# 所有顏色群的頂點數和範圍
W=320 H=180 node run.mjs eval 'HERO.ready().then(() => JSON.stringify(HERO.S.clusters.fk))'
```
