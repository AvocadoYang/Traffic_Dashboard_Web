import { FC } from "react";
import { ColorPicker, Form, FormInstance, InputNumber, message } from "antd";
import type { Color } from "antd/es/color-picker";
import { BorderOuterOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useActiveGroupResources from "@/api/useActiveGroupResources";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { initialZoneRectInfo, zoneRectInfo } from "@/utils/gloable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import ZoneFields, { ZONE_TAGS } from "../../ui/zoneFields";
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
  /** 與地圖共用的 form:在地圖上框選會直接寫進 startX/startY/endX/endY */
  zonePanelForm: FormInstance<unknown>;
};

const ZoneEditPanel: FC<Props> = ({ zonePanelForm }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const setZoneRectInfo = useSetAtom(zoneRectInfo);
  const { data: resources } = useActiveGroupResources();

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/save-new-zone", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      zonePanelForm.resetFields();
      // 存檔後把地圖上的框選清掉,不然會殘留上一個區域的框
      setZoneRectInfo(initialZoneRectInfo);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = async () => {
    const v = zonePanelForm.getFieldsValue() as Record<string, unknown>;
    const {
      name,
      color,
      category,
      startX,
      startY,
      endX,
      endY,
      layer,
      lidar_back,
      lidar_front,
      speed_limit,
      hight_limit,
      forbidden,
      limitNum,
      all_forbidden,
      view_available,
    } = v as never as {
      name?: string;
      color?: Color;
      category?: string[];
      startX?: number;
      startY?: number;
      endX?: number;
      endY?: number;
      layer?: string;
      lidar_back?: boolean;
      lidar_front?: boolean;
      speed_limit?: number;
      hight_limit?: number;
      forbidden?: string[];
      limitNum?: number;
      all_forbidden?: boolean;
      view_available?: string;
    };

    if ((startX === endX && startY === endY) || !startX || !startY) {
      void messageApi.warning(t("edit_zone_panel.waring.invalid_frame"));
      return;
    }
    if (!name) {
      void messageApi.warning(t("edit_zone_panel.waring.name_empty_error"));
      return;
    }

    const sameMapZones =
      resources?.maps.find((m) => m.mapId === currentMapId)?.zones ?? [];
    if (sameMapZones.some((z) => z.name.trim() === name.trim())) {
      void messageApi.warning(t("edit_zone_panel.waring.name_duplicated_error"));
      return;
    }
    if (!color) {
      void messageApi.warning(t("edit_zone_panel.waring.color_error"));
      return;
    }

    try {
      await zonePanelForm.validateFields();
    } catch {
      return;
    }

    // 有選層級就一定要至少開一個 lidar,否則這個層級設定不會生效
    if (layer && !lidar_front && !lidar_back) {
      void messageApi.warning(t("edit_zone_panel.waring.tag_not_yet_setting"));
      return;
    }
    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    const { r, g, b } = color.toRgb();
    const has = (tag: string) => category?.includes(tag);

    saveMutation.mutate({
      name,
      backgroundColor: `rgba(${r}, ${g}, ${b} , 0.05)`,
      category: {
        tags: category || [],
        forbidden_car:
          has(ZONE_TAGS.forbid) && all_forbidden ? ["*"] : forbidden || [],
        speed_limit: has(ZONE_TAGS.decel) ? Number(speed_limit) : undefined,
        hight_limit: has(ZONE_TAGS.height) ? Number(hight_limit) : undefined,
        limitNum: has(ZONE_TAGS.limit) ? Number(limitNum) : undefined,
        view_available: has(ZONE_TAGS.view) ? view_available : undefined,
      },
      startPoint: { startX, startY },
      layer: layer ? layer : "none",
      lidar_back: layer ? lidar_back : false,
      lidar_front: layer ? lidar_front : false,
      endPoint: { endX, endY },
      map_id: currentMapId,
    });
  };

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <BorderOuterOutlined />
          {t("toolbar.zone.zones.edit_zone")}
        </SectionTitle>

        <Form
          form={zonePanelForm}
          layout="vertical"
          initialValues={{
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            lidar_back: false,
            lidar_front: false,
            forbidden: [],
            all_forbidden: false,
          }}
        >
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>START X</FieldLabel>
              <Form.Item name="startX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>START Y</FieldLabel>
              <Form.Item name="startY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>END X</FieldLabel>
              <Form.Item name="endX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>END Y</FieldLabel>
              <Form.Item name="endY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("zone_table_form.zone_color")}</FieldLabel>
            <Form.Item name="color" noStyle>
              <ColorPicker />
            </Form.Item>
          </Field>

          <ZoneFields form={zonePanelForm} />
        </Form>

        <Toolbar>
          <SolidButton onClick={save} disabled={saveMutation.isLoading}>
            <SaveOutlined />
            {t("utils.save")}
          </SolidButton>
          <GhostButton
            onClick={() => {
              zonePanelForm.resetFields();
              setZoneRectInfo(initialZoneRectInfo);
            }}
          >
            {t("utils.reset")}
          </GhostButton>
        </Toolbar>

        <Hint>在地圖上拖曳框選範圍,會自動帶入起訖座標。</Hint>
      </Section>
    </PanelShell>
  );
};

export default ZoneEditPanel;
