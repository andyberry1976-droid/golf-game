import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LIE_CARRY } from '../src/clubs.js';
import { plannedCarry, simulateShot } from '../src/physics.js';
import { surfaceAt } from '../src/surfaces.js';
import { makeOpenHole, stillWind, UP, rect } from './fixtures.js';

function holeWithLies() {
  return makeOpenHole({
    surfaces: [
      { type: 'rough', polygon: rect(5, 5, 190, 390) },
      { type: 'fairway', polygon: rect(50, 15, 60, 280) },
      { type: 'tee', polygon: rect(74, 14, 12, 14) },
      { type: 'green', polygon: rect(65, 300, 30, 40) },
      { type: 'bunker', polygon: rect(20, 80, 16, 16) },
    ],
  });
}

describe('lie penalties', () => {
  test('rough cuts carry to 85% of a fairway shot', () => {
    assert.equal(LIE_CARRY.rough, 0.85);
    const fairway = plannedCarry('7-iron', 1, 'fairway');
    const rough = plannedCarry('7-iron', 1, 'rough');
    assert.equal(rough, fairway * 0.85);
  });

  test('a bunker cuts carry more than rough', () => {
    assert.equal(LIE_CARRY.bunker, 0.65);
    const fairway = plannedCarry('7-iron', 1, 'fairway');
    const rough = plannedCarry('7-iron', 1, 'rough');
    const bunker = plannedCarry('7-iron', 1, 'bunker');
    assert.ok(bunker < rough);
    assert.equal(bunker, fairway * 0.65);
  });

  test('a shot from the rough travels less than the same shot from the fairway', () => {
    const hole = holeWithLies();
    const fairwayStart = { x: 80, y: 60 };
    const roughStart = { x: 30, y: 60 };
    assert.equal(surfaceAt(fairwayStart, hole), 'fairway');
    assert.equal(surfaceAt(roughStart, hole), 'rough');

    const fromFairway = simulateShot({
      start: fairwayStart,
      clubId: '5-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    const fromRough = simulateShot({
      start: roughStart,
      clubId: '5-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.ok(fromRough.carryDistance < fromFairway.carryDistance);
    assert.equal(fromRough.lie, 'rough');
    assert.equal(fromFairway.lie, 'fairway');
  });

  test('a shot from a bunker travels less than the same shot from the rough', () => {
    const hole = holeWithLies();
    const bunkerStart = { x: 28, y: 88 };
    const roughStart = { x: 30, y: 60 };
    assert.equal(surfaceAt(bunkerStart, hole), 'bunker');

    const fromBunker = simulateShot({
      start: bunkerStart,
      clubId: '9-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    const fromRough = simulateShot({
      start: roughStart,
      clubId: '9-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.ok(fromBunker.carryDistance < fromRough.carryDistance);
    assert.equal(fromBunker.lie, 'bunker');
  });
});
