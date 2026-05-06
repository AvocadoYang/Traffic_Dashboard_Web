// import { useThermal } from '~/socket/useThermal';
import { FC } from 'react';
const ThermalComponent: FC<{ amrId: string }> = ({ amrId }) => {
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
          <p style={{ color: 'white' }}>Not Connected</p>
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