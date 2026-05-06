import { FC, useState } from "react";
import { Form } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import ShelfCategoryTable from "./ShelfCategoryTable";
import ShelfCategoryForm from "./ShelfCategoryForm";
import { borderColor } from "../../../../utils/utils";

const ShelfCategoryPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ sortableId, attributes, listeners }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectId, setSelectId] = useState("");
  const [cateHeight, setCateHeight] = useState<number[] | undefined>([]);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [hasDelete, setHasDelete] = useState(false);

  const editMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      shelf_style: string;
      height: number[] | undefined;
      hasDelete: boolean;
    }) => {
      const result = Promise.all([
        client.post<unknown>("api/setting/edit-shelf-category", payload),
      ]);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-shelf-category"],
      });
      await queryClient.refetchQueries({
        queryKey: ["shelf"],
      });
    },
  });

  const editHandler = () => {
    const fieldName = form.getFieldValue("name") as string;
    const style = form.getFieldValue("shelfStyle") as string;
    const payload = {
      id: selectId,
      shelf_style: style,
      name: fieldName,
      height: cateHeight,
      hasDelete,
    };

    editMutation.mutate(payload);
    form.resetFields();
    setCateHeight([]);
    setOpen(false);
    setHasDelete(false);
  };

  return (
    <>
      {/* 4-2 編輯貨架種類 */}

      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("edit_shelf_category.edit_shelf_category")}
      </h3>

      <hr
        style={{
          marginTop: "1px",
          marginBottom: "10px",
          border: `4px solid ${borderColor(sortableId)}`,
        }}
      ></hr>
      <ShelfCategoryTable setOpen={setOpen} setSelectId={setSelectId} />

      <ShelfCategoryForm
        setHasDelete={setHasDelete}
        selectId={selectId}
        form={form}
        cateHeight={cateHeight}
        setCateHeight={setCateHeight}
        editHandler={editHandler}
        openModel={open}
        setOpenModel={setOpen}
      />
    </>
  );
};

export default ShelfCategoryPanel;
