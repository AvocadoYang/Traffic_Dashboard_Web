import { FC, useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Tooltip, message } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAMRsample from "@/api/useAMRsample";
import useCategory from "@/api/useCategory";
import useMissionTitleById from "@/api/useMissionTitleById";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { MissionListType } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/mission";
import { Field, FieldLabel, Hint } from "../../../ui/primitives";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 有值就是編輯那一筆,null 就是新增 */
  missionId: string | null;
  /** 新增時用來擋掉重複的名稱 */
  existingNames: string[];
};

const MissionMetaModal: FC<Props> = ({
  open,
  onClose,
  missionId,
  existingNames,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: amrs } = useAMRsample();
  const { data: categories } = useCategory();
  const { data: mission } = useMissionTitleById(missionId ?? "");
  const currentMapId = useAtomValue(currentMapIdAtom);

  const [tags, setTags] = useState<string[]>([]);

  const carOptions = useMemo(
    () => amrs?.map((v) => ({ label: v.name, value: v.id })) ?? [],
    [amrs],
  );
  const categoryOptions = useMemo(
    () => categories?.map((v) => ({ value: v.id, label: v.tagName })) ?? [],
    [categories],
  );

  /**
   * normal-mission 與 dynamic-mission 必須且只能選一個:
   * 前者每個子任務參數固定,後者由系統派任務時動態帶入。
   */
  const tagsValid = useMemo(() => {
    const names = tags.map(
      (id) => categoryOptions.find((o) => o.value === id)?.label ?? "",
    );
    const hasNormal = names.includes("normal-mission");
    const hasDynamic = names.includes("dynamic-mission");
    return (hasNormal || hasDynamic) && !(hasNormal && hasDynamic);
  }, [tags, categoryOptions]);

  useEffect(() => {
    if (!open) return;
    if (!missionId) {
      form.resetFields();
      setTags([]);
      // 預設帶第一個車種,跟 v1 一樣
      if (amrs?.[0]) form.setFieldValue("robot_type_id", amrs[0].id);
      return;
    }
    if (!mission) return;
    const nextTags =
      mission.MissionTitleBridgeCategory?.map((v) => v.Category?.id).filter(
        (v): v is string => !!v,
      ) ?? [];
    setTags(nextTags);
    form.setFieldsValue({
      name: mission.name,
      robot_type_id: mission.Robot_types?.id,
      category: nextTags,
    });
  }, [open, missionId, mission, amrs, form]);

  const invalidate = async () => {
    await queryClient.refetchQueries({
      queryKey: ["all-mission-title-detail"],
    });
    await queryClient.refetchQueries({ queryKey: ["all-mission-title"] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: MissionListType) =>
      client.post("api/setting/add-mission-title", payload),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
      onClose();
    },
    onError: () => void messageApi.error(t("utils.error")),
  });

  const editMutation = useMutation({
    mutationFn: (payload: MissionListType) =>
      client.post("api/setting/update-mission-title", payload),
    onSuccess: async () => {
      await invalidate();
      void messageApi.success(t("utils.success"));
      onClose();
    },
    onError: () => void messageApi.error(t("utils.error")),
  });

  const submit = async () => {
    let values: Omit<MissionListType, "key" | "currentMapId">;
    try {
      values = (await form.validateFields()) as typeof values;
    } catch {
      return;
    }

    if (!tagsValid) {
      void messageApi.warning(t("mission.add_mission.tag_warn"));
      return;
    }

    if (missionId) {
      editMutation.mutate({
        ...values,
        key: missionId,
        currentMapId: currentMapId || "",
      });
      return;
    }

    if (existingNames.includes(values.name.trim())) {
      void messageApi.warning(t("mission.add_mission.duplicate_warn"));
      return;
    }

    addMutation.mutate({
      ...values,
      name: values.name.trim(),
      key: nanoid(36),
      currentMapId: currentMapId || "",
    });
  };

  return (
    <Modal
      open={open}
      title={
        missionId
          ? t("mission.add_mission.edit_info")
          : t("mission.add_mission.create_mission")
      }
      onCancel={onClose}
      onOk={submit}
      confirmLoading={addMutation.isLoading || editMutation.isLoading}
      okText={missionId ? t("utils.save") : t("utils.add")}
      cancelText={t("utils.cancel")}
      destroyOnHidden
    >
      {contextHolder}

      <Form form={form} layout="vertical" autoComplete="off">
        <Field>
          <FieldLabel>{t("mission.add_mission.name")}</FieldLabel>
          <Form.Item
            name="name"
            rules={[
              { required: true, message: t("mission.add_mission.name_warn") },
            ]}
          >
            <Input placeholder={t("mission.add_mission.name_placeholder")} />
          </Form.Item>
        </Field>

        <Field>
          <FieldLabel>{t("mission.add_mission.car")}</FieldLabel>
          <Form.Item
            name="robot_type_id"
            rules={[
              { required: true, message: t("mission.add_mission.car_warn") },
            ]}
          >
            <Select
              options={carOptions}
              placeholder={t("mission.add_mission.car_type_placeholder")}
            />
          </Form.Item>
        </Field>

        <Field>
          <FieldLabel>
            {t("mission.add_mission.tag")}{" "}
            <Tooltip title={t("mission.add_mission.tag_info")}>
              <InfoCircleOutlined />
            </Tooltip>
          </FieldLabel>
          <Form.Item
            name="category"
            rules={[
              { required: true, message: t("mission.add_mission.tag_warn") },
            ]}
          >
            <Select
              mode="multiple"
              options={categoryOptions}
              placeholder={t("mission.add_mission.tag")}
              onChange={(v: string[]) => setTags(v)}
            />
          </Form.Item>
        </Field>

        {!tagsValid && tags.length > 0 && (
          <Hint>{t("mission.add_mission.tag_warn")}</Hint>
        )}
      </Form>
    </Modal>
  );
};

export default MissionMetaModal;
