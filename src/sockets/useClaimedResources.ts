import { io } from '@/sockets/socketConnect';
import { useEffect, useState } from 'react';
import { distinctUntilChanged, filter, from, fromEventPattern, share, switchMap } from 'rxjs';
import { isDefined } from 'ts-extras';
import { array, object, string, ValidationError } from 'yup';

const schema = () =>
  object({
    locations: array(
      object({
        locationId: string().required(),
        amrId: string().required()
      }).required()
    ).required(),
    roads: array(
      object({
        roadId: string().required(),
        amrId: string().required()
      }).required()
    ).required()
  }).required();

const claimedResource$ = fromEventPattern(
  (next) => {
    io.on('claimed-resources', next);
    return next;
  },
  (next) => {
    io.off('claimed-resources', next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(msg, { stripUnknown: true })
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error('claimed-resources socket schema mismatch: ', err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
  share()
);

export const useClaimedRoads = () => {
  const [claimedRoads, setClaimedRoads] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const sub = claimedResource$.subscribe(({ roads }) => {
      setClaimedRoads(new Map(roads.map(({ roadId, amrId }) => [roadId, amrId])));
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  return claimedRoads;
};

export const useClaimedLocations = () => {
  const [claimedLocations, setClaimedLocations] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const sub = claimedResource$.subscribe(({ locations }) => {
      setClaimedLocations(new Map(locations.map(({ locationId, amrId }) => [locationId, amrId])));
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  return claimedLocations;
};
