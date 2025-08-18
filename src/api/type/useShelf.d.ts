type Loc = {
  dirId: string | null | undefined;
  id: string;
  name: string;
  region: string;
  locationId: string;
  areaType: string | undefined;
  loc_regions: {
    id: number;
    name: string;
    region_task_id: number;
  };
};

type ShelfHeight = {
  id: string;
  height: number;
  shelfCategoryId: string;
};

type ShelfConfig = {
  id: string;
  level: number;
  name: string;
  disable: boolean;
  cargo_limit: number;
  hasCargo: boolean;
  shelfId: string;
};

type ShelfCategory = {
  id: string;
  name: string;
  Height: ShelfHeight[] | undefined;
};

export type ShelfWithoutList = {
  id: string;
  shelfCategoryId: string | null;
  Loc: Loc;
  ShelfCategory: ShelfCategory;
  ShelfConfig: ShelfConfig[];
};
