import './stream.css';
import ThermalComponent from './ThermalComponent';
import AIComponent from './AIComponent';
import { FC } from 'react';

const StreamWrap: FC<{ amrId: string }> = ({ amrId }) => {
  return (
    <>
      <div className="stream_wrap">
        <AIComponent amrId={amrId}></AIComponent>
        <ThermalComponent amrId={amrId}></ThermalComponent>
      </div>
    </>
  );
};

export default StreamWrap;