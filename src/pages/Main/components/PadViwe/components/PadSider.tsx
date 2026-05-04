// import { Menu, MenuProps, Badge } from "antd";
// import {
//   ScheduleOutlined,
//   GlobalOutlined,
//   InsertRowAboveOutlined,
//   AlertOutlined,
// } from "@ant-design/icons";
// import { viewBtn } from "@/pages/Main/jotai.ts";
// import { useAtom } from "jotai";
// import "../style.css";
// import { ViewBtn } from "@/pages/Main/jotai.ts";
// import { useTranslation } from "react-i18next";
// import styled from "styled-components";

// type MenuItem = Required<MenuProps>["items"][number];

// function getItem(
//   label: React.ReactNode,
//   key: React.Key,
//   icon?: React.ReactNode,
//   onClick?: () => void,
// ): MenuItem {
//   return { key, icon, onClick, label } as MenuItem;
// }

// const BottomBar = styled(Menu)`
//   display: flex;
//   justify-content: space-around;
//   width: 100%;
//   border-top: 1px solid #e0e0e0 !important;
//   border-right: none !important;
//   background-color: #f5f5f5 !important;

//   .ant-menu-item {
//     flex: 1;
//     text-align: center;
//     padding: 0 !important;
//     margin: 0 !important;
//     height: 56px;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//   }
// `;

// const PadBottomBar = () => {
//   const { t } = useTranslation();
//   const [_, setOpenEditLocationPanel] = useAtom(viewBtn);

//   const handleViewChange = (itemType: number) => {
//     setOpenEditLocationPanel(itemType);
//   };

// //   const viewItem: MenuItem[] = [
// //     getItem(
// //       t("main.pad_view.sider.map_view"),
// //       "1",
// //       <GlobalOutlined />,
// //       () => handleViewChange(ViewBtn.mapView)
// //     ),
// //     getItem(
// //       t("main.pad_view.sider.mission_view"),
// //       "2",
// //       <ScheduleOutlined />,
// //       () => handleViewChange(ViewBtn.missionView)
// //     ),
// //     getItem(
// //       t("main.pad_view.sider.info_view"),
// //       "3",
// //       <InsertRowAboveOutlined />,
// //       () => handleViewChange(ViewBtn.infoView)
// //     ),
// //     // TODO: alert api
// //     getItem(
// //       t("main.pad_view.sider.alert_view"),
// //       "4",
// //       <Badge count={12} size="small">
// //         <AlertOutlined />
// //       </Badge>,
// //       () => handleViewChange(ViewBtn.alertView)
// //     ),
// //   ];

//   return (
//     <BottomBar
//       mode="horizontal"
//       defaultSelectedKeys={["2"]}
//       items={viewItem}
//     />
//   );
// };

// export default PadBottomBar;