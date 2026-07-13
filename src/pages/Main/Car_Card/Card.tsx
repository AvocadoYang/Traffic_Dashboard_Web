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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Subject } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { ConfigProvider, Popover, Modal, Button } from "antd";
import type { JoystickValue } from "./components/Joystick";
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
import Joystick from "./components/Joystick";
import { io } from "@/sockets/socketConnect";
import React from "react";

/** 後端 socket.io 監聽搖桿指令的事件名稱（依後端實際名稱調整）。 */
const JOYSTICK_EMIT_EVENT = "set-joystick-vel";
/** ROS Bridge 要發布的 topic 名稱。 */
const JOYSTICK_TOPIC = "/joystick_vel";
/** 最大線速度（前後），單位 m/s，依實車調整。 */
const MAX_LINEAR = 0.4;
/** 最大角速度（轉向），單位 rad/s，依實車調整。 */
const MAX_ANGULAR = 0.8;

const Card: React.FC<{ id: string }> = ({ id }) => {
  const [openHiddenRow, setOpenHiddenRow] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [openFullInfo, setOpenFullInfo] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [openJoystick, setOpenJoystick] = useState(false);
  const errorMessage = useWarningId()?.get(id);

  const { t } = useTranslation();

  // hover 卡片時地圖AMR的提示
  const setHintAmr = useSetAtom(hintAmr);
  // select選單篩選顯示的 AMR 系列
  const selectedOption = useAtomValue(AmrCarSelectFilter);
  //點擊地圖AMR時篩選卡片
  const hintAmrId = useAtomValue(AmrFilterCarCard);

  const isDark = useAtomValue(darkMode);

  // Joystick 移動事件的來源 stream，整個元件生命週期共用同一個 Subject。
  const joystickMove$ = useRef(new Subject<JoystickValue>()).current;

  // 每次發布遞增的序號，用來組出 rosbridge 的 id（publish:<topic>:<seq>）。
  const publishSeq = useRef(0);

  // 實際把搖桿座標送出的地方（移動節流後、放開歸零都會呼叫）。
  const sendJoystickValue = useCallback(
    (value: JoystickValue) => {
      // 搖桿座標（-100~100）換算成 ROS Twist 速度。
      const payload = {
        op: "publish",
        id: `publish:${JOYSTICK_TOPIC}:${(publishSeq.current += 1)}`,
        topic: JOYSTICK_TOPIC,
        msg: {
          joystick_token: "",
          speed_command: {
            // linear.x：前後速度。搖桿上推（y 正）為前進。
            linear: { x: (value.y / 100) * MAX_LINEAR, y: 0, z: 0 },
            // angular.z：轉向角速度。ROS 慣例正值＝左轉（逆時針），
            // 搖桿右推（x 正）＝右轉，故取負號；若方向相反把負號拿掉即可。
            angular: { x: 0, y: 0, z: -(value.x / 100) * MAX_ANGULAR },
          },
        },
        latch: false,
      };

      // 帶上車輛 id，讓後端知道要路由到哪一台。
      io.emit(JOYSTICK_EMIT_EVENT, { amrId: id, payload });
    },
    [id]
  );

  // 訂閱搖桿移動，透過 throttleTime 限制成每 100ms 最多處理一次。
  useEffect(() => {
    const subscription = joystickMove$
      .pipe(throttleTime(100, undefined, { leading: true, trailing: true }))
      .subscribe(sendJoystickValue);

    return () => subscription.unsubscribe();
  }, [joystickMove$, sendJoystickValue]);

  // 放開搖桿：不經節流，立即送出歸零值，確保車輛馬上停止。
  const handleJoystickEnd = () => {
    sendJoystickValue({ x: 0, y: 0 });
  };

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
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpenJoystick(true);
              }}
            >
              Joystick
            </Button>
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
      <Modal
        title={`${id} - Joystick`}
        open={openJoystick}
        onCancel={() => setOpenJoystick(false)}
        footer={null}
        centered
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "20px 0",
          }}
        >
          <Joystick
            size={200}
            stickSize={80}
            baseColor="#ccc"
            stickColor="#888"
            onMove={(value) => joystickMove$.next(value)}
            onEnd={handleJoystickEnd}
          />
        </div>
      </Modal>
    </React.Fragment>
  );
};

export default Card;
