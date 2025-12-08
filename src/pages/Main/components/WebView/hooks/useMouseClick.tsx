import { mouseMoveSwitch, mousePosition } from "@/utils/siderGloble";
import { useAtom, useAtomValue } from "jotai";
import { RefObject, useEffect } from "react";
import { debounceTime, fromEvent, map, throttleTime } from "rxjs";

const useMouseClick = (
    mapWrapRef: RefObject<HTMLDivElement>,
) => {
     const [moveSwitch, setMouseMoveSwitch] = useAtom(mouseMoveSwitch);


     useEffect(() => {
        if(!mapWrapRef.current) return;
        const mouseClickEvent$ = fromEvent<MouseEvent>(mapWrapRef.current, "click").pipe((
            map(({ clientX, clientY}) => {
                return { clientX, clientY}
            })
        ));


        const sub$ = mouseClickEvent$.subscribe(({}) => {
            setMouseMoveSwitch((pre) => !pre);
        })

        return () => {
            sub$.unsubscribe();
        };
     },[
        mapWrapRef,
        moveSwitch
     ])
};

export default useMouseClick;