/** 一台車這一幀的樣子 (Vehicle3D 每一幀向 VehicleSource 要) */
export type VehicleFrame = {
  /** ROS 座標 (公尺) */
  x: number;
  y: number;
  /** 車頭方向 (弧度, 逆時針為正) */
  yaw: number;
  /** 牙叉高度 (公尺) */
  lift: number;
  /** 牙叉上 (或車上) 有貨 */
  loaded: boolean;
  /** 地上色圈的顏色 */
  ring: string;
  /** 淡化 (卡片篩選了別台車) */
  dim: boolean;
};

/** 回傳 false 表示這一幀不畫 */
export type VehicleSource = (id: string, out: VehicleFrame) => boolean;

export const emptyFrame = (): VehicleFrame => ({ x: 0, y: 0, yaw: 0, lift: 0, loaded: false, ring: "#888888", dim: false });
