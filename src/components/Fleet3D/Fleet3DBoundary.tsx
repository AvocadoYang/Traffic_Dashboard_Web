import { FC, ReactNode, Suspense } from "react";
import { Button } from "antd";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

/**
 * 包整個 3D 檢視: 畫布建不起來 (顯示卡驅動出錯、WebGL 被關掉) 或 3D 裡面出錯時, 只有這一塊顯示錯誤,
 * 可以切回 2D 或再試一次。不包的話錯誤會一路往外丟, 整個頁面白掉; 首頁又記得上次選 3D,
 * 重新整理還是白的, 只能清 localStorage。一定不能畫的電腦先用 webglAvailable() 擋掉, 這個接剩下的意外
 */

const Failed = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  background: var(--c-bg-muted);
  color: var(--c-text);

  .detail {
    max-width: 480px;
    color: var(--c-text-muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
`;

/** onUse2d: 「切回 2D」要做什麼; 沒有 2D 可以切 (例如急停回放) 就不給, 只有重試 */
const Fleet3DBoundary: FC<{ children: ReactNode; onUse2d?: () => void }> = ({ children, onUse2d }) => {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      onError={(e) => console.error("3D 檢視出錯:", e)}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <Failed role="alert" data-testid="fleet3d-failed">
          <strong>{t("fleet3d.failed.title")}</strong>
          {error instanceof Error && <div className="detail">{error.message}</div>}
          <div className="actions">
            {onUse2d && (
              <Button type="primary" onClick={onUse2d}>
                {t("fleet3d.failed.use_2d")}
              </Button>
            )}
            <Button onClick={resetErrorBoundary}>{t("fleet3d.failed.retry")}</Button>
          </div>
        </Failed>
      )}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  );
};

export default Fleet3DBoundary;
