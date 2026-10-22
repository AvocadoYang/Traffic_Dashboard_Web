import { FC, ReactNode, useState } from "react";
import { Modal } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { c, font, space } from "./tokens";

/**
 * 區塊標題旁的問號: 點開看詳細的使用說明。
 * 說明放在 translation.json 的 `${i18nKey}`: { title, sections: [{ title, items[] }] };
 * extra 會放在說明最上面 (例如示意圖)。
 */
type HelpSection = { title: string; items: string[] };

const IconButton = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: ${c.textMuted};
  font-size: 14px;
  text-transform: none;

  &:hover {
    color: ${c.accent};
  }
  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
    border-radius: 50%;
  }
`;

const SectionHeading = styled.h4`
  margin: ${space.lg} 0 ${space.xs};
  font-size: ${font.lg};
`;

const Items = styled.ul`
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
`;

const HelpButton: FC<{ i18nKey: string; label: string; extra?: ReactNode }> = ({
  i18nKey,
  label,
  extra,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sections = t(`${i18nKey}.sections` as never, {
    returnObjects: true,
  }) as unknown as HelpSection[];

  return (
    <>
      <IconButton type="button" aria-label={label} title={label} onClick={() => setOpen(true)}>
        <QuestionCircleOutlined />
      </IconButton>
      <Modal
        open={open}
        title={t(`${i18nKey}.title` as never)}
        footer={null}
        width={640}
        onCancel={() => setOpen(false)}
      >
        {extra}
        {(Array.isArray(sections) ? sections : []).map((s) => (
          <section key={s.title}>
            <SectionHeading>{s.title}</SectionHeading>
            <Items>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </Items>
          </section>
        ))}
      </Modal>
    </>
  );
};

export default HelpButton;
