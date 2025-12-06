import { ControlTwoTone, DeleteTwoTone, EditOutlined } from "@ant-design/icons";
import client from "@/api/axiosClient";
import { MTType } from "@/api/useMissionTitle";
import { Err } from "@/utils/responseErr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Flex,
  message,
  Popconfirm,
  Table,
  TableColumnsType,
  Tag,
} from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Mission_Title } from "./mission";

// Industrial Styled Components
const IndustrialTableContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  width: 100%;

  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
    padding: 16px;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
    color: #595959;
    padding: 16px;
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
  }
`;

const MissionName = styled.p`
  margin: 0;
  font-weight: 600;
  color: #262626;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RobotType = styled.p`
  margin: 0;
  padding: 4px 10px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TagWrapper = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const IndustrialTag = styled(Tag)`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 32px;
  padding: 0 16px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }
  }

  &.edit-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #1890ff;
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }

  &.control-btn {
    background: #f9f0ff;
    border: 1px solid #722ed1;
    color: #722ed1;

    &:hover {
      background: #722ed1;
      border-color: #722ed1;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(114, 46, 209, 0.3);
    }
  }

  .anticon {
    font-size: 14px;
  }
`;

const MissionTable: FC<{
  setEditMissionKey: React.Dispatch<React.SetStateAction<string>>;
  setOpenMissionModel: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMissionKey: string;
  setSelectedMissionKey: React.Dispatch<React.SetStateAction<string>>;
  setSelectedMissionCar: React.Dispatch<React.SetStateAction<string>>;
  setMissionName: React.Dispatch<React.SetStateAction<string>>;
  allMissionTitle: MTType;
}> = ({
  setEditMissionKey,
  setOpenMissionModel,
  setSelectedMissionKey,
  setSelectedMissionCar,
  allMissionTitle,
  setMissionName,
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();
  
  const deleteMutation = useMutation({
    mutationFn: (deleteId: string) => {
      return client.post(
        "api/setting/delete-mission-title",
        {
          id: deleteId,
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task"],
      });
      setSelectedMissionKey("");
      messageApi.success(t("utils.success"));
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleDelete = (key: string) => {
    deleteMutation.mutate(key);
  };

  const handleClick = async (record: Mission_Title) => {
    if (record.Robot_types) {
      setSelectedMissionCar(record.Robot_types.value);
    }
    setSelectedMissionKey(record.id);
    setMissionName(record.name);
    try {
      await queryClient.refetchQueries({ queryKey: ["all-relate-task"] });
    } catch (e) {
      console.log(e);
    }
  };

  const showModal = (key: string) => {
    setEditMissionKey(key);
    setOpenMissionModel(true);
    setSelectedMissionKey("");
  };

  const columns: TableColumnsType<Mission_Title> = [
    {
      title: t("mission.add_mission.name"),
      dataIndex: "name",
      key: "name",
      width: "25%",
      render: (text: string) => <MissionName>{text}</MissionName>,
      defaultSortOrder: "ascend",
    },
    {
      title: t("mission.add_mission.car"),
      dataIndex: "car_type",
      key: "car_type",
      width: "20%",
      render: (_, record) => {
        return <RobotType>{record.Robot_types?.name || "-"}</RobotType>;
      },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("mission.add_mission.tag"),
      dataIndex: "tag",
      key: "tag",
      width: "25%",
      render: (_, record) => {
        const tags = record.MissionTitleBridgeCategory?.map((c, idx) => (
          <IndustrialTag key={c.Category?.id || idx} color={c.Category?.color}>
            {c.Category?.tagName}
          </IndustrialTag>
        ));
        return <TagWrapper>{tags || <span style={{ color: "#8c8c8c" }}>-</span>}</TagWrapper>;
      },
    },
    {
      title: "ACTIONS",
      dataIndex: "operation",
      key: "operation",
      width: "30%",
      render: (_, record) => {
        return (
          <ActionButtonGroup>
            <Popconfirm
              title={t("utils.delete_warn") || "Sure to delete?"}
              onConfirm={() => handleDelete(record.id)}
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                size="small"
              >
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>

            <IndustrialButton
              className="edit-btn"
              onClick={() => showModal(record.id)}
              icon={<EditOutlined />}
              size="small"
            >
              {t("mission.add_mission.edit_info")}
            </IndustrialButton>

            <IndustrialButton
              className="control-btn"
              onClick={() => handleClick(record)}
              icon={<ControlTwoTone twoToneColor="#722ed1" />}
              size="small"
            >
              {t("mission.add_mission.edit_detail")}
            </IndustrialButton>
          </ActionButtonGroup>
        );
      },
    },
  ];

  return (
    <IndustrialTableContainer>
      {contextHolders}
      <Table
        bordered
        dataSource={allMissionTitle}
        columns={columns as []}
        rowKey={(record) => record.id}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `TOTAL: ${total} MISSIONS`,
        }}
      />
    </IndustrialTableContainer>
  );
};

export default MissionTable;