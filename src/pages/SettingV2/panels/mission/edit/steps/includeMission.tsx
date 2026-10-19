import { FC, useMemo } from "react";
import { Select } from "antd";
import { useTranslation } from "react-i18next";
import useAllMissionTitlesDetail from "@/api/useMissionTitleDetail";
import { isFork, isHumanRobot, isMir } from "@/utils/globalFunction";
import { Hint } from "../../../../ui/primitives";

export type IncludeGroup = {
  folder: string;
  missions: { id: string; name: string }[];
};

/**
 * 「包含既有任務」可以選的任務:同車型、扣掉自己,按資料夾分組。
 * Fork 的步驟表單和 MiR 編輯器共用。
 *
 * /all-mission-title 沒有車型,用 detail 這支才能先把不同車型的濾掉,
 * 不用等送出去才被後端擋。繞一圈包回自己這種還是只有後端擋得到。
 */
export const useIncludeMissionOptions = (
  missionId: string,
  robotValue: string,
) => {
  const { t } = useTranslation();
  const { data } = useAllMissionTitlesDetail();

  return useMemo(() => {
    const sameKind = (value: string) => {
      if (isFork(robotValue)) return isFork(value);
      if (isMir(robotValue)) return isMir(value);
      if (isHumanRobot(robotValue)) return isHumanRobot(value);
      return false;
    };
    const byFolder = new Map<string, IncludeGroup["missions"]>();
    const names = new Map<string, string>();
    (data ?? [])
      .filter(
        (v) => v.id !== missionId && sameKind(v.Robot_types?.value ?? ""),
      )
      .forEach((v) => {
        const folder =
          v.mission_folder?.name || t("setting_v2.mission.include_no_folder");
        byFolder.set(folder, [
          ...(byFolder.get(folder) ?? []),
          { id: v.id, name: v.name },
        ]);
        names.set(v.id, v.name);
      });
    const groups: IncludeGroup[] = [...byFolder].map(([folder, missions]) => ({
      folder,
      missions,
    }));
    return { groups, nameOf: (id: string) => names.get(id) ?? "" };
  }, [data, robotValue, missionId, t]);
};

type SelectProps = {
  groups: IncludeGroup[];
  value?: string;
  onChange: (id: string) => void;
};

/** 可搜尋的任務下拉,依資料夾分組 */
export const IncludeMissionSelect: FC<SelectProps> = ({
  groups,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onChange={onChange}
      options={groups.map((g) => ({
        label: g.folder,
        title: g.folder,
        options: g.missions.map((m) => ({ value: m.id, label: m.name })),
      }))}
      placeholder={t("utils.select")}
      style={{ width: "100%" }}
      showSearch={{
        filterOption: (input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase()),
      }}
      notFoundContent={<Hint>{t("setting_v2.mission.include_empty")}</Hint>}
    />
  );
};
