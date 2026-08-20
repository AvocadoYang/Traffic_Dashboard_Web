import styled from "styled-components";

const BatteryBody = styled.div`
  width: 70%;
  border: 1.8px solid black;
  border-radius: 3px;
  height: 25%;
  margin-top: 2px;
  margin-bottom: 4px;
`;

const Power = styled.div.attrs<{ power: number }>((props) => {
  return { power: props.power };
})<{ power: number }>`
  height: 100%;
  width: ${(props) => (props.power ? `${props.power}%` : "0%")};
  border-radius: 3px;
  background-color: #92e247;
  background-color: ${(props) =>
    props.power > 70 ? "#92e247" : props.power > 25 ? "#f5953c" : "#f80d0d"};
`;

const Battery: React.FC = () => {
  return (
    <BatteryBody>
      <Power power={24}></Power>
    </BatteryBody>
  );
};

export default Battery;
