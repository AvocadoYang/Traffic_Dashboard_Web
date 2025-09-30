import {
  Button,
  Form,
  InputNumber,
  message,
  Select,
  Checkbox,
  FormInstance,
  Flex,
  Space,
} from "antd";
import client from "@/api/axiosClient";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LocationType, RoadListType } from "@/utils/jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useMap from "@/api/useMap";
import { openNotificationWithIcon } from "../../utils/notification";
import { useAtom, useAtomValue } from "jotai";
import {
  locationXForQuickEditLocationPanel,
  locationYForQuickEditLocationPanel,
  TempStoredLocationsForQuickEditPanel,
} from "@/utils/gloable";
import FormHr from "../../utils/FormHr";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { locationOption } from "../../utils/func";

const initialFormDate = {
  genre: "EXTRA",
  originId: 0,
  originX: null,
  originY: null,
  multiplyX: 0,
  multiplyY: 0,
  xGap: 0,
  yGap: 0,
  dirX: "right",
  dirY: "down",
  connectRoad: false,
};

type FormT = {
  genre: string;
  originId: number;
  originX: number;
  originY: number;
  multiplyX: number;
  multiplyY: number;
  xGap: number;
  yGap: number;
  dirX: string;
  dirY: string;
};

const selectDirX = [{ value: "left" }, { value: "right" }];
const selectDirY = [{ value: "top" }, { value: "down" }];

