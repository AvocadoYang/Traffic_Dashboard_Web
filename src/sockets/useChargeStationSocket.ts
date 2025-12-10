import {
  array,
  string,
  object,
  ValidationError,
  number,
  boolean,
  date,
} from "yup";
import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
  map,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";

const stateSchema = object({
  responseTime: date().optional().nullable(),
  current: object({
    AUTO_MODE: boolean().optional().nullable(),
    COMPLETE: boolean().optional().nullable(),
    FAULT: boolean().optional().nullable(),
    PROCESS: boolean().optional().nullable(),
    STANDBY: boolean().optional().nullable(),
  })
    .optional()
    .nullable(),
  error: object({
    MODULE_COMMUNICATION_FAILURE: boolean().optional().nullable(),
    REVERSE_BATTERY_CONNECTION: boolean().optional().nullable(),
    BATTERY_NOT_CONNECTED: boolean().optional().nullable(),
    SHORT_CIRCUIT: boolean().optional().nullable(),
    OVER_VOLTAGE: boolean().optional().nullable(),
    OVER_CURRENT: boolean().optional().nullable(),
    TOTAL_FAULT: boolean().optional().nullable(),
  })
    .optional()
    .nullable(),
  other: object({
    INFRARED_IN_PLACE: boolean().optional().nullable(),
    COMPRESS: boolean().optional().nullable(),
    SCALING_FAILURE: boolean().optional().nullable(),
    REACH_OUT_CHARGE: boolean().optional().nullable(),
    RETURNING: boolean().optional().nullable(),
    IS_STRETCHING_OUT: boolean().optional().nullable(),
    RESET: boolean().optional().nullable(),
  })
    .optional()
    .nullable(),
})
  .optional()
  .nullable();

const schema = array(
  object({
    locationId: string().required(),
    name: string().optional().nullable(),
    description: string().optional().nullable(),
    group: string().optional().nullable(),
    disable: boolean().required(),
    booker: string().optional().nullable(),
    occupier: string().optional().nullable(),
    isConnect: boolean().optional(),
    ip: string().optional().nullable(),
    port: number().required(),
  }).optional()
).required();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("charge-station-config", next);
    return next;
  },
  (next) => {
    io.off("charge-station-config", next);
  }
).pipe(
  switchMap(async (msg: unknown) => {
    return msg as { [locationId: string]: Charge_Status_Info };
  }),
  // distinctUntilChanged(
  //   (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
  // ),
  share()
);

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

export type Field = Map<string, boolean>;

export type Charge_Status_Info = {
  locationId: string;
  name: string;
  description: string;
  group: string;
  disable: boolean;
  booker: string;
  occupier: string;
  // currentStatus: ChargeStationResponseObj;
  isMQTTConnect: boolean;
  isTCPConnect: boolean;
  isStationCodeAlive: boolean;
  leastHeartbeatTime: Date;
  stationId: string;
  ip: string;
  port: number;
};

const useChargeStationSocket = () => {
  const [data, setData] = useState<{
    [locationId: string]: Charge_Status_Info;
  }>({});

  useEffect(() => {
    const subscription = profiles$.subscribe((filteredData) => {
      if (filteredData) {
        setData(filteredData);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return data;
};

export default useChargeStationSocket;
