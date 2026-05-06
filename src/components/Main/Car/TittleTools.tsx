import { memo, useCallback, useEffect, useState } from "react";
import { DownOutlined, UpOutlined, CloseOutlined } from "@ant-design/icons";
import { ConfigProvider, Select, SelectProps, Flex } from "antd"; // Added Flex
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AmrCarSelectFilter,
  AmrFilterCarCard,
  darkMode,
} from "@/utils/gloable";
import useName from "@/api/useAmrName";
import { DefaultOptionType } from "antd/es/select";
import styled from "styled-components"; // Added styled-components

// --- Reusing the Styled Components from the Missions component ---
const TitleBar = styled.div<{ $isDark: boolean }>`
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#ffffff")};
  border: 1px solid ${({ $isDark }) => ($isDark ? "#333" : "#d9d9d9")};
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
  cursor: pointer; /* To indicate the whole bar is clickable */
  @media (max-width: 1500px) {
    display: none;
  }
`;

const Title = styled.span<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};

  @media (max-width: 1200px) {
    font-size: 12px;
  }
`;
// ----------------------------------------------------------------

const UpDownIcon: React.FC<{
  isDrop: boolean;
  setIsDrop: React.Dispatch<boolean>;
}> = memo(({ isDrop, setIsDrop }) => {
  return (
    <>
      {isDrop ? (
        <UpOutlined
          style={{ marginLeft: "auto" }}
          onClick={() => setIsDrop(false)}
        />
      ) : (
        <DownOutlined
          style={{ marginLeft: "auto" }}
          onClick={() => setIsDrop(true)}
        />
      )}
    </>
  );
});


// 左側
const TittleTools: React.FC<{}> = () => {
  const isDark = useAtomValue(darkMode);
  const setSelectedOption = useSetAtom(AmrCarSelectFilter);
  const [selectOption, setSelectOption] = useState<SelectProps["options"]>([]);

  const { data: names } = useName();
  const [hintAmrId, setHintAmrId] = useAtom(AmrFilterCarCard);
  const [isDrop, setIsDrop] = useState(false);

  useEffect(() => {
    if (!names) return;
    const AMRCategories = new Set<string>();
    for (let name of names.amrs) {
      const { amrId } = name;
      const category = amrId.split("-").slice(0, 3).join("-");
      AMRCategories.add(category);
    }
    const allAMRCategory = [...AMRCategories].map((amrCategory) => {
      return { value: amrCategory, label: amrCategory };
    });
    setSelectOption(allAMRCategory as unknown as DefaultOptionType[]);
  }, [names]);

  const handleChange = useCallback(
    (value: string[]) => {
      setSelectedOption(
        value.map((amrCategory) => ({
          value: amrCategory,
          label: amrCategory,
        })),
      );
    },
    [setSelectedOption],
  );

  return (
    <>
      <TitleBar
        $isDark={isDark}
        onClick={() => {
          if (hintAmrId.size) {
            setHintAmrId((pre) => {
              pre.clear();
              return new Set([...pre]);
            });
            setIsDrop(false);
            return;
          }
          setIsDrop(!isDrop);
        }}
      >
        <Flex justify="space-between" align="center">
          <Title $isDark={isDark}>AMRs</Title>

          {hintAmrId.size ? (
            <CloseOutlined
              onClick={(e) => {
                e.stopPropagation(); // Prevent trigger parent onClick
                setHintAmrId((pre) => {
                  pre.clear();
                  return new Set([...pre]);
                });
                setIsDrop(false);
              }}
              style={{ color: isDark ? "#00ff41" : "#1890ff" }}
            />
          ) : (
            <div style={{ color: isDark ? "#00ff41" : "#1890ff" }}>
              <UpDownIcon isDrop={isDrop} setIsDrop={setIsDrop}></UpDownIcon>
            </div>
          )}
        </Flex>
      </TitleBar>

      {isDrop && !hintAmrId.size && (
        <div style={{ padding: "0 20px" }}>
          <ConfigProvider
            theme={{
              components: {
                Input: {
                  activeBorderColor: `${isDark ? "#ff9900" : "#1677ff"}`,
                  hoverBorderColor: `${isDark ? "#ff9900" : "#1677ff"}`,
                },
                Select: {
                  activeBorderColor: `${isDark ? "#ff9900" : "#1677ff"}`,
                  hoverBorderColor: `${isDark ? "#ff9900" : "#1677ff"}`,
                },
              },
            }}
          >
            <Select
              mode="multiple"
              placeholder="AMR category"
              onChange={handleChange}
              style={{ width: "100%", marginBottom: "20px" }}
              options={selectOption}
              onMouseDown={(e) => e.preventDefault()}
              onPopupScroll={(e) => e.stopPropagation()}
              onOpenChange={(open) => {
                document.body.style.overflow = open ? "hidden" : "auto";
              }}
            />
          </ConfigProvider>
        </div>
      )}
    </>
  );
};

export default memo(TittleTools);
