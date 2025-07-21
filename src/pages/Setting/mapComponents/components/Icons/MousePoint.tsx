 
import { FC, memo } from 'react';
import styled from 'styled-components';
import useMap from '@/api/useMap';
import { mousePoint_X, mousePoint_Y } from '@/utils/gloable';
import { useAtom } from 'jotai';

const Container = styled.div.attrs<{ left: number; top: number }>(({ left, top }) => ({
  style: { left, top }
}))<{ left: number; top: number }>`
  position: absolute;
`;

const Circle = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border: 3px solid;
  border-radius: 5px;
  border-color: red;
  background-color: red;
  transform: translate(-50%, -50%);
`;

const Point: FC = () => {
  const [x,] = useAtom(mousePoint_X); // MousePoint 編輯點位小紅點
  const [y,] = useAtom(mousePoint_Y); // MousePoint 編輯點位小紅點
  const { data } = useMap();
  if (!data) return null;
  return (
    <Container left={Number(x)} top={Number(y)}>
      <Circle />
    </Container>
  );
};

export default memo(Point);


