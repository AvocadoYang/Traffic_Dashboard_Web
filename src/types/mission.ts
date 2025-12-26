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
}

export type Reject_Mission = {
  [missionId: string]: {
    amrId: string;
    reason: string;
  }[];
};

export enum CancelReason {
  NULL = 0, // 無原因
  CANCEL = 10, // 任務取消
  CHARGE_STATION_OFFLINE = 200, // 充電站離線
  IPC_CHARGE_PANEL_OFF = 201, // IPC 充電面板關閉
  REJECT_BY_CHARGE_STATION = 202, // 被充電站拒絕
  NOT_COMPRESS = 203, // 未壓縮（未達要求）
  HAS_NEXT_MISSION = 204, // 已有下一個任務

  USER_ABORT = 210, // 使用者手動中止
  WCS_ABORT = 211, //第三方刪除任務

  MOCK_DISCONNECTED = 221, // 模擬設備斷線
  AMR_DISCONNECTED = 222, // AMR 設備斷線
  ROSBRIDGE_DISCONNECTED = 223, // ROSBridge 設備斷線

  AMR_CHARGE_HAS_PROBLEM = 1002, // AMR 充電有問題

  AMR_IS_NOT_REGISTERED_YET = 10000, // AMR 尚未註冊
  AMR_IS_RUNNING = 10001, // AMR 運行中
  AMR_IS_NOT_IN_AUTO_MODE = 10002, // AMR 未處於自動模式
  PLEASE_CLOSE_ENFORCE_CHARGE = 10003, // 請關閉強制充電
  PLEASE_ELIMINATE_AMR_ERRORS_FIRST = 10004, // 請先清除 AMR 錯誤
  TYPE_CODE_NOT_DEFINE = 10005, // 類型代碼未定義
  AMR_TIMEOUT = 10006, // AMR 無回應
  NO_VALID_POSE = 10007, // AMR 無法定位到有效姿態

  CRUSH_IN_MOVE = 20000, // 移動中發生碰撞
  CRUSH_IN_NAVIGATION = 20001, // 導航中發生碰撞
  CRUSH_IN_SPIN = 20002, // 旋轉中發生碰撞
  ROUTE_NOT_ACCESSIBLE = 20003, // 路徑無法通行

  CRUSH_IN_GAUGE_RECOGNITION = 21000, // 表計識別過程中發生碰撞
  CAN_NOT_GET_AI_RESULT = 21001, // 無法獲取 AI 結果
  CAN_NOT_GET_GAUGE_ID = 21002, // 無法獲取表計 ID
  GAUGE_VALUE_ABNORMAL = 21003, // 表計數值異常

  CAN_NOT_OPEN_CHARGE_BOARD = 22000, // 無法打開充電板
  LOCATION_ERROR = 22001, // 定位錯誤
  NOT_RECEIVE_CHARGE_BAR_WHEN_START_CHARGE = 22002, // 開始充電時未收到充電桿
  CHARGE_FAILED = 22003, // 充電啟動失敗
  BATTERY_LOW_ABORT = 22004, // 電量過低自動中止

  CONTROL_CODE_NOT_DEFINE = 28000, // 控制代碼未定義
  CAN_NOT_GET_SHORTEST_PATH = 28001, // 無法獲取最短路徑
  INCORRECT_SHORTEST_PATH = 28002, // 最短路徑錯誤

  CAN_NOT_GET_CORRECT_ANGLE = 29000, // 無法獲取正確角度

  MISSION_TIMEOUT = 30000, // 任務逾時
  INTERNAL_LOGIC_FAILURE = 30001, // 任務邏輯異常
}
