// import { useThermal } from '~/socket/useThermal';
import { FC } from 'react';
import { useTranslation } from "react-i18next";
const ThermalComponent: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
//   const data = useThermal(amrId);

  if (true) {
    return (
      <div className="image_wrap" style={{ borderLeft: '0.5rem solid gray' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '5vh', margin: '0 auto' }}>🎦</span>
          <p style={{ color: 'white' }}>{t("sw_monitor.not_connected")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="image_wrap">
        <img src={`${123}`} className="img_stream" />
      </div>
    </>
  );
};
export default ThermalComponent;