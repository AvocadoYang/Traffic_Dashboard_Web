import { LocationType } from "@/types/map/locationTypes";
import { hsl } from "color-convert";
import { md5 } from "@/utils/md5";

export const getLocationInfoById = (
  locationId: string,
  locationList: Array<LocationType>,
) => {
  const result = locationList.filter(
    (v) => v.locationId.toString() === locationId,
  );
  return result[0];
};

export const getMoveIndex = (
  array: { key?: unknown }[],
  dragItem: { active: { id: unknown }; over: { id: unknown } | null },
) => {
  const { active, over } = dragItem;
  let activeIndex = 0;
  let overIndex = 0;
  try {
    // 找出active和over的index
    array.forEach((item, index) => {
      if (active.id === item.key) {
        activeIndex = index;
      }
      if ((over as { id: unknown }).id === item.key) {
        overIndex = index;
      }
    });
  } catch {
    overIndex = activeIndex; // 如果有問題就復位
  }
  return { activeIndex, overIndex };
};

export const borderColor = (id: string) => {
  const seed = parseInt(`0x${md5(id)}`, 16);
  const h = seed % 360;
  const s = (seed % 70) + 40;
  const l = (seed % 60) + 20;
  const color = `#${hsl.hex([h, s, l])}`;
  return color;
};

export const tagColor = (id: string) => {
  const seed = parseInt(`0x${md5(id)}`, 16);
  const h = seed % 380;
  const s = (seed % 60) + 70;
  const l = (seed % 60) + 30;
  const color = `#${hsl.hex([h, s, l])}`;
  return color;
};
