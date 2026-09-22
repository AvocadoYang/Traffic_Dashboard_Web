import { FC } from "react";
import { Form, FormInstance, InputNumber, message } from "antd";
import { NodeIndexOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { DragLineInfo, showBlockId as ShowBlockId } from "@/utils/gloable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import RoadCommonFields from "../../ui/roadFields";
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
  /** 與地圖共用的 form:在地圖上點兩個點會直接寫進起點/終點 */
  roadPanelForm: FormInstance<unknown>;
};

const RoadEditPanel: FC<Props> = ({ roadPanelForm }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const setShowBlockId = useSetAtom(ShowBlockId);
  const setDragLineInfo = useSetAtom(DragLineInfo);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/save-edit-road", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      // 存檔後把地圖上的拖曳箭頭清掉,不然會殘留上一條路線的指向
      setShowBlockId("");
      setDragLineInfo({});
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = () => {
    const v = roadPanelForm.getFieldsValue() as Record<string, unknown>;
    const from = v.x;
    const to = v.to;

    if (from === undefined || from === null || to === undefined || to === null) {
      void messageApi.warning(t("edit_road_panel.save_road_notify.warn"));
      return;
    }
    if (String(from) === String(to)) {
      void messageApi.warning(t("edit_road_panel.save_road_notify.warn_msg"));
      return;
    }
    const yaw = v.validYawList as string[] | undefined;
    if (!yaw || yaw.length === 0) {
      void messageApi.warning(
        t("edit_road_panel.save_road_notify.warn_road_yaw"),
      );
      return;
    }
    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    saveMutation.mutate({
      spot1Id: String(from),
      spot2Id: String(to),
      limit: v.limit ?? false,
      disabled: v.disabled ?? false,
      priority: v.priority ?? 3,
      roadType: v.roadType ?? "twoWayRoad",
      validYawList: yaw,
      map_id: currentMapId,
    });
  };

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <NodeIndexOutlined />
          {t("edit_road_panel.road")}
        </SectionTitle>

        <Form
          form={roadPanelForm}
          layout="vertical"
          initialValues={{
            roadType: "twoWayRoad",
            priority: 3,
            validYawList: ["*"],
            disabled: false,
            limit: false,
          }}
        >
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("edit_road_panel.start_point")}</FieldLabel>
              <Form.Item name="x" noStyle>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_road_panel.end_point")}</FieldLabel>
              <Form.Item name="to" noStyle>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <RoadCommonFields />
        </Form>

        <Toolbar>
          <SolidButton onClick={save} disabled={saveMutation.isLoading}>
            <SaveOutlined />
            {t("edit_road_panel.add")}
          </SolidButton>
          <GhostButton onClick={() => roadPanelForm.resetFields()}>
            {t("utils.reset")}
          </GhostButton>
        </Toolbar>

        <Hint>在地圖上依序點兩個點位,會自動帶入起點與終點。</Hint>
      </Section>
    </PanelShell>
  );
};

export default RoadEditPanel;
