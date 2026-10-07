import { memo, useCallback, useEffect, useState } from "react";
import {
  DownOutlined,
  UpOutlined,
  CloseOutlined,
  BarsOutlined,
  AppstoreOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
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
import { mq } from "@/styles/responsive";
import { useTranslation } from "react-i18next";
import {
  CAR_CARD_DENSITIES,
  carCardDensityAtom,
  type CarCardDensity,
} from "./cardDensity";

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

const TitleIcon = styled.div`
  color: var(--c-header-accent);
`;

// 卡片排列方式的切換鈕。TitleBar 在 1500px 以下會整條收掉,
// 所以這排獨立出來,任何寬度都切得到。
const DensityBar = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 12px;
  border: 1px solid var(--c-header-border);
  border-radius: 4px;
  background: var(--c-bg);
  overflow: hidden;

  /* 底部面板的卡片是橫向捲動的,切換鈕固定在左邊不跟著捲走 */
  position: sticky;
  left: 0;
  max-width: 360px;

  ${mq.web} {
    position: static;
    max-width: none;
  }
`;

const DensityBtn = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) =>
    $active ? "var(--c-header-accent)" : "var(--c-text-secondary)"};
  background: ${({ $active }) =>
    $active ? "var(--c-header-accent-soft)" : "transparent"};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  & + & {
    border-left: 1px solid var(--c-header-border);
  }

  &:hover {
    color: var(--c-header-accent);
    background: ${({ $active }) =>
      $active ? "var(--c-header-accent-soft)" : "var(--c-bg-muted)"};
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: -2px;
  }

  > span:last-child {
    white-space: nowrap;
  }

  /* 桌機側欄很窄,三顆按鈕放不下文字,只留圖示,文字用 title 提示 */
  ${mq.web} {
    > span:last-child {
      display: none;
    }
  }
`;

const DENSITY_ICON: Record<CarCardDensity, React.ReactNode> = {
  compact: <BarsOutlined />,
  normal: <AppstoreOutlined />,
  detailed: <ProfileOutlined />,
};

const DensitySwitch: React.FC = memo(() => {
  const { t } = useTranslation();
  const [density, setDensity] = useAtom(carCardDensityAtom);
  return (
    <DensityBar role="group" aria-label={t("amr_card.density") as string}>
      {CAR_CARD_DENSITIES.map((item) => (
        <DensityBtn
          key={item}
          type="button"
          $active={density === item}
          aria-pressed={density === item}
          title={t(`amr_card.density_${item}_hint`) as string}
          onClick={() => setDensity(item)}
        >
          {DENSITY_ICON[item]}
          <span>{t(`amr_card.density_${item}`)}</span>
        </DensityBtn>
      ))}
    </DensityBar>
  );
});

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
  const { t } = useTranslation();
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
          <Title $isDark={isDark}>{t("main.amrs")}</Title>

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
              style={{ color: "var(--c-header-accent)" }}
            />
          ) : (
            <TitleIcon>
              <UpDownIcon isDrop={isDrop} setIsDrop={setIsDrop}></UpDownIcon>
            </TitleIcon>
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
              placeholder={t("main.amr_category")}
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

      <DensitySwitch />
    </>
  );
};

export default memo(TittleTools);
