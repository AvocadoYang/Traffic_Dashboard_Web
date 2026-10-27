import { FC } from "react";
import { Button, Tooltip } from "antd";
import { AimOutlined } from "@ant-design/icons";
import { useSetAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  focusLocationRequest,
  parseLocationId,
} from "@/components/CanvasMap/focusLocation";

/**
 * 貨物歷史裡的地點 ("16002 L2"、"conveyor:C03"): 點了就到首頁地圖,
 * 把那個點位移到中央、放大、用箭頭指幾秒。
 * onLocate: 從會蓋住地圖的抽屜 / 彈窗裡點的時候, 讓呼叫端先關掉它。
 */
const LocateLocationLink: FC<{
  location: string | null | undefined;
  onLocate?: () => void;
}> = ({ location, onLocate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setRequest = useSetAtom(focusLocationRequest);

  const id = parseLocationId(location);
  if (!location) return <>-</>;
  if (!id) return <>{location}</>;

  return (
    <Tooltip title={t("cargo_history.locate")}>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, height: "auto" }}
        icon={<AimOutlined />}
        onClick={() => {
          setRequest({ locationId: id, at: Date.now() });
          onLocate?.();
          if (pathname !== "/") navigate("/");
        }}
      >
        {location}
      </Button>
    </Tooltip>
  );
};

export default LocateLocationLink;
