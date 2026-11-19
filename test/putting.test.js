import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { simulateShot, inCup, cupRadius } from '../src/physics.js';
import { playShot, createGame } from '../src/game.js';
import { makeOpenHole, makeOpenCourse, stillWind, UP } from './fixtures.js';
import { distance } from '../src/geometry.js';

function greenStart(hole, offset = { x: 0, y: -8 }) {
  return { x: hole.hole.x + offset.x, y: hole.hole.y + offset.y };
}

describe('putting and holing', () => {
  test('a gentle putt from just short of the cup goes in', () => {
    const hole = makeOpenHole();
    const start = greenStart(hole, { x: 0, y: -6 });
    const result = simulateShot({
      start,
      clubId: 'putter',
      power: 6 / 40,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.equal(result.kind, 'holed');
    assert.equal(result.holed, true);
    assert.ok(inCup(result.rest, hole));
  });

  test('a putt that stops on the green but short of the cup is not holed', () => {
    const hole = makeOpenHole();
    const start = greenStart(hole, { x: 0, y: -16 });
    const result = simulateShot({
      start,
      clubId: 'putter',
      power: 4 / 40,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.equal(result.kind, 'ok');
    assert.equal(result.holed, false);
    assert.ok(distance(result.rest, hole.hole) > cupRadius(hole));
    assert.ok(result.rest.y > start.y);
  });

  test('green slope steers a putt off a straight line', () => {
    const flat = makeOpenHole({ greenSlope: { x: 0, y: 0 } });
    const sloped = makeOpenHole({ greenSlope: { x: 0.35, y: 0 } });
    const start = greenStart(flat, { x: 0, y: -18 });
    const input = {
      start,
      clubId: 'putter',
      power: 11 / 40,
      aimAngle: UP,
      wind: stillWind(),
    };
    const straight = simulateShot({ ...input, hole: flat });
    const breaking = simulateShot({ ...input, hole: sloped });
    assert.equal(straight.kind, 'ok');
    assert.ok(breaking.rest.x > straight.rest.x + 0.4);
  });

  test('a ball that comes to rest in the cup is holed in the game', () => {
    const hole = makeOpenHole();
    const course = makeOpenCourse([hole]);
    let game = createGame(course);
    game = {
      ...game,
      ball: greenStart(hole, { x: 0, y: -5 }),
      lastPosition: greenStart(hole, { x: 0, y: -5 }),
    };
    const { game: next, result } = playShot(game, {
      clubId: 'putter',
      power: 5 / 40,
      aimAngle: UP,
    });
    assert.equal(result.kind, 'holed');
    assert.equal(next.holed, true);
    assert.equal(next.strokes, 1);
    assert.equal(next.scores.length, 1);
    assert.equal(next.scores[0].strokes, 1);
  });

  test('a chip that finishes in the cup is holed', () => {
    const hole = makeOpenHole();
    const start = { x: hole.hole.x, y: hole.hole.y - 40 };
    const result = simulateShot({
      start,
      clubId: 'wedge',
      power: 40 / 90,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.ok(['holed', 'ok'].includes(result.kind));
    if (result.kind !== 'holed') {
      const miss = distance(result.rest, hole.hole);
      assert.ok(miss < 25, `wedge chip finished ${miss} yards from the cup`);
    }
  });
});
