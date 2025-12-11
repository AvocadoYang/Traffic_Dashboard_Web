import useMap from "@/api/useMap";
import { rad2Deg, rosCoord2DisplayCoord } from "@/utils/utils";
import { FC, Fragment } from "react";
import styled from "styled-components";

const hexToRGBA = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


const Container = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({ style: { left, top } }))<{
  left: number;
  top: number;
}>`
  position: absolute;
`;


const Line = styled.div.attrs<{
  length: number;
  angle: number;
  color: string;
}>(
  ({
    length,
    angle,
    color,
  }) => ({
    style: {
      width: length,
      height: "1px",
      transform: `rotate(${angle}deg) translateY(-50%)`,
      transformOrigin: "0 50%",  // ⬅ 旋轉基準改在左正中
      opacity: "0.7",
      border: `1px dashed ${hexToRGBA(color, 0.9)}`
    },
  }),
)<{
  length: number;
  angle: number;
  color: string;
}>` 

  position: absolute;
  z-index: 149;
`;


const BBox: FC<{ amrId: string, color: string,  bbox: number[][]}> = ({ amrId, color, bbox}) => {
     const { data } = useMap();
    if(!data || !bbox) return null;
    return (
        <>
        {
          [...bbox].slice(0, bbox.length -1).map((curr, i) => {
            // console.log((i + 1) % bbox.length, '@@@@')
            const next = bbox[(i + 1) % (bbox.length -1)];
            const [displayX, displayY] = rosCoord2DisplayCoord({
              x: curr[0],
              y: curr[1],
              mapHeight: data?.mapHeight,
              mapOriginX: data?.mapOriginX,
              mapOriginY: data.mapOriginY,
              mapResolution: data.mapResolution,
          });

          const [connectX, connectY] = rosCoord2DisplayCoord({
              x: next[0],
              y: next[1],
              mapHeight: data?.mapHeight,
              mapOriginX: data?.mapOriginX,
              mapOriginY: data.mapOriginY,
              mapResolution: data.mapResolution,
            });
          
            const [centerX, centerY] = rosCoord2DisplayCoord({
              x: bbox[bbox.length -1][0],
              y: bbox[bbox.length -1][1],
              mapHeight: data?.mapHeight,
              mapOriginX: data?.mapOriginX,
              mapOriginY: data.mapOriginY,
              mapResolution: data.mapResolution,
            })

              const length = Math.hypot(displayX - connectX, displayY - connectY);
              const angle = rad2Deg(Math.atan2(connectY - displayY, connectX - displayX));

              const length2Center = Math.hypot(displayX - centerX, displayY - centerY);
              const angleWCenter =  rad2Deg(Math.atan2(centerY - displayY, centerX - displayX));

              return (
                <Fragment key={`${amrId}-line-${i}`}>
                <Container left={displayX} top={displayY} >
                  <Line  color={color} length={length} angle={angle} className="bbox-line"></Line>
                </Container>
                <Container left={displayX} top={displayY} >
                  <Line  color={color} length={length2Center} angle={angleWCenter} className="bbox-line"></Line>
                </Container>
                </Fragment>
              )
          })
        }

        
        
        </>
    )
}


export default BBox


