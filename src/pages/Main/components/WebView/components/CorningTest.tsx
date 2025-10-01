import client from "@/api/axiosClient";
import { useMockInfo } from "@/sockets/useMockInfo";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, message, Tooltip } from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const MissionBtnWrap = styled.div`
  position: absolute;
  z-index: 4;
  bottom: 16px; /* Align with the header */
  left: 16px; /* Align with the right edge of the mission panel */
  background-color: rgba(
    255,
    255,
    255,
    0.01
  ); /* White background to match panels */
  border-radius: 8px; /* Consistent rounded corners */
  padding: 8px; /* More padding for a spacious feel */
  opacity: 1; /* Always fully opaque for clarity */
  transition: all 0.3s ease-in-out;
  width: "auto";
  height: "auto";
  overflow: hidden;
  display: flex;
  align-items: center;
`;

const CorningTest: FC = () => {
  const script = useMockInfo();
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();

  const elevatorMutation = useMutation({
    mutationFn: (payload: string) => {
      return client.post("api/simulate/elevator-signal", {
        scenario: payload,
      });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const liftMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/test/fake-elevator-signal-change", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const warnMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/test/fake-warning", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const alarmMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/test/fake-alarm", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleElevator = (scenario: string) => {
    elevatorMutation.mutate(scenario);
  };

  const handleLiftSignal = () => {
    liftMutation.mutate();
  };

  const handleWarning = () => {
    warnMutation.mutate();
  };

  const handleAlarm = () => {
    alarmMutation.mutate();
  };

  if (script?.isSimulate === false) return null;
  return (
    <>
      {contextHolders}
      <MissionBtnWrap>
        <Flex vertical gap="small">
          <Tooltip
            placement="right"
            title="Success elevator barcode reader, success fork read container"
          >
            <Button onClick={() => handleElevator("1")}>Scenario 1</Button>
          </Tooltip>

          <Tooltip
            placement="right"
            title="Success elevator barcode reader, fail fork read container"
          >
            <Button onClick={() => handleElevator("2")}>Scenario 2</Button>
          </Tooltip>

          <Tooltip
            placement="right"
            title="Fail elevator barcode reader, success fork read container"
          >
            <Button onClick={() => handleElevator("3")}>Scenario 3</Button>
          </Tooltip>

          <Tooltip
            placement="right"
            title="Fail elevator barcode reader, fail fork read container"
          >
            <Button onClick={() => handleElevator("4")}>Scenario 4</Button>
          </Tooltip>

          <Button onClick={() => handleLiftSignal()}>Lift Signal</Button>

          <Button onClick={() => handleWarning()}>Warning</Button>
          <Button onClick={() => handleAlarm()}>Alarm</Button>
        </Flex>
      </MissionBtnWrap>
    </>
  );
};

export default CorningTest;
