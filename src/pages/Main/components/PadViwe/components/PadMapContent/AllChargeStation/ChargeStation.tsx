import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import { Tooltip } from "antd";
import { useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

// 1. 定義 Styled Components 的 Props 型態
const SvgStyle = styled.svg<{
  $isDisable: boolean;
  $isAlive: boolean;
  $booker: string;
  translate_x: number;
  translate_y: number;
  scale: number;
  rotate: number;

  // 💡 新增連線狀態的 Transient Props
  $barOut: "0" | "1";
  $isMQTTConnect: boolean;
  $isStationCodeAlive: boolean;
  $isTCPConnect: boolean;
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.3s ease;
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};

  /* 💡 2. 根據四個連線狀態決定 Icon 顏色 */
  fill: ${({
    $barOut,
    $isMQTTConnect,
    $isStationCodeAlive,
    $isTCPConnect,
    $isAlive,
  }) => {
    // 檢查是否「所有通訊皆正常」且「barOut 為正常狀態 0」
    const isAllConnected =
      $isMQTTConnect && $isStationCodeAlive && $isTCPConnect && $barOut === "0";

    if (!isAllConnected) return "#ff4d4f"; // 🚨 任何一個斷線或異常，顯示警告紅
    return $isAlive ? "#52c41a" : "#3c8aff"; // ✅ 全正常時，有車活著給綠色，沒車給藍色
  }};

  /* 💡 3. 根據通訊狀態決定外框與陰影 */
  border: ${({
    $barOut,
    $isMQTTConnect,
    $isStationCodeAlive,
    $isTCPConnect,
    $isDisable,
  }) => {
    const isAllConnected =
      $isMQTTConnect && $isStationCodeAlive && $isTCPConnect && $barOut === "0";
    if (!isAllConnected) return "2px solid #ff4d4f"; // 異常紅框
    return $isDisable ? "2px solid #1890ff" : "1px dashed #727272";
  }};

  box-shadow: ${({
    $barOut,
    $isMQTTConnect,
    $isStationCodeAlive,
    $isTCPConnect,
    $isDisable,
  }) => {
    const isAllConnected =
      $isMQTTConnect && $isStationCodeAlive && $isTCPConnect && $barOut === "0";
    if (!isAllConnected) return "0 0 10px rgba(255, 77, 79, 0.5)"; // 異常紅光外暈
    return $isDisable ? "0 0 8px rgba(24, 144, 255, 0.3)" : "none";
  }};

  transform: ${(props) =>
    `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale}) rotate(${props.rotate}deg)`};

  /* 💡 4. 動態動畫：如果全部連線正常且有被預約 ($booker)，就閃爍綠光；如果異常就閃爍紅光 */
  ${({
    $booker,
    $isDisable,
    $barOut,
    $isMQTTConnect,
    $isStationCodeAlive,
    $isTCPConnect,
  }) => {
    const isAllConnected =
      $isMQTTConnect && $isStationCodeAlive && $isTCPConnect && $barOut === "0";

    if (!isAllConnected) {
      return `
        animation: errorPulse 1.5s infinite;
        @keyframes errorPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(255, 77, 79, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
        }
      `;
    }

    if ($booker && !$isDisable) {
      return `
        animation: pulse 2s infinite;
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(82, 196, 26, 0); }
          100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
        }
      `;
    }
    return "";
  }}

  &:hover {
    transform: ${(props) =>
      `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale * 1.1}) rotate(${props.rotate}deg)`};
    background-color: rgba(24, 144, 255, 0.1);
  }
`;

const ChargeStation: FC<{
  locationId: string;
  isAlive: boolean;
  isDisable: boolean;
  customName: string;
  booker: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;

  barOut: "0" | "1";
  isMQTTConnect: boolean;
  isStationCodeAlive: boolean;
  isTCPConnect: boolean;
}> = ({
  locationId,
  isAlive,
  booker,
  isDisable,
  customName,
  translateX,
  translateY,
  rotate,
  scale,
  // 💡 5. 修正：原本這裡漏了解構，必須把這四個屬性拿出來
  barOut,
  isMQTTConnect,
  isStationCodeAlive,
  isTCPConnect,
}) => {
  const setLoc = useSetAtom(OpenChargeStationModal);

  return (
    <Tooltip title={customName}>
      <SvgStyle
        $isAlive={isAlive}
        $isDisable={isDisable}
        $booker={booker}
        translate_x={translateX}
        translate_y={translateY}
        scale={scale}
        rotate={rotate}
        // 💡 6. 將 Props 傳遞進去給 styled-components 運用
        $barOut={barOut}
        $isMQTTConnect={isMQTTConnect}
        $isStationCodeAlive={isStationCodeAlive}
        $isTCPConnect={isTCPConnect}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        onClick={() => setLoc(locationId)}
      >
        <path d="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z" />
      </SvgStyle>
    </Tooltip>
  );
};

export default ChargeStation;
