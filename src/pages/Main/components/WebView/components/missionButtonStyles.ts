import { css } from "styled-components";

/**
 * 任務按鈕的共用配色（MissionBtn / MissionDispatchPanel）。
 * 依 className 套用：quick-mission / cycle-mission / new-mission / upload-mission。
 * 尺寸、字級由各自的 styled component 決定。
 */
export const missionAccentStyles = css`
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: transparent;
    transition: width 0.3s;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &.quick-mission {
    border-color: #faad14;
    color: #af7603;
    background: #fffbe6;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(250, 173, 20, 0.1));
    }
    &:hover {
      background: #fff1b8;
      color: #fa8c16;
      box-shadow: 0 2px 12px rgba(250, 173, 20, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.new-mission {
    border-color: #1890ff;
    color: #1890ff;
    background: #e6f7ff;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(24, 144, 255, 0.1));
    }
    &:hover {
      background: #bae7ff;
      color: #096dd9;
      box-shadow: 0 2px 12px rgba(24, 144, 255, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.cycle-mission {
    border-color: #52c41a;
    color: #327411;
    background: #f6ffed;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(82, 196, 26, 0.1));
    }
    &:hover {
      background: #d9f7be;
      border-color: #52c41a;
      color: #389e0d;
      box-shadow: 0 2px 12px rgba(82, 196, 26, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.upload-mission {
    border-color: #722ed1;
    color: #722ed1;
    background: #f9f0ff;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(114, 46, 209, 0.1));
    }
    &:hover {
      background: #efdbff;
      border-color: #722ed1;
      color: #531dab;
      box-shadow: 0 2px 12px rgba(114, 46, 209, 0.3);
      &::before {
        width: 100%;
      }
    }
  }
`;
