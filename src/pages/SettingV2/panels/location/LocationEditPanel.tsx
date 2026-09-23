import { FC, useCallback, useEffect } from "react";
import { Form, FormInstance, Input, InputNumber, Select, Switch, message } from "antd";
import { EnvironmentOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { locationOption } from "@/pages/Setting/utils/func";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { LocationType } from "@/utils/jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  Hint,
} from "../../ui/primitives";

type Props = {
  /** 與地圖共用的 form:在地圖上點一下,座標會直接寫進這份 form */
  locationPanelForm: FormInstance<unknown>;
};

const LocationEditPanel: FC<Props> = ({ locationPanelForm }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: areaTypes } = useAllAreaTypes();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const saveMutation = useMutation({
    mutationFn: (payload: LocationType) =>
      client.post("api/setting/save-edit-loc", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      queryClient.refetchQueries({ queryKey: ["loc-only"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = useCallback(() => {
    const values = locationPanelForm.getFieldsValue() as LocationType;
    const { locationId, x, y } = values;

    if (x === undefined || x === null || y === undefined || y === null) {
      void messageApi.warning(
        t("edit_location_panel.save_pose_notify.fill_in_value"),
      );
      return;
    }
    if (!locationId || Number(locationId) <= 0) {
      void messageApi.warning(
        t("edit_location_panel.save_pose_notify.is_a_navigate"),
      );
      return;
    }
    if (/^0\d/.test(String(locationId))) {
      void messageApi.warning(
        t("edit_location_panel.save_pose_notify.leading_zero"),
      );
      return;
    }
    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    saveMutation.mutate({
      ...values,
      locationId: String(locationId),
      x: Number(x),
      y: Number(y),
      rotation: Number(values.rotation ?? 0),
      map_id: currentMapId,
    });
  }, [currentMapId, locationPanelForm, messageApi, saveMutation, t]);

  // 沿用 v1 的快捷鍵:Q 加 ID、W 減 ID、E 儲存。在輸入框裡打字時不觸發。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const current = Number(locationPanelForm.getFieldValue("locationId")) || 0;
      const key = e.key.toLowerCase();
      if (key === "q") {
        locationPanelForm.setFieldsValue({ locationId: current + 1 });
      } else if (key === "w") {
        locationPanelForm.setFieldsValue({
          locationId: Math.max(1, current - 1),
        });
      } else if (key === "e") {
        save();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locationPanelForm, save]);

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <EnvironmentOutlined />
          {t("toolbar.location.edit_locations")}
        </SectionTitle>

        <Form
          form={locationPanelForm}
          layout="vertical"
          initialValues={{ locationId: 1, rotation: 0, canRotate: false, areaType: "EXTRA" }}
        >
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("utils.location")} ID</FieldLabel>
              <Form.Item name="locationId" noStyle>
                <Input type="number" min={1} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("edit_location_panel.areaType")}</FieldLabel>
              <Form.Item name="areaType" noStyle>
                <Select
                  options={areaTypes?.map((a) => ({
                    value: a.value,
                    label: locationOption(a.value),
                  }))}
                />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>X</FieldLabel>
              <Form.Item name="x" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>Y</FieldLabel>
              <Form.Item name="y" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>θ (rotation)</FieldLabel>
              <Form.Item name="rotation" noStyle>
                <InputNumber min={-360} max={360} style={{ width: "100%" }} />
              </Form.Item>
            </Field>

            <Field>
              <FieldLabel>{t("edit_location_panel.can_rotate")}</FieldLabel>
              <Form.Item name="canRotate" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Form>

        <Toolbar>
          <SolidButton onClick={save} disabled={saveMutation.isLoading}>
            <SaveOutlined />
            {t("edit_location_panel.save")}
          </SolidButton>
          <GhostButton onClick={() => locationPanelForm.resetFields()}>
            {t("utils.reset")}
          </GhostButton>
        </Toolbar>

        <Hint>
          在地圖上點一下可直接帶入 X / Y。快捷鍵:Q = ID +1、W = ID -1、E = 儲存。
        </Hint>
      </Section>
    </PanelShell>
  );
};

export default LocationEditPanel;
