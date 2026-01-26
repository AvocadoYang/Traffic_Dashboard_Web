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
