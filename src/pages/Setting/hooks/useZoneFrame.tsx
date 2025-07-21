import useMap from '@/api/useMap';
import { EditZoneSwitch } from '@/utils/siderGloble';
import { useAtomValue } from 'jotai';
import { RefObject, useEffect } from 'react';
import { fromEvent, switchMap, takeUntil, tap, EMPTY, take, merge } from 'rxjs';
import { rvizCoord } from '@/utils/utils';
import { MouseLocationForFrame, RectInfo } from './hook';
import { FormInstance } from 'antd';

const useZoneFrame = (
  mapWrapRef: RefObject<HTMLDivElement>,
  mapRef: RefObject<HTMLDivElement>,
  mapImageRef: RefObject<HTMLImageElement>,
  scale: number,
  setIsDragging: React.Dispatch<boolean>,
  setInitPointRecord: React.Dispatch<MouseLocationForFrame>,
  setEndPointRecord: React.Dispatch<MouseLocationForFrame>,
  setRectInfo: React.Dispatch<RectInfo>,
  zonePanelForm: FormInstance<unknown>
) => {
  const { data } = useMap();
  const openEditZone = useAtomValue(EditZoneSwitch);

  useEffect(() => {
    if (!mapWrapRef.current || !mapRef.current || !mapImageRef.current || !data || !openEditZone)
      return;
    const mapPanel = mapRef.current;
    const mapWrap = mapWrapRef.current;

    //點擊開始拖曳
    const mouseDown$ = fromEvent<MouseEvent>(mapRef.current, 'mousedown').pipe(
      switchMap((startEvent) => {
        // zonePanelForm.resetFields()
        if (!mapPanel || !mapWrap || !mapImageRef) return EMPTY;
        setIsDragging(true);
        startEvent.preventDefault();
        setRectInfo({
          axisX: -5000,
          axisY: -5000,
          width: 0,
          height: 0
        });
        if ((mapImageRef.current as HTMLElement).nodeName !== 'IMG') return EMPTY;
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;
        const startXForDisplay = startX - mapPanel.offsetLeft + mapWrap.scrollLeft;
        const startYForDisplay = startY - mapPanel.offsetTop + mapWrap.scrollTop;

        const [rx, ry] = rvizCoord({
          displayX: startXForDisplay,
          displayY: startYForDisplay,
          mapResolution: data?.mapResolution,
          mapOriginX: data?.mapOriginX,
          mapOriginY: data?.mapOriginY,
          mapHeight: data?.mapHeight,
          scaleSize: scale
        });
        setInitPointRecord({
          rvizX: rx,
          rvizY: ry
        });
        zonePanelForm.setFieldValue('startX', Number(rx).toFixed(3));
        zonePanelForm.setFieldValue('startY', Number(ry).toFixed(3));
        return fromEvent<MouseEvent>(mapRef.current, 'mousemove').pipe(
          tap((moveEvent) => {
            //這裡可以傳遞矩形範圍給 state 或其他處理函數
            const endX = moveEvent.clientX - mapPanel.offsetLeft + mapWrap.scrollLeft;
            const endY = moveEvent.clientY - mapPanel.offsetTop + mapWrap.scrollTop;
            setRectInfo({
              axisX: Math.min(endX / scale, startXForDisplay / scale),
              axisY: Math.min(endY / scale, startYForDisplay / scale),
              width: Math.abs((endX - startXForDisplay) / scale),
              height: Math.abs((endY - startYForDisplay) / scale)
            });
          }),
          takeUntil(
            merge(
              fromEvent<MouseEvent>(mapPanel, 'mouseup').pipe(
                tap((e) => {
                  const endXForDisplay = e.clientX - mapPanel.offsetLeft + mapWrap.scrollLeft;
                  const endYForDisplay = e.clientY - mapPanel.offsetTop + mapWrap.scrollTop;
                  // console.log('mouseup 事件，停止拖曳')
                  const [rx, ry] = rvizCoord({
                    displayX: endXForDisplay,
                    displayY: endYForDisplay,
                    mapResolution: data?.mapResolution,
                    mapOriginX: data?.mapOriginX,
                    mapOriginY: data?.mapOriginY,
                    mapHeight: data?.mapHeight,
                    scaleSize: scale
                  });
                  setEndPointRecord({
                    rvizX: rx,
                    rvizY: ry
                  });
                  zonePanelForm.setFieldValue('endX', Number(rx).toFixed(3));
                  zonePanelForm.setFieldValue('endY', Number(ry).toFixed(3));
                  setIsDragging(false);
                }),
                take(1)
              ),
              fromEvent<MouseEvent>(mapPanel, 'mouseleave').pipe(
                tap(() => {
                  // console.log('mouseleave 事件，停止拖曳')
                  setIsDragging(false);
                  setRectInfo({
                    axisX: -5000,
                    axisY: -5000,
                    width: 0,
                    height: 0
                  });
                }),
                take(1)
              )
            )
          )
        );
      })
    );

    const subscription = mouseDown$.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [mapRef, mapWrapRef, scale, openEditZone]);

  return null;
};

export default useZoneFrame;
