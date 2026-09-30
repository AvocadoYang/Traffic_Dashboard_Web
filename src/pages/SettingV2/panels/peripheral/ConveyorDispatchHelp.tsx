import { FC } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { c, font, space } from "../../ui/tokens";
import HelpButton from "../../ui/HelpButton";

/**
 * 「輸送帶派送」面板各區塊旁的問號。說明文字在 conveyor_dispatch.help;
 * 巷道另外畫一張示意圖, 方向最容易設錯。
 */
export type HelpTopic = "runtime" | "rules" | "policy" | "lanes";

const ConveyorDispatchHelp: FC<{ topic: HelpTopic }> = ({ topic }) => {
  const { t } = useTranslation();
  return (
    <HelpButton
      i18nKey={`conveyor_dispatch.help.${topic}`}
      label={t("conveyor_dispatch.help.open")}
      extra={topic === "lanes" ? <LaneDiagram /> : undefined}
    />
  );
};

// ------------------------------------------------------------ 巷道示意圖

const Diagram = styled.div`
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr)) auto;
  gap: ${space.xs} ${space.sm};
  align-items: center;
  padding: ${space.md};
  background: ${c.bgSubtle};
  border: 1px solid ${c.border};
  font-size: ${font.md};
`;

const Slot = styled.div<{ $inner?: boolean }>`
  padding: ${space.sm} ${space.xs};
  text-align: center;
  border: 2px solid ${({ $inner }) => ($inner ? c.textSecondary : c.border)};
  background: ${c.bg};
  font-weight: 600;
`;

const Aisle = styled.div`
  padding: ${space.sm};
  color: ${c.accent};
  font-weight: 600;
  white-space: nowrap;
`;

const RowLabel = styled.div`
  color: ${c.textSecondary};
  white-space: nowrap;
`;

const Step = styled.div`
  text-align: center;
  font-family: ${font.mono};
  font-weight: 700;
`;

const LaneDiagram: FC = () => {
  const { t } = useTranslation();
  const d = (key: "inner" | "middle" | "outer" | "aisle" | "place" | "pick") =>
    t(`conveyor_dispatch.help.lane_diagram.${key}`);

  return (
    <Diagram role="img" aria-label={t("conveyor_dispatch.help.lane_diagram.alt")}>
      <span />
      <Slot $inner>{d("inner")}</Slot>
      <Slot>{d("middle")}</Slot>
      <Slot>{d("outer")}</Slot>
      <Aisle>⇆ {d("aisle")}</Aisle>

      <RowLabel>{d("place")}</RowLabel>
      <Step>1</Step>
      <Step>2</Step>
      <Step>3</Step>
      <span />

      <RowLabel>{d("pick")}</RowLabel>
      <Step>3</Step>
      <Step>2</Step>
      <Step>1</Step>
      <span />
    </Diagram>
  );
};

export default ConveyorDispatchHelp;
