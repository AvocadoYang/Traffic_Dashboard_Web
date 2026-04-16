import React, { memo } from "react";
import style from "@/styles/Main/Car/CardWrap.module.scss";  
import Cards from "./Cards";
import TittleTools from "./TittleTools";

const CarCardWrap: React.FC = () => {
  return (
    <div className={style.container}>
      <TittleTools />
      <Cards />
    </div>
  );
};

export default memo(CarCardWrap);