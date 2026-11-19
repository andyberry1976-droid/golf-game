import { CLUBS } from '../src/clubs.js';
import { createGame, playShot, nextHole, scorecard, currentHole, currentLie, defaultAim, holeView } from '../src/game.js';
import { formatVsPar } from '../src/scoring.js';
import { drawHole, createViewport, estimatedShotLength } from './render.js';

const canvas = document.getElementById('fairway');
const clubSelect = document.getElementById('club');
const powerInput = document.getElementById('power');
const powerLabel = document.getElementById('power-label');
const powerMeter = document.getElementById('power-meter');
const shotButton = document.getElementById('shot-button');
const aimHoleButton = document.getElementById('aim-hole');
const nextHoleButton = document.getElementById('next-hole');
const statusEl = document.getElementById('status');
const courseNameEl = document.getElementById('course-name');
const holeTitleEl = document.getElementById('hole-title');
const shotFactsEl = document.getElementById('shot-facts');
const scoreBody = document.querySelector('#scorecard tbody');
const scoreFoot = document.querySelector('#scorecard tfoot');

const state = {
  game: null,
  aim: Math.PI / 2,
  power: 0.8,
  animating: false,
  displayBall: null,
  ballScale: 1,
  hold: null,
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 640;
  const height = Math.max(520, Math.round(width * 1.28));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.height = `${height}px`;
}

function currentClub() {
  return clubSelect.value || '7-iron';
}

function redraw() {
  if (!state.game) return;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const view = holeView(state.game);
  drawHole(ctx, state.game, {
    hole: view.hole,
    ball: view.ball,
    ballDisplay: state.displayBall ?? view.ball,
    ballScale: state.ballScale,
    wind: view.wind,
    holed: view.holed,
    aim: {
      angle: state.aim,
      length: estimatedShotLength(currentClub(), state.power),
    },
  });
}

function fact(term, value) {
  const wrap = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  dd.textContent = value;
  wrap.append(dt, dd);
  return wrap;
}

function renderPanel() {
  const game = state.game;
  const hole = currentHole(game);
  const view = holeView(game);
  courseNameEl.textContent = game.course.name;
  holeTitleEl.textContent = `Hole ${hole.number}${hole.name ? ` · ${hole.name}` : ''} · Par ${hole.par}`;
  statusEl.textContent = game.message;
  shotFactsEl.replaceChildren(
    fact('Stroke', game.finished ? 'Done' : String(game.strokes + (game.holed ? 0 : 1))),
    fact('Lie', labelLie(view.lie)),
    fact('Wind', `${view.wind.speed.toFixed(1)} mph`),
    fact('To cup', `${Math.round(Math.hypot(hole.hole.x - game.ball.x, hole.hole.y - game.ball.y))} yds`),
  );
  powerLabel.textContent = `${Math.round(state.power * 100)}%`;
  if (!state.hold) powerMeter.style.width = `${Math.round(state.power * 100)}%`;

  const card = scorecard(game);
  const rows = game.course.holes.map((item) => {
    const scored = card.holes.find((entry) => entry.hole === item.number);
    const current = !game.finished && item.number === hole.number;
    const tr = document.createElement('tr');
    if (current) tr.className = 'current';
    const strokes = scored ? scored.strokes : current ? game.strokes : '—';
    const points = scored ? scored.stableford : '—';
    tr.innerHTML = `<td>${item.number}${item.name ? ` ${item.name}` : ''}</td><td>${item.par}</td><td>${item.strokeIndex}</td><td>${strokes}</td><td>${points}</td>`;
    return tr;
  });
  scoreBody.replaceChildren(...rows);
  const totals = card.totals;
  scoreFoot.innerHTML = `<tr><td>Total</td><td>${totals.par}</td><td></td><td>${totals.strokes} (${card.vsPar})</td><td>${totals.stableford}</td></tr>`;
  nextHoleButton.hidden = !game.holed || game.finished;
  const locked = state.animating || game.holed || game.finished;
  shotButton.disabled = locked;
  clubSelect.disabled = locked;
  powerInput.disabled = locked;
  aimHoleButton.disabled = locked;
}

function labelLie(lie) {
  if (lie === 'ob') return 'Out of bounds';
  return lie.charAt(0).toUpperCase() + lie.slice(1);
}

function setPower(value) {
  state.power = Math.min(1, Math.max(0.01, value));
  powerInput.value = String(Math.round(state.power * 100));
  powerLabel.textContent = `${Math.round(state.power * 100)}%`;
  powerMeter.style.width = `${Math.round(state.power * 100)}%`;
}

function aimAtCup() {
  if (!state.game || state.game.holed) return;
  state.aim = defaultAim(state.game);
  redraw();
}

