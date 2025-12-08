import { mouseMoveSwitch, mousePosition } from "@/utils/siderGloble";
import { useAtom, useAtomValue } from "jotai";
import { RefObject, useEffect } from "react";
import { debounceTime, fromEvent, map, throttleTime } from "rxjs";

const useMouseMove = (
    mapRef: RefObject<HTMLDivElement>,
) => {
     const [_, setMousePosition] = useAtom(mousePosition);
       const eventSwitch = useAtomValue(mouseMoveSwitch)


     useEffect(() => {
        if(!mapRef.current || !eventSwitch) return;
        const mouseMoveEvent$ = fromEvent<MouseEvent>(mapRef.current, "mousemove").pipe((
            throttleTime(300),
            debounceTime(300),
            map(({ clientX, clientY}) => {
                return { clientX, clientY}
            })
        ));


        const sub$ = mouseMoveEvent$.subscribe(({ clientX, clientY}) => {
            setMousePosition({ clientX, clientY})
        })

        return () => {
            sub$.unsubscribe();
        };
     },[
        mapRef,
        eventSwitch
     ])
};

export default useMouseMove;