import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  RedoOutlined,
  UndoOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  message,
  Row,
  Select,
} from "antd";
import { useAtom } from "jotai";
import { FC, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { batchCargoStyle } from "@/utils/gloable";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type Event =
  | "up"
  | "down"
  | "left"
  | "right"
  | "r-rotate"
  | "l-rotate"
  | "scale-up"
  | "scale-down";

type Offset = "dx" | "dy" | "dRotate" | "dScale";

const flexOption = [
  { value: "row" },
  { value: "column" },
  { value: "row-reverse" },
  { value: "column-reverse" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

// 按鈕對應的位移量，與單一貨架的「調整位置」一致
const STEP: Record<Event, [Offset, number]> = {
  up: ["dy", -0.1],
  down: ["dy", 0.1],
  left: ["dx", -0.1],
  right: ["dx", 0.1],
  "r-rotate": ["dRotate", -1],
  "l-rotate": ["dRotate", 1],
  "scale-up": ["dScale", 0.1],
  "scale-down": ["dScale", -0.1],
};

const SettingBatchCargoStyleForm: FC<{
  // Loc.id (不是貨架 id)
  locIds: string[];
  locationIds: string[];
  onDone: () => void;
}> = ({ locIds, locationIds, onDone }) => {
  const [style, setStyle] = useAtom(batchCargoStyle);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // 預覽狀態放在 atom，地圖上的紅框才看得到；離開時一定要清掉
  useEffect(() => {
    setStyle({
      locIds,
      dx: 0,
      dy: 0,
      dRotate: 0,
      dScale: 0,
      flex_direction: null,
    });
    return () => {
      stopCounter();
      setStyle(null);
    };
  }, [locIds.join(",")]);

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!style) throw new Error("no style");
      return client.post("api/setting/edit-multi-loc-style-offset", {
        ids: locIds,
        dx: style.dx,
        dy: style.dy,
        dRotate: style.dRotate,
        dScale: style.dScale,
        flex_direction: style.flex_direction,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] });
      await queryClient.refetchQueries({ queryKey: ["loc-only"] });
      void messageApi.success(t("utils.success"));
      onDone();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const setOffset = (key: Offset, value: number) => {
    setStyle((prev) => (prev ? { ...prev, [key]: round2(value) } : prev));
  };

  const addOffset = (event: Event) => {
    const [key, step] = STEP[event];
    setStyle((prev) =>
      prev ? { ...prev, [key]: round2(prev[key] + step) } : prev,
    );
  };

  const handleButtonPress = (event: Event) => {
    if (intervalId.current) return;
    addOffset(event);
    intervalId.current = setInterval(() => addOffset(event), 50);
  };

  function stopCounter() {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }

  const reset = () =>
    setStyle((prev) =>
      prev
        ? { ...prev, dx: 0, dy: 0, dRotate: 0, dScale: 0, flex_direction: null }
        : prev,
    );

  const changed =
    !!style &&
    (style.dx !== 0 ||
      style.dy !== 0 ||
      style.dRotate !== 0 ||
      style.dScale !== 0 ||
      style.flex_direction !== null);

  const pressProps = (event: Event) => ({
    onMouseDown: () => handleButtonPress(event),
    onMouseUp: stopCounter,
    onMouseLeave: stopCounter,
  });

  return (
    <>
      {contextHolder}
      <Card>
        <Row gutter={[12, 24]}>
          <Col span={24}>
            <Alert
              type="info"
              showIcon
              title={t("batchStyle.selected", { n: locIds.length })}
              description={
                <div>
                  <div style={{ wordBreak: "break-all" }}>
                    {locationIds.join(", ")}
                  </div>
                  <div style={{ marginTop: 4 }}>{t("batchStyle.hint")}</div>
                </div>
              }
            />
          </Col>

          <Col span={24}>
            <Flex gap="middle" wrap>
              <Button onClick={onDone}>{t("utils.cancel")}</Button>
              <Button
                type="primary"
                disabled={!changed}
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {t("edit_shelf_panel.save")}
              </Button>
              <Button
                icon={<ClearOutlined />}
                disabled={!changed}
                onClick={reset}
              >
                {t("batchStyle.reset")}
              </Button>
              <Button {...pressProps("up")} icon={<ArrowUpOutlined />} />
              <Button {...pressProps("down")} icon={<ArrowDownOutlined />} />
              <Button {...pressProps("left")} icon={<ArrowLeftOutlined />} />
              <Button {...pressProps("right")} icon={<ArrowRightOutlined />} />
              <Button {...pressProps("l-rotate")} icon={<RedoOutlined />} />
              <Button {...pressProps("r-rotate")} icon={<UndoOutlined />} />
              <Button
                {...pressProps("scale-up")}
                icon={<FullscreenOutlined />}
              />
              <Button
                {...pressProps("scale-down")}
                icon={<FullscreenExitOutlined />}
              />
            </Flex>
          </Col>

          <Col span={24}>
            <Form labelCol={{ span: 5 }} autoComplete="off">
              <Form.Item label={t("batchStyle.dx")}>
                <InputNumber
                  style={{ width: "100%" }}
                  step={0.1}
                  value={style?.dx ?? 0}
                  onChange={(v) => setOffset("dx", v ?? 0)}
                />
              </Form.Item>
              <Form.Item label={t("batchStyle.dy")}>
                <InputNumber
                  style={{ width: "100%" }}
                  step={0.1}
                  value={style?.dy ?? 0}
                  onChange={(v) => setOffset("dy", v ?? 0)}
                />
              </Form.Item>
              <Form.Item label={t("batchStyle.dScale")}>
                <InputNumber
                  style={{ width: "100%" }}
                  step={0.1}
                  value={style?.dScale ?? 0}
                  onChange={(v) => setOffset("dScale", v ?? 0)}
                />
              </Form.Item>
              <Form.Item label={t("batchStyle.dRotate")}>
                <InputNumber
                  style={{ width: "100%" }}
                  step={1}
                  value={style?.dRotate ?? 0}
                  onChange={(v) => setOffset("dRotate", v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="flex_direction">
                <Select
                  allowClear
                  options={flexOption}
                  placeholder={t("batchStyle.keep_direction")}
                  value={style?.flex_direction ?? undefined}
                  onChange={(v: string | undefined) =>
                    setStyle((prev) =>
                      prev ? { ...prev, flex_direction: v ?? null } : prev,
                    )
                  }
                />
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
    </>
  );
};

export default SettingBatchCargoStyleForm;
