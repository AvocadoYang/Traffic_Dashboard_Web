import { FC, memo, RefObject } from "react";
import styled from "styled-components";
import { amrId2Color } from "@/utils/utils";
import { Button, message, Tooltip } from "antd";
import { PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import useScriptRobot from "@/api/useScriptRobot";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AmrIcon from "./AmrIcon";

const AMRPadWrap = styled.div`
  position: absolute;
  z-index: 4;
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
  width: 3em;
  height: 40vh;
  padding: 1em 0em;
  justify-content: space-between;

  &:hover {
    opacity: 1;
  }
`;

const Box = styled.div`
  display: flex;
  flex-direction: column;
  height: 80%;
  overflow-y: scroll;
  align-items: center;
  gap: 1em;

  &::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for Firefox */
  scrollbar-width: none;
  -ms-overflow-style: none; /* Hide scrollbar for IE and Edge */
`;

const AmrIconStyled = styled(AmrIcon)`
  width: 2em;
  min-width: 150px;
  height: 2em;
  margin-bottom: 1.5em; /* Add margin to create spacing */

  &:last-child {
    margin-bottom: 0; /* Remove margin from the last item */
  }
`;

const IdleRobotPanel: FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapWrapRef: RefObject<HTMLDivElement>;
}> = ({ mapRef, mapWrapRef }) => {
  const { data: robot, refetch } = useScriptRobot();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: () => {
      return client.post("api/simulate/add-robot");
    },
    onSuccess: () => {
      refetch();
      queryClient.refetchQueries({ queryKey: ["mock-robot"] });
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const handleAdd = () => {
    addMutation.mutate();
  };

  function onDrop(event) {
    const data = event.dataTransfer.getData("text/plain");
    event.target.textContent = data;
    event.preventDefault();
  }

  return (
    <>
      {contextHolder}
      <AMRPadWrap onDrop={(e) => onDrop(e)}>
        <Tooltip placement="right" title={t("sim.robot.no_add_warn")}>
          <QuestionCircleOutlined />
        </Tooltip>

        <Box>
          {robot && robot.length !== 0
            ? robot
                .filter((r) => r?.script_placement_location === "unset")
                .map((v) => {
                  return (
                    <AmrIconStyled
                      key={v?.id}
                      id={v?.id as string}
                      amrId={v?.full_name as string}
                      color={amrId2Color(v?.id as string)}
                      mapRef={mapRef}
                      mapWrapRef={mapWrapRef}
                      left={null}
                      top={null}
                      placement={v?.script_placement_location as string}
                    />
                  );
                })
            : []}
        </Box>

        <Tooltip placement="right" title={t("utils.add")}>
          <Button
            onClick={() => handleAdd()}
            loading={addMutation.isLoading}
            shape="circle"
            icon={<PlusOutlined />}
          ></Button>
        </Tooltip>
      </AMRPadWrap>
    </>
  );
};

export default memo(IdleRobotPanel, () => true);
