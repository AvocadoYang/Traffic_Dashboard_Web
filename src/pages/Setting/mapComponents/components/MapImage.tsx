import { forwardRef, useId, useMemo } from "react";
import { memo } from "react";
import { useAtomValue } from "jotai";
import useMap from "@/api/useMap";
import { Spin } from "antd";
import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  buildMapImageMatrix,
  getMapCanvas,
  mapImageModeAtom,
  themeAtom,
} from "@/theme";

const MapImage = forwardRef<HTMLImageElement>((_props, ref) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMap();

  // 底圖跟著主題:顯示時用濾鏡把白換成主題的底色、黑換成線條色,原檔不動。
  // 選「原圖」或是灰階主題時 matrix 是 null,連濾鏡都不掛,跟以前一模一樣。
  const theme = useAtomValue(themeAtom);
  const mapImage = useAtomValue(mapImageModeAtom);
  const matrix = useMemo(
    () => buildMapImageMatrix(getMapCanvas(theme, mapImage)),
    [theme, mapImage],
  );
  // useId 產生的 id 有冒號,放進 url(#…) 之前先拿掉
  const filterId = `map-image-${useId().replace(/:/g, "")}`;
  // console.log(data?.imageUrl)
  if (isLoading)
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 55 }} spin />} />
      </div>
    );

  if (isError)
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "50%",
            padding: "5px",
          }}
        >
          <p
            className="error-text"
            style={{
              fontSize: "50px",
              marginBottom: "0",
              color: "red",
              fontWeight: "bold",
            }}
          >
            ⚠️
          </p>
          <RobotOutlined
            className="robot-icon"
            style={{ marginBottom: "20px" }}
          />
          <h1 className="error-text">{t("utils.server_error.title")}</h1>
          <h3 className="error-text">{t("utils.server_error.subtitle")}</h3>
          <h4 className="error-text">{t("utils.server_error.desc")}</h4>
        </div>
      </div>
    );

  return (
    <>
      <img
        ref={ref}
        src={`${data.imageUrl}`}
        draggable={false}
        style={{
          userSelect: "none",
          filter: matrix ? `url(#${filterId})` : undefined,
        }}
        alt="Map-bibib"
        onDragStart={(e) => e.preventDefault()}
      />
      {matrix ? (
        // 只是放濾鏡定義的容器,不佔位置。放在 <img> 後面,<img> 才仍然是第一個子元素。
        <svg
          width="0"
          height="0"
          aria-hidden
          style={{ position: "absolute", pointerEvents: "none" }}
        >
          {/* 預設是在 linearRGB 裡算,白跟黑的對應會偏掉,要指定用 sRGB */}
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={matrix} />
          </filter>
        </svg>
      ) : null}
    </>
  );
});

export default memo(MapImage);
