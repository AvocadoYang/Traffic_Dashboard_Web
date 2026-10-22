import { memo } from "react";
import Card from "./Card";
import useName from "@/api/useAmrName";
import { useMockInfo } from "@/sockets/useMockInfo";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { mq } from "@/styles/responsive";
import { carCardDensityAtom, type CarCardDensity } from "./cardDensity";

// 每種排列方式的卡片寬度。
// fixed:手機 / 平板的底部面板,卡片排成一列橫向捲動,所以要給定寬。
// min:桌機的側欄,卡片至少要這麼寬;側欄拉寬到放得下兩張時會自動變成兩欄。
const CARD_WIDTH: Record<CarCardDensity, { fixed: number; min: number }> = {
  compact: { fixed: 220, min: 170 },
  normal: { fixed: 260, min: 200 },
  detailed: { fixed: 300, min: 240 },
};

const CardGrid = styled.div<{ $density: CarCardDensity }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: ${({ $density }) => ($density === "compact" ? "6px" : "12px")};

  > * {
    flex: 0 0 ${({ $density }) => CARD_WIDTH[$density].fixed}px;
  }

  ${mq.web} {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(${({ $density }) => CARD_WIDTH[$density].min}px, 100%), 1fr)
    );
  }
`;

// 後端回來的車輛順序不固定(看它註冊 / 存進資料庫的先後),
// 所以這裡照卡片上顯示的車號(id 最後一段)由小到大排;車號相同再比完整 id。
const byAmrNumber = (a: string, b: string) => {
  const num = (id: string) => id.slice(id.lastIndexOf("-") + 1);
  return (
    num(a).localeCompare(num(b), undefined, { numeric: true }) ||
    a.localeCompare(b, undefined, { numeric: true })
  );
};

const Cards: React.FC<{}> = () => {
  const { data: names } = useName();
  const mockRobot = useMockInfo();
  const density = useAtomValue(carCardDensityAtom);

  if (!names || !names.amrs.length) return;
  if (mockRobot && mockRobot.isSimulate) {
    return (
      <CardGrid className="car-card-grid" $density={density}>
        {mockRobot?.robot
          ?.filter((v) => v.script_placement_location !== "unset")
          .map((v) => v.id as string)
          .sort(byAmrNumber)
          .map((id) => {
            return <Card key={id} id={id} />;
          })}
      </CardGrid>
    );
  }
  return (
    <CardGrid className="car-card-grid" $density={density}>
      {names.amrs
        .filter((v) => v.isReal)
        .map((item) => item.amrId)
        .sort(byAmrNumber)
        .map((amrId) => {
          return <Card key={amrId} id={amrId}></Card>;
        })}
    </CardGrid>
  );
};

export default memo(Cards);
