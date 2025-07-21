import { useEffect, RefObject } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { DragLineInfo, showBlockId as ShowBlockId } from '@/utils/gloable';
import { rad2Deg } from '@/utils/utils';
import { FormInstance } from 'antd';
import { draggableLineInitialPoint } from './hook';
import { getLocationInfoById } from '@/pages/Setting/utils/utils';
import useMap from '@/api/useMap';
import { LocationType } from '@/utils/jotai';
import { EditRoadPanelSwitch, EditZoneSwitch } from '@/utils/siderGloble';

const useDraggableLine = (
  mapRef: RefObject<HTMLDivElement>,
  roadPanelForm: FormInstance<unknown>,
  initPoint: draggableLineInitialPoint,
  isResizing: boolean,
  setIsResizing: React.Dispatch<boolean>,
  scale: number
) => {
  const [showBlockId, setShowBlockId] = useAtom(ShowBlockId);
  const [, setDragLineInfo] = useAtom(DragLineInfo);
  const openEditRoadPanel = useAtomValue(EditRoadPanelSwitch);
  const openEditZone = useAtomValue(EditZoneSwitch);
  const { data: mapData } = useMap();

  const handleMouseUp = (endId: string) => {
    if (endId === '') {
      setShowBlockId('');
      return;
    }
    setIsResizing(!isResizing);
    const result = getLocationInfoById(endId, mapData?.locations as LocationType[]);
    roadPanelForm.setFieldValue('to', result.locationId);
  };

  const mouseMoveEvent = (e: MouseEvent) => {
    if (!isResizing) return;
    const rad = Math.atan2(e.clientY - initPoint.clientY, e.clientX - initPoint.clientX);
    const deg = rad2Deg(rad);
    const width = Math.sqrt(
      (e.clientX - initPoint.clientX) ** 2 + (e.clientY - initPoint.clientY) ** 2
    );
    const newLocation = {
      deg,
      width: width / (scale || 1),
      // width ? width / (scale || 1) : 5,
      endDisplayX1: e.clientX,
      endDisplayY1: e.clientY
    };
    setDragLineInfo(() => {
      return {
        ...newLocation
      };
    });
  };

  const mouseUpEvent = (e: MouseEvent) => {
    e.stopPropagation();
    if (!setShowBlockId || !setIsResizing) return;
    const targetTag = (e.target as HTMLInputElement).tagName;
    if (targetTag === 'IMG' && (e.target as HTMLInputElement).id === '') {
      setShowBlockId('');
      setDragLineInfo({
        deg: 90,
        endDisplayX1: initPoint.clientX,
        endDisplayY1: initPoint.clientY,
        width: 0
      });
      return;
    }
    if (showBlockId === (e.target as HTMLInputElement).id) {
      setShowBlockId('');
      setDragLineInfo({
        deg: 90,
        endDisplayX1: initPoint.clientX,
        endDisplayY1: initPoint.clientY,
        width: 0
      });
      return;
    }
    if (!handleMouseUp) return;
    handleMouseUp((e.target as HTMLInputElement).id);
    setIsResizing(false);
  };

  useEffect(() => {
    if (showBlockId === '' || !openEditRoadPanel || openEditZone) return;
    let mapPanelRefCopy: HTMLDivElement;
    if (mapRef && mapRef.current) {
      mapPanelRefCopy = mapRef.current;
      mapPanelRefCopy.addEventListener('mousemove', mouseMoveEvent);
      mapPanelRefCopy.addEventListener('mouseup', mouseUpEvent);
    }
    return () => {
      mapPanelRefCopy.removeEventListener('mousemove', mouseMoveEvent);
      mapPanelRefCopy.removeEventListener('mouseup', mouseUpEvent);
    };
  }, [mapRef, mouseMoveEvent, mouseUpEvent, initPoint, showBlockId]);
};

export default useDraggableLine;
