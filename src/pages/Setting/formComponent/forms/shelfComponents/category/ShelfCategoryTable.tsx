import { DeleteOutlined, EditTwoTone, PlusOutlined } from '@ant-design/icons';
import client from '@/api/axiosClient';
import useShelfCategory, { ShelfCategoryWithoutList } from '@/api/useShelfCategory';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Popconfirm, Button, Flex } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const ShelfCategoryTable: FC<{
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectId: React.Dispatch<React.SetStateAction<string>>;
}> = ({ setOpen, setSelectId }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useShelfCategory();
  const { t } = useTranslation();

  const addMutation = useMutation({
    mutationFn: () => {
      return client.post('api/setting/add-shelf-category');
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['all-shelf-category']
      });
      await queryClient.refetchQueries({
        queryKey: ['shelf']
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post<unknown>('api/setting/delete-shelf-category', {
        id
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['shelf'] });
      await queryClient.refetchQueries({
        queryKey: ['all-shelf-category']
      });
    }
  });

  const addHandler = () => [addMutation.mutate()];

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (id: string) => {
    setOpen(true);
    setSelectId(id);
  };

  const columns: ColumnsType<ShelfCategoryWithoutList> = [
    {
      title: t('edit_shelf_category.name'),
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: t('edit_shelf_category.style'),
      dataIndex: 'shelf_style',
      key: 'shelf_style',
      render: (_v, record) => {
        switch (record.shelf_style) {
          case 'type_1':
            return <>{t('edit_shelf_category.type_1')}</>;

          case 'type_2':
            return <>{t('edit_shelf_category.type_2')}</>;

          default:
            return <></>;
        }
      }
    },
    {
      title: t('edit_shelf_category.every_level'),
      dataIndex: 'height',
      key: 'height',
      render: (_v, recorder) => {
        const sortedHeight = recorder.Height?.sort((a, b) => a.height - b.height);

        return sortedHeight?.map((k) => <p key={k.id}>{k.height}</p>);
      }
    },
    {
      title: '',
      dataIndex: '',
      render: (_v, record) => {
        return (
          <Flex gap="small">
            <Popconfirm
              title={t('edit_shelf_category.delete_warning')}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                icon={<DeleteOutlined color="#ff0707" />}
                color="danger"
                variant="filled"
                type="link"
              >
                {t('utils.delete')}
              </Button>
            </Popconfirm>

            <Button
              color="primary"
              variant="filled"
              onClick={() => handleEdit(record.id)}
              icon={<EditTwoTone twoToneColor="#33bcb7" />}
            >
              {t('utils.edit')}
            </Button>
          </Flex>
        );
      }
    }
  ];

  if (isLoading) return [];
  return (
    <>
      <Button
        icon={<PlusOutlined />}
        color="primary"
        variant="filled"
        onClick={addHandler}
        type="primary"
        style={{ marginBottom: 16 }}
      >
        {t('edit_shelf_category.add_shelf')}
      </Button>
      <Table
        dataSource={data as ShelfCategoryWithoutList[]}
        columns={columns}
        rowKey={(record) => record.id}
      />
    </>
  );
};

export default ShelfCategoryTable;
