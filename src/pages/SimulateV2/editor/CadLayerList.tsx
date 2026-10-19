/** DXF 圖層的顯示開關 (匯入時、底圖視窗、狀態列的圖層選單共用) */
import { FC, useMemo, useState } from "react";
import { Button, Checkbox, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { CadLayerInfo } from "../io/dxf/types";

const List = styled.div`
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 4px 8px;

  .ant-checkbox-wrapper {
    display: flex;
    width: 100%;
    margin: 2px 0;
  }
  .ant-checkbox-wrapper > span:last-child {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
  }
  .name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    margin-left: 8px;
    color: var(--c-text-muted);
    font-size: 12px;
    white-space: nowrap;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--c-text-secondary);
`;

/** 圖層多於這麼多個才顯示搜尋框 */
const SEARCH_FROM = 10;

const CadLayerList: FC<{
  layers: CadLayerInfo[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  testId?: string;
}> = ({ layers, hidden, onChange, testId }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  // 沒有任何線和字的圖層 (例如只是列在圖層表裡) 不列出來
  const used = useMemo(() => layers.filter((l) => l.lines + l.texts > 0), [layers]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? used.filter((l) => l.name.toLowerCase().includes(q)) : used;
  }, [used, query]);
  const hiddenSet = new Set(hidden);
  const visibleCount = used.filter((l) => !hiddenSet.has(l.name)).length;

  const toggle = (name: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.delete(name);
    else next.add(name);
    onChange([...next]);
  };
  const setAll = (on: boolean) => {
    const names = new Set(shown.map((l) => l.name));
    const next = new Set(hidden);
    for (const n of names) {
      if (on) next.delete(n);
      else next.add(n);
    }
    onChange([...next]);
  };

  return (
    <div data-testid={testId}>
      <Head>
        <span style={{ flex: "1 1 auto" }}>{t("sim_v2.cad.layers_count", { shown: visibleCount, total: used.length })}</span>
        <Button size="small" type="link" onClick={() => setAll(true)}>
          {t("sim_v2.cad.show_all")}
        </Button>
        <Button size="small" type="link" onClick={() => setAll(false)}>
          {t("sim_v2.cad.hide_all")}
        </Button>
      </Head>
      {used.length > SEARCH_FROM && (
        <Input
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("sim_v2.cad.search_layer")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 6 }}
        />
      )}
      <List>
        {shown.map((l) => (
          <Checkbox key={l.name} checked={!hiddenSet.has(l.name)} onChange={(e) => toggle(l.name, e.target.checked)}>
            <span className="name" title={l.name}>
              {l.name}
            </span>
            <span className="count">{t("sim_v2.cad.layer_counts", { lines: l.lines, texts: l.texts })}</span>
          </Checkbox>
        ))}
        {!shown.length && <div style={{ padding: 8, color: "var(--c-text-muted)" }}>{t("sim_v2.cad.no_layer_match")}</div>}
      </List>
    </div>
  );
};

export default CadLayerList;
