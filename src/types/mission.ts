export enum MissionPriority {
  TRIVIAL, //沒差最後再做
  NORMAL, //普通
  PIVOTAL, //特別優先
  CRITICAL, // 緊急
}

export enum MissionStatus {
  /**未指派 */
  PENDING,
  /**已指派 */
  ASSIGNED,
  /**執行中 */
  EXECUTING,
  /**已完成 */
  COMPLETED,
  /**刪除中 */
  ABORTING,
  /**已刪除 */
  CANCELED,
  /**等待位置: 目前沒有可取放貨的位置, 位置空出來後自動建立 (後端 YAML 開啟才會出現) */
  WAITING,
}

export type Reject_Mission = {
  [missionId: string]: {
    amrId: string;
    reason: string;
    /** FIX = 要有人處理才派得出去, WAIT = 排隊中 */
    level?: "FIX" | "WAIT";
  }[];
};

export enum CancelReason {
  NULL = 0, // 無原因
  OFFLINE = 5,
  CANCEL = 10, //
  FORCE_CANCEL_BY_USER = 11, // 使用者強至刪除任務

  CHARGE_STATION_OFFLINE = 200, // 充電站離線
  IPC_CHARGE_PANEL_OFF = 201, // IPC 充電面板關閉
  REJECT_BY_CHARGE_STATION = 202, // 被充電站拒絕
  NOT_COMPRESS = 203, // 未壓縮（未達要求）
  HAS_NEXT_MISSION = 204, // 已有下一個任務
  NOT_AT_CHARGE_STATION = 205, // 已有下一個任務
  CHARGE_STATION_TCP_ERROR = 206,
  CHARGE_STATION_MQTT_ERROR = 207,
  CHARGE_STATION_HEARTBEAT_ERROR = 208,
  CHARGE_STATION_AGV_NOT_DOCK_PRECISE = 209,

  USER_ABORT = 210, // 使用者手動中止
  WCS_ABORT = 211, // 第三方刪除任務

  MOCK_DISCONNECTED = 221, // 模擬設備斷線
  AMR_DISCONNECTED = 222, // AMR 設備斷線
  ROSBRIDGE_DISCONNECTED = 223, // ROSBridge 設備斷線

  AMR_CHARGE_HAS_PROBLEM = 1002, // AMR 充電有問題
}
