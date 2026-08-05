import { memo } from "react";
import { Button } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  OpenAssignMission,
  OpenAutoMission,
  OpenQuickMission,
} from "@/pages/Main/global/jotai";
import { darkMode } from "@/utils/gloable";
import { AutoMission, DialogMission, QuickMission } from "../../missionModal";

const DispatchContainer = styled.div<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  border-radius: 4px;
`;

const DispatchGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
`;

const DispatchButton = styled(Button)`
  && {
    flex: 1 1 10rem;
    min-width: 8rem;
    height: 5rem;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
`;

const MissionDispatchPanel = () => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const setOpenQuickMission = useSetAtom(OpenQuickMission);
  const setOpenAutoMission = useSetAtom(OpenAutoMission);
  const setOpenAssignMission = useSetAtom(OpenAssignMission);

  return (
    <DispatchContainer $isDark={isDark}>
      <DispatchGrid>
        <DispatchButton
          type="default"
          variant="filled"
          onClick={() => setOpenQuickMission(true)}
        >
          {t("main.card_name.quick_mission")}
        </DispatchButton>
        <DispatchButton
          type="default"
          variant="filled"
          onClick={() => setOpenAutoMission(true)}
        >
          {t("main.card_name.auto_mission")}
        </DispatchButton>
        <DispatchButton
          type="default"
          variant="filled"
          onClick={() => setOpenAssignMission(true)}
        >
          {t("main.card_name.new_mission")}
        </DispatchButton>
      </DispatchGrid>

      <QuickMission></QuickMission>
      <AutoMission></AutoMission>
      <DialogMission></DialogMission>
    </DispatchContainer>
  );
};

export default memo(MissionDispatchPanel);
