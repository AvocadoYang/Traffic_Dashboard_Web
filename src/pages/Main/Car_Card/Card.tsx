import { InfoWrap } from "./components/InfoWrap";
import {
  RowOne,
  RowThread,
  RowSecond,
  CarTag,
  HiddenRow,
  DropDown,
  RowFourth,
  RowFifth,
  EmergencyIcon,
  MiR_Map_Status,
  MiR_Running_Status,
} from "./components/Lists";
import "./car_info.css";
import { useMemo, useState } from "react";
import { ConfigProvider, Popover, Modal, Button } from "antd";
import BtnGroup from "./components/BtnGroup";
import { useAtomValue, useSetAtom } from "jotai";
import {
  AmrCarSelectFilter,
  AmrFilterCarCard,
  darkMode,
  hintAmr,
} from "@/utils/gloable";
import { amrId2ColorRainbow } from "@/utils/utils";
import { useWarningId } from "@/sockets/useWarning";
import { useTranslation } from "react-i18next";
import React from "react";
import { JoystickAmrId } from "@/pages/Main/global/jotai";
import styled from "styled-components";
import { mq } from "@/styles/responsive";

const StatusRows = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;

  && > * {
    width: auto;
    flex: 1 1 auto;
    min-width: 5.5rem;
  }

  ${mq.web} {
    display: block;

    && > * {
      width: 100%;
      min-width: 0;
    }
  }
`;

const WarnBlock = styled.div`
  margin-top: 5px;
`;

const WarnInfoText = styled.p`
  color: red;
  font-size: 0.8em;
  font-weight: bold;
`;

const WarnSolutionText = styled.p`
  font-size: 0.8em;
  font-weight: bold;
`;

const WarnDivider = styled.hr`
  margin-bottom: 5px;
`;

const Card: React.FC<{ id: string }> = ({ id }) => {
  const [openHiddenRow, setOpenHiddenRow] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [openFullInfo, setOpenFullInfo] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const errorMessage = useWarningId()?.get(id);
  const setJoystickAmrId = useSetAtom(JoystickAmrId);

  const { t } = useTranslation();

  // hover 卡片時地圖AMR的提示
  const setHintAmr = useSetAtom(hintAmr);
  // select選單篩選顯示的 AMR 系列
  const selectedOption = useAtomValue(AmrCarSelectFilter);
  //點擊地圖AMR時篩選卡片
  const hintAmrId = useAtomValue(AmrFilterCarCard);

  const isDark = useAtomValue(darkMode);

  const handleCancel = () => {
    setOpenModal(false);
  };

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
      <ConfigProvider
        theme={{
          token: {
            colorBgElevated: "rgb(255, 255, 255)",
          },
          components: {
            Popover: {
              titleMinWidth: 110,
            },
          },
        }}
      >
        <Popover
          content={<BtnGroup amrId={id} />}
          trigger="click"
          open={isPopoverOpen}
          placement="rightTop"
          onOpenChange={(newOpen) => {
            setPopoverOpen(newOpen);
          }}
        >
          <InfoWrap
            className={`${hide ? "hide-car-info-wrap" : ""}`}
            randomcolor={amrId2ColorRainbow(id)}
            is_dark={isDark.toString()}
            is_warn={errorMessage?.length ? "true" : "false"}
            onMouseEnter={() => {
              setHintAmr(id);
            }}
            onMouseLeave={() => {
              setHintAmr("");
            }}
          >
            {errorMessage?.length ? (
              <EmergencyIcon
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenModal(true);
                }}
              >
                ⚠️
              </EmergencyIcon>
            ) : null}
            <DropDown
              color={amrId2ColorRainbow(id)}
              openFullInfo={openFullInfo}
              setOpenFullInfo={setOpenFullInfo}
            ></DropDown>
            <RowOne isDark={isDark} amrId={id}></RowOne>

            <RowSecond
              setOpenHiddenRow={setOpenHiddenRow}
              openHiddenRow={openHiddenRow}
              isDark={isDark}
              amrId={id}
            ></RowSecond>
            <HiddenRow
              openHiddenRow={openHiddenRow}
              isDark={isDark}
              amrId={id}
            ></HiddenRow>
            <StatusRows>
              { id.includes('mi') ? <MiR_Running_Status amrId={id} isDark={isDark}></MiR_Running_Status> : <></>}
              { id.includes('mi') ?<MiR_Map_Status amrId={id} isDark={isDark} ></MiR_Map_Status> :<RowFourth amrId={id} isDark={isDark}></RowFourth>}
              { id.includes('mi') ? <></> : <RowFifth amrId={id} isDark={isDark}></RowFifth>}
            </StatusRows>
            <CarTag openFullInfo={openFullInfo} amrId={id}></CarTag>
          </InfoWrap>
        </Popover>
      </ConfigProvider>
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
