export const GRID_SIZE = 20;
export const MIN_BUTTON_SIZE = 60;
export const MAX_BUTTON_SIZE = 320;

export const MIN_WIDGET_WIDTH = 60;
export const MAX_WIDGET_WIDTH = 800;
export const MIN_WIDGET_HEIGHT = 60;
export const MAX_WIDGET_HEIGHT = 600;

// 地圖顯示元件不受一般元件的最大尺寸限制,跟後端 MAX_MAP_WIDGET_SIZE 對齊
export const MAX_MAP_WIDGET_SIZE = 4000;

export const snapToGrid = (value: number) =>
  Math.max(0, Math.round(value / GRID_SIZE) * GRID_SIZE);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
