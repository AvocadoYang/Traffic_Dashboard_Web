import { FC } from "react";
import { Tooltip } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { c, font, space } from "../../../../ui/tokens";
import {
  CountNote,
  EmptyState,
  FieldLabel,
  GhostButton,
  Hint,
  Toolbar,
} from "../../../../ui/primitives";
import { IconBar, IconButton, OrderBadge } from "../steps/stepPrimitives";
import { controlLabel, hasControlFields } from "./controlSpec";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: 6px ${space.sm};
  background: ${c.bg};
  border: 1px solid ${c.border};

  &:hover {
    border-color: ${c.borderStrong};
    background: ${c.bgSubtle};
  }
`;

const RowName = styled.span`
  flex: 1;
  min-width: 0;
  font-family: ${font.mono};
  font-size: ${font.sm};
  font-weight: 600;
  letter-spacing: 0.5px;
  color: ${c.text};
  overflow-wrap: anywhere;
`;

type Props = {
  /** 可以加進來的控制項,依目前的動作類型決定 */
  available: readonly string[];
  sequence: string[];
  onAdd: (control: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onReset: () => void;
};

/**
 * 控制序列建構器:上面是已排好的順序,下面是可以加進來的控制項。
 * 順序就是車輛實際執行的順序,所以序號要一直看得到。
 */
const ControlSequence: FC<Props> = ({
  available,
  sequence,
  onAdd,
  onMove,
  onRemove,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Toolbar>
        <CountNote>{`${sequence.length} CONTROLS`}</CountNote>
        <span style={{ flex: 1 }} />
        <GhostButton
          type="button"
          disabled={sequence.length === 0}
          onClick={onReset}
        >
          <RedoOutlined />
          {t("mission.task_form_fork.reset_all")}
        </GhostButton>
      </Toolbar>

      {sequence.length === 0 ? (
        <EmptyState>{t("mission.task_form_fork.no_control_sequence")}</EmptyState>
      ) : (
        <List>
          {sequence.map((control, idx) => (
            <Row key={`${control}-${idx}`}>
              <OrderBadge>{idx + 1}</OrderBadge>
              <RowName>{controlLabel(control)}</RowName>
              {hasControlFields(control) ? null : (
                <CountNote>NO PARAMS</CountNote>
              )}
              <IconBar>
                <Tooltip title={t("mission.task_form_fork.move_up")}>
                  <IconButton
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMove(idx, idx - 1)}
                  >
                    <ArrowUpOutlined />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("mission.task_form_fork.move_down")}>
                  <IconButton
                    type="button"
                    disabled={idx === sequence.length - 1}
                    onClick={() => onMove(idx, idx + 1)}
                  >
                    <ArrowDownOutlined />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("mission.task_form_fork.delete")}>
                  <IconButton type="button" $danger onClick={() => onRemove(idx)}>
                    <DeleteOutlined />
                  </IconButton>
                </Tooltip>
              </IconBar>
            </Row>
          ))}
        </List>
      )}

      {available.length > 0 && (
        <>
          <FieldLabel>{t("mission.task_form_fork.available_controls")}</FieldLabel>
          <Toolbar style={{ flexWrap: "wrap" }}>
            {available.map((control) => (
              <GhostButton
                key={control}
                type="button"
                onClick={() => onAdd(control)}
              >
                <PlusOutlined />
                {controlLabel(control)}
              </GhostButton>
            ))}
          </Toolbar>
          <Hint>同一個控制項可以重複加,順序就是車輛執行的順序。</Hint>
        </>
      )}
    </>
  );
};

export default ControlSequence;
