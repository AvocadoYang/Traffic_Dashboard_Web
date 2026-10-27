import { FC } from "react";
import { Button, Empty, Popconfirm, Tag } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import styled from "styled-components";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ShiftNote } from "@/api/useProfile";
import { AccountAvatar } from "@/components/UserAvatar/UserAvatar";

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
`;

const Item = styled.li<{ $unread: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-sm);
  align-items: start;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--c-border);
  border-left: 3px solid ${({ $unread }) => ($unread ? "var(--c-header-accent)" : "var(--c-border)")};
  border-radius: 4px;
  background: var(--c-bg);
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  font-size: var(--font-sm);
  color: var(--c-text-secondary);

  strong {
    color: var(--c-text);
  }
`;

const Content = styled.div`
  margin-top: 2px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--font-md);
  color: var(--c-text);
`;

type Props = {
  notes: ShiftNote[];
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

/** 交班留言列表 (登入後跳出來的視窗、個人設定的交班留言分頁共用) */
const ShiftNoteList: FC<Props> = ({ notes, onDelete, deleting }) => {
  const { t } = useTranslation();
  if (notes.length === 0) return <Empty description={t("profile.shift.empty")} />;
  return (
    <List>
      {notes.map((n) => (
        <Item key={n.id} $unread={n.unread}>
          <AccountAvatar account={n.account} size={28} />
          <div>
            <Meta>
              <strong>{n.account}</strong>
              <span>{dayjs(n.time).format("MM/DD HH:mm")}</span>
              {n.unread && <Tag color="blue">{t("profile.shift.unread")}</Tag>}
            </Meta>
            <Content>{n.content}</Content>
          </div>
          {onDelete && n.canDelete ? (
            <Popconfirm title={t("profile.shift.delete_confirm")} onConfirm={() => onDelete(n.id)}>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={deleting}
                aria-label={t("utils.delete")}
              />
            </Popconfirm>
          ) : (
            <span />
          )}
        </Item>
      ))}
    </List>
  );
};

export default ShiftNoteList;
