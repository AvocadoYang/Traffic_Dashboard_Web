import { Open2DMap } from "@/pages/Main/global/jotai";
import { Button, Space } from "antd";
import { useSetAtom } from "jotai";
import {
  PlusOutlined,
  MinusOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export const ZoomPad: React.FC<{
  setScale: React.Dispatch<React.SetStateAction<number>>;
}> = ({ setScale }) => {
  const { t } = useTranslation();
  return (
    <div className="zoom-pad-wrap">
      <Space.Compact>
        <Button
          onClick={() => setScale((pre) => pre + 0.035)}
          icon={<PlusOutlined />}
        >
          {t("map_tool.zoom_in")}
        </Button>
        <Button
          onClick={() =>
            setScale((pre) => {
              return pre - 0.035;
            })
          }
          icon={<MinusOutlined />}
        >
          {t("map_tool.zoom_out")}
        </Button>
      </Space.Compact>
    </div>
  );
};

export const CloseBtn = () => {
  const open2DMap = useSetAtom(Open2DMap);
  return (
    <RollbackOutlined
      className="close-pad-map-button"
      onClick={() => {
        open2DMap(false);
      }}
    />
  );
};
