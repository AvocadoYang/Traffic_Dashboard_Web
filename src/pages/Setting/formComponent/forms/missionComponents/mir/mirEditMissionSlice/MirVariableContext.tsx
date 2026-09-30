import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface MirVariableFieldState {
  enabled: boolean;
  name: string;
}

interface MirVariableContextValue {
  fields: Record<string, MirVariableFieldState>;
  setVariable: (fieldName: string, enabled: boolean, name: string) => void;
  setAllFields: (fields: Record<string, MirVariableFieldState>) => void;
}

const EMPTY_FIELD: MirVariableFieldState = { enabled: false, name: "" };

const MirVariableContext = createContext<MirVariableContextValue | null>(
  null,
);

export const MirVariableProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [fields, setFields] = useState<Record<string, MirVariableFieldState>>(
    {},
  );

  const setVariable = useCallback(
    (fieldName: string, enabled: boolean, name: string) => {
      setFields((prev) => ({ ...prev, [fieldName]: { enabled, name } }));
    },
    [],
  );

  const setAllFields = useCallback(
    (nextFields: Record<string, MirVariableFieldState>) => {
      setFields(nextFields);
    },
    [],
  );

  return (
    <MirVariableContext.Provider value={{ fields, setVariable, setAllFields }}>
      {children}
    </MirVariableContext.Provider>
  );
};

const useMirVariableContext = () => {
  const ctx = useContext(MirVariableContext);
  if (!ctx) {
    throw new Error(
      "useMirVariableContext must be used within a MirVariableProvider",
    );
  }
  return ctx;
};

export const useMirVariableField = (fieldName: string) => {
  const ctx = useMirVariableContext();
  const field = ctx.fields[fieldName] ?? EMPTY_FIELD;

  return {
    enabled: field.enabled,
    name: field.name,
    setVariable: (enabled: boolean, name: string) =>
      ctx.setVariable(fieldName, enabled, name),
  };
};

// 給表單頂層用:讀取整份變數狀態(存檔組 payload 用)、或整包覆寫
// (從後端載入既有資料、還原變數狀態用)。
export const useMirVariableFields = () => {
  const ctx = useMirVariableContext();
  return { fields: ctx.fields, setAllFields: ctx.setAllFields };
};
