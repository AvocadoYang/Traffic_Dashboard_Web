import { FC, useEffect, useMemo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import {
  AutoComplete,
  Button,
  Checkbox,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Tag,
  Typography,
} from "antd";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import useAllMissionTitles from "@/api/useMissionTitle";
import usePackageSocket from "@/sockets/usePackageSocket";
import useEquipmentSignalSocket from "@/sockets/useEquipmentSignalSocket";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Package_Signal } from "@/types/peripheral";
import { EditPackageLocationId } from "@/pages/Setting/formComponent/forms/peripheralModal/jotai";
import { CargoPanelTarget } from "@/components/CargoPanel/state";
import PeripheralIdentity from "../PeripheralIdentity";
import {
  editHalfPanelStyle,
  editSubPanelStyle,
  EDIT_TITLE_COLOR,
} from "../editModalStyle";

const { Title, Text } = Typography;

/** 跟後端 packageRouter 的上限一致 */
const MAX_SLOT_COUNT = 64;

type SignalRow = Partial<Package_Signal> | undefined;

type FormValues = {
  name: string;
  description: string;
  disable: boolean;
  forkHeight: number;
  loadMissionId: string | null;
  offloadMissionId: string | null;
  loadPriority: number;
  offloadPriority: number;
  exitLocationId: string | null;
  capacity: number;
  slotCount: number;
  signals: SignalRow[];
};

// 燈號對照表:一顆燈一列(編號 / 模組 / 通道 / 反相 / 現在的值)
const SignalGrid = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 76px 52px 76px;
  align-items: center;
  gap: 6px 8px;

  .ant-form-item {
    margin-bottom: 0;
  }
`;

const HeadCell = styled.div`
  font-size: 12px;
  color: var(--c-text-muted);
  white-space: nowrap;
`;

// 說明文字的框。antd 的 Alert 在灰階和深色主題下底色太深、字看不清楚,所以自己畫
const Note = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-header-accent);
  border-radius: 2px;
  color: var(--c-text-secondary);
  font-size: 13px;
  line-height: 1.6;
`;

const LampNo = styled.div`
  font-family: "Roboto Mono", monospace;
  font-weight: 700;
  color: var(--c-text-secondary);
`;

const Live = styled.div<{ $state: "on" | "off" | "unknown" }>`
  padding: 0 6px;
  border: 1px solid;
  border-radius: 2px;
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  white-space: nowrap;
  ${({ $state }) =>
    $state === "on"
      ? `background: var(--c-success); border-color: var(--c-success); color: var(--c-bg);`
      : $state === "off"
        ? `background: var(--c-bg-muted); border-color: var(--c-border); color: var(--c-text-secondary);`
        : `background: transparent; border-style: dashed; border-color: var(--c-border-strong); color: var(--c-text-muted);`}
`;

