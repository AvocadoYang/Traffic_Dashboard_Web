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
import { Button, Card, Col, Form, Input, message, Row, Select } from "antd";
import { useAtom, useSetAtom } from "jotai";
import { FC, useEffect, useRef } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cargoStyle, shelfSelectedStyleLocationId } from "@/utils/gloable";
import client from "@/api/axiosClient";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type Options = "areaType" | "translateX" | "translateY" | "rotate" | "scale";

type Val = {
  input: Options;
  value: number;
};

export type SubmitValue = {
  id: string;
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

const BtnWrapper = styled.div`
  display: flex;
  gap: 1em;
`;

const flexOption = [
  { value: "row" },
  { value: "column" },
  { value: "row-reverse" },
  { value: "column-reverse" },
];

const SettingCargoStyleForm: FC<{
  selectId: string;
  cancelEditStyle: () => void;
}> = ({ selectId, cancelEditStyle }) => {
  const [cStyle, setCStyle] = useAtom(cargoStyle);
  const setShelfSelectedStyle = useSetAtom(shelfSelectedStyleLocationId);
  const [form] = Form.useForm();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data } = useLoc(undefined);
  const [messageApi, contextHolder] = message.useMessage();
  const submitMutation = useMutation({
    mutationFn: (editValue: SubmitValue) => {
      return client.post("api/setting/edit-loc-style", editValue);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["cargoLoc-mission"],
      });
      await queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });
  const saveStyle = () => {
    const x = form.getFieldValue("translateX") as number;
    const y = form.getFieldValue("translateY") as number;
    const r = form.getFieldValue("rotate") as number;
    const s = form.getFieldValue("scale") as number;
    const f = form.getFieldValue("flex_direction") as string;

    submitMutation.mutate({
      id: selectId,
      translateX: x,
      translateY: y,
      rotate: r,
      scale: s,
      flex_direction: f,
    });
    cancelEditStyle();
  };

  const handChange = (val: Val) => {
    setCStyle((prev) => {
      if (!prev) return null;
      return {
        flex_direction: prev.flex_direction,
        translateX: val.input === "translateX" ? val.value : prev.translateX,
        translateY: val.input === "translateY" ? val.value : prev.translateY,
        rotate: val.input === "rotate" ? val.value : prev.rotate,
        scale: val.input === "scale" ? val.value : prev.scale,
      };
    });
  };

  const handleBtnChange = (val: Val) => {
    setCStyle((prev) => {
      if (!prev) return null;
      return {
        flex_direction: prev.flex_direction,
        translateX:
          val.input === "translateX"
            ? val.value + prev.translateX
            : prev.translateX,
        translateY:
          val.input === "translateY"
            ? val.value + prev.translateY
            : prev.translateY,
        rotate: val.input === "rotate" ? val.value + prev.rotate : prev.rotate,
        scale: val.input === "scale" ? val.value + prev.scale : prev.scale,
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

  useEffect(() => {
    if (!data) return;
    const thisLocData = (data as LocWithoutArr[]).find(
      (v) => v.id === selectId,
    );

    if (!thisLocData) return;
    setShelfSelectedStyle(thisLocData.locationId);
    setCStyle({
      translateX: thisLocData.translateX,
      translateY: thisLocData.translateY,
      rotate: thisLocData.rotate,
      scale: thisLocData.scale,
      flex_direction: thisLocData.flex_direction,
    });
    form.setFieldValue("translateX", thisLocData.translateX);
    form.setFieldValue("translateY", thisLocData.translateY);
    form.setFieldValue("scale", thisLocData.scale);
    form.setFieldValue("rotate", thisLocData.rotate);
  }, [selectId, data]);

  useEffect(() => {
    if (!cStyle) return;
    form.setFieldValue("translateX", cStyle.translateX);
    form.setFieldValue("translateY", cStyle.translateY);
    form.setFieldValue("scale", cStyle.scale);
    form.setFieldValue("rotate", cStyle.rotate);
    form.setFieldValue("flex_direction", cStyle.flex_direction);
  }, [cStyle]);

  // Function to handle the button press and start the transformations
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

  const handleChangeFlex = (val: string) => {
    setCStyle((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        flex_direction: val,
      };
    });
  };

  useEffect(() => {
    return () => stopCounter();
  }, []);

  return (
    <>
      {contextHolder}
      <Card>
        <Row gutter={[12, 24]}>
          <Col span={24}>
            {" "}
            <BtnWrapper>
              <Button
                color="default"
                variant="filled"
                onClick={cancelEditStyle}
              >
                {t("utils.cancel")}
              </Button>
              <Button
                color="primary"
                variant="filled"
                onClick={() => saveStyle()}
                type="primary"
              >
                {t("edit_shelf_panel.save")}
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
                <Input
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "translateX",
                      value: Number(e.target.value),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="y" name="translateY">
                <Input
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "translateY",
                      value: Number(e.target.value),
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="scale" name="scale">
                <Input
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "scale",
                      value: Number(e.target.value),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="rotate" name="rotate">
                <Input
                  type="number"
                  onChange={(e) =>
                    handChange({
                      input: "rotate",
                      value: Number(e.target.value),
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="flex_direction" name="flex_direction">
                <Select
                  options={flexOption}
                  onChange={(e) => handleChangeFlex(e)}
                />
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default SettingCargoStyleForm;