function takeShot() {
  const game = state.game;
  if (!game || game.holed || game.finished || state.animating) return;
  const { game: next, result, error } = playShot(game, {
    clubId: currentClub(),
    power: state.power,
    aimAngle: state.aim,
  });
  if (error) {
    game.message = error;
    renderPanel();
    return;
  }
  animateShot(result, next);
}

function animateShot(result, nextGame) {
  const path = result.trajectory?.length ? result.trajectory : [result.start, result.rest];
  state.animating = true;
  shotButton.disabled = true;
  const duration = Math.min(1600, 350 + path.length * 18);
  const started = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - started) / duration);
    const index = Math.min(path.length - 1, Math.floor(t * (path.length - 1)));
    const point = path[index];
    state.displayBall = { x: point.x, y: point.y };
    state.ballScale = point.phase === 'flight' ? 1 + (point.z ?? 0) / 40 : 1;
    redraw();
    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }
    state.animating = false;
    state.displayBall = null;
    state.ballScale = 1;
    state.game = nextGame;
    if (!nextGame.holed && !nextGame.finished) {
      state.aim = defaultAim(nextGame);
      maybeSuggestClub();
    }
    renderPanel();
    redraw();
  }

  requestAnimationFrame(frame);
}

function maybeSuggestClub() {
  const hole = currentHole(state.game);
  const remaining = Math.hypot(hole.hole.x - state.game.ball.x, hole.hole.y - state.game.ball.y);
  const lie = currentLie(state.game);
  if (lie === 'green' || remaining < 30) {
    clubSelect.value = 'putter';
    return;
  }
  const choice = [...CLUBS].reverse().find((club) => club.id !== 'putter' && club.carry >= remaining - 8);
  if (choice) clubSelect.value = choice.id;
}

function startHold() {
  if (shotButton.disabled) return;
  state.hold = { started: performance.now(), rising: true };
  function tick(now) {
    if (!state.hold) return;
    const elapsed = (now - state.hold.started) / 900;
    const cycle = elapsed % 2;
    const value = cycle <= 1 ? cycle : 2 - cycle;
    setPower(Math.max(0.05, value));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function endHold() {
  if (!state.hold) return;
  state.hold = null;
  takeShot();
}

function pointerWorld(event) {
  const view = createViewport(canvas, currentHole(state.game));
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return view.toWorld({
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  });
}

function bindControls() {
  for (const club of CLUBS) {
    const option = document.createElement('option');
    option.value = club.id;
    option.textContent = `${club.name}${club.carry ? ` · ${club.carry} yds` : ''}`;
    clubSelect.append(option);
  }
  clubSelect.value = '7-iron';
  clubSelect.addEventListener('change', redraw);
  powerInput.addEventListener('input', () => {
    setPower(Number(powerInput.value) / 100);
    redraw();
  });
  shotButton.addEventListener('mousedown', startHold);
  shotButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    startHold();
  }, { passive: false });
  window.addEventListener('mouseup', endHold);
  window.addEventListener('touchend', endHold);
  aimHoleButton.addEventListener('click', aimAtCup);
  nextHoleButton.addEventListener('click', () => {
    const { game, error } = nextHole(state.game);
    if (error) {
      state.game.message = error;
    } else {
      state.game = game;
      state.aim = defaultAim(game);
      clubSelect.value = game.holeIndex === 0 ? '7-iron' : 'driver';
      if (currentHole(game).par === 3) clubSelect.value = '7-iron';
      setPower(0.8);
    }
    renderPanel();
    redraw();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!state.game || state.game.holed || state.animating) return;
    const world = pointerWorld(event);
    state.aim = Math.atan2(world.y - state.game.ball.y, world.x - state.game.ball.x);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.buttons !== 1 || !state.game || state.game.holed || state.animating) return;
    const world = pointerWorld(event);
    state.aim = Math.atan2(world.y - state.game.ball.y, world.x - state.game.ball.x);
    redraw();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (!state.hold && !event.repeat) startHold();
      return;
    }
    if (event.key === 'ArrowLeft') {
      state.aim += 0.04;
      redraw();
    } else if (event.key === 'ArrowRight') {
      state.aim -= 0.04;
      redraw();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const ids = CLUBS.map((club) => club.id);
      const index = ids.indexOf(currentClub());
      const next = event.key === 'ArrowUp' ? index - 1 : index + 1;
      if (ids[next]) {
        clubSelect.value = ids[next];
        redraw();
      }
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      endHold();
    }
  });
  window.addEventListener('resize', () => {
    resizeCanvas();
    redraw();
  });
}

async function start() {
  bindControls();
  resizeCanvas();
  const response = await fetch('/data/courses/meadow-park.json');
  if (!response.ok) {
    statusEl.textContent = 'Could not load the course. Start the local server with npm start.';
    return;
  }
  const course = await response.json();
  state.game = createGame(course);
  state.aim = defaultAim(state.game);
  setPower(0.8);
  renderPanel();
  redraw();
}

start();
