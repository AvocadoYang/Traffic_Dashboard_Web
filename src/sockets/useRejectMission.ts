import { filter, fromEventPattern, map, share } from "rxjs";
import { io } from "./socketConnect";
import { useEffect, useState } from "react";
import { Reject_Mission } from "@/types/mission";

const missionReject$ = fromEventPattern(
  (next) => io.on("mission-reject", next),
  (next) => io.off("mission-reject", next)
).pipe(
  map((msg: unknown) => {
    if (typeof msg === "object" && msg !== null && "payload" in (msg as any)) {
      return (msg as { payload: Reject_Mission }).payload;
    }
    return undefined;
  }),
  filter((v): v is Reject_Mission => v !== undefined),
  share()
);

export const useRejectMission = () => {
  const [rejectMission, setRejectMission] = useState<Reject_Mission>();

  useEffect(() => {
    const sub = missionReject$.subscribe(setRejectMission);
    return () => sub.unsubscribe();
  }, []);

  return rejectMission;
};
