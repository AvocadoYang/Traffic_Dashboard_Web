import { FC } from "react";

/**
 * 車上方的標籤 (drei Html, 另外一個 React root, 拿不到外面的 context, 只吃 props)。
 * 樣子跟 2D 地圖的提示框一樣: 黑底白字, 車號、在做什麼、要去哪。
 */
const VehicleLabel: FC<{
  name: string;
  color?: string;
  lines?: string[];
  paused?: boolean;
  /** 車子有警告 (2D 地圖上車旁邊的警告記號) */
  warning?: boolean;
  selected?: boolean;
}> = ({ name, color, lines = [], paused = false, warning = false, selected = false }) => (
  <div
    style={{
      padding: "2px 8px",
      borderRadius: 5,
      background: "rgba(0, 0, 0, 0.72)",
      outline: selected ? "2px solid #ffffff" : undefined,
      color: "#ffffff",
      fontSize: 11,
      lineHeight: "14px",
      whiteSpace: "nowrap",
      userSelect: "none",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flex: "0 0 auto" }} />}
      {name}
      {paused && <span style={{ color: "#ff4d4f" }}>⏸</span>}
      {warning && <span style={{ color: "#faad14" }}>⚠</span>}
    </div>
    {lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </div>
);

export default VehicleLabel;
