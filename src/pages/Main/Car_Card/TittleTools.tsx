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
import { themeAtom } from "@/theme";
import styled from "styled-components"; // Added styled-components

// --- Reusing the Styled Components from the Missions component ---
const TitleBar = styled.div<{ $isDark: boolean }>`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
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
  color: var(--c-text);

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

const TittleTools: React.FC<{}> = () => {
  const isDark = useAtomValue(darkMode);
  // antd 的 token 不能吃 var(),要餵真實色碼,所以這裡直接拿 palette
  const { colors } = useAtomValue(themeAtom);
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
                  activeBorderColor: colors.headerAccent,
                  hoverBorderColor: colors.headerAccent,
                },
                Select: {
                  activeBorderColor: colors.headerAccent,
                  hoverBorderColor: colors.headerAccent,
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
