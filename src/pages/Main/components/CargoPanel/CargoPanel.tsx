import { FC, useEffect, useState } from "react";
import { Alert, Button, Drawer, message, Popconfirm, Spin, Tag } from "antd";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { CargoPanelTarget } from "@/pages/Main/global/jotai";
import { Cargo } from "@/types/peripheral";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import CargoCard from "./CargoCard";
import CargoForm from "./CargoForm";
import {
  CargoFormat,
  CargoPayload,
  withAdded,
  withEdited,
  withMoved,
  withRemoved,
} from "./cargoList";
import { useCargoPanelSource, useSaveCargo } from "./useCargoPanelSource";

const PANEL_WIDTH = 440;
/** 存檔後等 socket 帶回新資料的最長時間,期間鎖住按鈕,避免拿舊資料連點 */
const SYNC_TIMEOUT_MS = 2500;

type View =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; cargoInfoId: string };

const cargoSignature = (cargo: Cargo[]) =>
  JSON.stringify(
    cargo.map((c) => [
      c.cargoInfoId,
      c.placement_order,
      c.customCargoMetadataId,
      c.metadata,
    ]),
  );

const HeaderTitle = styled.div`
  min-width: 0;

  .name {
    font-size: 18px;
    font-weight: 700;
    color: var(--c-text);
    word-break: break-all;
  }
  .meta {
    margin-top: 2px;
    font-size: 13px;
    font-weight: 400;
    color: var(--c-text-secondary);
  }
`;

const BackButton = styled(Button)`
  height: 44px;
  padding: 0 var(--space-sm);
  font-size: 17px;
  font-weight: 600;
`;

// antd 預設的關閉鈕很小又緊貼返回鈕,改放右上角並放大到手指好點的尺寸
const CloseButton = styled(Button)`
  && {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
`;

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
`;

const LevelPicker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);

  .ant-btn {
    height: 44px;
    min-width: 72px;
    font-size: 15px;
  }
  .ant-btn.is-disabled-level:not(.ant-btn-primary) {
    border-style: dashed;
    color: var(--c-text-muted);
  }
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);

  .ant-tag {
    margin: 0;
    padding: 4px 10px;
    font-size: 13px;
  }
`;

const List = styled.ol`
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
`;

const Empty = styled.div`
  padding: 48px 0;
  text-align: center;
  font-size: 15px;
  color: var(--c-text-muted);
`;

const ListFooter = styled.div`
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);

  .ant-btn {
    height: 48px;
    font-size: 16px;
  }
  .hint {
    text-align: center;
    font-size: 13px;
    color: var(--c-text-secondary);
  }
`;

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TYPE_LABEL_KEY: Record<CargoPanelTarget["type"], string> = {
  STORAGE: "cargo_panel.type_storage",
  CONVEYOR: "cargo_panel.type_conveyor",
  STACK: "cargo_panel.type_stack",
  ELEVATOR: "cargo_panel.type_elevator",
};

