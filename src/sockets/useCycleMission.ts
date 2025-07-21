import { distinctUntilChanged, filter, from, fromEventPattern, share, switchMap } from 'rxjs';
import { isDefined } from 'ts-extras';
import { io } from './socketConnect';
import { useState, useEffect } from 'react';
import { object, ValidationError, boolean, array, string, InferType } from 'yup';

const schema = array(
  object({
    isActive: boolean().required(),
    missionName: string().required(),
    amrId: string().optional().nullable(),
    cycle_relate_id: string().required(),
    mission_id: string().required()
  }).optional()
).required();

const getC$ = fromEventPattern(
  (next) => {
    io.on('cycle-mission', next);
    return next;
  },
  (next) => {
    io.off('cycle-mission', next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema.validate(msg, { stripUnknown: true }).catch((err: ValidationError) => {
        console.error(err.message);
        console.error('script mismatch: ', err.value);
        return undefined;
      })
    )
  ),
  filter(isDefined),
  share()
);

export type Cycle_Mission = InferType<typeof schema>;

export const useCycleMission = () => {
  const [cycleData, setCycleData] = useState<Cycle_Mission>();

  useEffect(() => {
    const scriptStatus = getC$
      .pipe(distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe((data) => {
        setCycleData(data);
      });

    return () => {
      scriptStatus.unsubscribe();
    };
  }, []);

  return cycleData;
};
