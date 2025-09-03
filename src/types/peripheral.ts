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
  cargoInfoId: string | null;
  customCargoMetadataId: string | null;
  metadata: string | null;
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
  booker?: string;
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
};

export enum Peripheral_Error {
  CONVEYOR_ALREADY_HAS_CARGO = 101,
}


export type Elevator_Info = {
  locationId: string;
  isManualMode: boolean;
  hasCargoSignal: boolean;
  status: PeripheralMachineStatus;
  name: string;
  description: string;
  disable: boolean;
  cargo: Cargo[];
  forkHeight: number;
  loadMissionId: string;
  offloadMissionId: string;
  elevatorDBId: string
}