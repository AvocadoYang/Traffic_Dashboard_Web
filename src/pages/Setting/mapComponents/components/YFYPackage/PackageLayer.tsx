import { FC, useMemo } from "react";
import { useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { LogoutOutlined } from "@ant-design/icons";
import useMap from "@/api/useMap";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import usePackageSocket from "@/sockets/usePackageSocket";
import { tooltipProp } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { Package_Info } from "@/types/peripheral";
import { Point } from "../AllLocation/components/PointAndLine";
import PackageStrip, { PackagePortIcon, PackagePortView } from "./PackageStrip";

const WrapperStation = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left, top },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

/** 後端還沒送資料來之前先畫這麼多顆「沒有訊號」的燈 */
const PLACEHOLDER_LAMPS: null[] = Array.from({ length: 12 }, () => null);

const PLACEHOLDER_PORT: PackagePortView = {
  state: "idle",
  disabled: true,
  booked: false,
  title: "",
};

/**
 * 地圖上所有的包膜線。
 * 入口(點位屬性 PACKAGE_IN)畫整條燈條,燈條右端的按鈕就是它的出口(PACKAGE_OUT)。
 * 還沒被哪個入口指定的出口沒有燈條可以代表它,才在點位上自己畫一個小圖示。
 * 兩端點了要做什麼(開設定、派車選點位、看登記的貨)由 portView 決定。
 */
const PackageLayer: FC<{
  portView: (info: Package_Info) => PackagePortView;
}> = ({ portView }) => {
  const { t } = useTranslation();
  const { data } = useMap();
  const { data: locInfo } = useLoc(undefined);
  const packages = usePackageSocket();
  const setTooltip = useSetAtom(tooltipProp);

  const styleOf = useMemo(() => {
    const map = new Map<string, LocWithoutArr>();
    ((locInfo as LocWithoutArr[]) ?? []).forEach((l) =>
      map.set(l.locationId, l),
    );
    return map;
  }, [locInfo]);

  if (!data) return null;

  return (
    <>
      {data.locations
        .filter(
          ({ areaType }) =>
            areaType === "PACKAGE_IN" || areaType === "PACKAGE_OUT",
        )
        .map((loc) => {
          const [displayX, displayY] = rosCoord2DisplayCoord({
            x: loc.x,
            y: loc.y,
            mapHeight: data.mapHeight,
            mapOriginX: data.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
          });
          const style = styleOf.get(loc.locationId);
          const info = packages?.[loc.locationId];
          const exitInfo =
            info?.exitLocationId != null
              ? packages?.[info.exitLocationId]
              : undefined;

          return (
            <div
              draggable={false}
              key={loc.locationId}
              onDragStart={(event) => event.preventDefault()}
            >
              <Point
                id={loc.locationId.toString()}
                canrotate={`${loc.canRotate}`}
                left={displayX}
                top={displayY}
                onMouseEnter={() =>
                  setTooltip({ x: loc.x, y: loc.y, locationId: loc.locationId })
                }
                onMouseLeave={() => setTooltip(null)}
              />

              <WrapperStation left={displayX} top={displayY}>
                {loc.areaType === "PACKAGE_OUT" ? (
                  // 已經配對的出口由入口那條燈條的右端代表,這裡不用再畫
                  info &&
                  info.entryLocationId === null && (
                    <div
                      style={{
                        transform: `translate(${style?.translateX ?? 0}px, ${
                          style?.translateY ?? 0
                        }px) scale(${style?.scale ?? 1}) rotate(${
                          style?.rotate ?? 0
                        }deg)`,
                      }}
                    >
                      {(() => {
                        const view = portView(info);
                        return (
                          <PackagePortIcon
                            type="button"
                            title={view.title}
                            $state={view.state}
                            $disabled={view.disabled}
                            $booked={view.booked}
                            onClick={view.onClick}
                          >
                            <LogoutOutlined />
                          </PackagePortIcon>
                        );
                      })()}
                    </div>
                  )
                ) : (
                  // 燈條的位移單位是 em,沿用舊版的寫法,已經擺好的位置才不會跑掉
                  <div
                    style={{
                      width: "max-content",
                      transform: `translate(${style?.translateX ?? 0}em, ${
                        style?.translateY ?? 0
                      }em) scale(${style?.scale ?? 1}) rotate(${
                        style?.rotate ?? 0
                      }deg)`,
                    }}
                  >
                    <PackageStrip
                      lamps={info?.lamps ?? PLACEHOLDER_LAMPS}
                      cargo={info?.cargo ?? []}
                      capacity={info?.capacity ?? 0}
                      entry={info ? portView(info) : PLACEHOLDER_PORT}
                      exit={exitInfo ? portView(exitInfo) : null}
                      missingExitTitle={t("package.no_exit")}
                      cargoTitle={t("package.registered_cargo", {
                        n: info?.cargo.length ?? 0,
                      })}
                      entrySensor={info?.entrySensor}
                      exitSensor={exitInfo ? info?.exitSensor : undefined}
                      entrySensorTitle={
                        info?.entrySensor
                          ? t(`package.entry_state.${info.entrySensor}`)
                          : undefined
                      }
                      exitSensorTitle={
                        info?.exitSensor
                          ? t(`package.exit_state.${info.exitSensor}`)
                          : undefined
                      }
                    />
                  </div>
                )}
              </WrapperStation>
            </div>
          );
        })}
    </>
  );
};

export default PackageLayer;
