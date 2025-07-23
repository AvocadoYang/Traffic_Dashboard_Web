import { Modal } from "antd";
import { Dispatch, FC, SetStateAction } from "react";

const InsertModal: FC<{
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  handleClose: () => void;
}> = ({ isOpen, setIsOpen, handleClose }) => {
  return (
    <>
      {isOpen ? (
        <Modal open={isOpen} onCancel={handleClose}>
          asda
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default InsertModal;
