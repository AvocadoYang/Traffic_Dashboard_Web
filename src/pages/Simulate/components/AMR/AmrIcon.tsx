import { FC, memo, RefObject, useRef, useState } from "react";
import styled from "styled-components";
import { message, Spin, Tooltip } from "antd";
import useMap from "@/api/useMap";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import useScriptRobot from "@/api/useScriptRobot";
import { errorHandler, rvizCoord } from "@/utils/utils";
import { EditFormType } from "./amr";
import AmrForm from "./AmrForm";
import { findClosestLocation } from "../../utils/funcs";
import { ErrorResponse } from "@/utils/globalType";
import { useAtomValue } from "jotai";
import { globalScale } from "../../utils/mapStatus";

const AMR_FORK_WIDTH = 1.4; // meter
const AMR_FORK_HEIGHT = 2; // meter

const ColorAmr = styled.div.attrs<{
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  $is_agv: boolean;
  placement: string;
}>(({ left, top }) => ({
  style: {
    left: `${left !== null ? left : "auto"}px`,
    top: `${top !== null ? top : "auto"}px`,
  },
}))<{
  left: number | null;
  top: number | null;
}>`
  width: 1.2em;
  min-height: 1.5em;
  display: flex;
  border: ${(prop) => (prop.$is_agv ? "1px solid gray" : "none")};
  justify-content: ${(prop) =>
    prop.$is_agv ? "space-evenly" : "space-around"};
  position: ${(prop) => (prop.placement === "unset" ? "relative" : "absolute")};
  background-color: ${(prop) => prop.color};
  transform-origin: x y;
  border-radius: 2px;
  z-index: 15;
`;

const Fork = styled.div<{
  direct: string;
}>`
  height: 55%;
  width: 15%;
  background-color: #424141;
  border-radius: 0px 0px 1px 1px;

  position: absolute;
  left: ${(prop) => (prop.direct === "left" ? "20%" : "65%")};
  bottom: -53%;
`;

const AmrIcon: FC<{
  id: string;
  amrId: string;
  color: string;
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
  placement: string;
  left: number | null;
  top: number | null;
}> = ({ amrId, color, id, mapRef, mapWrapRef, placement, left, top }) => {
  const { data: map } = useMap();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: robot, refetch } = useScriptRobot();
  const ref = useRef<HTMLDivElement | null>(null);
  const scale = useAtomValue(globalScale);
  const queryClient = useQueryClient();
  const handleSetRobot = () => {
    setIsOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: (payload: EditFormType) => {
      return client.post("api/simulate/edit-robot", { ...payload, id });
    },
    onSuccess: async () => {
      refetch();
      void messageApi.success(t("utils.success"));
      setIsOpen(false);
      queryClient.refetchQueries({ queryKey: ["mock-robot"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const isRegisterMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await client.post("api/simulate/is-place-has-robot", {
        locationId,
      });
      return response.data as { locationId: string; isRegister: boolean };
    },
    onSuccess: (result) => {
      if (result.isRegister) {
        messageApi.warning(t("sim.robot.no_overlapping"));
        return;
      }
      handlePlacement(result.locationId);
      queryClient.refetchQueries({ queryKey: ["mock-robot"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleEditMutation = (payload: EditFormType) => {
    editMutation.mutate(payload);
  };

  const handlePlacement = (locationId: string | null) => {
    const info = robot?.find((v) => v?.id === id);

    handleEditMutation({
      full_name: info?.full_name as string,
      script_placement_location: locationId === null ? "unset" : locationId,
    });
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (!map || !mapRef.current || !mapWrapRef.current) return;

    const { clientX, clientY } = event;
    const mapRect = mapRef.current.getBoundingClientRect();

    const adjustX = clientX - mapRect.left;
    const adjustY = clientY - mapRect.top;
    const [rx, ry] = rvizCoord({
      displayX: adjustX / scale,
      displayY: adjustY / scale,
      mapResolution: map.mapResolution,
      mapOriginX: map.mapOriginX,
      mapOriginY: map.mapOriginY,
      mapHeight: map.mapHeight,
      scaleSize: scale,
    });

    // console.log(rx, ry);

    const closestLocationId = findClosestLocation(rx, ry, map);

    if (!closestLocationId) {
      messageApi.warning("edit location first");
      return;
    }

    isRegisterMutation.mutate(closestLocationId);
  };

  if (!map) return <Spin />;
  return (
    <>
      {contextHolder}
      <Tooltip title={amrId} placement="right">
        <ColorAmr
          placement={placement}
          left={left}
          top={top}
          onClick={handleSetRobot}
          draggable
          onDragEnd={handleDragEnd}
          ref={ref}
          width={AMR_FORK_WIDTH / map.mapResolution}
          height={AMR_FORK_HEIGHT / map.mapResolution}
          color={color}
          $is_agv={amrId.includes("SW15")}
        >
          <Fork direct="left"></Fork>
          <Fork direct="right"></Fork>
        </ColorAmr>
      </Tooltip>
      <AmrForm
        id={id}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        handleEditMutation={handleEditMutation}
      />
    </>
  );
};

export default memo(
  AmrIcon,
  (prev, next) =>
    JSON.stringify(prev.placement) === JSON.stringify(next.placement),
);
