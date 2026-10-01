import { InfoWrap } from "./components/InfoWrap";
import {
  CardHeader,
  Metrics,
  InfoRows,
  CarTag,
} from "./components/Lists";
import "./car_info.css";
import { useCallback, useMemo, useState } from "react";
import { Popover, Modal } from "antd";
import BtnGroup from "./components/BtnGroup";
import { useAtomValue, useSetAtom } from "jotai";
import {
  AmrCarSelectFilter,
  AmrFilterCarCard,
  hintAmr,
} from "@/utils/gloable";
import { amrId2ColorRainbow } from "@/utils/utils";
import { useWarningId } from "@/sockets/useWarning";
import { useTranslation } from "react-i18next";
import React from "react";
import styled from "styled-components";
import { carCardDensityAtom } from "./cardDensity";
import useIsWebMediaQuery from "@/hooks/useIsWebMediaQuery";

const WarnBlock = styled.div`
  margin-top: 5px;
`;

const WarnInfoText = styled.p`
  color: var(--c-danger);
  font-size: 0.8em;
  font-weight: bold;
`;

const WarnSolutionText = styled.p`
  font-size: 0.8em;
  font-weight: bold;
`;

const WarnDivider = styled.hr`
  margin-bottom: 5px;
  border: none;
  border-top: 1px solid var(--c-border);
`;

// 詳細模式下直接攤在卡片裡的異常清單,不用再點開對話框
const InlineWarnList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 10px 10px;
  padding: 6px 8px;
  border: 1px solid var(--c-danger);
  border-radius: 2px;
  background: var(--c-danger-soft);
  font-size: 11px;
  line-height: 1.5;
`;

const InlineWarnCode = styled.div`
  font-weight: 600;
  color: var(--c-danger);
`;

const InlineWarnText = styled.div`
  color: var(--c-text);
  overflow-wrap: anywhere;
`;

const InlineWarnSolution = styled.div`
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
`;

const MenuTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
`;

const MenuTitleSwatch = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 4px;
  height: 16px;
  border-radius: 1px;
  background: ${({ $color }) => $color};
`;

const MenuTitleSub = styled.span`
  font-size: 11px;
  font-weight: 400;
  color: var(--c-text-muted);
`;

const Card: React.FC<{ id: string }> = ({ id }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  // 單張卡片可以不管全域的排列方式,自己展開成詳細內容
  const [expanded, setExpanded] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const errorMessage = useWarningId()?.get(id);

  const { t } = useTranslation();

  // hover 卡片時地圖AMR的提示
  const setHintAmr = useSetAtom(hintAmr);
  // select選單篩選顯示的 AMR 系列
  const selectedOption = useAtomValue(AmrCarSelectFilter);
  //點擊地圖AMR時篩選卡片
  const hintAmrId = useAtomValue(AmrFilterCarCard);

  const density = useAtomValue(carCardDensityAtom);
  const view = expanded ? "detailed" : density;
  const color = amrId2ColorRainbow(id);
  const warnCount = errorMessage?.length ?? 0;
  // 桌機:選單用 Popover 貼在卡片旁邊。
  // 小螢幕:卡片在畫面最下面那排,Popover 會被擠到邊角,改成開在螢幕正中間的對話框。
  const isWeb = useIsWebMediaQuery();
  const menuTitle = (
    <MenuTitle>
      <MenuTitleSwatch $color={color} />
      {`${t("utils.num")} ${id.split("-")[id.split("-").length - 1]}`}
      <MenuTitleSub>{id}</MenuTitleSub>
    </MenuTitle>
  );

  const handleCancel = () => {
    setOpenModal(false);
  };
  const toggleExpand = useCallback(() => setExpanded((pre) => !pre), []);
  const openWarnModal = useCallback(() => setOpenModal(true), []);

  const hide = useMemo(() => {
    if (hintAmrId.size) {
      return !hintAmrId.has(id);
    }
    if (!selectedOption) return false;
    if (selectedOption?.length) {
      const filter = new Set(selectedOption.map((item) => item.value));
      const AMRCategory = id.split("-").slice(0, 3).join("-");
      return filter.has(AMRCategory) ? false : true;
    }
    return false;
  }, [selectedOption, hintAmrId]);

  return (
    <React.Fragment key={id}>
      <Popover
        title={menuTitle}
        content={<BtnGroup amrId={id} />}
        trigger="click"
        open={isWeb && isPopoverOpen}
        placement="rightTop"
        onOpenChange={(newOpen) => {
          setPopoverOpen(newOpen);
        }}
      >
        <InfoWrap
          className={`${hide ? "hide-car-info-wrap" : ""}`}
          $color={color}
          $warn={warnCount > 0}
          onMouseEnter={() => {
            setHintAmr(id);
          }}
          onMouseLeave={() => {
            setHintAmr("");
          }}
        >
          <CardHeader
            amrId={id}
            compact={view === "compact"}
            expanded={expanded}
            showExpand={density !== "detailed"}
            onToggleExpand={toggleExpand}
            warnCount={warnCount}
            onWarnClick={openWarnModal}
          />
          {view !== "compact" && (
            <>
              <Metrics amrId={id} />
              <InfoRows amrId={id} detailed={view === "detailed"} />
              <CarTag amrId={id} />
            </>
          )}
          {view === "detailed" && warnCount > 0 && (
            <InlineWarnList>
              {errorMessage?.map((warn) => (
                <div key={warn.warningId}>
                  <InlineWarnCode>{`${t("file.warning_list.error_code")}: ${warn.warningId}`}</InlineWarnCode>
                  <InlineWarnText>{warn.info}</InlineWarnText>
                  {warn.debug ? (
                    <InlineWarnSolution>{`${t("file.warning_list.solution")}: ${warn.debug}`}</InlineWarnSolution>
                  ) : null}
                </div>
              ))}
            </InlineWarnList>
          )}
        </InfoWrap>
      </Popover>
      <Modal
        title={menuTitle}
        open={!isWeb && isPopoverOpen}
        onCancel={() => setPopoverOpen(false)}
        footer={null}
        centered
        destroyOnHidden
        width="min(520px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70dvh", overflowY: "auto" } }}
      >
        <BtnGroup amrId={id} />
      </Modal>
      <Modal
        title={id}
        closable={{ "aria-label": "Custom Close Button" }}
        open={openModal}
        onCancel={handleCancel}
        footer={null}
        mask={false}
      >
        {errorMessage?.map((warn) => {
          return (
            <React.Fragment key={warn.warningId}>
              <h4>{`${t("file.warning_list.error_code")}: ${warn.warningId}`}</h4>
              <WarnBlock>
                <h5>{`${t("file.warning_list.info")}- `}</h5>
                <WarnInfoText>{warn.info}</WarnInfoText>
              </WarnBlock>
              <WarnBlock>
                <h5>{`${t("file.warning_list.solution")}- `}</h5>
                <WarnSolutionText>
                  {warn.debug ? warn.debug : "---"}
                </WarnSolutionText>
              </WarnBlock>
              <WarnDivider />
            </React.Fragment>
          );
        })}
      </Modal>
    </React.Fragment>
  );
};

export default Card;
