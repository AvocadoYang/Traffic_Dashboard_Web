import { useEffect, useState } from "react";
import { distinctUntilChanged, filter, from, fromEventPattern, map, share, switchMap, tap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { object, string, ValidationError } from "yup";




const schema = () => {
    return object({
        amrId: string().required(),
        status: string().required()
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


export const useMiRStatus = (amrId: string) => {
  const [MiR_Status, setMiRStatus] = useState<string>(
    ""
  );
  useEffect(() => {
    const mirStatus$ = amrStatus$ .pipe(
      filter((status) => status.amrId == amrId),
      filter(isDefined),
      share(),
    );
    const isAccurate$ = mirStatus$
      .pipe(
        map((info) => info.status),
        tap((data)=> console.log(data)),
        filter((info) => info !== undefined),
        distinctUntilChanged(),
      )
      .subscribe((status) => setMiRStatus(status));

    return () => {
      isAccurate$.unsubscribe();
    };
  }, [amrId]);

  return { MiR_Status };
};