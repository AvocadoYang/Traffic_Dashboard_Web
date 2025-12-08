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
                    // console.log(clientX, clientY, mapRef.current.offsetLeft,Top, scale)

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
        eventSwitch
     ])
};

export default useDetectLoc;