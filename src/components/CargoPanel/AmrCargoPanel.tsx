import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { useIsCarry } from "@/sockets/useAMRInfo";
import CargoEditorDrawer from "./CargoEditorDrawer";
import { sortCargo } from "./cargoList";

const Hint = styled.div`
  font-size: 13px;
  color: var(--c-text-secondary);
`;

/** 車上攜帶的貨物,跟點位用同一個面板 */
const AmrCargoPanel: FC<{
  amrId: string;
  open: boolean;
  onClose: () => void;
}> = ({ amrId, open, onClose }) => {
  const { t } = useTranslation();
  const { cargo } = useIsCarry(amrId);
  const sorted = useMemo(() => sortCargo(cargo ?? []), [cargo]);

  return (
    <CargoEditorDrawer
      open={open}
      onClose={onClose}
      resetKey={amrId}
      name={amrId}
      meta={`${t("cargo_panel.type_amr")} · ${t("cargo_panel.cargo_count", {
        count: sorted.length,
      })}`}
      cargo={sorted}
      capacity={null}
      order="none"
      notices={<Hint>{t("amr_card.add_desc")}</Hint>}
      save={(list, knownCargoIds) =>
        client.post("/api/amr/update-cargo-info", {
          amrId,
          cargo: list,
          knownCargoIds,
        })
      }
    />
  );
};

export default AmrCargoPanel;
