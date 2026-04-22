import { Select, ConfigProvider } from "antd";
import { font } from "@/styles/variables";

type LanguageSelectProps = {
  onChange: (value: string) => void;
};

const LanguageSelect: React.FC<LanguageSelectProps> = ({ onChange }) => (
  <ConfigProvider
    theme={{
      components: {
        Select: {
          controlHeight: 36,
          borderRadius: 7,
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
      options={[
        { value: "en", label: "EN" },
        { value: "ch.tw", label: "中文" },
      ]}
    />
  </ConfigProvider>
);

export default LanguageSelect;

