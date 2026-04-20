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
} from "./components/Lists";
import "./car_info.css";
import { useMemo, useState } from "react";
import { ConfigProvider, Popover, Modal } from "antd";
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

const Card: React.FC<{ id: string }> = ({ id }) => {
  const [openHiddenRow, setOpenHiddenRow] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [openFullInfo, setOpenFullInfo] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const errorMessage = useWarningId()?.get(id);

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
            <RowThread amrId={id} isDark={isDark}></RowThread>
            <RowFourth amrId={id} isDark={isDark}></RowFourth>
            <RowFifth amrId={id} isDark={isDark}></RowFifth>
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
              <div style={{ marginTop: "5px" }}>
                <h5>{`${t("file.warning_list.info")}- `}</h5>
                <p
                  style={{
                    color: "red",
                    fontSize: "0.8em",
                    fontWeight: "bold",
                  }}
                >
                  {warn.info}
                </p>
              </div>
              <div style={{ marginTop: "5px" }}>
                <h5>{`${t("file.warning_list.solution")}- `}</h5>
                <p style={{ fontSize: "0.8em", fontWeight: "bold" }}>
                  {warn.debug ? warn.debug : "---"}
                </p>
              </div>
              <hr style={{ marginBottom: "5px" }} />
            </React.Fragment>
          );
        })}
      </Modal>
    </React.Fragment>
  );
};

export default Card;
