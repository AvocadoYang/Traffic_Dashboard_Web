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
import {  Elevator_Info } from "@/types/peripheral";



const profiles$ = fromEventPattern(
  (next) => {
    io.on("elevator-info", next);
    return next;
  },
  (next) => {
    io.off("elevator-info", next);
  },
).pipe(
  switchMap((msg: unknown) => {
    if (typeof msg !== 'object' || msg === null) {
      console.error('Invalid message format.');
      return from([undefined]);
    }

    const message = msg as { [key: string]: Elevator_Info };


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
const useElevatorSocket = () => {
  const [cargoInfo, setCargoInfo] = useState< { [key: string]: Elevator_Info }>();

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

export default useElevatorSocket;
