import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { viewBtn, ViewBtn } from "@/jotai.ts";

type DeviceType = "mobile" | "tablet" | "desktop";

  const getDeviceType = (width: number): DeviceType => {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export const useIsMobile = () => {
  const setOpenEditLocationPanel = useSetAtom(viewBtn);
  const [deviceType, setDeviceType] = useState<DeviceType>(
    getDeviceType(window.innerWidth)
  );

  useEffect(() => {
    setOpenEditLocationPanel(ViewBtn.missionView);

    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    deviceType,
  };
};