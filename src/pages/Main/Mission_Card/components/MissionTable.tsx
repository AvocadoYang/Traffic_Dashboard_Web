import {
  Additional_Mission_Info,
  MissionInfo,
  useMissions,
} from "../../../../sockets/useMissions";
import {
  TableColumnsType,
  Table,
  Spin,
  ConfigProvider,
  Button,
  Flex,
} from "antd";
import { memo, useEffect, useState } from "react";
import "../mission_info.css";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { translate } from "@/i18n";
import { darkMode } from "@/utils/gloable";
import { useAtomValue } from "jotai";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import useName from "@/api/useAmrName";
import MissionHistory from "./MissionHistory";

const MISSION_SORT = [
  "executing",
  "assigned",
  "pending",
  "completed",
  "aborting",
  "canceled",
];

const TaskInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 6px;
  transition: background 0.3s ease;
`;

const TaskTitle = styled.div`
  font-size: 1.1em;
  font-weight: 600;
  color: #1f2a44;
  margin-bottom: 4px;
`;

const SubTitle = styled.div`
  font-size: 0.9em;
  color: #595959;
  display: flex;
  align-items: center;
  gap: 6px;
  &::before {
    content: "→";
    color: #1890ff;
    font-weight: bold;
  }
`;

const BtnWrapper = styled.div`
  width: 100%;
  padding: 0 1em;
`;

type SelectMissionT = {
  amrId?: string; // 有些選到的任務也許還沒指派到amr
  taskId?: string;
  missionId?: string;
  status?: string;
};

const MissionTable = () => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const { data: name } = useName();
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectInfo, setSelectInfo] = useState<MissionInfo[]>([]);
  const { missions } = useMissions();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 767);
  const [, setWindowHeight] = useState(window.innerHeight);
  const [isOpenMissionHistory, setIsOpenMissionHistory] = useState(false);

  const openHistory = () => {
    setIsOpenMissionHistory(true);
  };

  useEffect(() => {
    const updateHeight = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", updateHeight);

    // 確保初始設定正確
    updateHeight();

    return () => window.removeEventListener("resize", updateHeight);
  }, [isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 767);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns: TableColumnsType<MissionInfo> = [
    {
      title: "AMR",
      dataIndex: "amrId",
      key: "amrId",
      render: (code: string) =>
        code ? code.replace("amr-0", "#") : t("main_task_list.wait_suitable"),
      filters: (() => {
        return name?.amrs.map((amrInfo) => ({
          text: `${amrInfo.amrId}`,
          value: `${amrInfo.amrId}`,
        }));
      })(),
      onFilter: (value, record) => {
        return record.amrId === value;
      },
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "missionStatus",
      filters: (() => {
        return MISSION_SORT.map((state) => ({
          text: `${translate("normal", state)}`,
          value: `${translate("normal", state)}`,
        }));
      })(),
      onFilter: (value, record) => {
        // console.log(record);
        return record.missionStatus === value;
      },
      key: "missionStatus",
    },

    {
      title: t("toolbar.mission.mission"),
      dataIndex: "taskInfo",
      key: "taskInfo",
      render: (_value, record: MissionInfo) => {
        if (typeof record.info === "string") {
          const parseData = JSON.parse(record.info) as Additional_Mission_Info;
          const fullName =
            parseData.missionFullName === null
              ? "-"
              : parseData.missionFullName;
          // const from = parseData.loadLocationId === null ? '' : parseData.loadLocationId;
          // const to = parseData.offloadLocationId === null ? '' : parseData.offloadLocationId;

          return (
            <TaskInfo>
              <TaskTitle>
                {typeof fullName === "string"
                  ? "-"
                  : fullName?.join(" - ") || "-"}
              </TaskTitle>
              <SubTitle>{record.sub_name}</SubTitle>
            </TaskInfo>
          );
        }
        return <span>-</span>;
      },
    },
    {
      title: t("utils.cost_time"),
      dataIndex: "totalTime",
      key: "totalTime",
    },
  ].filter((item) => {
    if (!isMobile) return true;
    return item.key !== "taskInfo";
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKey: React.Key[], selectedRows: MissionInfo[]) => {
      setSelectInfo(selectedRows);
      setSelectedRowKeys(selectedRowKey);
    },
    getCheckboxProps: (record: MissionInfo) => ({
      disabled: record.amrId === "Disabled User", // Column configuration not to be checked
    }),
  };
  const deleteMissionMutation = useMutation({
    mutationFn: (deleteList: SelectMissionT[]) => {
      return client.post(
        "/api/missions/delete-mission",
        {
          selectedMission: deleteList,
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: () => {
      setSelectedRowKeys([]);
      setSelectInfo([]);
    },
  });

  const handleDeleteMission = () => {
    if (selectInfo.length === 0) return;

    const convertArr = selectInfo
      .filter((v) => v.missionId !== null)
      .map((v) => ({
        amrId: v.amrId,
        missionId: v.missionId,
        status: v.missionStatus,
      }));

    deleteMissionMutation.mutate(convertArr);
  };

  if (!missions || !name?.amrs)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "100%",
        }}
      >
        <Spin size="large" />
      </div>
    );
  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            rowHoverBg: isDark ? "#313131" : "#fafafa",
          },
        },
      }}
    >
      <MissionHistory
        isOpenMissionHistory={isOpenMissionHistory}
        setIsOpenMissionHistory={setIsOpenMissionHistory}
      />

      <BtnWrapper>
        <Flex gap="middle" align="flex-start">
          <Button
            onClick={() => {
              handleDeleteMission();
            }}
            disabled={!selectInfo.length}
            loading={deleteMissionMutation.isLoading}
            color="danger"
            variant="filled"
          >
            {t("utils.delete")}
          </Button>
          <Button
            onClick={() => {
              openHistory();
            }}
            variant="filled"
          >
            {t("mission_history.open")}
          </Button>
        </Flex>
      </BtnWrapper>

      <Table
        columns={columns}
        style={{ width: "100%" }}
        className={`custom-table ${isDark ? "custom-table-dark" : ""}`}
        rowSelection={{
          type: selectionType,
          ...rowSelection,
        }}
        dataSource={
          missions
            .sort((a, b) => {
              const isCompleteA = a.missionStatus === "completed";
              const isCompleteB = b.missionStatus === "completed";
              const typeDiff =
                MISSION_SORT.indexOf(a.missionStatus as string) -
                MISSION_SORT.indexOf(b.missionStatus as string);
              if (typeDiff !== 0) return typeDiff;
              if (isCompleteA && isCompleteB) {
                return b.createdAt.getTime() - a.createdAt.getTime();
              }

              if (!isCompleteA && !isCompleteB) {
                return a.order - b.order;
              }

              return (
                MISSION_SORT.indexOf(a.missionStatus) -
                MISSION_SORT.indexOf(b.missionStatus)
              );
            })
            .map((m) => ({
              ...m,
              missionStatus: translate("normal", m.missionStatus) || "",
              missionType: translate("normal", m.missionType) || "",
              manualMode: m.manualMode ? t("utils.yes") : t("utils.no"),
              emergencyBtn: m.emergencyBtn ? t("utils.yes") : t("utils.no"),
              recoveryBtn: m.recoveryBtn ? t("utils.yes") : t("utils.no"),

              totalTime:
                m.completedAt && m.createdAt
                  ? Math.round(
                      (m.completedAt.getTime() -
                        (m.startedAt?.getTime() || 0)) /
                        6000,
                    ) / 10
                  : "",
            })) as []
        }
      />
    </ConfigProvider>
  );
};

export default memo(MissionTable);
