import { rectPolygon } from '../src/geometry.js';

export function rect(x, y, width, height) {
  return rectPolygon(x, y, width, height);
}

export function makeOpenHole(overrides = {}) {
  const hole = {
    number: 1,
    name: 'Open',
    par: 4,
    strokeIndex: 1,
    tee: { x: 80, y: 20 },
    hole: { x: 80, y: 320, radius: 0.75 },
    greenSlope: { x: 0, y: 0 },
    windSeed: 1,
    bounds: { minX: 0, minY: 0, maxX: 200, maxY: 400 },
    surfaces: [
      { type: 'rough', polygon: rect(5, 5, 190, 390) },
      { type: 'fairway', polygon: rect(50, 15, 60, 280) },
      { type: 'tee', polygon: rect(74, 14, 12, 14) },
      { type: 'green', polygon: rect(65, 300, 30, 40) },
    ],
  };
  return { ...hole, ...overrides, surfaces: overrides.surfaces ?? hole.surfaces };
}

export function makeOpenCourse(holes) {
  return {
    id: 'test-links',
    name: 'Test Links',
    holes: holes ?? [makeOpenHole()],
  };
}

export function stillWind() {
  return { speed: 0, angle: 0 };
}

/** Aim straight up the hole, toward +y. */
export const UP = Math.PI / 2;
