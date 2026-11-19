import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { simulateShot, plannedCarry, windDrift } from '../src/physics.js';
import { makeOpenHole, stillWind, UP } from './fixtures.js';
import { distance } from '../src/geometry.js';
import { createRng, windFromSeed } from '../src/rng.js';

describe('physics determinism', () => {
  test('the same seed and shot land in the same place twice', () => {
    const hole = makeOpenHole();
    const wind = windFromSeed(424242);
    const input = {
      start: hole.tee,
      clubId: '7-iron',
      power: 0.85,
      aimAngle: UP - 0.05,
      wind,
      hole,
    };
    const first = simulateShot(input);
    const second = simulateShot(input);
    assert.equal(first.kind, second.kind);
    assert.equal(first.rest.x, second.rest.x);
    assert.equal(first.rest.y, second.rest.y);
    assert.equal(first.landing.x, second.landing.x);
    assert.equal(first.landing.y, second.landing.y);
    assert.equal(first.carryDistance, second.carryDistance);
  });

  test('a seeded generator repeats its sequence', () => {
    const a = createRng(99);
    const b = createRng(99);
    const c = createRng(100);
    const first = [a(), a(), a()];
    const second = [b(), b(), b()];
    const other = [c(), c(), c()];
    assert.deepEqual(first, second);
    assert.notDeepEqual(first, other);
  });

  test('wind from the same seed is identical', () => {
    assert.deepEqual(windFromSeed(202601), windFromSeed(202601));
    assert.notDeepEqual(windFromSeed(202601), windFromSeed(202602));
  });

  test('with no wind the landing sits on the aim line at the planned carry', () => {
    const hole = makeOpenHole();
    const result = simulateShot({
      start: hole.tee,
      clubId: '5-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    const planned = plannedCarry('5-iron', 1, 'tee');
    assert.equal(result.carryDistance, planned);
    assert.ok(Math.abs(result.landing.x - hole.tee.x) < 1e-9);
    assert.ok(Math.abs(result.landing.y - (hole.tee.y + planned)) < 1e-9);
  });

  test('wind shifts the landing in the wind direction', () => {
    const hole = makeOpenHole();
    const base = {
      start: hole.tee,
      clubId: 'driver',
      power: 1,
      aimAngle: UP,
      hole,
    };
    const calm = simulateShot({ ...base, wind: stillWind() });
    const wind = { speed: 10, angle: 0 };
    const blown = simulateShot({ ...base, wind });
    const drift = windDrift(wind, calm.carryDistance);
    assert.ok(drift.x > 0);
    assert.ok(Math.abs(blown.landing.x - (calm.landing.x + drift.x)) < 1e-9);
    assert.ok(Math.abs(blown.landing.y - (calm.landing.y + drift.y)) < 1e-9);
  });
});
