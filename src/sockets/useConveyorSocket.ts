import { array, string, object, ValidationError, number, boolean } from "yup";
import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { Conveyor_Info } from "@/types/peripheral";

const strSchema = string().optional().nullable();

const relationshipSchema = object().test(
  "relation-type",
  "relationship has format error",
  (value) => {
    if (!value || Object.keys(value).length === 0) return true;

    if (typeof value !== "object" || Array.isArray(value)) return false;

    for (const key in value) {
      const levelValue = value[key];
      const valid = strSchema.isValidSync(levelValue);
      if (!valid) return false;
    }

    return true;
  },
);

const schema = () =>
  array(
    object({
      locationId: string().optional().nullable(),
      name: string().nullable(),
      disable: boolean().required(),
      conveyorDBId: string().optional(),
      forkHeight: number().required(),
      activeLoad: boolean().required(),
      activeOffload: boolean().required(),
      loadMissionId: string().nullable(),
      offloadMissionId: string().nullable(),
      booker: string().nullable(),
      occupier: string().nullable(),
      placement_priority: number().required(),
      relationships: relationshipSchema.optional().nullable(),
      cargo: array(
        object({
          cargoInfoId: string().optional().nullable(),
          customCargoMetadataId: string().optional().nullable(),
          metadata: string().optional().nullable(),
        }).optional(),
      )
        .optional()
        .nullable(),
      status: string().optional(),
    }).required(),
  ).required();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("conveyor-info", next);
    return next;
  },
  (next) => {
    io.off("conveyor-info", next);
  },
).pipe(
  switchMap((msg) => {
    // console.log('Message received by switchMap:', msg);

    return from(
      schema()
        .validate(msg as unknown[])
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("conveyor-info socket schema mismatch: ", err.value);
          return undefined;
        }),
    );
  }),
  distinctUntilChanged(
    (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
  ),
  share(),
);

const useConveyorSocket = () => {
  const [cargoInfo, setCargoInfo] = useState<Conveyor_Info[]>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ), // Avoid state update if data is identical
      )
      .subscribe((filteredData) => {
        if (filteredData) {
          setCargoInfo(filteredData as Conveyor_Info[]);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return cargoInfo;
};

export default useConveyorSocket;
