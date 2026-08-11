import { useEffect, useState } from "react";
import { distinctUntilChanged, filter, from, fromEventPattern, map, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { boolean, object, string, ValidationError } from "yup";




const schema = () => {
    return object({
        amrId: string().required(),
        status: string().required(),
        active_groups_id: string().required(),
        active_map_id: string().required(),
        protectiveStop: boolean().required()
    })
}

const amrStatus$ = fromEventPattern(
    (next) => {
        io.on('mir-status', next);
        return next;
    },
    (next) => {
        io.off("mir-status", next);
    }
).pipe(
    switchMap((msg) =>
        from(
          schema()
            .validate(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              msg as unknown[],
              { stripUnknown: true },
            )
            .catch((err: ValidationError) => {
              console.error(err.message);
              console.error("mir status socket schema mismatch: ", err.value);
              return undefined;
            }),
        ),
      ),
      filter(isDefined),
      share(),
)

const MiR_Status_IO = {
  status: "", 
  active_groups_id:"",
  active_map_id:"",
  amrId: "",
  protectiveStop: false
}

export const useMiRStatus = (amrId: string) => {
  const [MiR_Status, setMiRStatus] = useState<typeof MiR_Status_IO>(MiR_Status_IO);
  useEffect(() => {
    const mirStatus$ = amrStatus$ .pipe(
      filter((status_info) => status_info.amrId == amrId),
      filter(isDefined),
      share(),
    );
    const isAccurate$ = mirStatus$
      .pipe(
        filter((info) => info !== undefined),
        distinctUntilChanged((pre, curr) => JSON.stringify(pre) == JSON.stringify(curr)),
      )
      .subscribe((status_info) => setMiRStatus(status_info));

    return () => {
      isAccurate$.unsubscribe();
    };
  }, [amrId]);

  return  MiR_Status ;
};