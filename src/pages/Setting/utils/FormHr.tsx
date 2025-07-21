import { FC, memo } from 'react';

const FormHr: FC = () => {
  return (
    <hr
      style={{
        marginTop: '1px',
        marginBottom: '10px',
        border: `2px solid  #315E7D`,
        borderRadius: '5px'
      }}
    ></hr>
  );
};

export default memo(FormHr);
