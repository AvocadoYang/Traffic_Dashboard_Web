import client from "@/api/axiosClient";
import { robotTypeValueOf } from "@/components/CanvasMap/robotType";
import { FORKLIFT_URL, M68_URL, MIR_URL } from "./modelUrls";

/**
 * 每台車用哪個 3D 模型: 照車型設定 (robot_types.model_3d), 車型沒設定就照車名 (同 2D 地圖的規則),
 * 其他畫叉車。
 *
 * 內建的模型在 public/models (scripts/vehicle-models 產生), 各有自己的約定 (原點在哪、貨放哪, 見 Vehicle3D);
 * 上傳的模型 (custom) 存在後端, 前端照形狀擺: 有牙叉 (節點名稱 fork) 的原點在叉臂根部, 其他在車身中心。
 */

export type BuiltinModel = "forklift" | "mir250" | "m68";
/** 車型的 3D 模型設定; null = 預設 (照車名) */
export type ModelChoice = BuiltinModel | "custom" | null;

export const BUILTIN_MODELS: BuiltinModel[] = ["forklift", "mir250", "m68"];
export const MODEL_YAWS = [0, 90, 180, 270] as const;

const BUILTIN_URL: Record<BuiltinModel, string> = {
  forklift: FORKLIFT_URL,
  mir250: MIR_URL,
  m68: M68_URL,
};

export type VehicleModel = {
  kind: BuiltinModel | "custom";
  url: string;
  /** 模型轉幾度才是車頭朝前 (度, 從上往下看逆時針) */
  yaw: number;
  /** 等比例縮放成這個長度 (公尺); 沒有就照模型原本的大小 */
  fitLength?: number;
};

/** 車型清單 (all-robot-type) 裡 3D 檢視要的欄位 */
export type RobotTypeModelInfo = {
  id: string;
  name: string;
  value: string;
  length: number;
  model_3d?: string | null;
  model_3d_yaw?: number | null;
  model_3d_file?: { updated_at: string } | null;
};

export const FORKLIFT_MODEL: VehicleModel = { kind: "forklift", url: FORKLIFT_URL, yaw: 0 };

/** 上傳的模型的網址: 帶上傳時間, 重新上傳後網址就變 (後端讓瀏覽器長期快取) */
export const customModelUrl = (typeId: string, updatedAt: string) =>
  `${client.defaults.baseURL}/api/setting/robot-type-model/${typeId}?v=${encodeURIComponent(updatedAt)}`;

/** 沒有車型設定時照車名: 同 2D 地圖, 車名有 mi 的是 MiR; SW15 是滾筒 AGV (M68) */
const builtinByName = (name: string): BuiltinModel =>
  /sw15/i.test(name) ? "m68" : name.includes("mi") ? "mir250" : "forklift";

const isBuiltin = (v: unknown): v is BuiltinModel => BUILTIN_MODELS.includes(v as BuiltinModel);

/**
 * 這台車是哪個車型: 先比車名前三段 (同 2D 地圖的車型長度); 沒對到再找車名裡有出現的車型代號
 * (不分大小寫, 例如 SW15), 好幾個都有就取最長的
 */
export const robotTypeFor = <T extends Pick<RobotTypeModelInfo, "value">>(amrId: string, types: T[] | undefined): T | undefined => {
  if (!types?.length) return undefined;
  const exact = robotTypeValueOf(amrId);
  const hit = types.find((t) => t.value === exact);
  if (hit) return hit;
  const name = amrId.toLowerCase();
  return types
    .filter((t) => t.value && name.includes(t.value.toLowerCase()))
    .sort((a, b) => b.value.length - a.value.length)[0];
};

/**
 * 某個車型 (可能沒有) 的模型; name 是車名, 車型沒設定時照車名決定。
 * 車型有設定長度就縮放成那個長度 (同 2D 地圖的 MiR 圖示)
 */
export const modelOfType = (type: RobotTypeModelInfo | undefined, name: string): VehicleModel => {
  const fitLength = type && type.length > 0 ? type.length : undefined;
  const yaw = type?.model_3d_yaw ?? 0;
  const choice = type?.model_3d;
  if (choice === "custom" && type?.model_3d_file) {
    return { kind: "custom", url: customModelUrl(type.id, type.model_3d_file.updated_at), yaw, fitLength };
  }
  const kind = isBuiltin(choice) ? choice : builtinByName(name);
  // 內建的叉車照模型原本的大小 (同以前): 車型的長度含貨叉、載的貨, 拿來縮放會變太大
  return { kind, url: BUILTIN_URL[kind], yaw, fitLength: kind === "forklift" ? undefined : fitLength };
};

/** 首頁: 車 -> 車型 -> 模型 */
export const vehicleModelFor = (amrId: string, types: RobotTypeModelInfo[] | undefined) =>
  modelOfType(robotTypeFor(amrId, types), amrId);

/** 模擬: 車種名稱跟哪個車型的名稱或代號一樣 (不分大小寫), 就用那個車型的模型 */
export const simVehicleModel = (typeName: string, types: RobotTypeModelInfo[] | undefined) => {
  const key = typeName.trim().toLowerCase();
  const type = types?.find((t) => t.name.toLowerCase() === key || t.value.toLowerCase() === key);
  return modelOfType(type, typeName);
};
