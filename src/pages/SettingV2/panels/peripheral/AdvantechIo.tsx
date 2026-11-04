import { FC } from "react";
import { Tooltip, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import {
  ADVANTECH_IO_KEY,
  IoLabels,
  useAdvantechIoStatus,
} from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "../../ui/tokens";

/** 一台 ADAM-4000 固定畫 4 個輸出、4 個輸入; 群組裡每台模組都還是自己的 0–3 */
export const IO_COUNT = 4;

const IoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
`;

const IoLabel = styled.span`
  font-size: ${font.md};
  color: ${c.textSecondary};
`;

/** 一台模組一段, 段和段之間空大一點, 看得出哪幾個是同一台 */
const IoSegments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.xs} ${space.md};
`;

const IoSegment = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SegmentName = styled.span`
  max-width: ${IO_COUNT * 44}px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${font.xs};
  color: ${c.textMuted};
`;

const IoRow = styled.div`
  display: flex;
  gap: ${space.xs};
`;

/** 一格 IO 加底下的代號 (例如 FALL) */
const IoSlot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 40px;
`;

const IoCode = styled.span`
  max-width: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${font.mono};
  font-size: 10px;
  line-height: 1.2;
  color: ${c.textMuted};
`;

/** 輸入只能看: 讀到 on 就亮藍色 */
const IoCell = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  border-radius: 4px;
  background: ${({ $on }) => ($on ? c.accent : c.bgSubtle)};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: ${({ $on }) => ($on ? 700 : 400)};
  color: ${({ $on }) => ($on ? c.onAccent : c.textMuted)};
  transition:
    background 0.15s,
    color 0.15s;
`;

/** 輸出可以點: 按一下真的把 Relay 打開 (變藍), 再按一下關掉; 顏色照模組讀回來的狀態 */
const OutputCell = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${({ $on }) => ($on ? c.accent : c.bgSubtle)};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: 700;
  color: ${({ $on }) => ($on ? c.onAccent : c.text)};
  transition:
    background 0.15s,
    color 0.15s;

  &:hover:not(:disabled) {
    background: ${({ $on }) => ($on ? c.accentHover : c.bgMuted)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
  }
`;

type Props = {
  /** 照群組順序的模組; 獨立模組就傳一台 */
  modules: { id: string; name: string; ioLabels: IoLabels | null }[];
  /** 群組要在每一段上面標是哪台模組 */
  showModuleNames?: boolean;
};

/** 連不上的模組; 卡片上標「離線」用 */
export const useOfflineModules = (ids: string[]) => {
  const { data: status } = useAdvantechIoStatus();
  return ids
    .map((id) => status?.get(id))
    .filter(
      (s): s is Extract<NonNullable<typeof s>, { ok: false }> => !!s && !s.ok,
    );
};

/** MiR internal IOs 風格的 IO 圖示; 狀態每秒從模組讀一次 */
const AdvantechIo: FC<Props> = ({ modules, showModuleNames }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: status } = useAdvantechIoStatus();

  const writeMutation = useMutation({
    mutationFn: (payload: { moduleId: string; channel: number; on: boolean }) =>
      client.post("api/setting/advantech-write-output", payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADVANTECH_IO_KEY }),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const renderRow = (kind: "out" | "in") => (
    <IoSegments>
      {modules.map((m) => {
        const io = status?.get(m.id);
        const values = io?.ok ? (kind === "out" ? io.do : io.di) : null;
        return (
          <IoSegment key={m.id}>
            {showModuleNames && (
              <SegmentName title={m.name}>{m.name}</SegmentName>
            )}
            <IoRow>
              {Array.from({ length: IO_COUNT }, (_, i) => {
                const on = values?.[i] ?? false;
                const label = m.ioLabels?.[kind === "out" ? "do" : "di"][i];
                const prefix = kind === "out" ? `RL${i}` : `DI${i}`;
                const tip = [prefix, label?.code, label?.name]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Tooltip key={i} title={tip} mouseEnterDelay={0.3}>
                    <IoSlot>
                      {kind === "out" ? (
                        <OutputCell
                          type="button"
                          $on={on}
                          aria-pressed={on}
                          // 還沒讀到狀態 (或離線) 不知道現在是開是關, 先不給按
                          disabled={!values || writeMutation.isLoading}
                          onClick={() =>
                            writeMutation.mutate({
                              moduleId: m.id,
                              channel: i,
                              on: !on,
                            })
                          }
                        >
                          {i}
                        </OutputCell>
                      ) : (
                        <IoCell $on={on}>{i}</IoCell>
                      )}
                      <IoCode>{label?.code || "\u00a0"}</IoCode>
                    </IoSlot>
                  </Tooltip>
                );
              })}
            </IoRow>
          </IoSegment>
        );
      })}
    </IoSegments>
  );

  return (
    <>
      {contextHolder}
      <IoGroup>
        <IoLabel>{t("advantech.outputs")}</IoLabel>
        {renderRow("out")}
      </IoGroup>
      <IoGroup>
        <IoLabel>{t("advantech.inputs")}</IoLabel>
        {renderRow("in")}
      </IoGroup>
    </>
  );
};

export default AdvantechIo;

const OfflineTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border: 1px solid ${c.danger};
  background: ${c.dangerSoft};
  color: ${c.danger};
  font-size: ${font.xs};
  letter-spacing: 0.5px;
`;

/** 有模組連不上就標「離線」, 滑上去看是哪台、什麼錯 */
export const OfflineBadge: FC<{ moduleIds: string[] }> = ({ moduleIds }) => {
  const { t } = useTranslation();
  const offline = useOfflineModules(moduleIds);
  if (!offline.length) return null;
  return (
    <Tooltip title={offline.map((o) => o.error).join("\n")}>
      <OfflineTag>{t("advantech.offline")}</OfflineTag>
    </Tooltip>
  );
};

export const DeviceGrid = styled.div<{ $min?: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(${({ $min }) => $min ?? 240}px, 100%), 1fr)
  );
  gap: ${space.md};
`;

export const DeviceCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.lg};
  background: ${c.bg};
  border: 1px solid ${c.border};
  border-radius: 8px;
  min-width: 0;
`;

export const DeviceName = styled.div`
  font-size: ${font.lg};
  font-weight: 700;
  color: ${c.text};
  text-align: center;
  word-break: break-all;
`;

export const DeviceSub = styled.div`
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
  text-align: center;
`;
