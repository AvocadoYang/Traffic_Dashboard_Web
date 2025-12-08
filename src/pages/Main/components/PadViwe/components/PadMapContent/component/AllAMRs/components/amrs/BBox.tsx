import useMap from "@/api/useMap";
import { rad2Deg, rosCoord2DisplayCoord } from "@/utils/utils";
import { FC } from "react";
import styled from "styled-components";

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;

}>(({ left, top }) => ({
  style: { left, top},
}))<{
  left: number;
  top: number;
}>`
width: 4px;
height: 4px;
border-radius: 50%;
background: #0d0d12;
position: absolute;

z-index: 150;

transform: translate(-50%, -50%);
`;


const BBox: FC<{ amrId: string, bbox: number[][]}> = ({ amrId, bbox}) => {
     const { data } = useMap();
    if(!data) return null;
    return (
        <>
        {
            bbox.map(([x,y], i) => {
                const [displayX, displayY] = rosCoord2DisplayCoord({
                    x,
                    y,
                    mapHeight: data?.mapHeight,
                    mapOriginX: data?.mapOriginX,
                    mapOriginY: data.mapOriginY,
                    mapResolution: data.mapResolution,
                });
                return <PointDiv key={i} left={displayX} top={displayY}></PointDiv>
            })
        }
    {bbox.map((curr, i) => {
        const next = bbox[(i + 1) % bbox.length]; // 最後一點連回第一點

        const [x1, y1] = rosCoord2DisplayCoord({
            x: curr[0],
            y: curr[1],
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
        });


        const [x2, y2] = rosCoord2DisplayCoord({
            x: next[0],
            y: next[1],
            mapHeight: data?.mapHeight,
            mapOriginX: data?.mapOriginX,
            mapOriginY: data.mapOriginY,
            mapResolution: data.mapResolution,
        });
        
        const length = Math.hypot(x1 - x2, y1 - y2);
        const angle = rad2Deg(Math.atan2(y2 - y1, x2 - x1));


        return (
          <Line
            key={`line-${i}`}
            length={length}
            angle={angle}
            color={"#0d0d12"}
          />
        );
      })}
        </>
    )
}
export default BBox


const Line = styled.div.attrs<{
    length: number;
    angle: number;
    color: string;
  }>(
    ({
      length,
      angle,
      color
    }) => ({
      style: {
        width: length,
        height: "2px",
        transform: `rotate(${angle}deg) translateY(-50%)`,
        backgroundColor: `${color}`,
        opacity: "0.7",
        border: `1px solid red`
      },
    }),
  )<{
    length: number;
    angle: number;
    color: string
  }>` `;