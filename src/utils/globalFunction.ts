export const isHumanRobot = (robotId: string): boolean =>
  robotId
    .split('-')
    .map((v) => v.toLowerCase())
    .includes('rb');

export const isFork = (robotId: string): boolean => {
  const list = robotId.split('-').map((v) => v.toLowerCase());
  return (
    list.includes('cb15') || list.includes('ps14') || list.includes('sw15') || list.includes('pm')
  );
};

export const prefixLevelName = (word: string | null | undefined): string => {
  if (!word) return '';
  const parts = word.split('-');
  parts.pop();
  return parts.join('-');
};
