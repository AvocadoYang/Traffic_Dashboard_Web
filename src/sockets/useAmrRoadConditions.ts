import { string, object } from "yup";
import {
  fromEventPattern,
  share,
  map,
  filter,
  distinctUntilChanged,
} from "rxjs";
import { useEffect, useState } from "react";
import { io } from "./socketConnect";

export type LayerType = {
  [level: number]: {
    levelName: string;
    booked: boolean;
    cargo_limit: number;
    disable: boolean;
    cargo: {
      hasCargo: boolean;
      name: string | null;
    };
  };
};

export type Info = {
  areaId?: string;
  name?: string | null;
  isDropping?: boolean;
  layer?: LayerType[];
};

const schema = () =>
  object({
    amrId: string().required(),
    status: string().defined(),
  }).required();

const getRoadConditions$ = fromEventPattern(
  (next) => {
    io.on("road-conditions", next);
    return next;
  },
  (next) => {
    io.off("road-conditions", next);
  },
).pipe(
  map((roadConditions) => {
    return schema().validateSync(roadConditions);
  }),
  share(),
);

const useRoadConditions = (amrId: string) => {
  const [roadConditions, setRoadConditions] = useState<string | null>("");

  useEffect(() => {
    const subscription = getRoadConditions$
      .pipe(
        filter((data) => {
          return data.amrId === amrId;
        }),
        map((data) => data.status),
        distinctUntilChanged((pre, cur) => {
          return cur === pre;
        }),
      )
      .subscribe((roadConditions) => {
        setRoadConditions(roadConditions);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return roadConditions;
};

export default useRoadConditions;
