import { useEffect, useState } from 'react';

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要+1
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year} / ${month} / ${day} / ${hours}:${minutes}:${seconds}`;
}

const ClockComponent = () => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const time = formatDate(new Date());
      setValue(time);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
  return (
    <div
      style={{
        fontSize: '1.5vh',
        textAlign: 'end',
        width: '33.33%',
        fontWeight: 'bold',
        color: 'rgba(22, 22, 22, 0.75)',
      }}
    >
      {value}
    </div>
  );
};

export default ClockComponent;