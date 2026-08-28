export const GRID_SIZE = 20;
export const MIN_BUTTON_SIZE = 60;
export const MAX_BUTTON_SIZE = 320;

export const MIN_WIDGET_WIDTH = 240;
export const MAX_WIDGET_WIDTH = 800;
export const MIN_WIDGET_HEIGHT = 160;
export const MAX_WIDGET_HEIGHT = 600;

export const snapToGrid = (value: number) =>
  Math.max(0, Math.round(value / GRID_SIZE) * GRID_SIZE);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
