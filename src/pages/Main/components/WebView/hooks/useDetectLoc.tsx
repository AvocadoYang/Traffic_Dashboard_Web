import useMap from "@/api/useMap";
import { mouseDetectLoc } from "@/utils/gloable";
import { isShowLocationTooltip, mouseMoveSwitch } from "@/utils/siderGloble";
import { rvizCoord } from "@/utils/utils";
import { useAtom, useAtomValue } from "jotai";
import { RefObject, useEffect } from "react";
import { debounceTime, fromEvent, map, throttleTime } from "rxjs";

const useDetectLoc = (
    mapRef: RefObject<HTMLDivElement>,
    mapWrapRef: RefObject<HTMLDivElement>,
    mapImageRef: RefObject<HTMLImageElement>,
    scale: number,
) => {
     const showLocationToolTip = useAtomValue(isShowLocationTooltip);
     const [_, setMouseDetectLoc] = useAtom(mouseDetectLoc);
     const eventSwitch = useAtomValue(mouseMoveSwitch)
     const { data } = useMap();



     useEffect(() => {
        if (
            !mapWrapRef.current ||
            !mapRef.current ||
            !mapImageRef.current ||
            !showLocationToolTip ||
            !data ||
            ! eventSwitch
          ) {
            return;
          };
        const mouseMoveEvent$ = fromEvent<MouseEvent>(mapRef.current, "mousemove").pipe((
            throttleTime(300),
            debounceTime(300),
            map(({ clientX, clientY}) => {
                return { clientX, clientY}
            })
        ));


        const sub$ = mouseMoveEvent$.subscribe(({ clientX, clientY}) => {
                    if (!mapRef.current || !mapWrapRef.current || !mapImageRef.current) return;
                    const rect = mapImageRef.current.getBoundingClientRect();
                    if (
                      clientX < rect.left ||
                      clientX > rect.right ||
                      clientY < rect.top ||
                      clientY > rect.bottom
                    ) {
                      return;
                    }

                    const adjustX = clientX - rect.left;
                    const adjustY = clientY - rect.top;
                    const [rx, ry] = rvizCoord({
                      displayX: adjustX,
                      displayY: adjustY,
                      mapResolution: data?.mapResolution,
                      mapOriginX: data?.mapOriginX,
                      mapOriginY: data?.mapOriginY,
                      mapHeight: data?.mapHeight,
                      scaleSize: scale,
                    });
                    
                    const inRangeLoc = data.locations.filter((loc) => {
                        const { x, y } = loc;
                        return Math.hypot(rx-x, ry- y) <= 2
                    }).map((loc) => loc.locationId);

                    setMouseDetectLoc(new Set(inRangeLoc));
                   
        })

        return () => {
            sub$.unsubscribe();
        };
     },[
        mapRef,
        mapWrapRef,
        scale,
        showLocationToolTip,
        eventSwitch,
        data
     ])
};

export default useDetectLoc;