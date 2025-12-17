export const DICT = [
  ["OBSTACLE", "路障"],
  ["LOW_MATCH_RATIO", "E1 點雲匹配過低"],
  ["PALLET_TIMEOUT", "C1 棧板輸送逾時"],
  ["CONVEYOR_NO_RESPONSE", "C2 輸送帶無反應"],
  ["PALLET_STATUS_WRONG", "C3 棧板錯帳"],
  ["CONVEYOR_NOT_FOUND", "C4 定位特徵缺失"],
  ["POSITION_NOT_CONVERGED", "C5 定位異常"],
  ["BUMPER_HIT", "H1 防撞邊條觸發"],
  ["MOTOR_ERROR", "H2 馬達異常"],
  ["CLAW_ERROR", "H3 擋板升降異常"],
  ["MAINBOARD_NO_RESPONSE", "H4 主板無回應"],
  ["LIDAR_DISCONNECTED", "H5 光達斷線異常"],
  ["AMR_DISCONNECTED", "H6 車輛離線"],
  ["CHARGING_MOVE_ERROR", "R1 充電中偵測移動"],
  ["CHARGE_FLAG_NOT_CLEANED", "A1 充電鎖動狀態"],
  ["LOAD_FLAG_NOT_CLEANED", "A1 上板鎖動狀態"],
  ["UNLOAD_FLAG_NOT_CLEANED", "A1 下板鎖動狀態"],
  ["POSITION_JUMPED", "E2 跳位錯誤"],
  ["FINE_POSITIONING", "⏳對接中"],
  ["PALLET_UNLOADING", "⏳卸板中"],
  ["PALLET_LOADING", "⏳上板中"],
  ["READY_TO_CHARGE", "準備充電"],
  ["MID_OFFSET_STOP", "🚶修正路徑中"],
  ["PALLET_RESCUE", "🤖自動救位中"],
  ["PALLET_MOVEBASE_REALIGN", "⏳初步定位中"],
  ["PALLET_ACTION_DONE", "🎉傳板完成"],
  ["MANUAL", "維修模式"],
  ["TURNING_OFF_CHARGE", "關閉充電"],
  ["completed", "😎 已完成"],
  ["executing", "🤖 進行中"],
  ["aborting", "🥊進行時取消"],
  ["canceled", "🙅‍♂️ 已取消"],
  ["pending", "⏱ 等待中"],
  ["assigned", "⏱ 已指派"],
  ["deliver-pallet", "補板"],
  ["shipment", "出貨"],
  ["sprinkle", "灑貨"],
  ["plain-move", "移動"],
  ["CREATE_MISSION", "任務建立"],
  ["UPDATE_TASK_STEP", "下一步"],
  ["ASSIGNED", "任務派發"],
  ["STARTED", "開始任務"],
  ["MOVED_TO", "移動"],
  ["FINISHED", "任務完成"],
  ["PALLET_TRANSFER_ERROR", "等待人工指令"],
  ["BEGIN_TRANSFERRING", "開始送板"],
  ["充電中", "⚡充電"],
  ["ERROR", "錯誤"],
  ["TASK/ENSURE_PALLET", "載空板"],
  ["TASK/MOVE_TO_LOCATION", "移動至標的"],
  ["TASK/OFFLOAD_PALLET", "卸板"],
  ["EMS_BTN_PRESSED", "急停鈕觸發"],
  ["TASK/LOAD_PALLET", "上板"],
  ["MODBUS_SEQ_ERROR", "主板通訊異常(CRC)"],
  ["MODBUS_CRC_ERROR", "主板通訊異常(序列)"],
];

