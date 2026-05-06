import { array, string, object, ValidationError, boolean, number } from "yup";
import { useEffect, useState } from "react"
import { filter, from, fromEventPattern, share, switchMap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";

const schema = 
    array(
        object({
            amrId: string().required(),
            bbox:  array(array(number().required()).required()).required() 
        })
    )


const profiles$ = fromEventPattern(
    (next) => {
        io.on("amr-bbox", next);
        return
    },
    (next) => {
        io.off("amr-bbox", next);
    }
).pipe(
  switchMap((msg) =>
    from(
      schema
        .validate(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          msg as unknown[],
          { stripUnknown: true }
        )
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("amr-profile socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  share()
);

export const useAmrBBox = (amrId: string) => {
    const [bbox, setBBox] = useState<number[][]>([]);


    useEffect(() => {
        const amrBBox = profiles$.subscribe((data)=> {
            const amrBBox = data.filter((amr) => amr.amrId === amrId)[0];
            if(!amrBBox) return;
            setBBox(amrBBox.bbox)
        });

        return () => {
            amrBBox.unsubscribe()
        }
    }, [amrId])

    return bbox;
}