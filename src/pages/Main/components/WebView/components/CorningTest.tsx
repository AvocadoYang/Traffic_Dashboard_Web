import client from "@/api/axiosClient";
import { useMockInfo } from "@/sockets/useMockInfo";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Input, message, Popover, Tooltip } from "antd";
import { FC, useState } from "react";
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

export type Corning_Cargo = {
  container_id: string;
  container_gen: string;
  container_type: string;
};

const c_genOption = ["5", "5.5", "6-Metal", "6-Wooden", "6-Inno", "6-KC"];
const c_typeOption = ["Full", "Pallet", "Wooden", "Unknown", "Empty"];

const CorningTest: FC = () => {
  const script = useMockInfo();
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();
  const [container, setContainer] = useState<Corning_Cargo>({
    container_id: "TC123456",
    container_gen: "",
    container_type: "",
  });

  const elevatorMutation = useMutation({
    mutationFn: (payload: string) => {
      return client.post("api/test/elevator-signal", {
        scenario: payload,
        container,
      });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const liftMutation = useMutation({
    mutationFn: (payload: { status: "all-empty" | "all-manual" }) => {
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

  const handleLiftSignal = (status: "all-empty" | "all-manual") => {
    liftMutation.mutate({ status });
  };

  const handleWarning = () => {
    warnMutation.mutate();
  };

  const handleAlarm = () => {
    alarmMutation.mutate();
  };

  const handleContainer = (type: "id" | "gen" | "type", value: string) => {
    if (type === "gen") {
      setContainer((prev) => {
        return {
          ...prev,
          container_gen: value,
        };
      });
    }
    if (type === "id") {
      setContainer((prev) => {
        return {
          ...prev,
          container_id: value,
        };
      });
    }
    if (type === "type") {
      setContainer((prev) => {
        return {
          ...prev,
          container_type: value,
        };
      });
    }
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

          <Input
            placeholder="id"
            value={container.container_id}
            onChange={(e) => handleContainer("id", e.target.value)}
          />

          <Input
            placeholder="gen"
            value={container.container_gen}
            onChange={(e) => handleContainer("gen", e.target.value)}
          />

          <Input
            placeholder="type"
            value={container.container_type}
            onChange={(e) => handleContainer("type", e.target.value)}
          />

          <Popover
            content={
              <div>
                ========= gen
                {c_genOption.map((v) => {
                  return <p>{v}</p>;
                })}
                ========= type
                {c_typeOption.map((v) => {
                  return <p>{v}</p>;
                })}
              </div>
            }
            placement="right"
            title="Title"
            trigger="click"
          >
            <Button>Click me</Button>
          </Popover>

          {/* <Tooltip
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
          </Tooltip> */}

          <Button onClick={() => handleLiftSignal("all-empty")}>
            Lift Signal All empty
          </Button>
          <Button onClick={() => handleLiftSignal("all-manual")}>
            Lift Signal All Manual
          </Button>

          <Button onClick={() => handleWarning()}>Warning</Button>
          <Button onClick={() => handleAlarm()}>Alarm</Button>
        </Flex>
      </MissionBtnWrap>
    </>
  );
};

export default CorningTest;
