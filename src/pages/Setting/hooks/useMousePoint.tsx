import { useEffect, RefObject } from "react";
import { fromEvent, throttleTime, debounceTime, map, tap } from "rxjs";
import { rvizCoord } from "@/utils/utils";
import useMap from "@/api/useMap";
import { FormInstance } from "antd";
import { useAtom, useAtomValue } from "jotai";
import {
  locationXForQuickEditLocationPanel,
  locationYForQuickEditLocationPanel,
  mousePoint_X,
  mousePoint_Y,
} from "@/utils/gloable";
import {
  EditZoneSwitch,
  QuickEditLocationPanelSwitch,
} from "@/utils/siderGloble";

const useMousePoint = (
  mapWrapRef: RefObject<HTMLDivElement>,
  mapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
  scale: number,
  locationPanelForm: FormInstance<unknown>,
  showEditLocationPanel: boolean,
) => {
  const [, setMousePointX] = useAtom(mousePoint_X); // MousePoint 編輯點位小紅點
  const [, setMousePointY] = useAtom(mousePoint_Y); // MousePoint 編輯點位小紅點
  const [, setLocationXForQuickEditLocationPanel] = useAtom(
    locationXForQuickEditLocationPanel,
  );
  const [, setLocationYForQuickEditLocationPanel] = useAtom(
    locationYForQuickEditLocationPanel,
  );
  const showQuickEditLocationPanel = useAtomValue(QuickEditLocationPanelSwitch);
  const openEditZone = useAtomValue(EditZoneSwitch);

  const { data } = useMap();
  useEffect(() => {
    if (
      !mapWrapRef.current ||
      !mapRef.current ||
      !mapImageRef.current ||
      (!showEditLocationPanel && !showQuickEditLocationPanel) ||
      openEditZone ||
      !data
    ) {
      return;
    }

    const clickEvent$ = fromEvent<MouseEvent>(mapRef.current, "click").pipe(
      throttleTime(300),
      debounceTime(300),
      map(({ clientX, clientY }) => ({
        clientX,
        clientY,
      })),
      tap(({ clientX, clientY }) => {
        if (!mapRef.current || !mapWrapRef.current) return;
        const rect = mapImageRef.current!.getBoundingClientRect();
        const Left = mapWrapRef.current.scrollLeft;
        const Top = mapWrapRef.current.scrollTop;
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          return;
        }
        if (!mapRef.current || !mapWrapRef.current) return;

        const adjustX = clientX - mapRef.current.offsetLeft + (Left as number);
        const adjustY = clientY - mapRef.current.offsetTop + (Top as number);
        const [rx, ry] = rvizCoord({
          displayX: adjustX,
          displayY: adjustY,
          mapResolution: data?.mapResolution,
          mapOriginX: data?.mapOriginX,
          mapOriginY: data?.mapOriginY,
          mapHeight: data?.mapHeight,
          scaleSize: scale,
        });

        setMousePointX(adjustX / scale);
        setMousePointY(adjustY / scale);
        setLocationXForQuickEditLocationPanel(Number(rx.toFixed(5)));
        setLocationYForQuickEditLocationPanel(Number(ry.toFixed(5)));
        locationPanelForm.setFieldValue("x", Number(rx.toFixed(5)));
        locationPanelForm.setFieldValue("y", Number(ry.toFixed(5)));
      }),
    );

    const subscription = clickEvent$.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [
    mapRef,
    mapWrapRef,
    scale,
    showEditLocationPanel,
    showQuickEditLocationPanel,
    openEditZone,
  ]);
};

export default useMousePoint;
