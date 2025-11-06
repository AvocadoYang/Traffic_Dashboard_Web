import { memo } from "react";
// import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, SelectProps, Tooltip } from "antd";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import { QuestionCircleFilled } from "@ant-design/icons";
import MissionRejectReasonInfo from "./components/MissionRejectReasonInfo";

const options: SelectProps["options"] = [];

for (let i = 10; i < 36; i++) {
  options.push({
    value: i.toString(36) + i,
    label: i.toString(36) + i,
  });
}

const TitleTools = () => {
  const isDark = useAtomValue(darkMode);
  // const [isDrop, setIsDrop] = useState(false);
  return (
    <>
      <Flex gap="middle">
        <span className={`card-wrap-title ${isDark ? "dark-mode-title" : ""}`}>
          Missions
        </span>
        <Popover content={<MissionRejectReasonInfo />} trigger="click">
          <Tooltip title="Why Rejected?">
            <QuestionCircleFilled />
          </Tooltip>
        </Popover>
      </Flex>
    </>
  );
};

export default memo(TitleTools);
