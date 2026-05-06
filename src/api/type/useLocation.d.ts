import { Cargo } from "@/types/peripheral";

export type ChargeStationResponseObj = {
  responseTime: Date;
  current: {
    AUTO_MODE: boolean;
    COMPLETE: boolean;
    FAULT: boolean;
    PROCESS: boolean;
    STANDBY: boolean;
  };
  error: {
    MODULE_COMMUNICATION_FAILURE: boolean;
    REVERSE_BATTERY_CONNECTION: boolean;
    BATTERY_NOT_CONNECTED: boolean;
    SHORT_CIRCUIT: boolean;
    OVER_VOLTAGE: boolean;
    OVER_CURRENT: boolean;
    TOTAL_FAULT: boolean;
  };
  other: {
    INFRARED_IN_PLACE: boolean;
    COMPRESS: boolean;
    SCALING_FAILURE: boolean;
    REACH_OUT_CHARGE: boolean;
    RETURNING: boolean;
    IS_STRETCHING_OUT: boolean;
    RESET: boolean;
  };
};

export type SelectStation = {
  loc: number;
  peripheralType: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

type GeneralStation = {
  stationId: string;
  isInService: string;
  actReq?: number;
  emptiedAt: Date | null;
  fulledAt: Date | null;
};

type ChargeStation = {
  id: string;
  isInService: string;
  booker: string;
  info: ChargeStationResponseObj;
};

export type AmrId = string | null;
export type ReservationMap = Map<LocationId, AmrId>;
export type LocationId = string;
export type Not_Specify = "none";
export type Booker = AmrId | Not_Specify;

export type LayerType = {
  [level: number]: {
    dbId: string;
    cargo: Cargo[];
    levelName: string;
    description: string;
    quantity: number; //corning special
    group: string | null;
    booker: Booker;
    cargo_limit: number;
    disable: boolean;
    cargoInfoId: string | null;
    customCargoMetadataId: string | null;
    metadata: string | null;
    loadPriority: number;
    offloadPriority: number;
  };
};

export type CargoArea = {
  booker: string;
  occupier: string;

  name?: string;
  layer?: LayerType;
  locationId: string;
  type: string;
  isDropping: boolean;
};

type Data = {
  generalStations: GeneralStation[];
  cargoArea: CargoArea[];
  chargingStations: ChargeStation[];
};

export type LocSchemaType = {
  data: Data;
};