export const DICT_AMR_IO = [
  ["connect_status", "與韌體板連線狀況"],

  ["Query:", "當前詢問狀況(寫入/回傳)"],
  ["Set", "當前設定狀況(寫入/回傳)"],
  ["MultiSet", "當前多筆設定狀況(寫入/回傳)"],
  ["error_code", "錯誤碼"],
  ["error_info", "錯誤訊息"],
  ["enable_ultrasoumd", "超聲波開關"],
  ["ultrasound", "超聲波資料"],
  ["enable_baffle", "擋板開關"],

  ["baffle_left", "擋板(左)"],
  ["baffle_right", "擋板(右)"],
  ["manual_mode", "手/自動模式"],
  ["enforce_charge", "手動充電"],
  ["set_charge", "充電開關"],
  ["battery", "電量"],
  ["charge_relay_status", "繼電板"],
  ["voltage", "當前電壓"],
  ["current", "當前電流"],
  ["front_2d_layer", "前方2d光達圖層"],
  ["enable_2d_lidar", "避障開關"],
  ["obstacle_2d_signal", "前方2d障礙物偵測狀態"],
  ["obstacle_rear_2d_signal", "後方2d障礙物偵測狀態"],
  ["obstacle_3d_signal", "3d障礙物偵測狀態"],
  ["enable_recovery", "覆歸開關"],
  ["enable_reboot", "重啟開關"],
  ["enable_tip", "枒杈尖開關"],
  ["set_tip", "設定枒杈偵測距離"],
  ["tip_left", "枒杈尖(左)"],
  ["tip_right", "枒杈尖(右)"],
  ["set_height", "設定高度"],
  ["current_height", "現在高度"],
  ["linear_x", "設定前進速度"],
  ["angular_z", "設定轉彎速度"],
  ["odom_x", "目前里程計前進速度"],
  ["odom_y", "目前里程計y方向"],
  ["odom_w", "目前里程計轉彎速度"],
  ["emergency_signal", "緊急訊號"],
  ["emergency_stop", "緊急按鈕訊號"],
  ["bumper", "防撞邊條訊號"],
];

export const DICT_AMR_READ_READ = [
  ["is_arrive", "確認收到命令"],
  ["is_locations", "執行任務地點"],
  ["checked_locations", "確認收到交管地點"],
  ["is_drop_goods", "確認放好料"],
  ["is_dropping_goods", "放料中"],
  ["is_take_goods", "確認取好料"],
  ["is_taking_goods", "取料中"],
  ["with_goods", "車上是否有料"],
  ["is_finished_mission", "完成任務"],
];

export const DICT_AMR_READ_INFO = [
  ["activated", "啟動訊號"],
  ["is_running", "叉車運轉訊號"],
  ["warning_msg", "警告訊息"],
  ["warning_id", "警告編號"],
  ["warning", "警告是否傳送到line"],
  ["task_process", "任務進度"],
  ["action_process", "action進度"],
  ["pallet_conflict", "確認取＼入貨物訊息"],
  ["grid_info", "庫位狀況"],
  ["charging", "充電中"],
  ["heartbeat", "心跳"],
  ["error", "錯誤訊息"],
];

export const DICT_AMR_WRITE = [
  ["send_mission", "傳送執行任務"],
  ["check_mission", "傳送交握任務"],
  ["start_mission", "開始任務"],
  ["cancel_mission", "取消任務"],
  ["pause", "緊急停止"],
  ["canTakeGoods", "確認取料"],
  ["canDropGoods", "確認放料"],
  ["heartbeat", "心跳"],
  ["charge_mission", "充電任務"],
];

export const DICT_AMR_ACTION_OPERATION = [
  ["type", "行為"],
  ["control", "而外姿勢列表"],
  ["wait", "等待秒數"],
  ["id", "地點id"],
  ["yaw", "轉角"],
  ["tolerance", "到點公差"],
  ["lookahead", "前瞻量"],
  ["roughly_pass", "經過點"],
  ["from", "from"],
  ["to", "to"],
  ["max_speed", "最大速度"],
  ["hasCargoToProcess", "自動偵測貨架上有無貨物"],
];

export const DICT_AMR_ACTION_FORK = [
  ["execute", "執行"],
  ["height", "高度"],
  ["move", "前後"],
  ["shift", "左右"],
  ["tilt", "頃角"],
];
export const DICT_AMR_ACTION_CAMERA = [
  ["execute", "執行"],
  ["height", "高度"],
  ["modify dis", "modify dis"],
];

type Option =
  | "normal"
  | "io"
  | "read_read"
  | "read_info"
  | "write"
  | "action_operation"
  | "action_fork"
  | "action_camera";

export const translate = (option: Option, key?: string) => {
  if (!key) return "";

  let dictionary;

  switch (option) {
    case "normal":
      dictionary = DICT;
      break;
    case "io":
      dictionary = DICT_AMR_IO;
      break;
    case "read_read":
      dictionary = DICT_AMR_READ_READ;
      break;
    case "read_info":
      dictionary = DICT_AMR_READ_INFO;
      break;
    case "write":
      dictionary = DICT_AMR_WRITE;
      break;
    case "action_operation":
      dictionary = DICT_AMR_ACTION_OPERATION;
      break;
    case "action_fork":
      dictionary = DICT_AMR_ACTION_FORK;
      break;
    case "action_camera":
      dictionary = DICT_AMR_ACTION_CAMERA;
      break;
    default:
      dictionary = DICT;
  }

  const translated = dictionary.filter((item) => item[0] === key);
  if (translated.length > 0) {
    return translated[0][1];
  }
  return key;
};
