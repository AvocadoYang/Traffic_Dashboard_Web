import { memo } from "react";
import "../../style.css";
import { RollbackOutlined } from "@ant-design/icons";
import CarCardWrap from "../../../../../../components/Main/Car/CardWrap";
import { useSetAtom } from "jotai";
import { OpenCarCardInfo } from "@/jotai.ts";

const CarList = () => {
  const setOpenCarCardInfo = useSetAtom(OpenCarCardInfo);
  return (
    <div className="car-and-mission-wrap">
      <RollbackOutlined
        className="rollback-icon"
        onClick={() => setOpenCarCardInfo(false)}
      />
      <CarCardWrap></CarCardWrap>
    </div>
  );
};

export default memo(CarList);
