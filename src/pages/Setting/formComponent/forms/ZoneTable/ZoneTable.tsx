import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FormHr from "../../../utils/FormHr";
import {
  Button,
  ColorPicker,
  Flex,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { DeleteTwoTone, EditOutlined } from "@ant-design/icons";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import { useAtomValue } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";
import GroupMapFolderBrowser from "@/components/GroupMapFolderBrowser";
import { nanoid } from "nanoid";
import { tagColor } from "../../../utils/utils";
import { ZoneTableData } from "../antd";
import EditZoneTable from "./component/EditZoneTable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

const ZoneTable: React.FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ listeners, attributes, sortableId }) => {
  const { data: resources } = useAllGroupsResources();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const activeGroupId = useMemo(
    () => resources?.groups.find((g) => g.isUsing)?.groupId ?? null,
    [resources],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    activeGroupId,
  );
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [oldData, setOldData] = useState<ZoneTableData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();

  const folders = useMemo(
    () =>
      resources?.groups.map((g) => ({
        groupId: g.groupId,
        groupName: g.groupName,
        isUsing: g.isUsing,
        maps: g.maps.map((m) => ({
          mapId: m.mapId,
          fileName: m.fileName,
          floor: m.floor,
          count: m.zones.length,
        })),
      })) ?? [],
    [resources],
  );

  const tableData = useMemo(() => {
    if (!resources) return [];
    const groups = selectedGroupId
      ? resources.groups.filter((g) => g.groupId === selectedGroupId)
      : resources.groups;
    return groups.flatMap((g) => {
      const maps = selectedMapId
        ? g.maps.filter((m) => m.mapId === selectedMapId)
        : g.maps;
      return maps.flatMap((m) =>
        m.zones.map((zone) => ({
          ...zone,
          lidar: { front: zone.lidar_front, back: zone.lidar_back },
          mapFileName: m.fileName,
          groupName: g.groupName,
          isActiveGroup: g.isUsing,
        })),
      );
    });
  }, [resources, selectedGroupId, selectedMapId]);

   const layerDict: { [value: string]: string} = {
    "0": `${t("edit_zone_panel.layer_dis_far")}`,
    "1":  `${t("edit_zone_panel.layer_dis_near")}`,
    "2": `${t("edit_zone_panel.speical_layer_cargo")}`,
    "3": `${t("edit_zone_panel.special_layer_charge")}`
  } 

  const deleteMutation = useMutation({
    mutationFn: (zoneId: string[]) => {
      return client.post(`api/setting/delete-edit-zone`, {
        zoneIds: zoneId,
      });
    },
    onSuccess: (__data, zonIds) => {
      void messageApi.success("success");

      setSelectedRowKeys((pre) => {
        return [...pre].filter((zoneId) => !zonIds.includes(zoneId as string));
      });
      console.log(selectedRowKeys);
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  //選擇要修改的區域列, 並且設定表單
  const edit = (record: Partial<ZoneTableData> & { id: string }) => {
    const isValidRecord = (
      record: Partial<ZoneTableData> & { id: string },
    ): record is ZoneTableData & { id: string } => {
      return Object.values(record).every((value) => value !== undefined);
    };
    if (!isValidRecord(record)) return;
    const data = {
      id: record.id,
      backgroundColor: record.backgroundColor,
      category: record.category,
      endPoint: record.endPoint,
      layer: record.layer,
      lidar: record.lidar,
      startPoint: record.startPoint,
      tagSetting: record.tagSetting,
      name: record.name,
    };
    setOldData(data);
    setEditingKey(record.id);
  };

  const columns = [
    {
      title: t("zone_table_form.zone_name"),
      dataIndex: "name",
      key: "name",
      editable: true,
      width: "16%",
    },
    {
      title: t("zone_table_form.start_point"),
      dataIndex: "startPoint",
      key: "startPoint",
      render: (data) => {
        return (
          <Flex justify="center" align="center" vertical>
            <p>{`X: ${(data.startX as number).toFixed(2)}`}</p>
            <p>{`Y: ${(data.startY as number).toFixed(2)}`}</p>
          </Flex>
        );
      },
      editable: true,
      width: "18%",
    },
    {
      title: t("zone_table_form.end_point"),
      dataIndex: "endPoint",
      key: "endPoint",
      editable: true,
      render: (data) => {
        return (
          <Flex justify="center" align="center" vertical>
            <p>{`X: ${(data.endX as number).toFixed(2)}`}</p>
            <p>{`Y: ${(data.endY as number).toFixed(2)}`}</p>
          </Flex>
        );
      },
      width: "18%",
    },
    {
      title: t("zone_table_form.layer"),
      dataIndex: "layer",
      key: "layer",
      editable: true,
      render: (data) => {
        return <>
          {`${data}: `}

          {
            data ?  <p style={{ fontWeight: "bold"}}>{layerDict[data]}</p> : <></>
          }

        </>
      },
      width: "18%",
    },
    {
      title: t("zone_table_form.lidar"),
      dataIndex: "lidar",
      key: "lidar",
      editable: true,
      render: (data: { front: boolean, back: boolean}) => {
        return <>
            <p>{`${t(`edit_zone_panel.lidar_front`)}: ${data.front ? t(`utils.open`): t(`utils.close`)}`}</p>
      
            <p>{`${t(`edit_zone_panel.lidar_back`)}: ${data.back ? t(`utils.open`): t(`utils.close`)}`}</p>
        </>
      },
      width: "18%",
    },
    {
      title: t("zone_table_form.zone_attr"),
      dataIndex: "category",
      key: "category",
      editable: true,
      render: (data) => {
        return (
          <Space wrap style={{ fontWeight: "bold" }}>
            {(data as string[]).map((tag) => {
              return (
                <Tag color={tagColor(tag)} key={nanoid()}>
                  {tag}
                </Tag>
              );
            })}
          </Space>
        );
      },
      width: "23%",
    },
    {
      title: t("zone_table_form.zone_color"),
      dataIndex: "backgroundColor",
      key: "backgroundColor",
      render: (data) => {
        // console.log(data)
        return <ColorPicker disabled defaultValue={data}></ColorPicker>;
      },
      editable: true,
      width: "6%",
    },
    {
      title: t("map_group_table.name"),
      dataIndex: "groupName",
      key: "groupName",
      width: "8%",
    },
    {
      title: t("map_manager.map_group"),
      dataIndex: "mapFileName",
      key: "mapFileName",
      width: "10%",
    },
    {
      dataIndex: "operation",
      key: "operation",
      render: (_, record: ZoneTableData & { isActiveGroup?: boolean }) => {
        return (
          <Flex vertical align="center" justify="space-between" gap={"middle"}>
            <Typography.Link
              onClick={() => {
                if (record.isActiveGroup) edit(record);
              }}
            >
              <Button
                icon={<EditOutlined />}
                color="primary"
                variant="filled"
                type="link"
                disabled={!record.isActiveGroup}
                title={
                  record.isActiveGroup
                    ? undefined
                    : t("map_manager.not_active_group_tooltip")
                }
              >
                {t("utils.edit")}
              </Button>
            </Typography.Link>
            <Popconfirm
              title={t("utils.delete")}
              description={t("edit_location_panel.table_notify.are_you_sure")}
              onConfirm={() => deleteMutation.mutate([record.id])}
              okText={t("utils.yes")}
              cancelText={t("utils.no")}
            >
              <Button
                icon={<DeleteTwoTone twoToneColor="#f30303" />}
                color="danger"
                variant="filled"
                type="link"
              >
                {t("utils.delete")}
              </Button>
            </Popconfirm>
          </Flex>
        );
      },
      width: "12%",
    },
  ];

  if (!resources) return;
  return (
    <>
      {contextHolders}
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {!editingKey
          ? t("sider_output_form_name.zoneTable")
          : t("edit_zone_panel.edit_zone")}
      </h3>
      <FormHr></FormHr>
      {!editingKey ? (
        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <GroupMapFolderBrowser
            groups={folders}
            selectedGroupId={selectedGroupId}
            selectedMapId={selectedMapId}
            currentMapId={currentMapId}
            onSelectGroup={setSelectedGroupId}
            onSelectMap={setSelectedMapId}
          />
          <Popconfirm
            title={t("utils.delete")}
            description={t("edit_location_panel.table_notify.are_you_sure")}
            onConfirm={() => deleteMutation.mutate(selectedRowKeys as string[])}
            okText={t("utils.yes")}
            cancelText={t("utils.no")}
          >
            <Button
              icon={<DeleteTwoTone twoToneColor="#f30303" />}
              disabled={selectedRowKeys.length === 0}
              color="danger"
              variant="filled"
            >
              {t("utils.delete")}
            </Button>
          </Popconfirm>
          <Table
            rowSelection={{
              type: "checkbox",
              onChange: (selectedRowKeys: React.Key[]) => {
                setSelectedRowKeys([...selectedRowKeys]);
              },
            }}
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={tableData as unknown as ZoneTableData[]}
          ></Table>
        </Flex>
      ) : (
        <EditZoneTable
          setEditingKey={setEditingKey}
          editingKey={editingKey}
          oldData={oldData}
          sortableId={sortableId}
        ></EditZoneTable>
      )}
    </>
  );
};

export default memo(ZoneTable);
