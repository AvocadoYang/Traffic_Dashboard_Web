export const formList = [
  // ===================
  // === location ===
  { key: "location_panel" },
  { key: "location_list" },
  { key: "quick_location_panel" },
  // ===================
  // === road ===
  { key: "road_panel" },
  { key: "show_roads_table" },
  { key: "quick_road_panel" },
  // ===================
  // === zone ===
  { key: "edit_zone" },
  { key: "show_zone_list" },
  { key: "show_zone_table" },

  // ===================
  // === shelf ===
  { key: "edit_shelve" },
  { key: "edit_shelve_type" },
  { key: "edit_yaw" },
  // ===================
  // === amr config ===
  { key: "edit_amr_config" },
  { key: "edit_register_amr" },
  // ===================
  // === mission ===
  { key: "edit_mission" },
  { key: "shelf_mission" }, // deprecated
  { key: "charge_mission" },
  { key: "cycle_mission" },
  { key: "todo_dependent_on_return_id_task" }, // deprecated 小車用的較多 待考慮
  { key: "before_left_charge_station_task" },
  { key: "schedule_mission" },
  { key: "idle_mission" },
  { key: "topic_mission" },
  { key: "abort_cargo_mission" },
  // ===================
  // === peripheral ===
  { key: "peripheral_name_table" },
  { key: "peripheral_group_table" },

  // === other ===
  { key: "edit_tag" },
  { key: "edit_icon_style" },
  { key: "edit_region_name" },
  { key: "custom_cargo_info" },
  // ===================
  // === config ===
  { key: "warning_id" },
  { key: "upload_warning_file" },
  { key: "backup_file" },

  { key: "yfy_auto_mission" },
] as const;

export const toolbarState = formList.map((item) => ({ ...item }));

export type formListType = typeof formList;
export type ToolBarItemType = (typeof formList)[number]["key"];
export type ToolBarType = typeof toolbarState;
