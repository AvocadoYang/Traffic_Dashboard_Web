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
          levelSchema.validateSync(value[key], { abortEarly: false })
        );
        return false;
      }
    }
    return true;
  }
);

export type CargoInfo = {
  name?: string;
  layer?: LayerType;
  locationId: string;
  type: string;
  isDropping: boolean;
};

const schema = () =>
  array(
    object({
      name: string().optional().nullable(),
      type: string().optional(),
      locationId: string().required(),
      layer: layerSchema.optional(),
      isDropping: boolean().optional(),
    }).required()
  ).required();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("cargo-info", next);
    return next;
  },
  (next) => {
    io.off("cargo-info", next);
  }
).pipe(
  switchMap((msg) => {
    // console.log('Message received by switchMap:', msg);

    return from(
      schema()
        .validate(msg as unknown[])
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("cargo-info socket schema mismatch: ", err.value);
          return undefined;
        })
    );
  }),
  distinctUntilChanged(
    (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
  ),
  share()
);

const useCargoInfo = () => {
  const [cargoInfo, setCargoInfo] = useState<CargoInfo[]>();

  useEffect(() => {
    const subscription = profiles$
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        ) // Avoid state update if data is identical
      )
      .subscribe((filteredData) => {
        if (filteredData) {
          setCargoInfo(filteredData as CargoInfo[]);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return cargoInfo;
};

export default useCargoInfo;
