import {
  CLUBS,
  FRICTION,
  LIE_CARRY,
  PUTT,
  ROLL_MAX_STEPS,
  ROLL_STEP_SECONDS,
  SLOPE_STEER,
  WIND_DRIFT,
  getClub,
} from './clubs.js';
import {
  clamp,
  distance,
  firstPolygonEntry,
  heading,
  lerp,
  normalize,
  walkPath,
} from './geometry.js';
import { polygonsOfType, surfaceAt } from './surfaces.js';

export { windFromSeed } from './rng.js';

export function cupRadius(hole) {
  return hole?.hole?.radius > 0 ? hole.hole.radius : PUTT.cupRadius;
}

export function cupPosition(hole) {
  return { x: hole.hole.x, y: hole.hole.y };
}

export function inCup(point, hole, radius = cupRadius(hole)) {
  return distance(point, cupPosition(hole)) <= radius;
}

export function plannedCarry(clubId, power, lie) {
  const club = getClub(clubId);
  const power01 = clamp(power, 0, 1);
  const lieMod = LIE_CARRY[lie] ?? LIE_CARRY.rough;
  return club.carry * power01 * lieMod;
}

export function windDrift(wind, carryYards) {
  if (!wind || !wind.speed || carryYards <= 0) return { x: 0, y: 0 };
  const scale = (wind.speed * WIND_DRIFT * carryYards) / 100;
  return {
    x: Math.cos(wind.angle) * scale,
    y: Math.sin(wind.angle) * scale,
  };
}

export function simulateShot({ start, clubId, power, aimAngle, wind, hole }) {
  const club = getClub(clubId);
  const power01 = clamp(power, 0, 1);
  const lie = surfaceAt(start, hole);
  const shared = { start: point(start), clubId, club, power: power01, aimAngle, wind, hole, lie };

  if (clubId === 'putter') {
    return simulatePutt(shared);
  }
  return simulateFullShot(shared);
}

function simulateFullShot(input) {
  const { start, club, power, aimAngle, wind, hole, lie } = input;
  const carryDistance = plannedCarry(club.id, power, lie);
  const drift = windDrift(wind, carryDistance);
  const landing = {
    x: start.x + Math.cos(aimAngle) * carryDistance + drift.x,
    y: start.y + Math.sin(aimAngle) * carryDistance + drift.y,
  };
  const flight = flightPath(start, landing, club, carryDistance);
  const landingSurface = surfaceAt(landing, hole);

  if (landingSurface === 'water') {
    const drop = dropBeforeHazard(start, landing, hole, 'water');
    return finish({
      ...input,
      kind: 'water',
      landing,
      rest: drop,
      drop,
      penalty: 1,
      carryDistance,
      flight,
      roll: [],
    });
  }
  if (landingSurface === 'ob') {
    return finish({
      ...input,
      kind: 'ob',
      landing,
      rest: point(start),
      drop: null,
      penalty: 1,
      carryDistance,
      flight,
      roll: [],
    });
  }

  const incoming = normalize({ x: landing.x - start.x, y: landing.y - start.y });
  const rollDistance = carryDistance * club.rollFactor;
  const speed = speedForDistance(rollDistance, FRICTION.fairway);
  const roll = simulateRoll({
    start: landing,
    velocity: { x: incoming.x * speed, y: incoming.y * speed },
    hole,
  });

  return mergeRoll(input, { landing, carryDistance, flight }, roll);
}

function simulatePutt(input) {
  const { start, power, aimAngle, hole, lie } = input;
  const intended = power * (getClub('putter').maxRoll ?? PUTT.maxRoll);
  const friction = FRICTION[lie] ?? FRICTION.rough;
  const speed = speedForDistance(intended, friction);
  const velocity = {
    x: Math.cos(aimAngle) * speed,
    y: Math.sin(aimAngle) * speed,
  };
  const flight = [{ ...point(start), z: 0, phase: 'roll' }];
  const roll = simulateRoll({ start, velocity, hole });
  return mergeRoll(input, { landing: point(start), carryDistance: 0, flight }, roll);
}

