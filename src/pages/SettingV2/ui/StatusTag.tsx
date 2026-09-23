import styled from "styled-components";
import { c, font } from "./tokens";

/**
 * 啟用 / 停用這種二元狀態。灰黑白配色下不能靠顏色分辨,
 * 所以改用「實心深底 = 開啟、淺灰外框 = 關閉」的對比。
 */
const StatusTag = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid ${({ $on }) => ($on ? c.accent : c.border)};
  background: ${({ $on }) => ($on ? c.accent : c.bgSubtle)};
  color: ${({ $on }) => ($on ? "#ffffff" : c.textMuted)};
`;

export default StatusTag;
