import { FC } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Result } from "antd";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { pagePermissionOf, usePermission } from "@/utils/permissions";

/** 帳號沒有這一頁的權限 (帳號管理勾的) 就不顯示頁面; 留著 header 選單, 再給一個回首頁的按鈕 */
const PageGate: FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const can = usePermission();
  const need = pagePermissionOf(pathname);
  if (!need || can(need)) return <Outlet />;
  return (
    <>
      <Header />
      <Result
        status="403"
        title={t("permission.no_page")}
        extra={
          <Button type="primary" onClick={() => navigate("/")}>
            {t("page_view")}
          </Button>
        }
      />
    </>
  );
};

export default PageGate;
