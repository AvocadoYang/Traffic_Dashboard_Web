/**
 * PGM (ROS / SLAM 的佔據格地圖) 轉 PNG。
 * PGM 是 2D 灰階點陣圖 (P2 文字 / P5 二進位, 8 或 16 bit), 瀏覽器不能直接顯示, 上傳前在前端轉成 PNG,
 * 後端、2D 地圖、3D 底圖都照原本的 PNG 流程走。灰階值原樣保留 (白 = 空地, 黑 = 障礙, 灰 = 未知)。
 */

export type Pgm = { width: number; height: number; maxVal: number; pixels: Uint16Array };

export const parsePgm = (buf: ArrayBuffer): Pgm => {
  const bytes = new Uint8Array(buf);
  let pos = 0;

  // 檔頭是用空白分隔的文字, # 開頭到行尾是註解 (ROS 的 map_saver 會寫一行 "# CREATOR")
  const token = (): string => {
    for (;;) {
      while (pos < bytes.length && /\s/.test(String.fromCharCode(bytes[pos]))) pos++;
      if (bytes[pos] !== 0x23) break;
      while (pos < bytes.length && bytes[pos] !== 0x0a) pos++;
    }
    const start = pos;
    while (pos < bytes.length && !/\s/.test(String.fromCharCode(bytes[pos]))) pos++;
    if (start === pos) throw new Error("PGM 檔頭不完整");
    return String.fromCharCode(...bytes.subarray(start, pos));
  };

  const magic = token();
  if (magic !== "P2" && magic !== "P5") throw new Error("不是 PGM 檔 (只支援 P2 / P5)");
  const width = Number(token());
  const height = Number(token());
  const maxVal = Number(token());
  if (!(width > 0 && height > 0 && maxVal > 0 && maxVal < 65536)) throw new Error("PGM 檔頭的寬高或最大灰階值不正確");
  if (width * height > 100_000_000) throw new Error("PGM 圖片太大");

  const pixels = new Uint16Array(width * height);
  if (magic === "P5") {
    pos++; // 檔頭最後一個空白
    const wide = maxVal > 255;
    if (bytes.length - pos < width * height * (wide ? 2 : 1)) throw new Error("PGM 檔案內容不完整");
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = wide ? (bytes[pos + i * 2] << 8) | bytes[pos + i * 2 + 1] : bytes[pos + i];
    }
  } else {
    for (let i = 0; i < pixels.length; i++) pixels[i] = Number(token());
  }
  return { width, height, maxVal, pixels };
};

/** 讀 PGM 檔, 回傳同名 .png 的 File */
export const pgmFileToPng = async (file: File): Promise<File> => {
  const { width, height, maxVal, pixels } = parsePgm(await file.arrayBuffer());
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("瀏覽器無法轉檔");
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < pixels.length; i++) {
    const v = Math.min(255, Math.round((pixels[i] * 255) / maxVal));
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("轉成 PNG 失敗");
  return new File([blob], file.name.replace(/\.pgm$/i, ".png"), { type: "image/png" });
};
