import { filter, from, fromEventPattern, share, switchMap } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { string, ValidationError } from "yup";
import { useEffect, useState } from "react";

const schema = () => string().required();

const elevator$ = fromEventPattern(
  (next) => {
    io.on("barcode-signal", next);
    return next;
  },
  (next) => {
    io.off("barcode-signal", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("barcode socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  share()
);

export const useBarcodeSignal = () => {
  const [bar, setBar] = useState<string>("");
  useEffect(() => {
    const sub = elevator$.subscribe((infos: string) => {
      setBar(infos);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return bar;
};
