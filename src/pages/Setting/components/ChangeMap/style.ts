import { Button, Form } from "antd";
import styled from "styled-components";

export const ImageContainer = styled.div<{
  url: string;
}>`
  width: 100%;
  height: 100%;
  filter: blur(8px);
  overflow: hidden;
  background-image: ${({ url }) => `url(${url})`}; /* Correct interpolation */
  background-position: center center;
  position: relative;
  background-repeat: no-repeat;
  background-size: contain;
  background-color: #cccccc;
`;

export const ImageText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 24px;
  text-align: center;
  padding: 5px 10px;
  border: 2px solid #3f3f3f;
  background-color: rgba(0, 0, 0, 0.5);
`;

export const ShowImageContainer = styled.div<{
  url: string;
}>`
  height: 500px;
  width: 100px;
  overflow: hidden;
  background-image: ${({ url }) => `url(${url})`}; /* Correct interpolation */
  background-position: center center;
  position: relative;
  background-repeat: no-repeat;
  background-size: contain;
  background-color: #cccccc;
`;

export const ShowImageText = styled.div<{ is_edit: string }>`
  position: absolute;
  top: ${({ is_edit }) => (is_edit === "true" ? "60%" : "75%")};
  left: 50%;
  width: auto;
  transform: translate(-50%, -50%);
  color: rgb(35, 35, 35);
  font-size: 18px;
  text-align: center;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 5px;
  transition: all 300ms;
  display: flex;
  justify-content: center;
`;

export const StyledForm = styled(Form)`
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background-color: rgb(255, 255, 255);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const StyledButton = styled(Button)`
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
`;

export const CarouselContainer = styled.div`
  margin-top: 25px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

export const FormButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

export const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const NoImageText = styled.div`
  text-align: center;
  font-size: 18px;
  color: #666;
  margin-top: 16px;
`;

export type Map_Info = {
  id: string;
  isUsing: boolean;
  fileName: string;
  mapOriginX: number;
  mapOriginY: number;
  mapWidth: number;
  mapHeight: number;
};
