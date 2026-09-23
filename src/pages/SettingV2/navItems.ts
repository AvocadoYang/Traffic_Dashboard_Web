import {
  AimOutlined,
  NodeIndexOutlined,
  BorderOuterOutlined,
  GoldOutlined,
  CarOutlined,
  ScheduleOutlined,
  DeploymentUnitOutlined,
  FileOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import type { ToolBarItemType } from "@/pages/Setting/components/siderElement";

export type NavLeaf = {
  key: ToolBarItemType;
  /** i18n key;沒有對應翻譯的(MIR 那幾個)直接用 rawLabel */
  labelKey?: string;
  rawLabel?: string;
};

export type NavCategory = {
  key: string;
  labelKey?: string;
  rawLabel?: string;
  icon: typeof AimOutlined;
  children: NavLeaf[];
};

// 分類、標題文字、icon 全部照抄 v1 Sider.tsx 的 toolItem,讓兩版看起來是同一套設定。
// 這裡只收「真的會顯示面板」的項目:
//   - show_zone_list 在 v1 也沒有對應面板(只切 showAllZonesSwitch 圖層),故排除
//   - shelf_mission / todo_dependent_on_return_id_task 已標記 deprecated,無 atom 無面板
//   - backup_file / edit_region_name / cycle_mission 在 v1 選單裡根本沒有入口,維持一致不加
//   - MiR 風格打點不是面板,是地圖互動模式,放在 SettingV2Nav 另外用 Switch 呈現
//   - upload_warning_file 開的是 Modal 不是面板,已在 SettingV2Nav 的動作列裡
//   - mir_edit_mission 的 v1 元件是空殼(標題印 ""、內容是空的),真正的 MiR
//     任務編輯器掛在 edit_mission 的 MissionList 底下,所以這裡不列
export const navCategories: NavCategory[] = [
  {
    key: "location",
    labelKey: "toolbar.location.edit_locations",
    icon: AimOutlined,
    children: [
      { key: "location_panel", labelKey: "toolbar.location.edit_locations" },
      {
        key: "location_list",
        labelKey: "toolbar.location.show_locations_table",
      },
    ],
  },
  {
    key: "road",
    labelKey: "toolbar.road.roads.roads",
    icon: NodeIndexOutlined,
    children: [
      { key: "road_panel", labelKey: "toolbar.road.roads.edit_roads" },
      {
        key: "show_roads_table",
        labelKey: "toolbar.road.roads.show_roads_table",
      },
      {
        key: "quick_road_panel",
        labelKey: "toolbar.road.roads.quick_edit_road",
      },
    ],
  },
  {
    key: "zone",
    labelKey: "toolbar.zone.zones.zones",
    icon: BorderOuterOutlined,
    children: [
      { key: "edit_zone", labelKey: "toolbar.zone.zones.edit_zone" },
      {
        key: "show_zone_table",
        labelKey: "toolbar.zone.zones.show_zone_table",
      },
    ],
  },
  {
    key: "shelve",
    labelKey: "toolbar.shelve.shelves.shelves&pallet",
    icon: GoldOutlined,
    children: [
      { key: "edit_shelve", labelKey: "toolbar.shelve.shelves.edit_shelve" },
      {
        key: "edit_shelve_type",
        labelKey: "toolbar.shelve.shelves.edit_shelve_type",
      },
      { key: "edit_yaw", labelKey: "toolbar.shelve.shelves.edit_yaw" },
    ],
  },
  {
    key: "amr",
    labelKey: "toolbar.amr_setting.robot",
    icon: CarOutlined,
    children: [
      { key: "edit_amr_config", labelKey: "toolbar.amr_setting.amr_config" },
      {
        key: "edit_register_amr",
        labelKey: "toolbar.amr_setting.register_amr",
      },
    ],
  },
  {
    key: "mission",
    labelKey: "toolbar.mission.mission",
    icon: ScheduleOutlined,
    children: [
      { key: "edit_mission", labelKey: "toolbar.mission.edit_mission" },
      { key: "charge_mission", labelKey: "toolbar.mission.charge_mission" },
      {
        key: "before_left_charge_station_task",
        labelKey: "toolbar.mission.before_left_charge_station_mission",
      },
      { key: "schedule_mission", labelKey: "toolbar.mission.schedule_mission" },
      { key: "idle_mission", labelKey: "toolbar.mission.idle_mission" },
      { key: "topic_mission", labelKey: "toolbar.mission.topic_mission" },
      {
        key: "abort_cargo_mission",
        labelKey: "toolbar.mission.abort_mission_when_has_cargo_mission",
      },
      { key: "blind_mission", labelKey: "toolbar.mission.blind_mission" },
    ],
  },
  {
    key: "peripheral",
    labelKey: "toolbar.peripheral.title",
    icon: DeploymentUnitOutlined,
    children: [
      {
        key: "peripheral_name_table",
        labelKey: "toolbar.peripheral.name_table",
      },
      {
        key: "peripheral_group_table",
        labelKey: "toolbar.peripheral.group_table",
      },
      {
        key: "edit_icon_style",
        labelKey: "toolbar.others.edit_peripheral_style",
      },
      {
        key: "stack_batch_edit",
        labelKey: "toolbar.peripheral.stack_batch_edit",
      },
      {
        key: "peripheral_charge_dock_config",
        labelKey: "toolbar.others.charge_dock_config",
      },
    ],
  },
  {
    key: "others",
    labelKey: "toolbar.others.others",
    icon: DeploymentUnitOutlined,
    children: [
      { key: "edit_tag", labelKey: "toolbar.others.edit_tag" },
      {
        key: "custom_cargo_info",
        labelKey: "toolbar.others.custom_cargo_info",
      },
      { key: "container_table", labelKey: "toolbar.others.container_table" },
    ],
  },
  {
    key: "map_setting",
    labelKey: "toolbar.map_setting.map_setting",
    icon: PictureOutlined,
    children: [
      { key: "switch_map", labelKey: "toolbar.map_setting.switch_map" },
      { key: "map_group_table", labelKey: "toolbar.map_setting.map_group" },
    ],
  },
  {
    key: "file_setting",
    labelKey: "toolbar.file_setting.file_setting",
    icon: FileOutlined,
    children: [
      { key: "warning_id", labelKey: "toolbar.file_setting.warning_id" },
      {
        key: "show_system_alarm",
        labelKey: "toolbar.file_setting.system_alarm",
      },
    ],
  },
  {
    key: "mir",
    rawLabel: "MIR",
    icon: FileOutlined,
    children: [
      { key: "footprint", rawLabel: "footprint" },
      { key: "sound", rawLabel: "sound" },
      { key: "marker_type", rawLabel: "marker_type" },
      { key: "sync_mir", rawLabel: "sync_mir" },
      { key: "mir_mission", rawLabel: "mir_mission" },
    ],
  },
];
