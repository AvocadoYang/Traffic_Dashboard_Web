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
  BgColorsOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  InboxOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import type { SettingV2PanelKey } from "./panelKeys";

export type NavLeaf = {
  key: SettingV2PanelKey;
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

// 標題文字沿用 v1 Sider.tsx 的翻譯 key,但分類是 v2 自己依「這個設定在管什麼」重排的,
// 跟 v1 的選單不再一一對應(v1 的「設備」「其它」「檔案設定」塞了不少不相干的東西):
//   - 充電: 充電任務、離站強制任務原本在「任務」,充電站停車容忍值原本在「設備」
//   - 調度規則: 輸送帶派送、區域搬運、作業區原本在「設備」,但它們管的是
//     車怎麼派、怎麼進場,不是設備本身
//   - 貨物: 自定義貨物資訊、貨物表格原本在「其它」
//   - 告警: 原本叫「檔案設定」,實際上只剩告警相關的兩個面板
//   - 標籤設定是任務的分類標籤,從「其它」併進「任務」,「其它」就此清空
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
    labelKey: "toolbar.location.locations",
    icon: AimOutlined,
    children: [
      { key: "location_panel", labelKey: "toolbar.location.edit_locations" },
      {
        key: "quick_location_panel",
        labelKey: "toolbar.location.quick_edit_locations",
      },
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
        key: "quick_road_panel",
        labelKey: "toolbar.road.roads.quick_edit_road",
      },
      {
        key: "show_roads_table",
        labelKey: "toolbar.road.roads.show_roads_table",
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
    key: "map_setting",
    labelKey: "toolbar.map_setting.map_setting",
    icon: PictureOutlined,
    children: [
      { key: "switch_map", labelKey: "toolbar.map_setting.switch_map" },
      { key: "map_group_table", labelKey: "toolbar.map_setting.map_group" },
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
    key: "charge",
    labelKey: "toolbar.category.charge",
    icon: ThunderboltOutlined,
    children: [
      { key: "charge_mission", labelKey: "toolbar.mission.charge_mission" },
      {
        key: "before_left_charge_station_task",
        labelKey: "toolbar.mission.before_left_charge_station_mission",
      },
      {
        key: "peripheral_charge_dock_config",
        labelKey: "toolbar.others.charge_dock_config",
      },
    ],
  },
  {
    key: "mission",
    labelKey: "toolbar.mission.mission",
    icon: ScheduleOutlined,
    children: [
      { key: "edit_mission", labelKey: "toolbar.mission.edit_mission" },
      { key: "schedule_mission", labelKey: "toolbar.mission.schedule_mission" },
      { key: "idle_mission", labelKey: "toolbar.mission.idle_mission" },
      { key: "topic_mission", labelKey: "toolbar.mission.topic_mission" },
      { key: "blind_mission", labelKey: "toolbar.mission.blind_mission" },
      {
        key: "abort_cargo_mission",
        labelKey: "toolbar.mission.abort_mission_when_has_cargo_mission",
      },
      { key: "edit_tag", labelKey: "toolbar.others.edit_tag" },
    ],
  },
  {
    key: "dispatch",
    labelKey: "toolbar.category.dispatch",
    icon: ApartmentOutlined,
    children: [
      {
        key: "conveyor_dispatch",
        labelKey: "toolbar.peripheral.conveyor_dispatch",
      },
      {
        key: "transfer_rules",
        labelKey: "toolbar.peripheral.transfer_rules",
      },
      {
        key: "work_areas",
        labelKey: "toolbar.peripheral.work_areas",
      },
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
        key: "stack_batch_edit",
        labelKey: "toolbar.peripheral.stack_batch_edit",
      },
      {
        key: "edit_icon_style",
        labelKey: "toolbar.others.edit_peripheral_style",
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
    key: "cargo",
    labelKey: "toolbar.category.cargo",
    icon: InboxOutlined,
    children: [
      {
        key: "custom_cargo_info",
        labelKey: "toolbar.others.custom_cargo_info",
      },
      { key: "container_table", labelKey: "toolbar.others.container_table" },
    ],
  },
  {
    key: "alarm",
    labelKey: "toolbar.category.alarm",
    icon: AlertOutlined,
    children: [
      { key: "warning_id", labelKey: "toolbar.file_setting.warning_id" },
      {
        key: "show_system_alarm",
        labelKey: "toolbar.file_setting.system_alarm",
      },
    ],
  },
  {
    key: "appearance_group",
    labelKey: "appearance.title",
    icon: BgColorsOutlined,
    children: [{ key: "appearance", labelKey: "appearance.theme" }],
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
