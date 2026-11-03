import { downloadBlob } from "../io/image";

/**
 * 把回放地圖錄成影片 (給客戶看佈局方案用)。用瀏覽器內建的 MediaRecorder, 錄的就是畫面上看到的
 * (回放 / 熱點 / 3D、現在的視角和播放速度), 左上角壓上模擬時鐘、左下角壓上圖例。
 *
 * 2D 是好幾層 Konva 畫布, 每一幀照 DOM 順序疊到錄影用的畫布上。3D 的 WebGL 畫布只有剛畫完那一刻讀得到
 * (沒開 preserveDrawingBuffer, 之後再讀是空的), 所以由畫布裡的 RecordFrames 每畫完一幀就複製到 frame3d。
 * 照實際時間一幀一幀錄: 分頁切到背景 (瀏覽器暫停動畫) 時影片也會停住。
 */

const FPS = 30;
const BITRATE = 8_000_000;
/** 影片最寬多少 (px): 大螢幕錄出來的檔太大 */
const MAX_WIDTH = 1920;
const MIME_TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];

/** 這個瀏覽器能錄的格式 (先選 mp4, PowerPoint 放得了); 都不行就 null */
export const recordingMime = () =>
  typeof MediaRecorder === "undefined" ? null : (MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null);

/** H.264 的長寬要是偶數 */
export const evenSize = (v: number) => Math.max(2, Math.floor(v / 2) * 2);

export type RecordingOverlay = {
  /** 左上角的字 (模擬時間、播放速度) */
  clock: () => string;
  /** 左下角的圖例; 空的就不畫 */
  legend: () => { color: string; label: string }[];
};

export type ReplayRecording = {
  /** 3D: 每畫完一幀複製到這裡 */
  frame3d: HTMLCanvasElement;
  startedAt: number;
  /** 停止並存檔 */
  stop: () => void;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const FONT = "ui-sans-serif, system-ui, 'Noto Sans TC', sans-serif";

const drawOverlay = (ctx: CanvasRenderingContext2D, overlay: RecordingOverlay, s: number, height: number) => {
  ctx.save();
  ctx.textBaseline = "middle";
  const pad = 10 * s;
  ctx.font = `600 ${Math.round(16 * s)}px ${FONT}`;
  const clock = overlay.clock();
  const h = 30 * s;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  roundRect(ctx, 12 * s, 12 * s, ctx.measureText(clock).width + pad * 2, h, 6 * s);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(clock, 12 * s + pad, 12 * s + h / 2);

  const legend = overlay.legend();
  if (legend.length) {
    ctx.font = `${Math.round(12 * s)}px ${FONT}`;
    const swatch = 12 * s;
    const items = legend.map((l) => ({ ...l, w: swatch + 6 * s + ctx.measureText(l.label).width + 14 * s }));
    const lh = 24 * s;
    const y = height - 12 * s - lh;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    roundRect(ctx, 12 * s, y, items.reduce((sum, i) => sum + i.w, 0) + pad * 2 - 14 * s, lh, 6 * s);
    ctx.fill();
    let x = 12 * s + pad;
    for (const it of items) {
      ctx.fillStyle = it.color;
      ctx.fillRect(x, y + lh / 2 - 4 * s, swatch, 8 * s);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(it.label, x + swatch + 6 * s, y + lh / 2);
      x += it.w;
    }
  }
  ctx.restore();
};

/**
 * 開始錄 container 裡的畫面 (錄影期間每一幀重疊一次)。不支援錄影的瀏覽器回傳 null。
 * 停止 (stop) 後把影片存成 fileName.mp4 (或 .webm), 再呼叫 onDone
 */
export const startReplayRecording = (o: {
  container: HTMLElement;
  background: string;
  is3d: () => boolean;
  overlay: RecordingOverlay;
  fileName: string;
  onDone: () => void;
}): ReplayRecording | null => {
  const mime = recordingMime();
  if (!mime) return null;
  const box = o.container.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, MAX_WIDTH / Math.max(1, box.width));
  const width = evenSize(box.width * scale);
  const height = evenSize(box.height * scale);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  const frame3d = document.createElement("canvas");
  const stream = out.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const type = mime.split(";")[0];
    downloadBlob(new Blob(chunks, { type }), `${o.fileName}.${type === "video/mp4" ? "mp4" : "webm"}`);
    o.onDone();
  };

  let raf = 0;
  const frame = () => {
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, width, height);
    if (o.is3d()) {
      if (frame3d.width) ctx.drawImage(frame3d, 0, 0, width, height);
    } else {
      o.container.querySelectorAll("canvas").forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.width && r.height) ctx.drawImage(c, (r.left - box.left) * scale, (r.top - box.top) * scale, r.width * scale, r.height * scale);
      });
    }
    drawOverlay(ctx, o.overlay, scale, height);
    raf = requestAnimationFrame(frame);
  };
  frame();
  recorder.start(1000);

  return {
    frame3d,
    startedAt: performance.now(),
    stop: () => {
      cancelAnimationFrame(raf);
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
};
