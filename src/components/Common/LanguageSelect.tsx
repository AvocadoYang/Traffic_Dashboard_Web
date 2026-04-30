import { Select, ConfigProvider, Dropdown } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { font } from "@/styles/variables";
import { titleSizes } from "@/styles/mixins";
import styled from "styled-components";

const MobileIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: ${font.color.gray};
  font-size: 24px;
  padding: 4px;

  &:active {
    opacity: 0.7;
  }
`;

const OptionLabel = styled.span`
  ${titleSizes.small};
`;

const OPTIONS = [
  { value: "ch.tw", label: <OptionLabel>中文</OptionLabel> },
  { value: "en", label: <OptionLabel>EN</OptionLabel> },
];

const DROPDOWN_ITEMS = [
  { key: "ch.tw", label: <OptionLabel>中文</OptionLabel> },
  { key: "en", label: <OptionLabel>EN</OptionLabel> },
];

type LanguageSelectProps = {
  onChange: (value: string) => void;
  isMobile?: boolean;
};

const LanguageSelect: React.FC<LanguageSelectProps> = ({ onChange, isMobile = false }) => {
  if (isMobile) {
    return (
      <Dropdown
        trigger={["click"]}
        menu={{
          items: DROPDOWN_ITEMS,
          onClick: ({ key }) => onChange(key),
        }}
      >
        <MobileIconBtn>
          <GlobalOutlined />
        </MobileIconBtn>
      </Dropdown>
    );
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Select: {
            controlHeight: 36,
            borderRadius: 8,
            colorBorder: font.color.gray,
            colorText: font.color.gray,
            optionSelectedColor: font.color.blue,
          },
        },
      }}
    >
      <Select
        style={{ width: "80px" }}
        defaultValue="ch.tw"
        onChange={onChange as any}
        options={OPTIONS}
      />
    </ConfigProvider>
  );
};

export default LanguageSelect;