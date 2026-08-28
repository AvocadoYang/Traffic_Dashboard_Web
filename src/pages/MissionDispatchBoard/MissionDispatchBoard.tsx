import client from "@/api/axiosClient";
import useMissionDispatchPages, {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchButton,
  DispatchWidget,
  DispatchWidgetType,
} from "@/api/useMissionDispatchBoard";
import Header from "@/components/Header";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input, Layout, Modal, Switch, Tabs, message } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchButtonFormModal from "./DispatchButtonFormModal";
import DispatchCanvas from "./DispatchCanvas";
import DispatchWidgetFormModal from "./DispatchWidgetFormModal";

const { Content } = Layout;

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
`;

const EditModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EmptyHint = styled.div`
  padding: 48px;
  color: #8c8c8c;
  text-align: center;
`;

const MissionDispatchBoard: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: pages } = useMissionDispatchPages();
  const [editMode, setEditMode] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("");
  const [newPageModalOpen, setNewPageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [buttonModal, setButtonModal] = useState<{
    open: boolean;
    button: DispatchButton | null;
  }>({ open: false, button: null });
  const [widgetModal, setWidgetModal] = useState<{
    open: boolean;
    widget: DispatchWidget | null;
    widgetType: DispatchWidgetType;
  }>({ open: false, widget: null, widgetType: "MISSION_LIST" });

  useEffect(() => {
    if (!pages || pages.length === 0) return;
    if (!pages.some((p) => p.id === activeKey)) {
      setActiveKey(pages[0].id);
    }
  }, [pages, activeKey]);

  const createPageMutation = useMutation({
    mutationFn: (name: string) =>
      client.post<{ id: string }>("api/setting/dispatch-page", { name }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
      setActiveKey(res.data.id);
      setNewPageModalOpen(false);
      setNewPageName("");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) =>
      client.delete("api/setting/dispatch-page", { data: { id } }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: "add" | "remove",
  ) => {
    if (action === "add") {
      setNewPageModalOpen(true);
      return;
    }
    Modal.confirm({
      title: t("mission_dispatch_board.delete_page_confirm_title"),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: () => deletePageMutation.mutate(targetKey as string),
    });
  };

  const activePage = pages?.find((p) => p.id === activeKey);

  return (
    <Layout style={{ height: "var(--app-height)" }}>
      {contextHolder}
      <Header />
      <Content>
        <HeaderBar>
          <Title>{t("mission_dispatch_board.title")}</Title>
          <EditModeToggle>
            <span>{t("mission_dispatch_board.edit_mode")}</span>
            <Switch checked={editMode} onChange={setEditMode} />
          </EditModeToggle>
        </HeaderBar>

        <Tabs
          type="editable-card"
          hideAdd={!editMode}
          activeKey={activeKey}
          onChange={setActiveKey}
          onEdit={handleTabEdit}
          items={(pages ?? []).map((page) => ({
            key: page.id,
            label: page.name,
            closable: editMode,
            children: (
              <DispatchCanvas
                page={page}
                editMode={editMode}
                onAddButton={() =>
                  setButtonModal({ open: true, button: null })
                }
                onEditButton={(button) =>
                  setButtonModal({ open: true, button })
                }
                onAddWidget={(widgetType) =>
                  setWidgetModal({ open: true, widget: null, widgetType })
                }
                onEditWidget={(widget) =>
                  setWidgetModal({
                    open: true,
                    widget,
                    widgetType: widget.widget_type,
                  })
                }
              />
            ),
          }))}
        />

        {pages && pages.length === 0 && (
          <EmptyHint>
            {editMode
              ? t("mission_dispatch_board.no_pages_hint")
              : t("mission_dispatch_board.no_pages_hint_enable_edit")}
          </EmptyHint>
        )}
      </Content>

      <Modal
        title={t("mission_dispatch_board.new_page_placeholder")}
        open={newPageModalOpen}
        onCancel={() => setNewPageModalOpen(false)}
        onOk={() => createPageMutation.mutate(newPageName)}
        confirmLoading={createPageMutation.isPending}
        okButtonProps={{ disabled: !newPageName.trim() }}
      >
        <Input
          value={newPageName}
          onChange={(e) => setNewPageName(e.target.value)}
          placeholder={t("mission_dispatch_board.new_page_placeholder")}
          onPressEnter={() => createPageMutation.mutate(newPageName)}
        />
      </Modal>

      {activePage && (
        <DispatchButtonFormModal
          open={buttonModal.open}
          pageId={activePage.id}
          initialValues={buttonModal.button}
          onClose={() => setButtonModal({ open: false, button: null })}
        />
      )}

      {activePage && (
        <DispatchWidgetFormModal
          open={widgetModal.open}
          pageId={activePage.id}
          widgetType={widgetModal.widgetType}
          initialValues={widgetModal.widget}
          onClose={() =>
            setWidgetModal({
              open: false,
              widget: null,
              widgetType: "MISSION_LIST",
            })
          }
        />
      )}
    </Layout>
  );
};

export default MissionDispatchBoard;
