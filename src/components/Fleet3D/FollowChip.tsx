import { FC, useEffect } from "react";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Chip = styled.div<{ $top: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  color: var(--c-text);
  font-size: 12px;
  white-space: nowrap;
`;

/** 3D 檢視上方的「跟著某台車」, 按 X 或 Esc 取消 */
const FollowChip: FC<{ name: string; onStop: () => void; top?: string }> = ({ name, onStop, top = "10px" }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onStop();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStop]);
  return (
    <Chip $top={top}>
      {t("map_tool.following", { id: name })}
      <Button size="small" type="text" icon={<CloseOutlined />} onClick={onStop} aria-label={t("map_tool.stop_follow")} />
    </Chip>
  );
};

export default FollowChip;
