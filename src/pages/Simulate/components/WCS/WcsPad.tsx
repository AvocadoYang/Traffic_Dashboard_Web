import { message, Tooltip } from "antd";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import WcsModal from "./WcsModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";

const FloatBtn = styled.div`
  position: absolute;
  z-index: 4;
  top: 18%;
  left: 20px;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
  width: 3em;
  height: 3em;
  padding: 1em 0em;
  justify-content: space-between;

  &:hover {
    opacity: 1;
  }
`;

const WcsPad: FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const editMutation = useMutation({
    mutationFn: (editValue: { locationId: string; isEnable: boolean }[]) =>
      client.post("api/peripherals/update-all-status", editValue),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["all-mock-conveyor-config"] }),
      ]);
      void messageApi.success("ok");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const showModal = () => {
    setIsOpen(true);
  };

  const handleOk = (updates: { locationId: string; isEnable: boolean }[]) => {
    editMutation.mutate(updates);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <>
      {contextHolder}
      <Tooltip title={t("sim.conveyor.title")} placement="right">
        <FloatBtn onClick={showModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M6 19H8V21H6V19M12 3L2 8V21H4V13H20V21H22V8L12 3M8 11H4V9H8V11M14 11H10V9H14V11M20 11H16V9H20V11M6 15H8V17H6V15M10 15H12V17H10V15M10 19H12V21H10V19M14 19H16V21H14V19Z" />
          </svg>
        </FloatBtn>
      </Tooltip>

      {isOpen ? (
        <WcsModal
          isOpen={isOpen}
          handleCancel={handleCancel}
          handleOk={handleOk}
        />
      ) : (
        []
      )}
    </>
  );
};

export default WcsPad;