/** 點設定頁地圖上的包膜線(入口或出口)開出來的設定對話框 */
const EditPackageModal: FC = () => {
  const { t } = useTranslation();
  const [locationId, setLocationId] = useAtom(EditPackageLocationId);
  const openCargoPanel = useSetAtom(CargoPanelTarget);
  const packages = usePackageSocket();
  const modules = useEquipmentSignalSocket();
  const { data: misTitle } = useAllMissionTitles();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const info = locationId ? packages?.[locationId] : undefined;
  const isEntry = info?.role === "ENTRY";
  const hasInfo = !!info;

  const slotCount = Form.useWatch("slotCount", form) ?? 0;
  const signalRows = Form.useWatch("signals", form) ?? [];

  // 開啟(或換到另一個點位)時把目前的設定填進表單。
  // socket 每秒都會送新資料,不能跟著重填,不然使用者改到一半的值會被蓋掉。
  useEffect(() => {
    if (!info) return;
    form.resetFields();
    form.setFieldsValue({
      name: info.name,
      description: info.description,
      disable: info.disable,
      forkHeight: info.forkHeight,
      loadMissionId: info.loadMissionId,
      offloadMissionId: info.offloadMissionId,
      loadPriority: info.loadPriority,
      offloadPriority: info.offloadPriority,
      exitLocationId: info.exitLocationId,
      capacity: info.capacity,
      slotCount: info.slotCount,
      signals: Array.from(
        { length: info.slotCount },
        (_, i) => info.signals[i] ?? undefined,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, hasInfo]);

  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

  // 可以當出口的點位:屬性是包膜線出口、還沒被別的入口用到的(或本來就是這條線的出口)
  const exitOptions = useMemo(() => {
    if (!info || !packages) return [];
    return Object.values(packages)
      .filter(
        (p) =>
          p.role === "EXIT" &&
          (p.entryLocationId === null || p.entryLocationId === info.locationId),
      )
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((p) => ({
        value: p.locationId,
        label: `${p.locationId} ${p.name}`.trim(),
      }));
  }, [info, packages]);

  const moduleOptions = useMemo(
    () =>
      Object.keys(modules)
        .sort()
        .map((m) => ({ value: m })),
    [modules],
  );

  const liveOf = (row: SignalRow): "on" | "off" | "unknown" => {
    if (!row?.module) return "unknown";
    const m = modules[row.module];
    const value = m?.alive ? m.states[row.channel ?? 0] : undefined;
    if (typeof value !== "boolean") return "unknown";
    return (row.invert ? !value : value) ? "on" : "off";
  };

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.post(`/api/setting/update-package-config`, data),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.invalidateQueries({ queryKey: ["peripheral-name"] });
      setLocationId(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSubmit = async () => {
    if (!info) {
      messageApi.warning(t("utils.station_not_found"));
      return;
    }
    const values = await form.validateFields();

    updateMutation.mutate({
      stationId: info.locationId,
      name: values.name || null,
      description: values.description ?? "",
      disable: !!values.disable,
      forkHeight: values.forkHeight ?? info.forkHeight,
      // 入口只能設放貨任務、出口只能設取貨任務,另一種一律送空的
      loadMissionId: isEntry ? null : (values.loadMissionId ?? null),
      offloadMissionId: isEntry ? (values.offloadMissionId ?? null) : null,
      loadPriority: values.loadPriority ?? 0,
      offloadPriority: values.offloadPriority ?? 0,
      // 以下是整條線的設定,只有入口會送
      ...(isEntry
        ? {
            exitLocationId: values.exitLocationId ?? null,
            capacity: values.capacity ?? 0,
            slotCount: values.slotCount,
            signals: Array.from({ length: values.slotCount }, (_, i) => {
              const row = values.signals?.[i];
              return row?.module
                ? {
                    module: row.module,
                    channel: row.channel ?? 0,
                    invert: !!row.invert,
                  }
                : null;
            }),
          }
        : {}),
    });
  };

  // 貨物改用跟主畫面同一個面板編輯
  const editCargo = () => {
    if (!info) return;
    openCargoPanel({ type: "PACKAGE", locationId: info.locationId });
    setLocationId(null);
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          locationId ? <PeripheralIdentity locationId={locationId} /> : null
        }
        open={!!locationId}
        onCancel={() => setLocationId(null)}
        centered
        width={1000}
        footer={
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={updateMutation.isPending}
            disabled={!info}
          >
            {t("utils.save")}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Flex gap={16}>
            <div style={editHalfPanelStyle}>
              <Title
                level={4}
                style={{ marginBottom: 16, color: EDIT_TITLE_COLOR }}
              >
                {t("package.this_point")}
              </Title>

              <Form.Item label={t("package.role")}>
                <Tag color={isEntry ? "blue" : "green"}>
                  {t(isEntry ? "package.role_entry" : "package.role_exit")}
                </Tag>
              </Form.Item>

              <Form.Item
                label={t("package.name")}
                tooltip={t("package.name_hint")}
                name="name"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={t("shelf.layer_form.description")}
                name="description"
              >
                <Input />
              </Form.Item>

              <Flex gap={16}>
                <Form.Item
                  label={t("package.disable")}
                  name="disable"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren={t("utils.on")}
                    unCheckedChildren={t("utils.off")}
                  />
                </Form.Item>
                <Form.Item label={t("package.fork_height")} name="forkHeight">
                  <InputNumber min={0} />
                </Form.Item>
              </Flex>

              {/* 入口只會被放貨、出口只會被取貨,各自只需要那一種任務和優先度 */}
              {isEntry ? (
                <>
                  <Form.Item
                    label={t("shelf.cargo_mission.offload_mission")}
                    tooltip={t("shelf.cargo_mission.offload_desc")}
                    name="offloadMissionId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={taskOption}
                      placeholder={t("utils.select")}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("shelf.offload_priority")}
                    name="offloadPriority"
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    label={t("shelf.cargo_mission.load_mission")}
                    tooltip={t("shelf.cargo_mission.load_desc")}
                    name="loadMissionId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={taskOption}
                      placeholder={t("utils.select")}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("shelf.load_priority")}
                    name="loadPriority"
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                </>
              )}

              <Button onClick={editCargo} disabled={!info}>
                {t("package.edit_cargo")}
                {info ? ` (${info.cargo.length})` : ""}
              </Button>
            </div>

            <div style={editHalfPanelStyle}>
              <Title
                level={4}
                style={{ marginBottom: 16, color: EDIT_TITLE_COLOR }}
              >
                {t("package.line_settings")}
              </Title>

              {isEntry ? (
                <>
                  <Form.Item
                    label={t("package.exit_point")}
                    tooltip={t("package.exit_point_hint")}
                    name="exitLocationId"
                  >
                    <Select
                      allowClear
                      options={exitOptions}
                      placeholder={t("package.exit_none")}
                    />
                  </Form.Item>

                  <Flex gap={16}>
                    <Form.Item
                      label={t("package.capacity")}
                      tooltip={t("package.capacity_hint")}
                      name="capacity"
                    >
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Form.Item
                      label={t("package.slot_count")}
                      name="slotCount"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} max={MAX_SLOT_COUNT} precision={0} />
                    </Form.Item>
                  </Flex>

                  <div style={editSubPanelStyle}>
                    <Title level={5} style={{ marginBottom: 4 }}>
                      {t("package.signals")}
                    </Title>
                    <Text
                      type="secondary"
                      style={{ display: "block", marginBottom: 12 }}
                    >
                      {t("package.signal_hint")}
                    </Text>
                    {moduleOptions.length === 0 && (
                      <Note>{t("package.no_signal_source")}</Note>
                    )}

                    <SignalGrid>
                      <HeadCell>{t("package.lamp")}</HeadCell>
                      <HeadCell>{t("package.module")}</HeadCell>
                      <HeadCell>{t("package.channel")}</HeadCell>
                      <HeadCell title={t("package.invert_hint")}>
                        {t("package.invert")}
                      </HeadCell>
                      <HeadCell>{t("package.live")}</HeadCell>

                      {Array.from({ length: slotCount }, (_, i) => {
                        const live = liveOf(signalRows[i]);
                        return [
                          <LampNo key={`no-${i}`}>{i + 1}</LampNo>,
                          <Form.Item
                            key={`module-${i}`}
                            name={["signals", i, "module"]}
                          >
                            <AutoComplete
                              allowClear
                              options={moduleOptions}
                              placeholder="wise_31"
                            />
                          </Form.Item>,
                          <Form.Item
                            key={`channel-${i}`}
                            name={["signals", i, "channel"]}
                          >
                            <InputNumber
                              min={0}
                              max={63}
                              precision={0}
                              placeholder="0"
                              style={{ width: "100%" }}
                            />
                          </Form.Item>,
                          <Form.Item
                            key={`invert-${i}`}
                            name={["signals", i, "invert"]}
                            valuePropName="checked"
                          >
                            <Checkbox />
                          </Form.Item>,
                          <Live key={`live-${i}`} $state={live}>
                            {t(`package.live_${live}`)}
                          </Live>,
                        ];
                      })}
                    </SignalGrid>
                  </div>
                </>
              ) : info?.entryLocationId ? (
                <>
                  <Note>
                    {t("package.edit_at_entry", { id: info.entryLocationId })}
                  </Note>
                  <Button onClick={() => setLocationId(info.entryLocationId)}>
                    {t("package.go_entry")}
                  </Button>
                </>
              ) : (
                <Note>{t("package.exit_unpaired")}</Note>
              )}
            </div>
          </Flex>
        </Form>
      </Modal>
    </>
  );
};

export default EditPackageModal;
