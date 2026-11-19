import { pointInPolygon } from './geometry.js';

const SURFACE_TYPES = new Set(['rough', 'fairway', 'tee', 'green', 'bunker', 'water']);
const PAR_VALUES = new Set([3, 4, 5]);

export function validateCourse(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['Course data must be an object.'] };
  }
  if (!nonEmptyString(data.id)) errors.push('Course must have an id.');
  if (!nonEmptyString(data.name)) errors.push('Course must have a name.');
  if (!Array.isArray(data.holes) || data.holes.length === 0) {
    errors.push('Course must have at least one hole.');
    return { ok: false, errors };
  }

  const numbers = new Set();
  const indexes = new Set();
  data.holes.forEach((hole, index) => {
    const label = `Hole ${index + 1}`;
    if (!isObject(hole)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    if (!positiveInt(hole.number)) {
      errors.push(`${label} must have a positive hole number.`);
    } else if (numbers.has(hole.number)) {
      errors.push(`Duplicate hole number: ${hole.number}.`);
    } else {
      numbers.add(hole.number);
    }
    if (!PAR_VALUES.has(hole.par)) {
      errors.push(`${label} par must be 3, 4 or 5.`);
    }
    if (!positiveInt(hole.strokeIndex)) {
      errors.push(`${label} must have a positive stroke index.`);
    } else if (indexes.has(hole.strokeIndex)) {
      errors.push(`Duplicate stroke index: ${hole.strokeIndex}.`);
    } else {
      indexes.add(hole.strokeIndex);
    }
    if (!isPoint(hole.tee)) errors.push(`${label} must have a tee position.`);
    if (!isPoint(hole.hole)) errors.push(`${label} must have a hole position.`);
    if (hole.hole && hole.hole.radius != null && !isPositiveNumber(hole.hole.radius)) {
      errors.push(`${label} cup radius must be a positive number.`);
    }
    if (hole.greenSlope != null && !isPoint(hole.greenSlope)) {
      errors.push(`${label} green slope must have x and y.`);
    }
    if (hole.windSeed != null && !Number.isFinite(Number(hole.windSeed))) {
      errors.push(`${label} wind seed must be a number.`);
    }
    if (hole.bounds != null) {
      const b = hole.bounds;
      if (!isObject(b) || ![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite)) {
        errors.push(`${label} bounds must include minX, minY, maxX and maxY.`);
      }
    }
    if (!Array.isArray(hole.surfaces) || hole.surfaces.length === 0) {
      errors.push(`${label} must have at least one surface polygon.`);
    } else {
      hole.surfaces.forEach((surface, surfaceIndex) => {
        const sLabel = `${label} surface ${surfaceIndex + 1}`;
        if (!isObject(surface)) {
          errors.push(`${sLabel} must be an object.`);
          return;
        }
        if (!SURFACE_TYPES.has(surface.type)) {
          errors.push(`${sLabel} has unknown type "${surface.type}".`);
        }
        if (!Array.isArray(surface.polygon) || surface.polygon.length < 3) {
          errors.push(`${sLabel} polygon must have at least 3 points.`);
        } else if (surface.polygon.some((point) => !isPoint(point))) {
          errors.push(`${sLabel} polygon points must have numeric x and y.`);
        }
      });
    }

    if (isPoint(hole.hole) && Array.isArray(hole.surfaces)) {
      const greens = hole.surfaces.filter((surface) => surface.type === 'green' && Array.isArray(surface.polygon));
      if (greens.length === 0) {
        errors.push(`${label} must include a green polygon.`);
      } else if (!greens.some((green) => pointInPolygon(hole.hole, green.polygon))) {
        errors.push(`${label} cup is not inside a green polygon.`);
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

export function loadCourse(data) {
  const result = validateCourse(data);
  if (!result.ok) {
    const detail = result.errors.join(' ');
    throw new Error(`Invalid course data. ${detail}`);
  }
  return structuredClone(data);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isPoint(value) {
  return isObject(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}
