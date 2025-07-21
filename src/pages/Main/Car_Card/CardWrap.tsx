import React, { memo } from 'react';
import './car_info.css';

import Cards from './Cards';
import { useAtomValue } from 'jotai';
import { darkMode } from '@/utils/gloable';
import TittleTools from './TittleTools';

const CarCardWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  return (
    <>
      <div className={`card-wrap-2d ${isDark ? 'dark-mode-wrap' : ''}`} draggable="false">
        <TittleTools></TittleTools>
        <Cards></Cards>
      </div>
    </>
  );
};

export default memo(CarCardWrap);
