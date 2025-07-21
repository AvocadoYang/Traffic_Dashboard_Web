import { memo } from 'react';
// import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { SelectProps } from 'antd';
import { useAtomValue } from 'jotai';
import { darkMode } from '@/utils/gloable';

const options: SelectProps['options'] = [];

for (let i = 10; i < 36; i++) {
  options.push({
    value: i.toString(36) + i,
    label: i.toString(36) + i
  });
}

const TitleTools = () => {
  const isDark = useAtomValue(darkMode);
  // const [isDrop, setIsDrop] = useState(false);
  return (
    <>
      <span className={`card-wrap-title ${isDark ? 'dark-mode-title' : ''}`}>
        Missions
        {/* {isDrop ? (
          <UpOutlined className="drop-icon" onClick={() => setIsDrop(false)} />
        ) : (
          <DownOutlined className="drop-icon" onClick={() => setIsDrop(true)} />
        )} */}
      </span>
    </>
  );
};

export default memo(TitleTools);
