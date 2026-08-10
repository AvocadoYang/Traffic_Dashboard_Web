import { forwardRef } from "react";
import { memo } from "react";
import useMap from "@/api/useMap";
import { Spin } from "antd";
import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";

const MapImage = forwardRef<HTMLImageElement>((_props, ref) => {
  const { data, isLoading, isError } = useMap();
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
          <h1 className="error-text">Internal Server Error</h1>
          <h3 className="error-text">Oops! Something went wrong</h3>
          <h4 className="error-text">
            The server encountered an internal error or misconfiguration and was
            unable to complete your request
          </h4>
        </div>
      </div>
    );

  return (
    <img
      ref={ref}
      src={`${data.imageUrl}`}
      draggable={false}
      style={{ userSelect: "none" }}
      alt="Map-bibib"
      onDragStart={(e) => e.preventDefault()}
    />
  );
});

export default memo(MapImage);
