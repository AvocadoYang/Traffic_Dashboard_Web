import { memo, useCallback, useEffect, useState } from "react";
import { DownOutlined, UpOutlined, CloseOutlined } from "@ant-design/icons";
import { ConfigProvider, Select, SelectProps } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AmrCarSelectFilter,
  AmrFilterCarCard,
  darkMode,
} from "@/utils/gloable";
import useName from "@/api/useAmrName";
import { DefaultOptionType } from "antd/es/select";

const UpDownIcon: React.FC<{
  isDrop: boolean;
  setIsDrop: React.Dispatch<boolean>;
}> = memo(({ isDrop, setIsDrop }) => {
  return (
    <>
      {isDrop ? (
        <UpOutlined className="drop-icon" onClick={() => setIsDrop(false)} />
      ) : (
        <DownOutlined className="drop-icon" onClick={() => setIsDrop(true)} />
      )}
    </>
  );
});

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
      <span
        className={`card-wrap-title ${isDark ? "dark-mode-title" : ""}`}
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
        AMRs
        {hintAmrId.size ? (
          <CloseOutlined
            onClick={() => {
              setHintAmrId((pre) => {
                pre.clear();
                return new Set([...pre]);
              });
              setIsDrop(false);
            }}
            className="drop-icon"
          />
        ) : (
          <UpDownIcon isDrop={isDrop} setIsDrop={setIsDrop}></UpDownIcon>
        )}
      </span>
      {isDrop && !hintAmrId.size ? (
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
            style={{ width: "82%", margin: "3% 0 3% 0" }}
            options={selectOption}
            onMouseDown={(e) => e.preventDefault()}
            onPopupScroll={(e) => {
              e.stopPropagation();
            }}
            onDropdownVisibleChange={(open) => {
              if (open) {
                document.body.style.overflow = "hidden";
              } else {
                document.body.style.overflow = "auto";
              }
            }}
          />
          {/* <Input
            size="middle"
            placeholder="Search AMR"
            suffix={<SearchOutlined />}
            style={{ width: '82%', margin: '3% 0 3% 0' }}
          /> */}
        </ConfigProvider>
      ) : (
        []
      )}
    </>
  );
};

export default memo(TittleTools);
