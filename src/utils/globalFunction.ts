export const isHumanRobot = (robotId: string): boolean =>
  robotId
    .split("-")
    .map((v) => v.toLowerCase())
    .includes("rb");

export const isFork = (robotId: string): boolean => {
  const list = robotId.split("-").map((v) => v.toLowerCase());
  return (
    list.includes("cb15") ||
    list.includes("ps14") ||
    list.includes("sw15") ||
    list.includes("pm")
  );
};

export const prefixLevelName = (word: string | null | undefined): string => {
  if (!word) return "";

  // Find the index of the last hyphen
  const lastHyphenIndex = word.lastIndexOf("-");

  // If a hyphen is found, return the substring up to that point
  if (lastHyphenIndex !== -1) {
    return word.substring(0, lastHyphenIndex);
  }

  // If no hyphen is found, return the original word
  return word;
};
