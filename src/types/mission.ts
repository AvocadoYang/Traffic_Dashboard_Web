export enum MissionPriority {
  TRIVIAL, //沒差最後再做
  NORMAL, //普通
  PIVOTAL, //特別優先
  CRITICAL, // 緊急
}

export type Reject_Mission = {
  [missionId: string]: {
    amrId: string;
    reason: string;
  }[];
};
