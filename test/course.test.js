import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateCourse, loadCourse } from '../src/course.js';
import { createGame, playShot, currentLie } from '../src/game.js';
import { surfaceAt } from '../src/surfaces.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadMeadowPark() {
  const file = path.join(root, 'data/courses/meadow-park.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

describe('course JSON validation', () => {
  test('Meadow Park is valid and has a par 3, par 4 and par 5', () => {
    const course = loadMeadowPark();
    const result = validateCourse(course);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.deepEqual(course.holes.map((hole) => hole.par), [3, 4, 5]);
    assert.equal(course.holes.length, 3);
  });

  test('each sample hole has a tee, fairway, rough, green and a cup on the green', () => {
    const course = loadMeadowPark();
    for (const hole of course.holes) {
      const types = new Set(hole.surfaces.map((surface) => surface.type));
      assert.ok(types.has('tee'), `${hole.name} missing tee`);
      assert.ok(types.has('fairway'), `${hole.name} missing fairway`);
      assert.ok(types.has('rough'), `${hole.name} missing rough`);
      assert.ok(types.has('green'), `${hole.name} missing green`);
      assert.equal(surfaceAt(hole.hole, hole), 'green');
      assert.equal(surfaceAt(hole.tee, hole), 'tee');
    }
  });

  test('the sample holes include bunker and water hazards', () => {
    const course = loadMeadowPark();
    const types = new Set(course.holes.flatMap((hole) => hole.surfaces.map((s) => s.type)));
    assert.ok(types.has('bunker'));
    assert.ok(types.has('water'));
  });

  test('loadCourse returns a copy of a valid course', () => {
    const course = loadMeadowPark();
    const loaded = loadCourse(course);
    assert.equal(loaded.id, 'meadow-park');
    loaded.name = 'changed';
    assert.equal(course.name, 'Meadow Park');
  });

  test('a player starts on the first tee of Meadow Park', () => {
    const game = createGame(loadMeadowPark());
    assert.equal(game.holeIndex, 0);
    assert.equal(currentLie(game), 'tee');
    assert.equal(game.ball.x, 45);
    assert.equal(game.ball.y, 16);
    assert.ok(game.wind.speed >= 0);
  });

  test('missing fields are reported', () => {
    const result = validateCourse({ id: '', holes: [] });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /id/i.test(error)));
    assert.ok(result.errors.some((error) => /name/i.test(error)));
    assert.ok(result.errors.some((error) => /at least one hole/i.test(error)));
  });

  test('an unknown surface type is rejected', () => {
    const course = loadMeadowPark();
    course.holes[0].surfaces.push({
      type: 'lava',
      polygon: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
    });
    const result = validateCourse(course);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /lava/.test(error)));
  });

  test('a cup off the green is rejected', () => {
    const course = loadMeadowPark();
    course.holes[0].hole = { x: 2, y: 2, radius: 0.75 };
    const result = validateCourse(course);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /cup is not inside a green/i.test(error)));
  });

  test('duplicate hole numbers and stroke indexes are rejected', () => {
    const course = loadMeadowPark();
    course.holes[1].number = 1;
    course.holes[1].strokeIndex = 15;
    const result = validateCourse(course);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /duplicate hole number/i.test(error)));
    assert.ok(result.errors.some((error) => /duplicate stroke index/i.test(error)));
  });

  test('loadCourse throws on invalid data', () => {
    assert.throws(() => loadCourse({}), /Invalid course data/);
  });

  test('a short opening shot on Willow stays on the hole', () => {
    const game = createGame(loadMeadowPark());
    const { game: next, result } = playShot(game, {
      clubId: 'wedge',
      power: 0.6,
      aimAngle: Math.PI / 2,
    });
    assert.equal(result.kind, 'ok');
    assert.ok(next.ball.y > game.ball.y);
    assert.notEqual(currentLie(next), 'ob');
    assert.notEqual(currentLie(next), 'water');
  });
});
