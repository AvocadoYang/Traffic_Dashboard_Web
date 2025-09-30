import { SingleChargeStation } from "@/api/useAllCharge";
import FormHr from "@/pages/Setting/utils/FormHr";
import { PeripheralEditData, IsEditPeripheralStyle } from "@/utils/gloable";
import { Button, Drawer, Flex, Select, Table } from "antd";
import { useAtom, useSetAtom } from "jotai";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingStyleForm from "./SettingStyleForm";
import { FormatPainterOutlined } from "@ant-design/icons";
import usePeripheralStyle from "@/api/usePeripheralStyle";
import SettingMultiStyleForm from "./SettingMultiStyleForm";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  width: 100%;
  transition: all 0.3s ease;
`;

const Panel = styled.div<{ width: string; hidden?: boolean }>`
  width: ${(p) => p.width};
  transition: all 0.3s ease;
  overflow: hidden;
  ${(p) => p.hidden && `visibility: hidden; height: 0;`}
`;

const EditPeripheralIcon: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const setSelectStation = useSetAtom(PeripheralEditData);
  const [isEditStation, setIsEditStation] = useAtom(IsEditPeripheralStyle);
  const [filterType, setFilterType] = useState<string | null>(null);
  const { data } = usePeripheralStyle(filterType);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const uniqueAreaTypes = Array.from(
    new Set((data ?? []).map((item) => item?.areaType)),
  );

  const onChangeAreaType = (type: string) => {
    setFilterType(type ?? null);
  };

  const handleEdit = (loc: number) => {
    if (!data) return;
    const targetIndex = data.findIndex((a) => a?.locationId === loc);

    if (targetIndex === -1) {
      setSelectStation(null);
      return;
    }

    setSelectStation({
      loc: data[targetIndex]?.locationId as number,
      peripheralType: data[targetIndex]?.areaType as string,
      translateX: data[targetIndex]?.translateX as number,
      translateY: data[targetIndex]?.translateY as number,
      rotate: data[targetIndex]?.rotate as number,
      scale: data[targetIndex]?.scale as number,
      flex_direction: data[targetIndex]?.flex_direction as string,
    });

    setIsEditStation(true);
  };

  const columns = [
    {
      title: t("other.edit_mission_tag.location"),
      dataIndex: "locationId",
      key: "locationId",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
    },
    {
      title: "name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("peripheral_style.areaType"),
      dataIndex: "areaType",
      key: "areaType",
      filteredValue: filterType ? [filterType] : null,
      onFilter: (value, record) => record.areaType === value,
      sorter: (a, b) => a.areaType.localeCompare(b.areaType),
      render: (v: string) => t(`peripheral.${v}` as any) || v,
    },
    {
      title: "x",
      dataIndex: "x",
      key: "x",
    },
    {
      title: "y",
      dataIndex: "y",
      key: "y",
    },
    {
      title: "translateX",
      dataIndex: "translateX",
      key: "translateX",
    },
    {
      title: "translateY",
      dataIndex: "translateY",
      key: "translateY",
    },
    {
      title: "rotate",
      dataIndex: "rotate",
      key: "rotate",
    },
    {
      title: "scale",
      dataIndex: "scale",
      key: "scale",
    },
    {
      title: t("other.edit_charge_station_icon_style.edit_position"),
      dataIndex: "operation",
      key: "operation",

      render: (_v: unknown, record: SingleChargeStation) => {
        return (
          <Button
            icon={<FormatPainterOutlined />}
            onClick={() => handleEdit(record.locationId)}
            color="primary"
            variant="filled"
          >
            {t("other.edit_charge_station_icon_style.edit_position")}
          </Button>
        );
      },
    },
  ];

  const onclose = () => {
    setOpenDrawer(false);
  };

  const handleEditMulti = () => {
    setOpenDrawer(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    //  console.log("selectedRowKeys changed: ", newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  return (
    <div>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("toolbar.others.edit_peripheral_style")}
      </h3>
      <FormHr />

      <Container>
        {/* Form */}
        <Panel width={isEditStation ? "100%" : "0%"}>
          <SettingStyleForm />
        </Panel>

        {/* Table */}
        <Panel width={isEditStation ? "0%" : "100%"} hidden={isEditStation}>
          <Flex gap="middle">
            <Button
              disabled={selectedRowKeys.length === 0}
              onClick={handleEditMulti}
            >
              {t("utils.edit")}
            </Button>
            <Select
              allowClear
              style={{ width: 200, marginBottom: 16 }}
              placeholder="Filter by areaType"
              onChange={(value) => onChangeAreaType(value)}
              options={uniqueAreaTypes.map((type) => ({
                label: type,
                value: type,
              }))}
              value={filterType ?? undefined}
            />
          </Flex>

          <Table
            rowSelection={rowSelection}
            dataSource={data as SingleChargeStation[]}
            columns={columns as []}
            rowKey={(record: SingleChargeStation) => record.locationId}
          />
        </Panel>
      </Container>

      {openDrawer && (
        <Drawer
          closable={{ "aria-label": "Close Button" }}
          onClose={onclose}
          open={openDrawer}
        >
          <SettingMultiStyleForm locations={selectedRowKeys as string[]} />
        </Drawer>
      )}
    </div>
  );
};

export default EditPeripheralIcon;
