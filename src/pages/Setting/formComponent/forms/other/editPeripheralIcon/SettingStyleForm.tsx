import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  RedoOutlined,
  UndoOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import { Button, Col, Form, InputNumber, message, Row, Select } from "antd";
import { FC, useEffect, useRef } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAtom, useSetAtom } from "jotai";
import client from "@/api/axiosClient";
import { IsEditPeripheralStyle, PeripheralEditData } from "@/utils/gloable";

type Options =
  | "areaType"
  | "translateX"
  | "translateY"
  | "rotate"
  | "scale"
  | "flex_direction";

type Val = {
  input: Options;
  value: number;
};

export type SubmitValue = {
  loc: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

type Event =
  | "up"
  | "down"
  | "left"
  | "right"
  | "r-rotate"
  | "l-rotate"
  | "scale-up"
  | "scale-down"
  | "";

const flexOption = [
  { value: "row" },
  { value: "column" },
  { value: "row-reverse" },
  { value: "column-reverse" },
];

const Wrapper = styled.div`
  max-width: 31em;
  display: flex;
  gap: 1em;
`;

const BtnWrapper = styled.div`
  display: flex;
  gap: 1em;
`;

const SettingStyleForm: FC = () => {
  const [form] = Form.useForm();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectStation, setSelectStation] = useAtom(PeripheralEditData);
  const setIsEditStation = useSetAtom(IsEditPeripheralStyle);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitValue) => {
      return client.post(
        "api/peripherals/edit-peripheral-station-style",
        payload,
      );
    },
    onSuccess: async () => {
      // await queryClient.refetchQueries({
      //   queryKey: ['all-charge-station']
      // });
      await queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
      await queryClient.refetchQueries({ queryKey: ["peripheral-style"] });
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error("無法排除 聯絡FAE工程師");
    },
  });

  const saveStyle = () => {
    if (!selectStation) return;

    submitMutation.mutate(selectStation);
  };

  const handChange = (val: Val) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        loc: prev.loc,
        peripheralType: prev.peripheralType,
        translateX: val.input === "translateX" ? val.value : prev.translateX,
        translateY: val.input === "translateY" ? val.value : prev.translateY,
        rotate: val.input === "rotate" ? val.value : prev.rotate,
        scale: val.input === "scale" ? val.value : prev.scale,
        flex_direction: prev.flex_direction,
      };
    });
  };

  const handleChangeFlex = (val: string) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        flex_direction: val,
      };
    });
  };

  const handleBtnChange = (val: Val) => {
    setSelectStation((prev) => {
      if (!prev) return null;
      return {
        loc: prev.loc,
        peripheralType: prev.peripheralType,
        flex_direction: prev.flex_direction,
        translateX:
          val.input === "translateX"
            ? Number((val.value + prev.translateX).toFixed(1))
            : prev.translateX,
        translateY:
          val.input === "translateY"
            ? Number((val.value + prev.translateY).toFixed(1))
            : prev.translateY,
        rotate:
          val.input === "rotate"
            ? Number((val.value + prev.rotate).toFixed(1))
            : prev.rotate,
        scale:
          val.input === "scale"
            ? Number((val.value + prev.scale).toFixed(1))
            : prev.scale,
      };
    });
  };

  const transformStyle = (event: Event) => {
    switch (event) {
      case "up":
        handleBtnChange({ input: "translateY", value: -0.1 });
        break;
      case "down":
        handleBtnChange({ input: "translateY", value: +0.1 });
        break;
      case "left":
        handleBtnChange({ input: "translateX", value: -0.1 });
        break;
      case "right":
        handleBtnChange({ input: "translateX", value: 0.1 });
        break;
      case "r-rotate":
        handleBtnChange({ input: "rotate", value: -1 });
        break;
      case "l-rotate":
        handleBtnChange({ input: "rotate", value: 1 });
        break;
      case "scale-up":
        handleBtnChange({ input: "scale", value: 0.1 });
        break;
      case "scale-down":
        handleBtnChange({ input: "scale", value: -0.1 });
        break;
      default:
        console.log("error");
    }
  };

  const handleButtonPress = (event: Event) => {
    if (intervalId.current) return;
    transformStyle(event);
    intervalId.current = setInterval(() => {
      transformStyle(event);
    }, 50);
  };

  const stopCounter = () => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  useEffect(() => {
    if (!selectStation) return;
    form.setFieldValue("translateX", selectStation.translateX);
    form.setFieldValue("translateY", selectStation.translateY);
    form.setFieldValue("scale", selectStation.scale);
    form.setFieldValue("rotate", selectStation.rotate);
    form.setFieldValue("flex_direction", selectStation.flex_direction);
  }, [selectStation]);

  useEffect(() => {
    return () => stopCounter();
  }, []);

  if (!selectStation) return [];
  return (
    <>
      {contextHolder}
      <Wrapper>
        <Row gutter={[12, 24]}>
          <Col span={24}>
            {" "}
            <BtnWrapper>
              <Button
                color="default"
                variant="filled"
                onClick={() => setIsEditStation(false)}
              >
                {t("utils.cancel")}
              </Button>
              <Button
                color="primary"
                variant="filled"
                onClick={() => saveStyle()}
                type="primary"
              >
                {t("utils.save")}
              </Button>
              <Button
                onMouseDown={() => handleButtonPress("up")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("up")}
                icon={<ArrowUpOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("down")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("down")}
                icon={<ArrowDownOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("left")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("left")}
                icon={<ArrowLeftOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("right")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("right")}
                icon={<ArrowRightOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("l-rotate")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("l-rotate")}
                icon={<RedoOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("r-rotate")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("r-rotate")}
                icon={<UndoOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("scale-up")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("scale-up")}
                icon={<FullscreenOutlined />}
              />
              <Button
                onMouseDown={() => handleButtonPress("scale-down")}
                onMouseUp={stopCounter}
                onClick={() => transformStyle("scale-down")}
                icon={<FullscreenExitOutlined />}
              />
            </BtnWrapper>
          </Col>
          <Col span={24}>
            {" "}
            <Form form={form} labelCol={{ span: 3 }} autoComplete="off">
              <Form.Item label="x" name="translateX">
                <InputNumber
                  value={selectStation.translateX}
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "translateX",
                      value: Number(e),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="y" name="translateY">
                <InputNumber
                  value={selectStation.translateY}
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "translateY",
                      value: Number(e),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="scale" name="scale">
                <InputNumber
                  value={selectStation.scale}
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "scale",
                      value: Number(e),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="rotate" name="rotate">
                <InputNumber
                  value={selectStation.rotate}
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "rotate",
                      value: Number(e),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="flex_direction" name="flex_direction">
                <Select
                  value={selectStation.flex_direction}
                  options={flexOption}
                  onChange={(e) => handleChangeFlex(e)}
                />
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Wrapper>
    </>
  );
};

export default SettingStyleForm;
