export const breakpoints = {
  pad: 768,
  web: 1440,
} as const;

export const mq = {
  pad: `@media (min-width: ${breakpoints.pad}px)`,
  web: `@media (min-width: ${breakpoints.web}px)`,
} as const;
