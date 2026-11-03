/** 車號 -> 車型代號 (useAMRsample 的 value, 即 robot_types.value): 「#」後面 (有的話) 的前三段, 例如 anfa-ps14-16-427 -> anfa-ps14-16 */
export const robotTypeValueOf = (amrId: string) =>
  (amrId.includes("#") ? amrId.split("#")[1] : amrId).split("-").slice(0, 3).join("-");
