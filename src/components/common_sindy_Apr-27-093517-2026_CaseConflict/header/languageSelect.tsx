import { Select } from "antd";
import styled from "styled-components";
import { font } from "@/styles/variables";

const StyledSelect = styled(Select)`
  .ant-select-selector {
    background: #ffffff !important;
    border: 1px solid ${font.color.white} !important;
    color: ${font.color.gray} !important;
    font-family: ${font.fontFamily.en} !important;
    font-size: ${font.size.xs};
    height: 36px !important;
    border-radius: 0 !important;

    &:hover {
      border-color: ${font.color.blue} !important;
      background: #f0f5ff !important;
      color: ${font.color.blue} !important;
    }
  }
`;

type LanguageSelectProps = {
  onChange: (value: string) => void;
};

const LanguageSelect: React.FC<LanguageSelectProps> = ({ onChange }) => (
  <StyledSelect
    defaultValue="ch.tw"
    style={{ width: 100 }}
    onChange={onChange as any}
    options={[
      { value: "en", label: "EN" },
      { value: "ch.tw", label: "中文" },
    ]}
  />
);

export default LanguageSelect;