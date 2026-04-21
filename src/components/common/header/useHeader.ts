import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { AmrFilterCarCard } from "@/utils/gloable";
import { useMockInfo } from "@/sockets/useMockInfo";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { jwtDecode } from "jwt-decode";
import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import dayjs from "dayjs";

const getUsername = (): string => {
  try {
    const token = localStorage.getItem("token");
    return token ? jwtDecode<{ username: string }>(token).username : "";
  } catch {
    return "";
  }
};

export const useHeader = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [hintAmrId, setHintAmrId] = useAtom(AmrFilterCarCard);
  const script = useMockInfo();
  const { refetch: amrNameRefetch } = useName();

  const [canSim, setCanSim] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);

  const simMutation = useMutation({
    mutationFn: (data: {
      isSimulate: boolean;
      startTime: string;
      endTime: string;
      runningScale: number;
      activeStationTask: boolean;
    }) => client.post("api/simulate/simulate", data),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      amrNameRefetch();
      setIsSimulateOpen(false);
      if (!hintAmrId.size) return;
      setHintAmrId(pre => { pre.clear(); return new Set([...pre]); });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSim = (
    timeRange: [dayjs.Dayjs, dayjs.Dayjs],
    activeStationTask: boolean,
    runningScale: number
  ) => {
    simMutation.mutate({
      isSimulate: true,
      startTime: timeRange[0].format("HH:mm"),
      endTime: timeRange[1].format("HH:mm"),
      runningScale,
      activeStationTask,
    });
  };

  const handleAbortSim = () => {
    simMutation.mutate({
      isSimulate: false,
      startTime: "00:00",
      endTime: "00:00",
      runningScale: 1,
      activeStationTask: false,
    });
  };

  const handleMenuClick = (e: { key: string }) => {
    const routes: Record<string, string> = {
      "1": "/", "2": "/amr", "3": "/cargo-history",
      "4": "/setting", "5": "/simulate",
      "6": "/simulate-result", "7": "/records",
    };
    if (routes[e.key]) navigate(routes[e.key]);
  };

  const handleLanguageChange = (value: string) => {
    void i18n.changeLanguage(value === "en" ? "en" : "tw");
  };

  const handleUserMenuClick = (e: { key: string }) => {
    switch (e.key) {
      case "2":
        localStorage.removeItem("token");
        navigate("/login");
        break;
      case "3": setOpenChangePassword(true); break;
      case "4": setOpenCreateUser(true); break;
    }
  };

  useEffect(() => {
    if (!script) return;
    const inUseAmr = script.robot?.filter(
      v => v.script_placement_location !== "unset"
    );
    setCanSim((inUseAmr?.length ?? 0) !== 0);
  }, [script]);

  return {
    t, navigate, location, contextHolder, script,
    username: getUsername(),
    canSim,
    isSimulateOpen, setIsSimulateOpen,
    drawerOpen, setDrawerOpen,
    openChangePassword, setOpenChangePassword,
    openCreateUser, setOpenCreateUser,
    handleSim, handleAbortSim,
    handleMenuClick, handleLanguageChange, handleUserMenuClick,
  };
};