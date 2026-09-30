import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import useCargoInfo from "@/sockets/useCargoInfo";
import useConveyorSocket from "@/sockets/useConveyorSocket";
import useStackSocket from "@/sockets/useStackSocket";
import useElevatorSocket from "@/sockets/useElevatorSocket";
import { Cargo, STACK_MAX_LEVEL } from "@/types/peripheral";
import { prefixLevelName } from "@/utils/globalFunction";
import { CargoPanelTarget } from "./state";
import { CargoPayload, sortCargo } from "./cargoList";

export type CargoPanelLevel = {
  level: number;
  name: string;
  count: number;
  disable: boolean;
};

export type CargoPanelSource = {
  name: string;
  /** 依 placement_order 由小到大 */
  cargo: Cargo[];
  booker: string | null;
  disabled: boolean;
  /** null 代表沒有上限 */
  capacity: number | null;
  /** 只有貨架有,切換層用 */
  levels: CargoPanelLevel[];
  /** 貨架那一層的 ShelfConfig id,後端用它找到要改的層 */
  storageDbId?: string;
  elevator?: { manual: boolean; running: boolean; cargoSignal: boolean };
};

const toBooker = (booker: unknown): string | null =>
  typeof booker === "string" && booker !== "" ? booker : null;

/**
 * 面板要顯示的即時資料。socket 在頁面載入就訂閱(面板元件一直掛著),
 * 打開面板時不用等下一次資料變動才有東西。
 */
export const useCargoPanelSource = (
  target: CargoPanelTarget | null,
): CargoPanelSource | null => {
  const storage = useCargoInfo();
  const conveyor = useConveyorSocket();
  const stack = useStackSocket();
  const elevator = useElevatorSocket();

  return useMemo(() => {
    if (!target) return null;
    const { type, locationId } = target;

    if (type === "STORAGE") {
      const layer = storage?.[locationId]?.layer;
      const current = layer?.[target.level ?? 0];
      if (!layer || !current) return null;
      return {
        name: prefixLevelName(current.levelName),
        cargo: sortCargo(current.cargo),
        booker: toBooker(current.booker),
        disabled: current.disable,
        capacity: current.cargo_limit > 0 ? current.cargo_limit : null,
        levels: Object.entries(layer).map(([level, info]) => ({
          level: Number(level),
          name: prefixLevelName(info.levelName),
          count: info.cargo.length,
          disable: info.disable,
        })),
        storageDbId: current.dbId,
      };
    }

    if (type === "CONVEYOR") {
      const info = conveyor?.[locationId];
      if (!info) return null;
      return {
        name: info.name,
        cargo: sortCargo(info.cargo),
        booker: toBooker(info.booker),
        disabled: info.disable,
        capacity: null,
        levels: [],
      };
    }

    if (type === "STACK") {
      const info = stack?.[locationId];
      if (!info) return null;
      return {
        name: info.name,
        cargo: sortCargo(info.cargo),
        booker: toBooker(info.booker),
        disabled: info.disable,
        capacity: STACK_MAX_LEVEL,
        levels: [],
      };
    }

    const info = elevator?.[locationId];
    if (!info) return null;
    return {
      name: info.name,
      cargo: sortCargo(info.cargo),
      booker: toBooker(info.booker),
      disabled: info.disable,
      capacity: null,
      levels: [],
      elevator: {
        manual: info.isManualMode,
        running: info.isRunning,
        cargoSignal: info.hasCargoSignal,
      },
    };
  }, [target, storage, conveyor, stack, elevator]);
};

/**
 * 儲存整份貨物清單。knownCargoIds 帶的是組清單當下看到的貨,
 * 後端只會移除這裡面被拿掉的,不會動到剛好在這期間才進來的貨。
 */
export const useSaveCargo = (
  target: CargoPanelTarget | null,
  storageDbId: string | undefined,
) =>
  useMutation({
    mutationFn: ({
      cargo,
      knownCargoIds,
    }: {
      cargo: CargoPayload[];
      knownCargoIds: string[];
    }) => {
      if (!target) return Promise.reject(new Error("no target"));
      if (target.type === "STORAGE") {
        return client.post("/api/setting/update-cargo-info", {
          dbId: storageDbId,
          locationId: target.locationId,
          level: target.level ?? 0,
          cargo,
          knownCargoIds,
        });
      }
      return client.post("/api/peripherals/update-cargo-info-peripheral", {
        locationId: target.locationId,
        peripheralType: target.type,
        cargo,
        knownCargoIds,
      });
    },
  });
