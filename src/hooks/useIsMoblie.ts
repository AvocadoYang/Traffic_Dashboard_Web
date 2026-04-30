import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { viewBtn, ViewBtn } from "@/jotai.ts";

export const useIsMobile = () => {
  const setOpenEditLocationPanel = useSetAtom(viewBtn);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 767);
  const [, setWindowHeight] = useState(window.innerHeight);
  useEffect(() => {
    const updateHeight = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", updateHeight);

    // 確保初始設定正確
    updateHeight();

    return () => window.removeEventListener("resize", updateHeight);
  }, [isMobile]);

  useEffect(() => {
    setOpenEditLocationPanel(ViewBtn.missionView);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 767);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile,
  };
};
