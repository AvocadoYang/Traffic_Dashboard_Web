import styled from 'styled-components';

export const InfoWrap = styled.div.attrs<{
  randomcolor: string;
  is_dark: string;
  is_warn: string;
}>((props) => {
  return {
    randomcolor: props.randomcolor,
    is_dark: props.is_dark,
    is_warn: props.is_warn
  };
})<{ randomcolor: string; is_warn: string }>`
  margin-top: 1%;
  z-index: 2;
  border-radius: 5px;
  position: relative;
  border: ${(props) => `0.2em solid ${props.randomcolor}`};
  box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3);
  min-width: 200px;
  max-width: 220px;
  border-top: ${(props) => `0.4em solid ${props.randomcolor}`};
  background-color: ${(props) => `${props.is_dark === 'true' ? '#3a3939' : '#ffffff'}`};
  box-shadow: ${(props) => `${props.is_warn == 'true' ? '0 0 7px rgba(255, 0, 0, 0.8)' : ''}`};
`;
