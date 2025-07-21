export type CargoMissionEdit = {
  id: string;
  loc: string;
  directionId: string;
  name: string;
};
export type FormCargo = {
  disable: boolean;
  titleId: string;
  prepare_point_id: string;
  name: string;
  region: string;
  loc: string;
  yaw: string;
  load: string;
  offload: string;
  placement_priority: number;
  relationships: unknown;
};

export type CargoArea = {
  booker: string;
  occupier: string;

  name?: string;
  layer?: LayerType;
  locationId: string;
  type: string;
  isDropping: boolean;
};

export type HasCargo = {
  has_cargo: boolean;
  border: string;
  is_disable: boolean;
};

export type WrapperType = {
  translatex: number;
  translatey: number;
  scale: number;
  rotate: number;
  flex_direction: string;
};
export type WrapperType2Type = {
  floors: number;
  numOfCargo: number;
} & WrapperType;

export type EditColumn = {
  id: string;
  locationId: string;
  level: number;
};

export type LocWithoutArr = {
  id: string;
  locationId: string;
  areaType: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
};
