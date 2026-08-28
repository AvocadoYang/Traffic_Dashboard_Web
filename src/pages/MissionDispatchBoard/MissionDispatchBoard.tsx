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
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input, Layout, Modal, Switch, Tabs, message } from "antd";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import DispatchButtonFormModal from "./DispatchButtonFormModal";
import DispatchCanvas from "./DispatchCanvas";
import DispatchWidgetFormModal from "./DispatchWidgetFormModal";

const { Content } = Layout;

const CHROME_COLLAPSED_COOKIE = "mission_dispatch_chrome_collapsed";

// 頂部的全站選單(Header)跟本頁自己的標題列一起收合用,收合狀態記在 cookie
// 裡,重新整理/下次打開這頁還是維持使用者上次選的收合狀態。
const ChromeWrap = styled.div<{ $collapsed: boolean }>`
  flex-shrink: 0;
  overflow: hidden;
  height: ${({ $collapsed }) => ($collapsed ? "0px" : "auto")};
`;

// 一定佔自己一整條的實體位置(不用 absolute 飄浮),不管收合與否都不會
// 疊到 Tabs 頁籤列或畫布上——飄浮疊加在收合後的頁籤列上面反而會看起來像
// 卡了一塊不明所以的東西。
const ChromeToggle = styled.div`
  flex-shrink: 0;
  width: 100%;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  color: #bfbfbf;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    color: #1890ff;
    background: #f0f0f0;
  }
`;

// Layout 被鎖定在 var(--app-height)(一個螢幕高),Content 預設不會自己捲動,
// 內容一旦比畫面高就會被撐出可視範圍外、完全捲不到——所以這裡把 Content
// 拆成「固定的 HeaderBar」+「可以自己往下捲的區域」,而不是讓整頁去捲。
const StyledContent = styled(Content)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

// 讓 antd Tabs 撐滿剩餘高度、tabpane 也是 100% 高,這樣 DispatchCanvas
// 內部自己的捲軸容器才能拿到一個「跟畫面一樣高」的固定框,捲軸才會貼在可視範圍
// 邊緣(而不是被畫布本身的高度撐到很下面、要捲到底才看得到)。
const TabsArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .ant-tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content-holder {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .ant-tabs-content,
  .ant-tabs-tabpane {
    height: 100%;
  }
`;

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
  const [chromeCollapsed, setChromeCollapsed] = useState(
    () => Cookies.get(CHROME_COLLAPSED_COOKIE) === "1",
  );
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

  const toggleChrome = () => {
    setChromeCollapsed((prev) => {
      const next = !prev;
      Cookies.set(CHROME_COLLAPSED_COOKIE, next ? "1" : "0", {
        expires: 365,
      });
      return next;
    });
  };

  return (
    <Layout style={{ height: "var(--app-height)" }}>
      {contextHolder}
      <ChromeWrap $collapsed={chromeCollapsed}>
        <Header />
        <HeaderBar>
          <Title>{t("mission_dispatch_board.title")}</Title>
          <EditModeToggle>
            <span>{t("mission_dispatch_board.edit_mode")}</span>
            <Switch checked={editMode} onChange={setEditMode} />
          </EditModeToggle>
        </HeaderBar>
      </ChromeWrap>
      <ChromeToggle
        onClick={toggleChrome}
        title={
          chromeCollapsed
            ? t("mission_dispatch_board.expand_header")
            : t("mission_dispatch_board.collapse_header")
        }
      >
        {chromeCollapsed ? <DownOutlined /> : <UpOutlined />}
      </ChromeToggle>
      <StyledContent>
        <TabsArea>
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
        </TabsArea>
      </StyledContent>

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
