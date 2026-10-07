import { FC, useMemo } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import usePeripheralName from "@/api/usePeripheralName";
import usePeripheralGroup from "@/api/usePeripheralGroup";

const Strip = styled.div<{ $besideClose: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 24px;
  /* 跟關閉鈕同一行時,右邊讓出它的位置 */
  margin-right: ${({ $besideClose }) => ($besideClose ? "28px" : "0")};
  padding: 10px 14px;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--c-text);
`;

const Fact = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`;

const Label = styled.span`
  font-size: 12px;
  color: var(--c-text-muted);
  white-space: nowrap;
`;

const Value = styled.span`
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  overflow-wrap: anywhere;
`;

const Tags = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const GroupTag = styled.span`
  padding: 0 8px;
  border: 1px solid var(--c-header-accent);
  border-radius: 2px;
  background: var(--c-header-accent-soft);
  color: var(--c-header-accent);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.7;
  white-space: nowrap;
`;

const Muted = styled.span`
  color: var(--c-text-muted);
`;

// 多層貨架:一層一列(層級 / 名稱 / 群組)
const LevelList = styled.div`
  flex-basis: 100%;
  display: grid;
  grid-template-columns: max-content max-content 1fr;
  align-items: baseline;
  gap: 4px 16px;
`;

const NO_VALUE = "—";

/**
 * 設備編輯對話框最上面那一條:這個設備的位置編號、名稱,以及它被放進哪些設備群組。
 *
 * 群組是在「設備群組表」設定的(一個群組收很多設備),從設備這邊反過來查很麻煩,
 * 所以在這裡直接列出來。多層貨架每一層是各自獨立的設備,可以分屬不同群組,會一層一列。
 */
const PeripheralIdentity: FC<{
  locationId: string;
  // 這一條是不是對話框的第一行(會跟右上角的關閉鈕並排)
  besideClose?: boolean;
}> = ({ locationId, besideClose = true }) => {
  const { t } = useTranslation();
  const { data: names, isLoading: namesLoading } = usePeripheralName();
  const { data: groups, isLoading: groupsLoading } = usePeripheralGroup();
  const loading = namesLoading || groupsLoading;

  // 以「設備群組表」那支 API 的成員名單為準(使用者就是在那裡編輯的),
  // 設備清單只用來把位置編號對到設備 id。
  const entries = useMemo(
    () =>
      (names ?? [])
        .filter((n) => n.locationId === locationId)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
        .map((n) => ({
          id: n.peripheralNameId,
          name: n.name ?? "",
          level: n.level ?? null,
          groups: (groups ?? [])
            .filter((g) =>
              g?.peripherals?.some((p) => p.id === n.peripheralNameId),
            )
            .map((g) => g?.name ?? "")
            .sort((a, b) => a.localeCompare(b)),
        })),
    [names, groups, locationId],
  );

  const renderGroups = (list: string[]) => {
    if (loading) return <Muted>…</Muted>;
    if (list.length === 0) {
      return <Muted>{t("peripheral_name_table.no_group")}</Muted>;
    }
    return (
      <Tags>
        {list.map((name) => (
          <GroupTag key={name}>{name}</GroupTag>
        ))}
      </Tags>
    );
  };

  const single = entries.length <= 1 ? entries[0] : undefined;

  return (
    <Strip $besideClose={besideClose}>
      <Fact>
        <Label>{t("peripheral_name_table.locationId")}</Label>
        <Value>{locationId}</Value>
      </Fact>

      {entries.length <= 1 ? (
        <>
          {single?.name ? (
            <Fact>
              <Label>{t("peripheral_name_table.name")}</Label>
              <Value>{single.name}</Value>
            </Fact>
          ) : null}
          <Fact>
            <Label>{t("peripheral_name_table.group")}</Label>
            {renderGroups(single?.groups ?? [])}
          </Fact>
        </>
      ) : (
        <LevelList>
          {entries.map((entry) => (
            <Fact key={entry.id} style={{ display: "contents" }}>
              <Label>
                {`${t("peripheral_name_table.level")} ${
                  entry.level !== null ? entry.level + 1 : NO_VALUE
                }`}
              </Label>
              <Value>{entry.name || NO_VALUE}</Value>
              <span>{renderGroups(entry.groups)}</span>
            </Fact>
          ))}
        </LevelList>
      )}
    </Strip>
  );
};

export default PeripheralIdentity;
