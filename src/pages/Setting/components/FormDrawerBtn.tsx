import styled from "styled-components";
import { LeftOutlined } from "@ant-design/icons";
import "./compont.css";

import { useAtom } from "jotai";
import { SideSwitchToShowForm } from "@/utils/siderGloble";

const BtnWrap = styled.div`
  position: absolute;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  background-color: #2d7df6;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9;
  box-shadow: 3px 3px 15px rgba(0, 0, 0, 0.2);
  z-index: 4;
  top: 70px;
  right: 30px;
  transition: 0.2s;

  &:hover {
    transform: scale(1.15);
    transform-origin: center;
  }
`;

const FormDrawerBtn = () => {
  const [sideSwitchToShowForm, setSideSwitchToShowForm] =
    useAtom(SideSwitchToShowForm);
  return (
    <>
      {!sideSwitchToShowForm ? (
        <BtnWrap
          onClick={() => {
            setSideSwitchToShowForm(true);
          }}
        >
          <LeftOutlined className="open-form-drawer-btn" />
        </BtnWrap>
      ) : null}
    </>
  );
};

export default FormDrawerBtn;
