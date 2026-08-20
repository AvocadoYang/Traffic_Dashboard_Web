import {
  Open2DMap,
  Open3DMap,
  OpenAssignMission,
  OpenAutoMission,
  OpenCarCardInfo,
  OpenInputMission,
  OpenMissionCardInfo,
  OpenQuickMission,
  viewBtn,
} from "@/pages/Main/global/jotai";
import { Card, Button, Space } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AutoMission,
  DialogMission,
  InputMission,
  QuickMission,
} from "../../../missionModal";

const CardWrap: React.FC<{
  id: string;
}> = ({ id }) => {
  const { t } = useTranslation();
  const view = useAtomValue(viewBtn);
  const [borderColor, setBorderColor] = useState("");
  const openQuickMission = useSetAtom(OpenQuickMission);
  const openAssignMission = useSetAtom(OpenAssignMission);

  useEffect(() => {
    if (id === "map_2D_view" || id === "map_3D_view") {
      setBorderColor("rgb(56, 142, 240)");
    }
    if (
      id === "quick_mission" ||
      id === "new_mission" 
    ) {
      setBorderColor("rgb(247, 108, 10)");
    }
    if (id === "mission_info" || id === "car_info") {
      setBorderColor("rgb(71, 138, 129)");
    }
  }, []);

  const btnClick = useCallback((id: string) => {
    switch (id) {
      case "quick_mission":
        openQuickMission(true);
        break;
      case "new_mission":
        openAssignMission(true);
        break;
      default:
        break;
    }
  }, []);

  return (
    <>
      <Card
        className="pad-card-wrap"
        size="default"
        type="inner"
        title={t(`main.card_name.${id}` as any)}
        style={{ borderTop: `6px solid ${borderColor}` }}
        extra={
          <>
            <Space>
             <Button
                key={id}
                id={id}
                color="primary"
                variant="filled"
                onClick={() => {
                  btnClick(id);
                }}
              >
                {t("utils.open")}
              </Button>
            </Space>
          </>
        }
      >
  
      </Card>

      {((id) => {
        if (view !== 1) return [];
        switch (id) {
          case "new_mission":
            return <DialogMission></DialogMission>;
          case "quick_mission":
            return <QuickMission></QuickMission>;
          default:
            return [];
        }
      })(id)}
    </>
  );
};
export default memo(CardWrap);
