import { pointInPolygon } from './geometry.js';

const SURFACE_PRIORITY = ['water', 'bunker', 'green', 'tee', 'fairway', 'rough'];

export function surfaceAt(point, hole) {
  if (!hole?.surfaces) return 'ob';
  const present = new Map();
  for (const surface of hole.surfaces) {
    if (!present.has(surface.type) && pointInPolygon(point, surface.polygon)) {
      present.set(surface.type, true);
    }
  }
  for (const type of SURFACE_PRIORITY) {
    if (present.has(type)) return type;
  }
  return 'ob';
}

export function isHazard(type) {
  return type === 'water' || type === 'ob';
}

export function polygonsOfType(hole, type) {
  return (hole.surfaces ?? [])
    .filter((surface) => surface.type === type)
    .map((surface) => surface.polygon);
}

export function holeBounds(hole) {
  if (hole.bounds) return hole.bounds;
  const points = [];
  for (const surface of hole.surfaces ?? []) {
    points.push(...surface.polygon);
  }
  if (hole.tee) points.push(hole.tee);
  if (hole.hole) points.push(hole.hole);
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { minX, minY, maxX, maxY };
}
