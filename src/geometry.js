export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function heading(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function boundingBox(points) {
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

export function rectPolygon(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/**
 * Intersection of segment p1->p2 with q1->q2.
 * Returns the point and t in [0, 1] along p1->p2, or null.
 */
export function segmentIntersection(p1, p2, q1, q2) {
  const rx = p2.x - p1.x;
  const ry = p2.y - p1.y;
  const sx = q2.x - q1.x;
  const sy = q2.y - q1.y;
  const rxs = rx * sy - ry * sx;
  if (Math.abs(rxs) < 1e-12) return null;
  const qpx = q1.x - p1.x;
  const qpy = q1.y - p1.y;
  const t = (qpx * sy - qpy * sx) / rxs;
  const u = (qpx * ry - qpy * rx) / rxs;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * rx, y: p1.y + t * ry, t };
}

/** First crossing of start->end with any edge of the polygon, or null. */
export function firstPolygonEntry(start, end, polygon) {
  let best = null;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const hit = segmentIntersection(start, end, polygon[j], polygon[i]);
    if (hit && (best === null || hit.t < best.t)) best = hit;
  }
  return best;
}

export function walkPath(start, end, step = 0.5) {
  const length = distance(start, end);
  const count = Math.max(1, Math.ceil(length / step));
  const points = [];
  for (let i = 0; i <= count; i += 1) {
    points.push(lerp(start, end, i / count));
  }
  return points;
}
