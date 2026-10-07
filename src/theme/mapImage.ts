// 地圖底圖的重新上色。
//
// 底圖是一張 PNG(掃出來的圖或客戶畫的平面圖),絕大部分是一片白。要讓它跟著主題走,
// 不需要把檔案轉成別的格式:顯示的時候用一顆 SVG 的 feColorMatrix 濾鏡重新算每個像素的顏色
// 就可以了——白變成主題的底色(paper)、黑變成主題的線條色(ink),灰階落在兩者之間。
// 原檔完全沒動,切回「原圖」只是把濾鏡拿掉。
//
// 為什麼用濾鏡而不是把圖畫進 <canvas> 自己改像素:底圖是從後端(另一個 port)來的,
// 跨來源的圖畫進 canvas 之後讀不到像素(tainted),濾鏡沒有這個限制,而且是 GPU 在算。

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
};

const brightness = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return (r + g + b) / 3;
};

/** 這個顏色算不算深色(用來判斷底圖現在是深是淺) */
export const isDarkColor = (hex: string): boolean => brightness(hex) < 0.5;

const round = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * 算出 feColorMatrix 的 values(4 列 × 5 欄),把底圖的白映到 paper、黑映到 ink。
 * 如果算出來等於「什麼都不做」(白→白、黑→黑)就回 null,呼叫端連濾鏡都不用掛。
 */
export const buildMapImageMatrix = ({
  paper,
  ink,
}: {
  paper: string;
  ink: string;
}): string | null => {
  const P = hexToRgb(paper);
  const K = hexToRgb(ink);

  const isIdentity =
    P.every((channel) => channel === 1) && K.every((channel) => channel === 0);
  if (isIdentity) return null;

  // 底色比線條深 = 深色底圖,明暗要整個反過來
  const flip = brightness(paper) < brightness(ink);

  const rows = [0, 1, 2].map((c) => {
    const span = P[c] - K[c];

    if (!flip) {
      // 每個色版各自從 [黑, 白] 線性拉到 [ink, paper]。
      // 圖上原本有顏色的標示(客戶畫的區域框線)色相不會變,只是被染上一點底色。
      const coeff = [0, 1, 2].map((j) => (j === c ? span : 0));
      return [...coeff, 0, K[c]];
    }

    // 深色底圖不能每個色版各自反相——那樣青色的框線會變成紅色。
    // 改成三個色版一起平移:先把像素的亮度(三色平均)翻過來,顏色之間的差距原封不動,
    // 所以白變黑、黑變白,有顏色的線還是原本的色相。然後再把 [黑, 白] 拉到 [paper, ink]。
    //   翻亮度:q = p + (1 - 2·avg(p))        (白→0、黑→1)
    //   上色:  out = paper + (ink - paper)·q
    const gain = -span; // ink - paper
    const coeff = [0, 1, 2].map((j) => gain * ((j === c ? 1 : 0) - 2 / 3));
    return [...coeff, 0, K[c]];
  });

  return [...rows, [0, 0, 0, 1, 0]]
    .map((row) => row.map(round).join(" "))
    .join(" ");
};
