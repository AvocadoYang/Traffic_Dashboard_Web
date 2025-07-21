import { CargoInfo } from '@/sockets/useCargoInfo';
import { Cargo } from '@/types/peripheral';
import { atom } from 'jotai';

// 只有給shelf用
export const GlobalCargoInfoModal = atom<boolean>(false);
export const BaseGlobalCargoInfoModal = atom<boolean>(false);

// 給其他有需要攜帶設備用
export const GlobalCargoInfoPeripheralModal = atom<boolean>(false);

// 只有給shelf用
export const GlobalCargoInfo = atom<{
  dbId: string | null;
  locationId: string | null;
  level: number;
  cargo: Cargo[];
}>({
  dbId: null,
  locationId: null,
  level: -1,
  cargo: []
});

// 給其他有需要攜帶設備用
export const GlobalCargoInfoPeripheral = atom<{
  dbId: string | null;
  locationId: string | null;
  cargo: Cargo[];
}>({
  dbId: null,
  locationId: null,
  cargo: []
});

export const GlobalCargoData = atom<{
  id: string | null;
  locationId: string | null;
  shelfInfo: CargoInfo | null;
}>({
  id: null,
  locationId: null,
  shelfInfo: null
});
