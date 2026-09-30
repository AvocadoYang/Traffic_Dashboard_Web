import { Cargo } from "@/types/peripheral";
import { Custom_Cargo_Format_Type } from "@/api/useCustomCargoFormat";

export type CargoFormat = NonNullable<Custom_Cargo_Format_Type[number]>;

export type FormatField = {
  name: string;
  type: "string" | "number" | "boolean";
};

export type CargoMetadata = Record<string, unknown>;

/** 送給後端的貨物。addon_metadata 在記憶體裡是 JSON 字串,這裡統一轉回字串 */
export type CargoPayload = {
  placement_order: number;
  cargoInfoId: string | null;
  customId: string | null;
  customCargoMetadataId: string | null;
  metadata: string | null;
  addon_metadata?: string | null;
};

/** 只能填固定值的字串欄位(Corning 容器),表單改用下拉選單 */
export const FIELD_PRESETS: Record<string, string[]> = {
  container_gen: ["6-Metal", "5", "6-Inno", "6-Wooden", "6-KC", "5.5", "6-TC"],
  container_type: ["Full", "Pallet", "Wooden", "Unknown", "Empty"],
};

export const parseFormatFields = (format?: CargoFormat): FormatField[] => {
  if (!format?.format) return [];
  try {
    return Object.entries(JSON.parse(format.format) as object).map(
      ([name, type]) => ({
        name,
        type:
          type === "number" || type === "boolean"
            ? type
            : ("string" as const),
      }),
    );
  } catch {
    return [];
  }
};

export const parseMetadata = (cargo: Cargo): CargoMetadata => {
  if (!cargo.metadata) return {};
  try {
    const parsed: unknown = JSON.parse(cargo.metadata);
    return parsed && typeof parsed === "object" ? (parsed as CargoMetadata) : {};
  } catch {
    return {};
  }
};

export const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const toPayload = (cargo: Cargo): CargoPayload => ({
  placement_order: cargo.placement_order,
  cargoInfoId: cargo.cargoInfoId,
  customId: cargo.customId,
  customCargoMetadataId: cargo.customCargoMetadataId,
  metadata: cargo.metadata,
  ...(cargo.addon_metadata === undefined
    ? {}
    : {
        addon_metadata:
          cargo.addon_metadata === null ||
          typeof cargo.addon_metadata === "string"
            ? cargo.addon_metadata
            : JSON.stringify(cargo.addon_metadata),
      }),
});

export const sortCargo = (cargo: Cargo[]) =>
  [...cargo].sort((a, b) => a.placement_order - b.placement_order);

/**
 * 以下每個動作都拿「按下去當下」最新的貨物清單來組出完整清單送出,
 * 不用打開面板時的舊快照,避免把期間新進來或被取走的貨蓋掉。
 */
export const withAdded = (
  live: Cargo[],
  formatId: string,
  metadata: CargoMetadata,
): CargoPayload[] => {
  const lastOrder = live.length
    ? Math.max(...live.map((c) => c.placement_order))
    : -1;
  return [
    ...live.map(toPayload),
    {
      placement_order: lastOrder + 1,
      cargoInfoId: null,
      customId: null,
      customCargoMetadataId: formatId,
      metadata: JSON.stringify(metadata),
    },
  ];
};

export const withEdited = (
  live: Cargo[],
  cargoInfoId: string,
  formatId: string,
  metadata: CargoMetadata,
): CargoPayload[] =>
  live.map((c) =>
    c.cargoInfoId === cargoInfoId
      ? {
          ...toPayload(c),
          customCargoMetadataId: formatId,
          metadata: JSON.stringify(metadata),
        }
      : toPayload(c),
  );

export const withRemoved = (
  live: Cargo[],
  cargoInfoId: string,
): CargoPayload[] =>
  live.filter((c) => c.cargoInfoId !== cargoInfoId).map(toPayload);

/** 跟相鄰的貨交換順序。順序有重複時(舊資料)先依目前排列重新編號再交換 */
export const withMoved = (
  live: Cargo[],
  cargoInfoId: string,
  offset: -1 | 1,
): CargoPayload[] => {
  const sorted = sortCargo(live);
  const orders = sorted.map((c) => c.placement_order);
  const hasDuplicate = new Set(orders).size !== orders.length;
  const list = sorted.map((c, i) => ({
    ...toPayload(c),
    placement_order: hasDuplicate ? i : c.placement_order,
  }));

  const from = list.findIndex((c) => c.cargoInfoId === cargoInfoId);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= list.length) return list;

  const fromOrder = list[from].placement_order;
  list[from].placement_order = list[to].placement_order;
  list[to].placement_order = fromOrder;
  return list;
};