const QuickEditLocationPanel: React.FC<{
  locationPanelForm: FormInstance<unknown>;
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [form] = Form.useForm();
  const { data } = useMap();
  const { data: locGenre } = useAllAreaTypes();
  const [FL, setFL] = useState<LocationType[]>([]);
  const [, setFLR] = useState<RoadListType[]>([]);
  const mousePointX = useAtomValue(locationXForQuickEditLocationPanel);
  const mousePointY = useAtomValue(locationYForQuickEditLocationPanel);
  const [, setTempStoredLocationsForQuickEditPanel] = useAtom(
    TempStoredLocationsForQuickEditPanel,
  );

  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<FormT | null>(null);
  const [isAutoProduceRoad, setIsAutoProduceRoad] = useState<boolean>(false);
  const { t } = useTranslation();

  const saveLocationMutation = useMutation({
    mutationFn: (payload: LocationType[]) => {
      return client.post("api/setting/save-edit-loc-fastShelve", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const savePose = () => {
    if (!data) return false;
    if (!FL.length) return false;
    const payload = FL;

    const isNegative = payload.findIndex((loc) => Number(loc.locationId) <= 0);

    if (isNegative != -1) {
      openNotificationWithIcon(
        "warning",
        t("quick_edit_location_panel.save_pose_notify.is_a_navigate"),
        t("quick_edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft",
      );
      return false;
    }

    const isDuplicate = data?.locations.some((v) => {
      const dbData = v.locationId;
      for (const loc of payload) {
        if (loc.locationId.toString() === dbData) {
          return true;
        }
      }
      return false;
    });

    if (isDuplicate) {
      void messageApi.warning(
        t("quick_edit_location_panel.save_pose_notify.duplicate_id"),
      );
      return false;
    }

    const formatData = payload.map((loc) => {
      return {
        ...loc,
        locationId: loc.locationId,
      };
    });

    saveLocationMutation.mutate(formatData);

    // if (!isAutoProduceRoad) return;
    // if (!FLR.length) return;
    // const newData: Road[] = FLR.map((road) => {
    //   return {
    //     spot1Id: road.x,
    //     spot2Id: road.to,
    //     limit: road.limit,
    //     roadType: road.roadType,
    //     validYawList: road.validYawList as number[] | string[],
    //     disabled: road.disabled,
    //   };
    // });
    // saveRoadMutation.mutate(newData);
    return true;
  };

  const save = () => {
    const result = savePose();
    if (!result) return;
    setFL([]);
    setFLR([]);
    setTempStoredLocationsForQuickEditPanel([]);
  };

  useEffect(() => {
    if (!formValues) return;

    const {
      genre,
      originId,
      originX,
      originY,
      multiplyX,
      multiplyY,
      xGap,
      yGap,
      dirX,
      dirY,
    } = formValues;

    // Check if any value is `0`, return early
    if (!originId || !originX || !originY || !multiplyX || !multiplyY) {
      return;
    }

    const newLocationData: LocationType[] = [];
    const newRoadData: RoadListType[] = [];

    let xWhileIndex = 0;
    while (xWhileIndex < multiplyX) {
      const xPrefix =
        dirX === "right"
          ? originX + xWhileIndex * xGap
          : originX - xWhileIndex * xGap;

      let yWhileIndex = 0;

      while (yWhileIndex < multiplyY) {
        const yPrefix =
          dirY === "top"
            ? originY + yWhileIndex * yGap
            : originY - yWhileIndex * yGap;

        const data: LocationType = {
          locationId: (
            originId +
            yWhileIndex +
            multiplyY * xWhileIndex
          ).toString(),
          areaType: genre,
          x: xPrefix,
          y: yPrefix,
          rotation: 0,
          canRotate: true,
        };

        newLocationData.push(data);
        yWhileIndex++;
      }

      xWhileIndex++;
    }
    if (isAutoProduceRoad) {
      for (let row = 0; row < multiplyY; row++) {
        for (let col = 0; col < multiplyX; col++) {
          if (row === multiplyY - 1 && col === multiplyX - 1) continue;

          const currentId = originId + row * multiplyX + col;
          const nextId = currentId + 1;
          const curPose = newLocationData.find(
            (v) => Number(v.locationId) === currentId,
          );
          const nextPose = newLocationData.find(
            (v) => Number(v.locationId) === nextId,
          );

          newRoadData.push({
            roadId: `${currentId} <-> ${nextId}`,
            validYawList: "*",
            x: currentId.toString(),
            to: nextId.toString(),
            x1: curPose?.x as number,
            y1: curPose?.y as number,
            x2: nextPose?.x as number,
            y2: nextPose?.y as number,
            roadType: "twoWayRoad",
            disabled: false,
            limit: false,
          });
        }
      }
    }
    setFL(newLocationData);
    setFLR(newRoadData);
    setTempStoredLocationsForQuickEditPanel(newLocationData);
  }, [formValues, setFL, setFLR, isAutoProduceRoad]);

  useEffect(() => {
    setTempStoredLocationsForQuickEditPanel([]);
    form.setFieldValue("genre", "EXTRA");
    form.setFieldValue("multiplyX", 2);
    form.setFieldValue("multiplyY", 2);
    form.setFieldValue("xGap", 1);
    form.setFieldValue("yGap", 1);
    setFL([]);
    setFLR([]);
  }, []);

  useEffect(() => {
    form.setFieldValue("originX", Number(mousePointX));
    form.setFieldValue("originY", Number(mousePointY));
  }, [mousePointX, mousePointY]);

  return (
    <>
      {contextHolder}
      <div style={{ width: "29em" }}>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("quick_edit_location_panel.quick_edit_location_panel")}
        </h3>
        <FormHr></FormHr>
        <Form
          form={form}
          title="設定依照車輛回傳的id來做任務"
          initialValues={initialFormDate}
          onValuesChange={(_, allValues) => {
            setFormValues(allValues as FormT);
          }}
          style={{ fontWeight: "bold" }}
        >
          <Flex vertical>
            <Space
              size={"large"}
              style={{
                borderBottom: "2px solid black",
                marginBottom: "15px",
                overflow: "hidden",
              }}
            >
              <Form.Item
                label={t("quick_edit_location_panel.areaType")}
                name="genre"
              >
                <Select
                  options={locGenre?.map((v) => ({
                    label: locationOption(v.value),
                    value: v.value,
                  }))}
                  style={{ overflow: "hidden", width: "8em" }}
                />
              </Form.Item>
              <Form.Item
                label={t("quick_edit_location_panel.location")}
                name="originId"
              >
                <InputNumber min={1} />
              </Form.Item>
            </Space>
            <Space
              size={"large"}
              style={{
                borderBottom: "2px solid black",
                marginBottom: "15px",
                overflow: "hidden",
              }}
            >
              <Flex vertical>
                <Form.Item label="X" name="originX">
                  <InputNumber />
                </Form.Item>
                <Form.Item label="Y" name="originY">
                  <InputNumber />
                </Form.Item>
              </Flex>

              <Flex vertical>
                <Form.Item
                  label={t("quick_edit_location_panel.x_gap")}
                  name="xGap"
                >
                  <InputNumber />
                </Form.Item>
                <Form.Item
                  label={t("quick_edit_location_panel.y_gap")}
                  name="yGap"
                >
                  <InputNumber />
                </Form.Item>
              </Flex>
            </Space>
            <Flex
              vertical
              style={{ borderBottom: "2px solid black", marginBottom: "15px" }}
            >
              <Form.Item label="multiplyX" name="multiplyX">
                <InputNumber />
              </Form.Item>
              <Form.Item label="multiplyY" name="multiplyY">
                <InputNumber />
              </Form.Item>
            </Flex>
            <Form.Item label={t("quick_edit_location_panel.dir_x")} name="dirX">
              <Select options={selectDirX} />
            </Form.Item>
            <Form.Item label={t("quick_edit_location_panel.dir_y")} name="dirY">
              <Select options={selectDirY} />
            </Form.Item>
            <Form.Item
              label={t("quick_edit_location_panel.is_connect_road")}
              name="connectRoad"
              shouldUpdate
            >
              <Checkbox
                defaultChecked={false}
                disabled
                onChange={(event) => setIsAutoProduceRoad(event.target.checked)}
              />
            </Form.Item>
          </Flex>
          <Flex align="center" justify="center">
            <Button color="primary" variant="filled" onClick={() => save()}>
              {t("quick_edit_location_panel.save")}
            </Button>
          </Flex>
        </Form>
      </div>
    </>
  );
};

export default memo(QuickEditLocationPanel);
