import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { simulateShot } from '../src/physics.js';
import { playShot, createGame } from '../src/game.js';
import { surfaceAt } from '../src/surfaces.js';
import { makeOpenHole, makeOpenCourse, stillWind, UP, rect } from './fixtures.js';

function waterHole() {
  return makeOpenHole({
    surfaces: [
      { type: 'rough', polygon: rect(5, 5, 190, 390) },
      { type: 'fairway', polygon: rect(50, 15, 60, 280) },
      { type: 'tee', polygon: rect(74, 14, 12, 14) },
      { type: 'green', polygon: rect(65, 300, 30, 40) },
      { type: 'water', polygon: rect(40, 120, 80, 60) },
    ],
  });
}

function narrowHole() {
  return makeOpenHole({
    surfaces: [
      { type: 'rough', polygon: rect(40, 5, 80, 200) },
      { type: 'fairway', polygon: rect(55, 15, 50, 160) },
      { type: 'tee', polygon: rect(74, 14, 12, 14) },
      { type: 'green', polygon: rect(65, 160, 30, 30) },
    ],
    hole: { x: 80, y: 175, radius: 0.75 },
  });
}

describe('water penalty and drop', () => {
  test('a ball that lands in water is a penalty and is dropped at the entry point', () => {
    const hole = waterHole();
    const start = hole.tee;
    const result = simulateShot({
      start,
      clubId: '7-iron',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.equal(result.kind, 'water');
    assert.equal(result.penalty, 1);
    assert.ok(result.drop);
    assert.equal(surfaceAt(result.drop, hole) !== 'water', true);
    assert.equal(surfaceAt(result.rest, hole) !== 'water', true);
    assert.ok(result.drop.y > start.y);
    assert.ok(result.drop.y <= 120 + 1e-6);
    assert.equal(surfaceAt(result.landing, hole), 'water');
  });

  test('the game adds a stroke plus the water penalty and moves the ball to the drop', () => {
    const course = makeOpenCourse([waterHole()]);
    const game = createGame(course);
    const { game: next, result } = playShot(game, {
      clubId: '7-iron',
      power: 1,
      aimAngle: UP,
    });
    assert.equal(result.kind, 'water');
    assert.equal(next.strokes, 2);
    assert.equal(next.holed, false);
    assert.ok(Math.abs(next.ball.x - result.drop.x) < 1e-9);
    assert.ok(Math.abs(next.ball.y - result.drop.y) < 1e-9);
    assert.match(next.message, /water/i);
  });
});

describe('out of bounds', () => {
  test('a ball that finishes out of bounds is stroke and distance', () => {
    const hole = narrowHole();
    const result = simulateShot({
      start: hole.tee,
      clubId: 'driver',
      power: 1,
      aimAngle: UP,
      wind: stillWind(),
      hole,
    });
    assert.equal(result.kind, 'ob');
    assert.equal(result.penalty, 1);
    assert.equal(result.rest.x, hole.tee.x);
    assert.equal(result.rest.y, hole.tee.y);
    assert.equal(surfaceAt(result.landing, hole), 'ob');
  });

  test('the game keeps the ball at the last spot and adds two strokes', () => {
    const course = makeOpenCourse([narrowHole()]);
    const game = createGame(course);
    const start = { ...game.ball };
    const { game: next, result } = playShot(game, {
      clubId: 'driver',
      power: 1,
      aimAngle: UP,
    });
    assert.equal(result.kind, 'ob');
    assert.equal(next.strokes, 2);
    assert.equal(next.ball.x, start.x);
    assert.equal(next.ball.y, start.y);
    assert.match(next.message, /out of bounds/i);
  });

  test('a shot aimed sideways off the course is also out of bounds', () => {
    const hole = narrowHole();
    const result = simulateShot({
      start: hole.tee,
      clubId: '5-iron',
      power: 1,
      aimAngle: 0,
      wind: stillWind(),
      hole,
    });
    assert.equal(result.kind, 'ob');
  });
});
