import { MapType } from '@/api/useMap';

export const findClosestLocation = (rx: number, ry: number, map: MapType) => {
  if (!map || !map.locations.length) return null;

  let closestLocation = map.locations[0];
  let minDistance = Number.MAX_VALUE;

  for (const location of map.locations) {
    const distance = Math.sqrt((rx - location.x) ** 2 + (ry - location.y) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestLocation = location;
    }
  }

  return closestLocation.locationId;
};
