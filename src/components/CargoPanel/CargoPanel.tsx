import { FC } from "react";
import { Alert, Button, Tag } from "antd";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import CargoEditorDrawer, { CargoOrder } from "./CargoEditorDrawer";
import { CargoPanelTarget } from "./state";
import { useCargoPanelSource, useSaveCargo } from "./useCargoPanelSource";

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

const TYPE_LABEL_KEY: Record<CargoPanelTarget["type"], string> = {
  STORAGE: "cargo_panel.type_storage",
  CONVEYOR: "cargo_panel.type_conveyor",
  STACK: "cargo_panel.type_stack",
  ELEVATOR: "cargo_panel.type_elevator",
};

const ORDER: Record<CargoPanelTarget["type"], CargoOrder> = {
  STORAGE: "none",
  CONVEYOR: "fifo",
  STACK: "lifo",
  ELEVATOR: "none",
};

/** 點位(貨架 / 輸送帶 / stack / 電梯)的貨物面板,由 CargoPanelTarget 決定顯示哪一個 */
const CargoPanel: FC = () => {
  const { t } = useTranslation();
  const [target, setTarget] = useAtom(CargoPanelTarget);
  const source = useCargoPanelSource(target);
  const save = useSaveCargo(target, source?.storageDbId);

  const count = source?.cargo.length ?? 0;
  const yesNo = (value: boolean) => (value ? t("utils.yes") : t("utils.no"));

  const notices = target && source && (
    <>
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
            {t("cargo_panel.elevator_manual")}: {yesNo(source.elevator.manual)}
          </Tag>
          <Tag color={source.elevator.running ? "blue" : undefined}>
            {t("cargo_panel.elevator_running")}:{" "}
            {yesNo(source.elevator.running)}
          </Tag>
          <Tag color={source.elevator.cargoSignal ? "gold" : undefined}>
            {t("cargo_panel.elevator_signal")}:{" "}
            {yesNo(source.elevator.cargoSignal)}
          </Tag>
        </StatusRow>
      )}

      {source.elevator && source.elevator.cargoSignal !== count > 0 && (
        <Alert
          type="warning"
          showIcon
          title={t("cargo_panel.signal_mismatch", {
            signal: yesNo(source.elevator.cargoSignal),
            count,
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
    </>
  );

  return (
    <CargoEditorDrawer
      open={!!target}
      onClose={() => setTarget(null)}
      resetKey={target ? `${target.type}-${target.locationId}-${target.level}` : ""}
      name={source?.name || target?.locationId || ""}
      meta={
        target
          ? `${t(TYPE_LABEL_KEY[target.type])} · #${target.locationId} · ${
              source?.capacity
                ? `${count} / ${source.capacity}`
                : t("cargo_panel.cargo_count", { count })
            }`
          : ""
      }
      cargo={source?.cargo ?? null}
      capacity={source?.capacity ?? null}
      order={target ? ORDER[target.type] : "none"}
      notices={notices}
      save={(cargo, knownCargoIds) => save.mutateAsync({ cargo, knownCargoIds })}
    />
  );
};

export default CargoPanel;
