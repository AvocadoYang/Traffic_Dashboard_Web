import { Button, Modal, Tag, message } from "antd";
import { CrownOutlined, WarningOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useHaStatus from "@/api/useHaStatus";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const takeOver = (role: "MASTER" | "BACKUP") =>
  client.post("/api/ha/take-over", { role });

const HaStatusWidget: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data } = useHaStatus();

  const takeOverMutation = useMutation({
    mutationFn: takeOver,
    onSuccess: (res) => {
      const { role, peerNotified, peerNotifyError } = res.data as {
        role: "MASTER" | "BACKUP";
        peerNotified?: boolean;
        peerNotifyError?: string;
      };

      // peerNotified 只有在切成 MASTER 時才有意義（arbiter 只有升級時才會
      // 去通知對方降級）；如果通知失敗，代表對方可能還沒被降級成 BACKUP，
      // 要提醒操作者自己去確認，不然可能會兩邊同時是 MASTER。
      if (role === "MASTER" && peerNotified === false) {
        messageApi.warning(
          `已接手，但無法通知對方降級為 BACKUP（${
            peerNotifyError || "原因不明"
          }），請自行確認對方目前的狀態，避免兩邊同時是 MASTER`,
          8,
        );
      } else {
        messageApi.success("已送出切換指令");
      }
      queryClient.invalidateQueries(["ha-status"]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 沒開 REDUNDANCY 或還沒拿到資料就先不畫，避免沒用到 HA 的場站也在首頁看到這塊
  if (!data?.redundancy) return null;

  const isMaster = data.role === "MASTER";
  const arbiterUnreachable = !data.arbiter;
  const peerHaDown = data.arbiter ? !data.arbiter.other.ha : false;

  const confirmTakeOver = (role: "MASTER" | "BACKUP") => {
    const toMaster = role === "MASTER";
    Modal.confirm({
      title: toMaster ? "確定要接手任務嗎？" : "確定要釋放主控權嗎？",
      icon: <WarningOutlined />,
      content: toMaster ? (
        <div>
          <p>請先確認「另一台主機」真的已經停機或斷線，不是只是連不到而已。</p>
          <p>
            如果另一台其實還活著、也還在對車輛下指令，兩邊同時是
            MASTER會導致同一台車同時收到互相衝突的任務。
          </p>
        </div>
      ) : (
        <p>釋放後這台主機會停止派發任務，請確認已經有另一台準備好接手。</p>
      ),
      okText: "確定",
      cancelText: "取消",
      onOk: () => takeOverMutation.mutate(role),
    });
  };

  return (
    <Wrap>
      {contextHolder}
      <Tag
        icon={isMaster ? <CrownOutlined /> : undefined}
        color={isMaster ? "green" : "default"}
      >
        {isMaster ? "MASTER" : "BACKUP"}
      </Tag>

      {arbiterUnreachable ? (
        <Tag icon={<WarningOutlined />} color="error">
          {data.arbiterError || "本機 HA 服務連不到"}
        </Tag>
      ) : peerHaDown ? (
        <Tag icon={<WarningOutlined />} color="warning">
          對方主機斷線
        </Tag>
      ) : (
        <Tag color="success">對方連線正常</Tag>
      )}

      {isMaster ? (
        <Button
          size="small"
          danger
          loading={takeOverMutation.isLoading}
          onClick={() => confirmTakeOver("BACKUP")}
        >
          釋放主控
        </Button>
      ) : (
        <Button
          size="small"
          type="primary"
          loading={takeOverMutation.isLoading}
          onClick={() => confirmTakeOver("MASTER")}
        >
          接手任務
        </Button>
      )}
    </Wrap>
  );
};

export default HaStatusWidget;
