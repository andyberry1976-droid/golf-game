import { loadCourse } from './course.js';
import { defaultWindSeed, windFromSeed } from './rng.js';
import { simulateShot, aimAt } from './physics.js';
import { scoreHole, totalScore, formatVsPar } from './scoring.js';
import { surfaceAt, holeBounds } from './surfaces.js';

export function createGame(courseData, options = {}) {
  const course = loadCourse(courseData);
  const handicap = Number.isFinite(options.handicap) ? options.handicap : 0;
  const game = {
    course,
    handicap,
    holeIndex: 0,
    ball: null,
    lastPosition: null,
    strokes: 0,
    scores: [],
    holed: false,
    finished: false,
    wind: null,
    lastResult: null,
    message: '',
  };
  return startHole(game, 0);
}

export function currentHole(game) {
  return game.course.holes[game.holeIndex];
}

export function currentLie(game) {
  return surfaceAt(game.ball, currentHole(game));
}

export function defaultAim(game) {
  const hole = currentHole(game);
  return aimAt(game.ball, hole.hole);
}

export function playShot(game, { clubId, power, aimAngle }) {
  if (game.finished) {
    return { game: cloneGame(game), result: null, error: 'The round is finished.' };
  }
  if (game.holed) {
    return { game: cloneGame(game), result: null, error: 'The hole is finished. Go to the next hole.' };
  }

  const hole = currentHole(game);
  const result = simulateShot({
    start: game.ball,
    clubId,
    power,
    aimAngle,
    wind: game.wind,
    hole,
  });

  const next = cloneGame(game);
  next.lastResult = result;
  next.strokes += 1 + result.penalty;

  if (result.kind === 'ob') {
    next.ball = point(next.lastPosition);
    next.message = 'Out of bounds. Stroke and distance.';
    return { game: next, result };
  }

  next.ball = point(result.rest);
  next.lastPosition = point(result.rest);

  if (result.kind === 'water') {
    next.message = 'Water hazard. One-stroke penalty, dropped at the entry point.';
    return { game: next, result };
  }

  if (result.kind === 'holed') {
    return finishHole(next, result);
  }

  next.message = shotSummary(result);
  return { game: next, result };
}

export function nextHole(game) {
  if (!game.holed) {
    return { game: cloneGame(game), error: 'Finish the current hole first.' };
  }
  if (game.finished || game.holeIndex >= game.course.holes.length - 1) {
    const done = cloneGame(game);
    done.finished = true;
    done.message = 'Round complete.';
    return { game: done };
  }
  return { game: startHole(cloneGame(game), game.holeIndex + 1) };
}

export function scorecard(game) {
  const totals = totalScore(game.scores);
  return {
    holes: game.scores,
    totals,
    vsPar: formatVsPar(totals.vsPar),
    netVsPar: formatVsPar(totals.netVsPar),
    current: game.finished
      ? null
      : {
          hole: currentHole(game).number,
          par: currentHole(game).par,
          strokes: game.strokes,
          holed: game.holed,
        },
  };
}

export function holeView(game) {
  const hole = currentHole(game);
  return {
    hole,
    bounds: holeBounds(hole),
    ball: point(game.ball),
    wind: game.wind,
    lie: currentLie(game),
    strokes: game.strokes,
    holed: game.holed,
    finished: game.finished,
  };
}

function startHole(game, index) {
  const hole = game.course.holes[index];
  game.holeIndex = index;
  game.ball = point(hole.tee);
  game.lastPosition = point(hole.tee);
  game.strokes = 0;
  game.holed = false;
  game.finished = false;
  game.lastResult = null;
  const seed = hole.windSeed ?? defaultWindSeed(game.course.id, hole.number);
  game.wind = windFromSeed(seed);
  game.message = `Hole ${hole.number} · Par ${hole.par}`;
  return game;
}

function finishHole(game, result) {
  const hole = currentHole(game);
  const scored = scoreHole({
    strokes: game.strokes,
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    handicap: game.handicap,
  });
  game.holed = true;
  game.ball = point(hole.hole);
  game.scores = [...game.scores, { ...scored, hole: hole.number, name: hole.name ?? null }];
  const last = game.holeIndex >= game.course.holes.length - 1;
  if (last) {
    game.finished = true;
    game.message = `Holed in ${game.strokes}. Round complete.`;
  } else {
    game.message = `Holed in ${game.strokes}.`;
  }
  return { game, result };
}

function shotSummary(result) {
  const carry = Math.round(result.carryDistance);
  const total = Math.round(result.totalDistance);
  if (result.carryDistance > 0) {
    return `Carry ${carry} yards, finished ${total} yards from the last spot.`;
  }
  return `Rolled ${total} yards.`;
}

function cloneGame(game) {
  return {
    ...game,
    ball: point(game.ball),
    lastPosition: point(game.lastPosition),
    wind: { ...game.wind },
    scores: game.scores.map((score) => ({ ...score })),
    lastResult: game.lastResult,
  };
}

function point(value) {
  return { x: value.x, y: value.y };
}
