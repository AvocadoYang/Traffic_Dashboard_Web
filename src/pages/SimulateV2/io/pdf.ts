/**
 * PDF 平面圖轉成圖片當底圖. pdf.js 很大, 用到才載入 (legacy 版, 舊瀏覽器也能跑).
 */

/** 轉出來的圖最長邊幾個像素: 200 公尺寬的廠區約 5 公分一個像素, 檔案也不會太大 */
const MAX_SIDE_PX = 4096;

async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export async function openPdf(file: Blob) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

export type PdfDocument = Awaited<ReturnType<typeof openPdf>>;

/** 把第 pageNumber 頁 (從 1 開始) 畫成 PNG */
export async function renderPdfPage(pdf: PdfDocument, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = MAX_SIDE_PX / Math.max(base.width, base.height);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // PDF 沒畫到的地方是透明的, 先鋪白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"),
  );
  page.cleanup();
  return { blob, width: canvas.width, height: canvas.height };
}
