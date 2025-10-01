import { Card } from "antd";
import styled from "styled-components";
import {
    CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import AnimatedNumber from "react-animated-numbers";

const { Meta } = Card;

const ProgressContainer = styled.div`
  width: 100%;
  max-width: 120px;     // 可依需求調整
  aspect-ratio: 1 / 1;
  margin: 0 auto;
`;

const CenterContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  height: 100%;
  font-size: clamp(8px, 2.5vw, 15px);
  font-weight: bold;
`;

interface Props {
    label: string;
    value: number;
    unit: string;
    color: string;
  }


const Gauge = ({ label, value, unit, color }: Props) => (
  <div className="gauge-item">
    <Card  size="small">
      <ProgressContainer>
        <CircularProgressbarWithChildren
          value={value}
          maxValue={100}
          styles={buildStyles({
            pathColor: color,
            trailColor: "#eee",
          })}
        >
          <CenterContent>
            <AnimatedNumber
              useThousandsSeparator
              transitions={(index) =>{
                  // console.log(index)
                  return  {
                      type: "spring",
                      duration: 0.1,
                    }
              } }
              animateToNumber={0}
              fontStyle={{
                fontSize: 15,
                color: "black",
                fontWeight: 'bold'
              }}
            />
            <span style={{ fontSize: "inherit", marginLeft: 4 }}>{unit}</span>
          </CenterContent>
        </CircularProgressbarWithChildren>
        <Meta style={{ padding: "15px 0 0 0", textAlign: "center"}} title={<p style={{ fontSize: "15px",borderTop: "3px solid black"}}>{label}</p>} />
      </ProgressContainer>
    </Card>
    </div>
  );

  export default Gauge;