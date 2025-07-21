export type Road = {
  spot1Id: string;
  spot2Id: string;
  priority: number;
  validYawList: string[] | number[];
  disabled: boolean;
  limit: boolean;
  roadType: string;
};
