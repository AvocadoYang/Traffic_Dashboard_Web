import { FC } from "react";
import { Form, message } from "antd";
import {
  ThunderboltOutlined,
  SaveOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import RoadCommonFields from "../../ui/roadFields";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  Hint,
  Tag,
  EmptyState,
} from "../../ui/primitives";

const RoadQuickPanel: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const [isEditing, setIsEditing] = useAtom(IsEditingQuickRoads);
  const [roadArr, setRoadArr] = useAtom(QuickRoadsArray);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/save-quick-edit-road", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      setRoadArr([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = () => {
    if (roadArr.length < 2) {
      void messageApi.error(t("quick_edit_road_panel.error_min_spots"));
      return;
    }
    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    const v = form.getFieldsValue() as Record<string, unknown>;
    saveMutation.mutate({
      ...v,
      disabled: v.disabled ?? false,
      limit: v.limit ?? false,
      roadArr,
      map_id: currentMapId,
    });
  };

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <ThunderboltOutlined />
          {t("quick_edit_road_panel.title")}
        </SectionTitle>

        <Toolbar>
          <SolidButton onClick={() => setIsEditing(!isEditing)}>
            {isEditing
              ? t("quick_edit_road_panel.stop_editing")
              : t("quick_edit_road_panel.start_editing")}
          </SolidButton>
          <GhostButton
            onClick={() => setRoadArr([])}
            disabled={roadArr.length === 0}
          >
            <ClearOutlined />
            {t("quick_edit_road_panel.clear_points")}
          </GhostButton>
        </Toolbar>

        <div>
          <Hint>
            {t("quick_edit_road_panel.selected_points")} ({roadArr.length})
          </Hint>
          {roadArr.length === 0 ? (
            <EmptyState>
              {t("quick_edit_road_panel.click_points_prompt")}
            </EmptyState>
          ) : (
            <Toolbar style={{ marginTop: 8 }}>
              {roadArr.map((id, i) => (
                <Tag key={`${id}-${i}`}>
                  {i + 1}. {id}
                </Tag>
              ))}
            </Toolbar>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            roadType: "twoWayRoad",
            priority: 3,
            validYawList: ["*"],
            disabled: false,
            limit: false,
          }}
        >
          <RoadCommonFields />
        </Form>

        <Toolbar>
          <SolidButton
            onClick={save}
            disabled={saveMutation.isLoading || roadArr.length < 2}
          >
            <SaveOutlined />
            {t("edit_road_panel.add")}
          </SolidButton>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default RoadQuickPanel;
