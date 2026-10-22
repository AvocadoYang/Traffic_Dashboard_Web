import { FC, ReactNode, useEffect, useState } from "react";
import { Button, Drawer, message, Popconfirm, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
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

const PANEL_WIDTH = 440;
/** 存檔後等 socket 帶回新資料的最長時間,期間鎖住按鈕,避免拿舊資料連點 */
const SYNC_TIMEOUT_MS = 2500;

/**
 * 取貨順序:
 * fifo 最先放的先取(輸送帶),lifo 最上層先取(stack),none 沒有先後(貨架、電梯、車上)
 */
export type CargoOrder = "fifo" | "lifo" | "none";

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

const CargoEditorDrawer: FC<{
  open: boolean;
  onClose: () => void;
  /** 編輯對象的識別,換了就回到清單 */
  resetKey: string;
  name: string;
  meta: string;
  /** 依 placement_order 由小到大;null 代表資料還沒到 */
  cargo: Cargo[] | null;
  /** null 代表沒有上限 */
  capacity: number | null;
  order: CargoOrder;
  /** 清單上方額外內容,例如層別切換、狀態、警告 */
  notices?: ReactNode;
  /** 儲存整份清單;knownCargoIds 是組清單當下看到的貨,後端只移除這裡面被拿掉的 */
  save: (cargo: CargoPayload[], knownCargoIds: string[]) => Promise<unknown>;
}> = ({
  open,
  onClose,
  resetKey,
  name,
  meta,
  cargo,
  capacity,
  order,
  notices,
  save,
}) => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const formats = (data ?? []).filter((f): f is CargoFormat => !!f);
  const [messageApi, contextHolder] = message.useMessage();
  const [view, setView] = useState<View>({ mode: "list" });
  const [saving, setSaving] = useState(false);
  const [syncingFrom, setSyncingFrom] = useState<string | null>(null);

  // 換了編輯對象就回到清單
  useEffect(() => {
    setView({ mode: "list" });
    setSyncingFrom(null);
  }, [resetKey]);

  const signature = cargo ? cargoSignature(cargo) : "";
  useEffect(() => {
    if (syncingFrom === null) return;
    if (signature !== syncingFrom) {
      setSyncingFrom(null);
      return;
    }
    const timer = setTimeout(() => setSyncingFrom(null), SYNC_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [signature, syncingFrom]);

  const busy = saving || syncingFrom !== null;

  /** 用按下去當下最新的貨物清單組出要送的內容 */
  const run = async (
    build: (live: Cargo[]) => CargoPayload[],
    successKey: string | null,
  ) => {
    if (!cargo) return false;
    const live = cargo;
    setSaving(true);
    try {
      await save(
        build(live),
        live.flatMap((c) => (c.cargoInfoId ? [c.cargoInfoId] : [])),
      );
      setSyncingFrom(cargoSignature(live));
      if (successKey) void messageApi.success(t(successKey));
      return true;
    } catch (e) {
      errorHandler(e as ErrorResponse, messageApi);
      return false;
    } finally {
      setSaving(false);
    }
  };

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
    return (
      <HeaderTitle>
        <div className="name">{name}</div>
        <div className="meta">{meta}</div>
      </HeaderTitle>
    );
  };

  const renderList = (live: Cargo[]) => {
    const isLifo = order === "lifo";
    const canReorder = order !== "none" && live.length > 1;
    // lifo 最上面那層先被取走,畫面也把最上層放在最上面
    const display = isLifo ? [...live].reverse() : live;
    const firstBadge =
      order === "fifo"
        ? t("cargo_panel.next_out")
        : isLifo
          ? t("cargo_panel.top_next_out")
          : undefined;
    const full = capacity !== null && live.length >= capacity;

    return (
      <>
        <Scroll>
          {notices}
          {display.length === 0 ? (
            <Empty>{t("cargo_panel.empty")}</Empty>
          ) : (
            <List>
              {display.map((c, i) => (
                <CargoCard
                  key={c.cargoInfoId ?? i}
                  cargo={c}
                  displayIndex={i}
                  formats={formats}
                  badge={i === 0 ? firstBadge : undefined}
                  busy={busy}
                  canMoveUp={canReorder ? i > 0 : null}
                  canMoveDown={canReorder ? i < display.length - 1 : null}
                  // 畫面上往上移:fifo 是提早取出(順序變小),lifo 是往上疊(順序變大)
                  onMoveUp={() =>
                    run(
                      (l) => withMoved(l, c.cargoInfoId ?? "", isLifo ? 1 : -1),
                      null,
                    )
                  }
                  onMoveDown={() =>
                    run(
                      (l) => withMoved(l, c.cargoInfoId ?? "", isLifo ? -1 : 1),
                      null,
                    )
                  }
                  onEdit={() =>
                    c.cargoInfoId &&
                    setView({ mode: "edit", cargoInfoId: c.cargoInfoId })
                  }
                  onRemove={() =>
                    run(
                      (l) => withRemoved(l, c.cargoInfoId ?? ""),
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
          {live.length > 0 && (
            <Popconfirm
              title={t("cargo_panel.clear_confirm", { count: live.length })}
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

  const renderForm = (live: Cargo[]) => {
    if (view.mode === "list") return null;
    const editingId = view.mode === "edit" ? view.cargoInfoId : null;
    const editing = editingId
      ? live.find((c) => c.cargoInfoId === editingId)
      : undefined;

    return (
      <CargoForm
        key={`${view.mode}-${editingId ?? "new"}`}
        mode={view.mode}
        cargo={editing}
        formats={formats}
        saving={saving}
        cargoGone={!!editingId && !editing}
        onCancel={() => setView({ mode: "list" })}
        onSubmit={async (formatId, metadata) => {
          const ok = await run(
            (l) =>
              editingId
                ? withEdited(l, editingId, formatId, metadata)
                : withAdded(l, formatId, metadata),
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
        open={open}
        onClose={onClose}
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
            onClick={onClose}
          />
        }
        styles={{
          wrapper: { maxWidth: "100vw" },
          body: { padding: 0, display: "flex", flexDirection: "column" },
        }}
      >
        {!cargo ? (
          <Loading>
            <Spin />
          </Loading>
        ) : view.mode === "list" ? (
          renderList(cargo)
        ) : (
          renderForm(cargo)
        )}
      </Drawer>
    </>
  );
};

export default CargoEditorDrawer;
