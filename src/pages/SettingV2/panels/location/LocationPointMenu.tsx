import { FC, RefObject, useEffect, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { EditOutlined, AimOutlined } from "@ant-design/icons";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import useMap from "@/api/useMap";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import { LDM } from "@/pages/Setting/utils/settingJotai";
import { isDetectableAreaType } from "@/pages/Setting/mapComponents/components/AllLocation/components/MirAreaTypeMarker";
import LocationEditModal, {
  LocationRow,
} from "@/pages/SettingV2/panels/location/LocationEditModal";

export type LocationPointMenuTarget = {
  locationId: string;
  x: number;
  y: number;
};

type Props = {
  target: LocationPointMenuTarget | null;
  onClose: () => void;
  wrapRef: RefObject<HTMLDivElement>;
};

const LocationPointMenu: FC<Props> = ({ target, onClose, wrapRef }) => {
  const { t } = useTranslation();
  const { data: mapData } = useMap();
  const setOpenLDM = useSetAtom(LDM);
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(
    null,
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!target || !wrap) return;
    wrap.addEventListener("wheel", onClose, { passive: true });
    return () => wrap.removeEventListener("wheel", onClose);
  }, [target, wrapRef, onClose]);

  const { data: resources } = useAllGroupsResources();
  const findLocationRow = (locationId: string): LocationRow | null => {
    const candidates = (resources?.groups ?? [])
      .filter((g) => g.isUsing)
      .flatMap((g) =>
        g.maps.flatMap((m) =>
          m.locations
            .filter((loc) => loc.locationId === locationId)
            .map((loc) => ({
              ...loc,
              x: loc.x.toFixed(3),
              y: loc.y.toFixed(3),
              mapId: m.mapId,
              mapFileName: m.fileName,
              groupName: g.groupName,
              isActiveGroup: g.isUsing,
            })),
        ),
      );
    const row =
      candidates.find((c) => c.mapId === mapData?.mapId) ?? candidates[0];
    return row ?? null;
  };

  const location = target
    ? mapData?.locations.find((l) => String(l.locationId) === target.locationId)
    : undefined;
  const row = target ? findLocationRow(target.locationId) : null;
  const items: MenuProps["items"] = [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: t("utils.edit"),
      disabled: !row,
    },
    ...(location && isDetectableAreaType(location.areaType)
      ? [
          {
            key: "detect",
            icon: <AimOutlined />,
            label: t("location_detect.title"),
          },
        ]
      : []),
  ];
  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (!target) return;
    if (key === "edit") setEditingLocation(row);
    if (key === "detect")
      setOpenLDM({ locationId: target.locationId, isOpen: true });
    onClose();
  };

  return (
    <>
      <Dropdown
        open={!!target}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        trigger={["click"]}
        menu={{ items, onClick }}
      >
        <span
          style={{
            position: "fixed",
            left: target?.x ?? 0,
            top: target?.y ?? 0,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </Dropdown>
      <LocationEditModal
        location={editingLocation}
        onClose={() => setEditingLocation(null)}
      />
    </>
  );
};

export default LocationPointMenu;
