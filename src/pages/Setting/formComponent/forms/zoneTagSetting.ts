export const zoneTagResetFields: Record<string, Record<string, unknown>> = {
  減速區: { speed_limit: undefined },
  限高區: { hight_limit: undefined },
  限制區: { limitNum: undefined },
  查看區: { view_available: undefined },
  禁止區: { forbidden: [], all_forbidden: false },
};

export const tagFieldStyle: React.CSSProperties = {
  boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
  borderLeft: "4px solid #8491ea",
  padding: "10px",
  borderRadius: "5px",
  marginBottom: "10px",
};

export const isUnset = (value: unknown) =>
  value === undefined || value === null || value === "";

export const transformToNumber = (value: unknown) =>
  isUnset(value) ? undefined : Number(value);
