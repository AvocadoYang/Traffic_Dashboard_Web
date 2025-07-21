import { Relation } from '@/api/useLoc';
import { Cargo, PeripheralTypes } from '@/types/peripheral';
import { atom } from 'jotai';

export const IsEditPeripheralModal = atom<{
  stationType: PeripheralTypes;
  stationId: string;
  name: string;
  disable: boolean;
  forkHeight: number;
  activeLoad: boolean;
  activeOffload: boolean;
  loadMissionId: string;
  offloadMissionId: string;
  placement_priority: number;
  relationships: Relation;
  cargo: Cargo[];
} | null>(null);

export const IsOpenCargoEditorModal = atom(false);
