import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, Select, message } from "antd"; // Import Flex
import { FC, useMemo } from "react";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

// --- (Styled Components remain the same) ---

const FormContainer = styled.div`
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 20px;
  border-left: 4px solid #722ed1;
`;

const SectionHeader = styled.div`
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  border-left: 3px solid #722ed1;
  padding: 8px 12px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #722ed1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 16px;
  }

  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

const IndustrialSelect = styled(Select)`
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    height: 40px !important;
    border: 1px solid #d9d9d9 !important;
    border-radius: 0 !important;
    font-size: 12px;
    display: flex;
    align-items: center;

    &:hover {
      border-color: #9254de !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #722ed1 !important;
    box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.2) !important;
  }
`;

const IndustrialButton1 = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  background: #2ed1b9;
  border-color: #2ed182;
  color: #ffffff;

  &:hover {
    background: #54de92;
    border-color: #54de72;
    box-shadow: 0 2px 8px rgba(46, 144, 209, 0.4);
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  background: #722ed1;
  border-color: #722ed1;
  color: #ffffff;

  &:hover {
    background: #9254de;
    border-color: #9254de;
    box-shadow: 0 2px 8px rgba(114, 46, 209, 0.4);
  }
`;

// --- (Component Logic remains the same) ---

type DataType = { amrId: string[]; missionId: string };

const BeforeLeftChargeStationForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  // Destructure isFetching to show loading state on button
  const {
    data: missionTitle,
    refetch: rMission,
    isFetching,
  } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: name, refetch: rName } = useName();

  const AmrOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      return name?.amrs.map((m) => ({
        label: `${m.amrId} ${m.isReal ? [] : t("simulate")}`,
        value: m.amrId,
      }));
    }, [name, t]);

  const addMutation = useMutation({
    mutationFn: (payload: DataType) => {
      return client.post("api/setting/add-BLCS", payload);
    },
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({
        queryKey: ["BLCS"],
      });
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const missionOptions = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "normal-mission",
      ),
    )
    .map((v) => {
      return {
        value: v.id,
        label: v.name,
      };
    });

  const handleAdd = () => {
    const payload = form.getFieldsValue() as DataType;
    console.log(payload);
    if (
      !Array.isArray(payload.amrId) ||
      payload.amrId.length === 0 ||
      !payload.missionId ||
      typeof payload.missionId !== "string"
    ) {
      void messageApi.warning(
        t("mission.before_left_charge_station_mission.field_required"),
      );
      return;
    }

    addMutation.mutate(payload);
  };

  const reload = () => {
    rMission();
    rName();
  };

  return (
    <>
      {contextHolder}
      <FormContainer>
        <SectionHeader>
          <PlusOutlined />
          Add New Configuration
        </SectionHeader>
        <StyledForm
          onFinish={handleAdd}
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          autoComplete="off"
        >
          {/* AMR Selection Field */}
          <Form.Item
            label={t("mission.before_left_charge_station_mission.car")}
            name="amrId"
            rules={[{ required: true, message: "Please select AMRs" }]}
          >
            <IndustrialSelect
              options={AmrOption}
              mode="multiple"
              placeholder="Select AMRs"
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          </Form.Item>

          {/* Mission Selection Field - Wrapped in a Flex container with the refetch button */}
          <Form.Item
            label={t("mission.before_left_charge_station_mission.mission")}
            name="missionId"
            rules={[{ required: true, message: "Please select a mission" }]}
          >
            <IndustrialSelect
              options={missionOptions}
              placeholder="Select mission"
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <IndustrialButton1
              icon={<ReloadOutlined />}
              block
              onClick={() => reload()}
            >
              {t("utils.reload")}
            </IndustrialButton1>
          </Form.Item>

          {/* Submission Button */}
          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <IndustrialButton
              icon={<PlusOutlined />}
              htmlType="submit"
              loading={addMutation.isPending}
              block
            >
              {t("utils.add")}
            </IndustrialButton>
          </Form.Item>
        </StyledForm>
      </FormContainer>
    </>
  );
};

export default BeforeLeftChargeStationForm;
