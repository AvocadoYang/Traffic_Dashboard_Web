import React from 'react';
import './mission_info.css';
import TitleTools from './TitleTools';
import MissionTable from './components/MissionTable';
import { useAtomValue } from 'jotai';
import { darkMode } from '@/utils/gloable';

const MissionWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  return (
    <div className={`mission-wrap-2d ${isDark ? 'dark-mode-wrap' : ''}`}>
      <TitleTools></TitleTools>
      <MissionTable></MissionTable>
    </div>
  );
};

export default MissionWrap;
