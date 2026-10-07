// import { useAiInfo } from '~/socket/useAiInfo';
import { FC } from 'react';
import { useTranslation } from "react-i18next";

const AIComponent: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
//   const data = useAiInfo(amrId);

  if (true) {
    return (
      <div
        className="image_wrap"
        style={{ justifyContent: 'center', borderRight: '0.5rem solid gray' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '5vh' }}>🎦</span>
          <p style={{ color: 'white' }}>{t("sw_monitor.not_connected")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="image_wrap">
        <img src={`${12}`} className="img_stream" />
      </div>
    </>
  );
};
export default AIComponent;