import styled from "styled-components";

export const InfoWrap = styled.div.attrs<{
  is_dark: string;
  is_warn: string;
}>((props) => {
  return {
    is_dark: props.is_dark,
    is_warn: props.is_warn,
  };
})<{ is_dark: string; is_warn: string }>`
  margin-top: 1%;
  z-index: 2;
  border-radius: 5px;
  position: relative;
  border: ${(props) =>
    `0.15em solid ${props.is_dark === "true" ? "#d9d9d9" : "#1a1a1a"}`};
  box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3);
  min-width: 200px;
  max-width: 220px;
  border-top: ${(props) =>
    `0.3em solid ${props.is_dark === "true" ? "#d9d9d9" : "#1a1a1a"}`};
  background-color: ${(props) =>
    `${props.is_dark === "true" ? "#3a3939" : "#ffffff"}`};
  box-shadow: ${(props) =>
    `${props.is_warn == "true" ? "0 0 7px rgba(255, 0, 0, 0.8)" : ""}`};
`;
