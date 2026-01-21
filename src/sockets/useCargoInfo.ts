import { array, string, object, ValidationError, boolean, number } from "yup";
import {
  from,
  fromEventPattern,
  share,
  switchMap,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";
import { LayerType } from "@/api/type/useLocation";

export const levelSchema = object({
  levelName: string().optional().nullable(),
  description: string().optional().nullable(),
  booked: boolean().optional().nullable(),
  cargo_limit: number().optional(),
  disable: boolean().optional(),
  hasCargo: boolean().optional(),
});

export const layerSchema = object().test(
  "is-layer-type",
  "socket Invalid layer format",
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;

    for (const key in value) {
      const valid = levelSchema.isValidSync(value[key]);
      if (!valid) {
        console.error(
          `Validation failed for level ${key}:`,
          levelSchema.validateSync(value[key], { abortEarly: false }),
        );
        return false;
      }
    }
    return true;
  },
);

export type CargoInfo = {
  name?: string;
  layer?: LayerType;
  locationId: string;
  type: string;
  isDropping: boolean;
};

const profiles$ = fromEventPattern(
  (next) => {
    io.on("cargo-info", next);
    return next;
  },
  (next) => {
    io.off("cargo-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== "object" || msg === null) {
      console.error("Invalid message format.");
      return from([undefined]);
    }

    const message = msg as { [key: string]: CargoInfo };

    if (message === null) {
      return from([undefined]);
    }

    return from([message]);
  }),
  distinctUntilChanged(
    (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
  ),
  share(),
);

const useCargoInfo = () => {
  const [cargoInfo, setCargoInfo] = useState<{
    [key: string]: CargoInfo;
  }>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((filteredData) => {
        if (filteredData) {
          setCargoInfo(filteredData);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return cargoInfo;
};

export default useCargoInfo;
