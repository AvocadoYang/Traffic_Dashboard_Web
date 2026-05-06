import useSimulateScript from "@/api/useSimulateScript";
import { Typography } from "antd";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const FloatTitle = styled.div<{ $isMobile: boolean }>`
  position: fixed;
  left: 2em;
  z-index: 1000;
  top: ${(props) => (props.$isMobile ? "unset" : "6em")};
  bottom: ${(props) => (props.$isMobile ? "2em" : "unset")};
`;

const MapTitle: FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const { t } = useTranslation();
  const { data } = useSimulateScript();

  return (
    <>
      <FloatTitle $isMobile={isMobile}>
        <Typography.Text type="secondary">
          {t("sim.modal.current")}：{data?.name}
        </Typography.Text>
      </FloatTitle>
    </>
  );
};

export default memo(MapTitle, (prev, next) => prev !== next);