const CargoPanel: FC = () => {
  const { t } = useTranslation();
  const [target, setTarget] = useAtom(CargoPanelTarget);
  const source = useCargoPanelSource(target);
  const { data } = useCustomCargoFormat();
  const formats = (data ?? []).filter((f): f is CargoFormat => !!f);
  const save = useSaveCargo(target, source?.storageDbId);
  const [messageApi, contextHolder] = message.useMessage();
  const [view, setView] = useState<View>({ mode: "list" });
  const [syncingFrom, setSyncingFrom] = useState<string | null>(null);

  // 換了點位(或貨架換層)就回到清單
  useEffect(() => {
    setView({ mode: "list" });
    setSyncingFrom(null);
  }, [target?.type, target?.locationId, target?.level]);

  const signature = source ? cargoSignature(source.cargo) : "";
  useEffect(() => {
    if (syncingFrom === null) return;
    if (signature !== syncingFrom) {
      setSyncingFrom(null);
      return;
    }
    const timer = setTimeout(() => setSyncingFrom(null), SYNC_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [signature, syncingFrom]);

  const busy = save.isLoading || syncingFrom !== null;

  /** 用按下去當下最新的貨物清單組出要送的內容 */
  const run = async (
    build: (live: Cargo[]) => CargoPayload[],
    successKey: string | null,
  ) => {
    if (!source) return false;
    const live = source.cargo;
    try {
      await save.mutateAsync({
        cargo: build(live),
        knownCargoIds: live.flatMap((c) => (c.cargoInfoId ? [c.cargoInfoId] : [])),
      });
      setSyncingFrom(cargoSignature(live));
      if (successKey) void messageApi.success(t(successKey));
      return true;
    } catch (e) {
      errorHandler(e as ErrorResponse, messageApi);
      return false;
    }
  };

  const close = () => setTarget(null);

  const renderTitle = () => {
    if (view.mode !== "list") {
      return (
        <BackButton
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setView({ mode: "list" })}
        >
          {t(view.mode === "add" ? "cargo_panel.add" : "cargo_panel.edit_title")}
        </BackButton>
      );
    }
    if (!target) return null;
    const count = source?.cargo.length ?? 0;
    return (
      <HeaderTitle>
        <div className="name">{source?.name || target.locationId}</div>
        <div className="meta">
          {t(TYPE_LABEL_KEY[target.type])} · #{target.locationId} ·{" "}
          {source?.capacity
            ? `${count} / ${source.capacity}`
            : t("cargo_panel.cargo_count", { count })}
        </div>
      </HeaderTitle>
    );
  };

  const renderList = () => {
    if (!target || !source) return null;
    const isStack = target.type === "STACK";
    const canReorder =
      (target.type === "CONVEYOR" || isStack) && source.cargo.length > 1;
    // stack 最上面那層先被取走,畫面也把最上層放在最上面
    const display = isStack ? [...source.cargo].reverse() : source.cargo;
    const firstBadge =
      target.type === "CONVEYOR"
        ? t("cargo_panel.next_out")
        : isStack
          ? t("cargo_panel.top_next_out")
          : undefined;
    const full =
      source.capacity !== null && source.cargo.length >= source.capacity;

    return (
      <>
        <Scroll>
          {source.levels.length > 1 && (
            <LevelPicker>
              {source.levels.map((l) => (
                <Button
                  key={l.level}
                  type={l.level === (target.level ?? 0) ? "primary" : "default"}
                  className={l.disable ? "is-disabled-level" : undefined}
                  onClick={() => setTarget({ ...target, level: l.level })}
                >
                  {l.name} ({l.count})
                  {l.disable && ` · ${t("cargo_panel.level_disabled")}`}
                </Button>
              ))}
            </LevelPicker>
          )}

          {source.elevator && (
            <StatusRow>
              <Tag color={source.elevator.manual ? "red" : undefined}>
                {t("cargo_panel.elevator_manual")}:{" "}
                {source.elevator.manual ? t("utils.yes") : t("utils.no")}
              </Tag>
              <Tag color={source.elevator.running ? "blue" : undefined}>
                {t("cargo_panel.elevator_running")}:{" "}
                {source.elevator.running ? t("utils.yes") : t("utils.no")}
              </Tag>
              <Tag color={source.elevator.cargoSignal ? "gold" : undefined}>
                {t("cargo_panel.elevator_signal")}:{" "}
                {source.elevator.cargoSignal ? t("utils.yes") : t("utils.no")}
              </Tag>
            </StatusRow>
          )}

          {source.elevator &&
            source.elevator.cargoSignal !== source.cargo.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={t("cargo_panel.signal_mismatch", {
                  signal: source.elevator.cargoSignal
                    ? t("utils.yes")
                    : t("utils.no"),
                  count: source.cargo.length,
                })}
              />
            )}

          {source.booker && (
            <Alert
              type="warning"
              showIcon
              title={t("cargo_panel.booked_warning", { booker: source.booker })}
            />
          )}
          {source.disabled && (
            <Alert type="info" showIcon title={t("cargo_panel.disabled_hint")} />
          )}

          {display.length === 0 ? (
            <Empty>{t("cargo_panel.empty")}</Empty>
          ) : (
            <List>
              {display.map((cargo, i) => (
                <CargoCard
                  key={cargo.cargoInfoId ?? i}
                  cargo={cargo}
                  displayIndex={i}
                  formats={formats}
                  badge={i === 0 ? firstBadge : undefined}
                  busy={busy}
                  canMoveUp={canReorder ? i > 0 : null}
                  canMoveDown={canReorder ? i < display.length - 1 : null}
                  // 畫面上往上移:輸送帶是提早取出(順序變小),stack 是往上疊(順序變大)
                  onMoveUp={() =>
                    run(
                      (live) =>
                        withMoved(live, cargo.cargoInfoId ?? "", isStack ? 1 : -1),
                      null,
                    )
                  }
                  onMoveDown={() =>
                    run(
                      (live) =>
                        withMoved(live, cargo.cargoInfoId ?? "", isStack ? -1 : 1),
                      null,
                    )
                  }
                  onEdit={() =>
                    cargo.cargoInfoId &&
                    setView({ mode: "edit", cargoInfoId: cargo.cargoInfoId })
                  }
                  onRemove={() =>
                    run(
                      (live) => withRemoved(live, cargo.cargoInfoId ?? ""),
                      "cargo_panel.removed",
                    )
                  }
                />
              ))}
            </List>
          )}
        </Scroll>

        <ListFooter>
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            disabled={busy || full || formats.length === 0}
            onClick={() => setView({ mode: "add" })}
          >
            {t("cargo_panel.add")}
          </Button>
          {full && <div className="hint">{t("cargo_panel.full")}</div>}
          {formats.length === 0 && (
            <div className="hint">{t("cargo_panel.no_formats")}</div>
          )}
          {source.cargo.length > 0 && (
            <Popconfirm
              title={t("cargo_panel.clear_confirm", {
                count: source.cargo.length,
              })}
              okText={t("cargo_panel.clear_all")}
              cancelText={t("utils.cancel")}
              okButtonProps={{ danger: true, size: "large" }}
              cancelButtonProps={{ size: "large" }}
              onConfirm={() => run(() => [], "cargo_panel.removed")}
            >
              <Button danger type="text" block disabled={busy}>
                {t("cargo_panel.clear_all")}
              </Button>
            </Popconfirm>
          )}
        </ListFooter>
      </>
    );
  };

  const renderForm = () => {
    if (!target || !source || view.mode === "list") return null;
    const editingId = view.mode === "edit" ? view.cargoInfoId : null;
    const editing = editingId
      ? source.cargo.find((c) => c.cargoInfoId === editingId)
      : undefined;

    return (
      <CargoForm
        key={`${view.mode}-${editingId ?? "new"}`}
        mode={view.mode}
        cargo={editing}
        formats={formats}
        saving={save.isLoading}
        cargoGone={!!editingId && !editing}
        onCancel={() => setView({ mode: "list" })}
        onSubmit={async (formatId, metadata) => {
          const ok = await run(
            (live) =>
              editingId
                ? withEdited(live, editingId, formatId, metadata)
                : withAdded(live, formatId, metadata),
            "cargo_panel.saved",
          );
          if (ok) setView({ mode: "list" });
        }}
      />
    );
  };

  return (
    <>
      {contextHolder}
      <Drawer
        open={!!target}
        onClose={close}
        placement="right"
        size={PANEL_WIDTH}
        destroyOnHidden
        closable={false}
        title={renderTitle()}
        extra={
          <CloseButton
            type="text"
            icon={<CloseOutlined />}
            aria-label={t("utils.close")}
            onClick={close}
          />
        }
        styles={{
          wrapper: { maxWidth: "100vw" },
          body: { padding: 0, display: "flex", flexDirection: "column" },
        }}
      >
        {target && !source ? (
          <Loading>
            <Spin />
          </Loading>
        ) : view.mode === "list" ? (
          renderList()
        ) : (
          renderForm()
        )}
      </Drawer>
    </>
  );
};

export default CargoPanel;
