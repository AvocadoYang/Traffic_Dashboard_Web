import { FC, useEffect, useState } from "react";
import {
  Form,
  InputNumber,
  Select,
  Checkbox,
  message,
} from "antd";
import { ThunderboltOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { LocationType } from "@/utils/jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { openNotificationWithIcon } from "@/pages/Setting/utils/notification";
import useMap from "@/api/useMap";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { locationOption } from "@/pages/Setting/utils/func";
import { currentMapIdAtom } from "@/utils/mapSelection";
import {
  locationXForQuickEditLocationPanel,
  locationYForQuickEditLocationPanel,
  TempStoredLocationsForQuickEditPanel,
} from "@/utils/gloable";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
} from "../../ui/primitives";

const initialFormValues = {
  genre: "EXTRA",
  originId: 0,
  originX: null,
  originY: null,
  multiplyX: 2,
  multiplyY: 2,
  xGap: 1,
  yGap: 1,
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

const QuickLocationPanel: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data } = useMap();
  const { data: locGenre } = useAllAreaTypes();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const mousePointX = useAtomValue(locationXForQuickEditLocationPanel);
  const mousePointY = useAtomValue(locationYForQuickEditLocationPanel);
  const [, setTempStoredLocationsForQuickEditPanel] = useAtom(
    TempStoredLocationsForQuickEditPanel,
  );

  const [formValues, setFormValues] = useState<FormT | null>(null);
  const [FL, setFL] = useState<LocationType[]>([]);

  const saveLocationMutation = useMutation({
    mutationFn: (payload: { map_id: string; items: LocationType[] }) =>
      client.post("api/setting/save-edit-loc-fastShelve", payload),
    onSuccess: () => {
      setTimeout(async () => {
        void messageApi.success(t("utils.success"));
        await queryClient.refetchQueries({ queryKey: ["map"] });
        await queryClient.refetchQueries({ queryKey: ["loc-only"] });
        await queryClient.refetchQueries({
          queryKey: ["active-group-resources"],
        });
        await queryClient.refetchQueries({
          queryKey: ["all-groups-resources"],
        });
      }, 500);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = () => {
    if (!data || !FL.length) return;

    const hasLeadingZero = /^0\d/.test(String(FL.at(0)?.locationId));
    const isNegative = FL.findIndex((loc) => Number(loc.locationId) <= 0);

    if (isNegative !== -1) {
      openNotificationWithIcon(
        "warning",
        t("quick_edit_location_panel.save_pose_notify.is_a_navigate"),
        t("quick_edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft",
      );
      return;
    }

    if (hasLeadingZero) {
      openNotificationWithIcon(
        "warning",
        t("quick_edit_location_panel.save_pose_notify.leading_zero"),
        t("quick_edit_location_panel.save_pose_notify.leading_zero"),
        "bottomLeft",
      );
      return;
    }

    const isDuplicate = data.locations.some((v) =>
      FL.some((loc) => loc.locationId.toString() === v.locationId),
    );
    if (isDuplicate) {
      void messageApi.warning(
        t("quick_edit_location_panel.save_pose_notify.duplicate_id"),
      );
      return;
    }

    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    saveLocationMutation.mutate({ map_id: currentMapId, items: FL });
    setFL([]);
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

    if (!originId || !originX || !originY || !multiplyX || !multiplyY) return;

    const newLocationData: LocationType[] = [];
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

        newLocationData.push({
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
        });
        yWhileIndex++;
      }
      xWhileIndex++;
    }

    setFL(newLocationData);
    setTempStoredLocationsForQuickEditPanel(newLocationData);
  }, [formValues, setTempStoredLocationsForQuickEditPanel]);

  useEffect(() => {
    return () => setTempStoredLocationsForQuickEditPanel([]);
  }, [setTempStoredLocationsForQuickEditPanel]);

  useEffect(() => {
    form.setFieldValue("originX", Number(mousePointX));
    form.setFieldValue("originY", Number(mousePointY));
  }, [mousePointX, mousePointY, form]);

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <ThunderboltOutlined />
          {t("quick_edit_location_panel.quick_edit_location_panel")}
        </SectionTitle>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialFormValues}
          onValuesChange={(_, allValues) =>
            setFormValues(allValues as FormT)
          }
        >
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("quick_edit_location_panel.areaType")}</FieldLabel>
              <Form.Item name="genre" noStyle>
                <Select
                  options={locGenre?.map((v) => ({
                    label: locationOption(v.value),
                    value: v.value,
                  }))}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("quick_edit_location_panel.location")}</FieldLabel>
              <Form.Item name="originId" noStyle>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>X</FieldLabel>
              <Form.Item name="originX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>Y</FieldLabel>
              <Form.Item name="originY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("quick_edit_location_panel.x_gap")}</FieldLabel>
              <Form.Item name="xGap" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("quick_edit_location_panel.y_gap")}</FieldLabel>
              <Form.Item name="yGap" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>multiplyX</FieldLabel>
              <Form.Item name="multiplyX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>multiplyY</FieldLabel>
              <Form.Item name="multiplyY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("quick_edit_location_panel.dir_x")}</FieldLabel>
              <Form.Item name="dirX" noStyle>
                <Select options={selectDirX} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("quick_edit_location_panel.dir_y")}</FieldLabel>
              <Form.Item name="dirY" noStyle>
                <Select options={selectDirY} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Form.Item
            name="connectRoad"
            valuePropName="checked"
            noStyle
          >
            <Checkbox disabled>
              {t("quick_edit_location_panel.is_connect_road")}
            </Checkbox>
          </Form.Item>
        </Form>

        <Toolbar>
          <SolidButton onClick={save} disabled={!FL.length}>
            <SaveOutlined />
            {t("quick_edit_location_panel.save")}
          </SolidButton>
        </Toolbar>

        <Hint>在地圖上點一下可帶入起點 X / Y,系統會依格數與間距自動展開成多個點位。</Hint>
      </Section>
    </PanelShell>
  );
};

export default QuickLocationPanel;
