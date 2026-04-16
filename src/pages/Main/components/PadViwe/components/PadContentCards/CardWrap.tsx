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
} from "@/pages/Main/jotai.ts";
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
  setOpenCycleMissionList: React.Dispatch<boolean>;
}> = ({ id, setOpenCycleMissionList }) => {
  const { t } = useTranslation();
  const view = useAtomValue(viewBtn);
  const [borderColor, setBorderColor] = useState("");

  const open2DMap = useSetAtom(Open2DMap);
  const open3DMap = useSetAtom(Open3DMap);
  const openQuickMission = useSetAtom(OpenQuickMission);
  const openAssignMission = useSetAtom(OpenAssignMission);
  const openAutoMission = useSetAtom(OpenAutoMission);
  const openInputMission = useSetAtom(OpenInputMission);
  const openCarCardInfo = useSetAtom(OpenCarCardInfo);
  const openMissionCardInfo = useSetAtom(OpenMissionCardInfo);

  useEffect(() => {
    if (id === "map_2D_view" || id === "map_3D_view") {
      setBorderColor("rgb(56, 142, 240)");
    }
    if (
      id === "quick_mission" ||
      id === "auto_mission" ||
      id === "new_mission" ||
      id === "input_mission"
    ) {
      setBorderColor("rgb(247, 108, 10)");
    }
    if (id === "mission_info" || id === "car_info") {
      setBorderColor("rgb(71, 138, 129)");
    }
  }, []);

  const btnClick = useCallback((id) => {
    switch (id) {
      case "map_2D_view":
        open2DMap(true);
        break;
      case "map_3D_view":
        open3DMap(true);
        break;
      case "quick_mission":
        openQuickMission(true);
        break;
      case "auto_mission":
        openAutoMission(true);
        break;
      case "new_mission":
        openAssignMission(true);
        break;
      case "input_mission":
        openInputMission(true);
        break;
      case "mission_info":
        openMissionCardInfo(true);
        break;
      case "car_info":
        openCarCardInfo(true);
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
              {id === "auto_mission" ? (
                <Button
                  size="small"
                  color="default"
                  variant="filled"
                  onClick={() => {
                    setOpenCycleMissionList(true);
                  }}
                >
                  {t("utils.detail")}
                </Button>
              ) : (
                []
              )}
              <Button
                key={id}
                id={id}
                color="primary"
                variant="filled"
                disabled={id === "map_3D_view"}
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
        {id === "map_3D_view" ? (
          <p style={{ color: "red" }}>{"開發中...."}</p>
        ) : (
          []
        )}
        <p>some content ....</p>
        <p>some content ....</p>
        <p>some content ....</p>
      </Card>

      {((id) => {
        if (view !== 1) return [];
        switch (id) {
          case "auto_mission":
            return <AutoMission></AutoMission>;
          case "new_mission":
            return <DialogMission></DialogMission>;
          case "input_mission":
            return <InputMission></InputMission>;
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
