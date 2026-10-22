import { FC } from "react";
import { Button, Popconfirm } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Cargo } from "@/types/peripheral";
import { CargoFormat, formatValue, parseMetadata } from "./cargoList";

const MAX_SUMMARY_FIELDS = 3;

const Card = styled.li<{ $highlight: boolean }>`
  list-style: none;
  padding: var(--space-md);
  border-radius: 10px;
  border: 1px solid
    ${({ $highlight }) => ($highlight ? "var(--c-accent)" : "var(--c-border)")};
  background: var(--c-bg);
  box-shadow: ${({ $highlight }) =>
    $highlight ? "0 0 0 1px var(--c-accent)" : "none"};
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
`;

const OrderNo = styled.span`
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  color: var(--c-text);
  background: var(--c-bg-muted);
`;

const Title = styled.div`
  flex: 1;
  min-width: 0;

  .id {
    font-size: 17px;
    font-weight: 600;
    color: var(--c-text);
    word-break: break-all;
  }
  .format {
    margin-top: 2px;
    font-size: 13px;
    color: var(--c-text-secondary);
  }
`;

const Badge = styled.span`
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-on-accent);
  background: var(--c-accent);
`;

const Summary = styled.dl`
  margin: var(--space-sm) 0 0 44px;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px var(--space-md);
  font-size: 13px;

  dt {
    color: var(--c-text-secondary);
  }
  dd {
    margin: 0;
    color: var(--c-text);
    word-break: break-all;
  }
`;

const Actions = styled.div`
  margin-top: var(--space-md);
  display: flex;
  gap: var(--space-sm);

  .ant-btn {
    height: 44px;
    min-width: 44px;
    font-size: 15px;
  }
  .grow {
    flex: 1;
  }
`;

const CargoCard: FC<{
  cargo: Cargo;
  displayIndex: number;
  formats: CargoFormat[];
  badge?: string;
  busy: boolean;
  /** null 代表不顯示排序按鈕 */
  canMoveUp: boolean | null;
  canMoveDown: boolean | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}> = ({
  cargo,
  displayIndex,
  formats,
  badge,
  busy,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
}) => {
  const { t } = useTranslation();
  const format = formats.find((f) => f.id === cargo.customCargoMetadataId);
  const metadata = parseMetadata(cargo);
  const summary = Object.entries(metadata)
    .filter(([key]) => key !== format?.unique_key)
    .slice(0, MAX_SUMMARY_FIELDS);
  const title = cargo.customId || t("cargo_panel.untitled");

  return (
    <Card $highlight={!!badge}>
      <Head>
        <OrderNo>{displayIndex + 1}</OrderNo>
        <Title>
          <div className="id">{title}</div>
          <div className="format">
            {format?.custom_name ?? t("cargo_panel.no_format")}
          </div>
        </Title>
        {badge && <Badge>{badge}</Badge>}
      </Head>

      {summary.length > 0 && (
        <Summary>
          {summary.map(([key, value]) => (
            <SummaryRow key={key} name={key} value={value} />
          ))}
        </Summary>
      )}

      <Actions>
        {canMoveUp !== null && (
          <Button
            icon={<ArrowUpOutlined />}
            aria-label={t("cargo_panel.move_up")}
            disabled={busy || !canMoveUp}
            onClick={onMoveUp}
          />
        )}
        {canMoveDown !== null && (
          <Button
            icon={<ArrowDownOutlined />}
            aria-label={t("cargo_panel.move_down")}
            disabled={busy || !canMoveDown}
            onClick={onMoveDown}
          />
        )}
        <span className="grow" />
        <Button icon={<EditOutlined />} disabled={busy} onClick={onEdit}>
          {t("utils.edit")}
        </Button>
        <Popconfirm
          title={t("cargo_panel.remove_confirm", { name: title })}
          okText={t("cargo_panel.remove")}
          cancelText={t("utils.cancel")}
          okButtonProps={{ danger: true, size: "large" }}
          cancelButtonProps={{ size: "large" }}
          onConfirm={onRemove}
        >
          <Button danger icon={<DeleteOutlined />} disabled={busy}>
            {t("cargo_panel.remove")}
          </Button>
        </Popconfirm>
      </Actions>
    </Card>
  );
};

const SummaryRow: FC<{ name: string; value: unknown }> = ({ name, value }) => (
  <>
    <dt>{name}</dt>
    <dd>{formatValue(value)}</dd>
  </>
);

export default CargoCard;
