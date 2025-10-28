import React from "react";
import { Button, message, Popover, Space, Tag, Tooltip } from "antd";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

const MissionBtnWrap = styled.div`
  position: absolute;
  z-index: 4;
  top: 140px;
  left: 16px;
  background-color: rgba(255, 255, 255, 0.01);
  border-radius: 8px;
  padding: 8px;
  opacity: 1;
  transition: all 0.3s ease-in-out;
  background-color: "#b41313";
  width: "50px";
  height: "50px";
  overflow: hidden;
  display: flex;
  align-items: center;
`;

const TestBarcode: React.FC = () => {
  const [messageApi, contextHolders] = message.useMessage();

  const barcodeMutation = useMutation({
    mutationFn: () => {
      return client.post("api/peripherals/barcode");
    },
    onSuccess: () => {
      void messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleBarcode = () => {
    barcodeMutation.mutate();
  };

  return (
    <>
      {contextHolders}
      <MissionBtnWrap>
        <Tooltip placement="right" title="show elevator io">
          <Button onClick={handleBarcode}>test barcode</Button>
        </Tooltip>
      </MissionBtnWrap>
    </>
  );
};

export default TestBarcode;
