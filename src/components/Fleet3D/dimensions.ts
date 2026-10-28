/** 貨的尺寸 (公尺): 車上的貨、設備上的貨都照這個畫 */

/** 棧板 1m x 1m x 0.13m, 原點在底部中心 */
export const PALLET_HEIGHT = 0.13;
/** 棧板中心在叉臂根部後面多遠: 牙叉長 1.06m, 棧板貼著擋貨架 */
export const PALLET_OFFSET = 0.55;
/** 棧板上的紙箱 */
export const CARTON_SIZE: [number, number, number] = [0.9, 0.7, 0.9];
/** 一板貨 (棧板 + 紙箱) 的高度, 堆疊一層一層往上疊 */
export const LOAD_HEIGHT = PALLET_HEIGHT + CARTON_SIZE[1];
