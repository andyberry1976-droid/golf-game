import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  strokesReceived,
  stablefordPoints,
  scoreHole,
  totalScore,
  formatVsPar,
} from '../src/scoring.js';
import { createGame, playShot, scorecard } from '../src/game.js';
import { makeOpenCourse, makeOpenHole, UP } from './fixtures.js';

describe('strokeplay and Stableford scoring', () => {
  test('a scratch player receives no strokes', () => {
    assert.equal(strokesReceived(0, 1), 0);
    assert.equal(strokesReceived(0, 18), 0);
  });

  test('handicap strokes follow stroke index', () => {
    assert.equal(strokesReceived(12, 1), 1);
    assert.equal(strokesReceived(12, 12), 1);
    assert.equal(strokesReceived(12, 13), 0);
    assert.equal(strokesReceived(18, 18), 1);
    assert.equal(strokesReceived(24, 1), 2);
    assert.equal(strokesReceived(24, 6), 2);
    assert.equal(strokesReceived(24, 7), 1);
  });

  test('Stableford points use net score against par', () => {
    assert.equal(stablefordPoints(-3), 5);
    assert.equal(stablefordPoints(-2), 4);
    assert.equal(stablefordPoints(-1), 3);
    assert.equal(stablefordPoints(0), 2);
    assert.equal(stablefordPoints(1), 1);
    assert.equal(stablefordPoints(2), 0);
    assert.equal(stablefordPoints(5), 0);
  });

  test('a gross birdie is 3 Stableford points off scratch', () => {
    const score = scoreHole({ strokes: 3, par: 4, strokeIndex: 5, handicap: 0 });
    assert.equal(score.vsPar, -1);
    assert.equal(score.net, 3);
    assert.equal(score.stableford, 3);
  });

  test('a gross bogey with a stroke received is 2 Stableford points', () => {
    const score = scoreHole({ strokes: 5, par: 4, strokeIndex: 1, handicap: 12 });
    assert.equal(score.strokesReceived, 1);
    assert.equal(score.net, 4);
    assert.equal(score.netVsPar, 0);
    assert.equal(score.stableford, 2);
    assert.equal(score.vsPar, 1);
  });

  test('totals add strokes, par, vs par and Stableford', () => {
    const holes = [
      scoreHole({ strokes: 3, par: 3, strokeIndex: 15, handicap: 0 }),
      scoreHole({ strokes: 5, par: 4, strokeIndex: 6, handicap: 0 }),
      scoreHole({ strokes: 6, par: 5, strokeIndex: 1, handicap: 0 }),
    ];
    const totals = totalScore(holes);
    assert.equal(totals.strokes, 14);
    assert.equal(totals.par, 12);
    assert.equal(totals.vsPar, 2);
    assert.equal(totals.stableford, 2 + 1 + 1);
    assert.equal(formatVsPar(0), 'E');
    assert.equal(formatVsPar(2), '+2');
    assert.equal(formatVsPar(-1), '-1');
  });

  test('the scorecard records a holed putt and finishes a one-hole course', () => {
    const hole = makeOpenHole({ par: 3, strokeIndex: 8 });
    const course = makeOpenCourse([hole]);
    let { game } = { game: createGame(course) };
    game = {
      ...game,
      ball: { x: hole.hole.x, y: hole.hole.y - 5 },
      lastPosition: { x: hole.hole.x, y: hole.hole.y - 5 },
    };
    ({ game } = playShot(game, { clubId: 'putter', power: 5 / 40, aimAngle: UP }));
    assert.equal(game.holed, true);
    assert.equal(game.finished, true);
    const card = scorecard(game);
    assert.equal(card.holes.length, 1);
    assert.equal(card.holes[0].strokes, 1);
    assert.equal(card.holes[0].par, 3);
    assert.equal(card.holes[0].stableford, 4);
    assert.equal(card.totals.strokes, 1);
    assert.equal(card.vsPar, '-2');
  });
});
