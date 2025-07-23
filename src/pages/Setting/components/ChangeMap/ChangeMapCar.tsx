import { Tabs, TabsProps } from "antd";

import { FC } from "react";
import "./style.css";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import UploadMap from "./UploadMap";
import MapViewer from "./MapViewer";
import { useAtom } from "jotai";
import { isOpenSwitchMap } from "@/utils/siderGloble";

const ChangeMapModal: FC<{}> = () => {
  const { t } = useTranslation();
  const [openSwitchMap, setOpenSwitchMap] = useAtom(isOpenSwitchMap);

  const onChange = (key: string) => {
    console.log(key);
  };

  const items: TabsProps["items"] = [
    {
      key: "tab1",
      label: t("change_map.view_maps"),
      children: <MapViewer />,
    },
    {
      key: "tab2",
      label: t("change_map.upload_map"),
      children: <UploadMap />,
    },
  ];

  return (
    <div className={`change-map-wrap ${openSwitchMap ? "show" : ""}`}>
      <div className="info-wrap">
        <div className="tittle-wrap">
          <CloseOutlined
            className="close-icon"
            onClick={() => setOpenSwitchMap(false)}
          />
          <span className="tittle">{t("change_map.switch_map")}</span>
        </div>
        <div className="body-wrap">
          <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
        </div>
      </div>
    </div>
  );
};

export default ChangeMapModal;