function simulateRoll({ start, velocity, hole }) {
  let x = start.x;
  let y = start.y;
  let vx = velocity.x;
  let vy = velocity.y;
  const path = [{ x, y, z: 0, phase: 'roll' }];
  let lastSafe = { x, y };

  for (let step = 0; step < ROLL_MAX_STEPS; step += 1) {
    const surface = surfaceAt({ x, y }, hole);
    if (surface === 'water') {
      const drop = dropBeforeHazard(lastSafe, { x, y }, hole, 'water') ?? lastSafe;
      return { kind: 'water', rest: drop, drop, path, penalty: 1 };
    }
    if (surface === 'ob') {
      return { kind: 'ob', rest: point(start), drop: null, path, penalty: 1 };
    }

    lastSafe = { x, y };
    const speed = Math.hypot(vx, vy);
    if (inCup({ x, y }, hole) && speed <= PUTT.maxHoleSpeed) {
      const cup = cupPosition(hole);
      path.push({ x: cup.x, y: cup.y, z: 0, phase: 'roll' });
      return { kind: 'holed', rest: cup, drop: null, path, penalty: 0 };
    }

    const slope = surface === 'green' ? hole.greenSlope : null;
    const moving = speed >= PUTT.stopSpeed;
    if (!moving) {
      const holed = inCup({ x, y }, hole);
      return {
        kind: holed ? 'holed' : 'ok',
        rest: holed ? cupPosition(hole) : { x, y },
        drop: null,
        path,
        penalty: 0,
      };
    }

    const friction = FRICTION[surface] ?? FRICTION.rough;
    if (moving) {
      const decel = friction * ROLL_STEP_SECONDS;
      const nextSpeed = Math.max(0, speed - decel);
      const dirX = vx / speed;
      const dirY = vy / speed;
      vx = dirX * nextSpeed;
      vy = dirY * nextSpeed;
      if (slope && nextSpeed > 0) {
        const steered = normalize({
          x: dirX + slope.x * SLOPE_STEER * ROLL_STEP_SECONDS,
          y: dirY + slope.y * SLOPE_STEER * ROLL_STEP_SECONDS,
        });
        vx = steered.x * nextSpeed;
        vy = steered.y * nextSpeed;
      }
    }

    x += vx * ROLL_STEP_SECONDS;
    y += vy * ROLL_STEP_SECONDS;
    if (step % 2 === 0) path.push({ x, y, z: 0, phase: 'roll' });
  }

  const holed = inCup({ x, y }, hole);
  return {
    kind: holed ? 'holed' : 'ok',
    rest: holed ? cupPosition(hole) : { x, y },
    drop: null,
    path,
    penalty: 0,
  };
}

function mergeRoll(input, shot, roll) {
  return finish({
    ...input,
    ...shot,
    kind: roll.kind,
    rest: roll.kind === 'ob' ? point(input.start) : roll.rest,
    drop: roll.drop,
    penalty: roll.penalty,
    roll: roll.path,
  });
}

function finish(result) {
  const { start, landing, rest } = result;
  return {
    kind: result.kind,
    clubId: result.clubId,
    lie: result.lie,
    power: result.power,
    aimAngle: result.aimAngle,
    start: point(start),
    landing: point(landing),
    rest: point(rest),
    drop: result.drop ? point(result.drop) : null,
    penalty: result.penalty ?? 0,
    carryDistance: result.carryDistance,
    totalDistance: distance(start, rest),
    flight: result.flight,
    roll: result.roll,
    trajectory: [...(result.flight ?? []), ...(result.roll ?? [])],
    holed: result.kind === 'holed',
  };
}

function flightPath(start, landing, club, carryDistance) {
  const points = walkPath(start, landing, 2);
  const height = Math.max(4, carryDistance * (0.08 + club.loft / 400));
  return points.map((point, index) => {
    const t = points.length === 1 ? 0 : index / (points.length - 1);
    return { x: point.x, y: point.y, z: 4 * height * t * (1 - t), phase: 'flight' };
  });
}

function dropBeforeHazard(start, end, hole, type) {
  const polygons = polygonsOfType(hole, type);
  let best = null;
  for (const polygon of polygons) {
    const hit = firstPolygonEntry(start, end, polygon);
    if (hit && (best === null || hit.t < best.t)) best = hit;
  }

  const backOff = (from, tHint) => {
    for (const delta of [1, 2, 3, 5, 8, 12]) {
      const pathLength = distance(start, from) || 1;
      const t = Math.max(0, (tHint ?? 1) - delta / pathLength);
      const candidate = lerp(start, from, t);
      const surface = surfaceAt(candidate, hole);
      if (surface !== 'water' && surface !== 'ob') return candidate;
    }
    return point(start);
  };

  if (best) return backOff(best, best.t);

  const samples = walkPath(start, end, 0.5);
  let lastSafe = point(start);
  for (const sample of samples) {
    const surface = surfaceAt(sample, hole);
    if (surface === type || surface === 'ob') return lastSafe;
    lastSafe = sample;
  }
  return lastSafe;
}

function speedForDistance(distanceYards, friction) {
  if (distanceYards <= 0 || friction <= 0) return 0;
  return Math.sqrt(2 * friction * distanceYards);
}

function point(value) {
  return { x: value.x, y: value.y };
}

export function aimAt(from, to) {
  return heading(from, to);
}

export function carryOrder() {
  return CLUBS.filter((club) => club.id !== 'putter').map((club) => club.id);
}
