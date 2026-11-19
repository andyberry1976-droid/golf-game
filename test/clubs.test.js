import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { CLUBS, getClub } from '../src/clubs.js';
import { plannedCarry, simulateShot, carryOrder } from '../src/physics.js';
import { makeOpenHole, stillWind, UP } from './fixtures.js';

describe('club carry ordering', () => {
  test('full-shot carries run from longest to shortest', () => {
    const order = carryOrder();
    const carries = order.map((id) => getClub(id).carry);
    for (let i = 1; i < carries.length; i += 1) {
      assert.ok(carries[i - 1] > carries[i], `${order[i - 1]} should out-carry ${order[i]}`);
    }
  });

  test('at the same lie and power, longer clubs land farther', () => {
    const hole = makeOpenHole();
    const distances = carryOrder().map((clubId) => {
      const result = simulateShot({
        start: hole.tee,
        clubId,
        power: 1,
        aimAngle: UP,
        wind: stillWind(),
        hole,
      });
      return { clubId, carry: result.carryDistance };
    });
    for (let i = 1; i < distances.length; i += 1) {
      assert.ok(
        distances[i - 1].carry > distances[i].carry,
        `${distances[i - 1].clubId} carry ${distances[i - 1].carry} should beat ${distances[i].clubId} ${distances[i].carry}`,
      );
    }
  });

  test('putter has no aerial carry', () => {
    assert.equal(getClub('putter').carry, 0);
    assert.equal(plannedCarry('putter', 1, 'green'), 0);
  });

  test('every bag club is unique and look-uppable', () => {
    const ids = CLUBS.map((club) => club.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.equal(getClub(id).id, id);
    }
  });
});
