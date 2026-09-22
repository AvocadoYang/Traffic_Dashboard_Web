import { FC } from "react";
import styled from "styled-components";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { LocWithoutArr } from "@/api/useLoc";
import { ShelfWithoutList } from "@/api/type/useShelf";
import { c, font, space } from "../../ui/tokens";
import { CardFacts, Tag } from "../../ui/primitives";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md};
  padding: ${space.md};
  background: ${c.bgSubtle};
  border: 1px solid ${c.border};
  font-family: ${font.mono};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  font-size: ${font.xs};
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${c.textSecondary};

  .anticon {
    color: ${c.textMuted};
  }
`;

const LevelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md};
  padding: ${space.sm} ${space.md};
  background: ${c.bg};
  border: 1px solid ${c.border};
  font-size: ${font.sm};
  flex-wrap: wrap;
`;

const LevelName = styled.span`
  flex: 1;
  min-width: 0;
  color: ${c.textSecondary};
  overflow-wrap: anywhere;
`;

/** 停用中的層別要一眼看得出來,所以這裡是少數允許出現紅色的地方 */
const DisabledTag = styled(Tag)`
  border-color: ${c.danger};
  background: ${c.dangerSoft};
  color: ${c.danger};
`;

type Props = {
  shelf: ShelfWithoutList;
  locList: LocWithoutArr[];
};

const ShelfConfigDetail: FC<Props> = ({ shelf, locList }) => {
  const { t } = useTranslation();

  const sortedConfig = [...(shelf.ShelfConfig ?? [])].sort(
    (a, b) => a.level - b.level,
  );
  const locInfo = locList.find(
    (v) => v.locationId === shelf.peripheral_station.source.locationId,
  );

  const relationships = locInfo?.relationships
    ? Object.entries(locInfo.relationships).map(
        ([locId, type]) =>
          `${locId}: ${
            type === "fixed"
              ? t("shelf.cargo_mission.relationship_fixed")
              : t("shelf.cargo_mission.relationship_non_fixed")
          }`,
      )
    : [];

  return (
    <Wrap>
      <Head>
        {t("edit_shelf_panel.shelf_config")}
        <Tooltip title={t("edit_shelf_panel.config_tooltip")}>
          <InfoCircleOutlined />
        </Tooltip>
      </Head>

      {sortedConfig.length === 0 ? (
        <LevelRow>{t("utils.none")}</LevelRow>
      ) : (
        sortedConfig.map((item) => {
          // 儲位名稱格式是「XXX-層號」,顯示時把最後一段層號去掉
          const parts = item?.name?.split("-") ?? [];
          const label = parts.slice(0, -1).join("-");
          return (
            <LevelRow key={item.id}>
              <Tag>
                {t("edit_shelf_panel.level")} {item.level + 1}
              </Tag>
              <LevelName>{label || "—"}</LevelName>
              <span>
                {t("edit_shelf_panel.height")}: {item.cargo_limit} mm
              </span>
              {item.disable && (
                <DisabledTag>{t("edit_shelf_panel.disabled")}</DisabledTag>
              )}
            </LevelRow>
          );
        })
      )}

      <CardFacts>
        <dt>{t("edit_shelf_panel.placement_priority")}</dt>
        <dd>{locInfo?.placement_priority ?? t("utils.none")}</dd>
        <dt>{t("edit_shelf_panel.relationships")}</dt>
        <dd>
          {relationships.length ? relationships.join(", ") : t("utils.none")}
        </dd>
      </CardFacts>
    </Wrap>
  );
};

export default ShelfConfigDetail;
