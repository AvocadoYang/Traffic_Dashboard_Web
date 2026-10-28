/**
 * 告警 -> 3D 車上要閃的地方。
 *
 * car-error-info 每筆告警帶 warningId 和說明文字 (告警清單的 info, 可能是中文或英文)。
 * 告警 ID 各廠區可以自己加, 所以照說明文字裡的關鍵字認是哪個部位出事 (預設清單見
 * mission-control/src/configs/warn.json); 認不出來的閃整台車。
 */

/** 防撞邊條、碰撞: 車底一圈 */
export const ALERT_BUMPER = 1;
/** 牙叉、擋板、棧板、貨物: 牙叉 (沒有牙叉的車閃整台) */
export const ALERT_FORK = 2;
/** 前方 / 後方的光達看到障礙物: 車頭前 / 車尾後的地上 */
export const ALERT_SCAN_FRONT = 4;
export const ALERT_SCAN_REAR = 8;
/** 3D 光達、超聲波這類不分方向的: 車子四周的地上 */
export const ALERT_SCAN_AROUND = 16;
/** 其他 (急停、電池、馬達、定位…): 整台車 */
export const ALERT_BODY = 32;

const RULES: { zone: number; re: RegExp }[] = [
  { zone: ALERT_BUMPER, re: /防撞|碰撞|bumper|collision/i },
  {
    zone: ALERT_SCAN_FRONT,
    re: /前方.*(光達|雷達|雷射)|front.*(lidar|laser|scanner)/i,
  },
  {
    zone: ALERT_SCAN_REAR,
    re: /後方.*(光達|雷達|雷射)|rear.*(lidar|laser|scanner)/i,
  },
  {
    zone: ALERT_FORK,
    re: /枒杈|牙叉|貨叉|擋板|棧板|貨物|拉繩|fork|guard plate|pallet|cargo|cable encoder/i,
  },
  {
    zone: ALERT_SCAN_AROUND,
    re: /光達|雷達|超聲波|障礙物|lidar|ultrasonic|obstacle/i,
  },
];

/** 一台車目前的告警說明 -> 要閃的部位 (ALERT_* 加起來); 沒有告警是 0 */
export const alertZones = (infos: readonly string[]): number => {
  let zones = 0;
  for (const info of infos) {
    const rule = RULES.find((r) => r.re.test(info));
    zones |= rule ? rule.zone : ALERT_BODY;
  }
  return zones;
};
