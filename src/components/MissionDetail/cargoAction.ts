export const CARGO_ACTION_COLOR: Record<string, string> = {
  CREATED: "blue",
  TRANSFER: "magenta",
  LOAD: "gold",
  OFFLOAD: "green",
  SHIFTED: "default",
  UPDATED: "purple",
};

export const cargoActionColor = (action: string) =>
  CARGO_ACTION_COLOR[action] ?? "default";
