import { Booker } from "@/api/type/useLocation";
import { Relation } from "@/api/useLoc";

export enum PeripheralMachineStatus {
  INIT = "INIT",
  IDLE = "IDLE",
  BUSY = "BUSY",
  ERROR = "ERROR",
}

export type AmrId = string | undefined;
export type ReservationMap = Map<LocationId, AmrId>;
export type LocationId = string;

export type PeripheralTypes =
  | "CHARGING_STATION"
  | "GENERAL_STATION"
  | "STANDBY_LOCATION"
  | "OUTPUT_STATION"
  | "STORAGE"
  | "FORKLIFT_LOAD_STATION"
  | "ELEVATOR"
  | "STACK"
  | "GATE_WAIT_POINT"
  | "CONVEYOR";

export type PeripheralInfo = {
  id: string;
  booker: string;
  occupier: string;
};

export type BeforeLeftStation = {
  active: boolean;
  missionId: string;
};

export type Cargo = {
  placement_order: number;
  cargoInfoId: string | null;
  customId: string | null;
  customCargoMetadataId: string | null;
  metadata: string | null;
  addon_metadata?: { height: number; size: string };
};

export type Mock_Conveyor_Config = {
  isEnable: boolean;
  isSpawnCargo: boolean;
  spawnTimeMs: number;
  activeShift: boolean;
  shiftTimeMs: number;
  shiftLocationId: string | null;
};

export type Conveyor_Info = {
  name: string;
  disable: boolean;
  locationId: string;
  booker?: boolean;
  occupier?: string;
  forkHeight: number;
  conveyorDBId: string;
  cargo: Cargo[];
  status: PeripheralMachineStatus;
  activeLoad: boolean;
  activeOffload: boolean;
  loadMissionId: string;
  offloadMissionId: string;
  placement_priority: number;
  relationships: Relation;
  loadPriority: number;
  offloadPriority: number;
};

export enum Peripheral_Error {
  CONVEYOR_ALREADY_HAS_CARGO = 101,
}

export type Elevator_Info = {
  locationId: string;
  booker: boolean;
  occupier: string | null;
  isManualMode: boolean;
  hasCargoSignal: boolean;
  isRunning: boolean;
  status: PeripheralMachineStatus;
  name: string;
  description: string;
  disable: boolean;
  cargo: Cargo[];
  forkHeight: number;
  loadMissionId: string;
  offloadMissionId: string;
  elevatorDBId: string;
};

export type Lift_Gate_Info = {
  locationId: string;
  booker?: string;
  occupier?: string | null;

  name: string;
  description: string;
  group: string | null;
  disable: boolean;
  status: Lift_Gate_Status;
};

export enum Lift_Gate_Status {
  OPENED = "1001",
  OPENING = "1002",
  CLOSING = "1003",
  CLOSED = "1004",
  E_STOP = "9001",
  VFD_Alarm = "9002",
  System_Error = "9003",
}

/** 一個 stack 最多可以堆幾層貨,跟後端 STACK_MAX_LEVEL 一致 */
export const STACK_MAX_LEVEL = 3;

/** 包膜線上一顆燈接的訊號: 哪個模組的第幾個通道, invert = 訊號 off 才算有貨 */
export type Package_Signal = {
  module: string;
  channel: number;
  invert: boolean;
};

/**
 * 包膜線的一個點位。一條線有入口和出口兩個點位:
 * 入口(點位屬性 PACKAGE_IN)只能放貨、出口(PACKAGE_OUT)只能取貨,
 * 兩端的 cargo 是同一份(整條線上登記的貨,先進先出)。
 */
export type Package_Info = {
  name: string;
  description: string;
  group: string | null;
  disable: boolean;
  locationId: string;
  booker?: Booker;
  occupier?: string | null;
  forkHeight: number;

  role: "ENTRY" | "EXIT";
  packageDBId: string;
  lineDBId: string;
  /** null = 這個出口還沒被哪個入口指定 */
  entryLocationId: string | null;
  /** null = 這個入口還沒指定出口 */
  exitLocationId: string | null;
  peripheralNameDBId: string;
  cargo: Cargo[];

  /** 整條線最多登記幾筆貨,0 = 不限 */
  capacity: number;
  slotCount: number;
  signals: (Package_Signal | null)[];
  /** 每顆燈現在的狀態; null = 這顆燈沒接訊號,或訊號來源斷線 */
  lamps: (boolean | null)[];

  loadMissionId: string | null;
  offloadMissionId: string | null;
  loadPriority: number;
  offloadPriority: number;
};

export type Stack_Info = {
  name: string;
  description: string;
  group: string | null;
  disable: boolean;
  locationId: string;
  booker?: Booker;
  occupier?: string | null;

  stackDBId: string;
  peripheralNameDBId: string;
  cargo: Cargo[];

  loadMissionId: string;
  offloadMissionId: string;

  loadPriority: number;
  offloadPriority: number;
};
