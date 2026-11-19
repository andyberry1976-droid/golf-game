import { holeBounds, surfaceAt } from '../src/surfaces.js';
import { cupRadius } from '../src/physics.js';
import { CLUBS } from '../src/clubs.js';
import { distance } from '../src/geometry.js';

const COLORS = {
  rough: '#3d7a45',
  fairway: '#5ca85a',
  tee: '#6fb86a',
  green: '#8fd98a',
  bunker: '#e4cc8a',
  water: '#2f7eb8',
  outline: 'rgba(12, 32, 18, 0.35)',
};

const DRAW_ORDER = ['rough', 'fairway', 'tee', 'bunker', 'green', 'water'];

export function createViewport(canvas, hole, padding = 18) {
  const bounds = holeBounds(hole);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const usableW = canvas.width - padding * 2;
  const usableH = canvas.height - padding * 2;
  const scale = Math.min(usableW / width, usableH / height);
  const offsetX = (canvas.width - width * scale) / 2 - bounds.minX * scale;
  const offsetY = (canvas.height - height * scale) / 2 + bounds.maxY * scale;
  return {
    scale,
    toCanvas(point) {
      return {
        x: point.x * scale + offsetX,
        y: offsetY - point.y * scale,
      };
    },
    toWorld(point) {
      return {
        x: (point.x - offsetX) / scale,
        y: (offsetY - point.y) / scale,
      };
    },
  };
}

export function drawHole(ctx, game, options) {
  const { hole, ball, wind, holed } = options;
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fillBackdrop(ctx);
  const view = createViewport(canvas, hole);

  for (const type of DRAW_ORDER) {
    for (const surface of hole.surfaces) {
      if (surface.type !== type) continue;
      drawPolygon(ctx, view, surface.polygon, COLORS[type], COLORS.outline);
    }
  }

  drawYardMarkers(ctx, view, hole);
  drawCup(ctx, view, hole);
  if (options.aim && !holed && !game.finished) {
    drawAim(ctx, view, ball, options.aim.angle, options.aim.length);
  }
  drawBall(ctx, view, options.ballDisplay ?? ball, options.ballScale ?? 1);
  drawWindBadge(ctx, wind);
  drawHoleFlag(ctx, view, hole);
  return view;
}

function fillBackdrop(ctx) {
  const { width, height } = ctx.canvas;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1b4f30');
  gradient.addColorStop(1, '#123524');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawPolygon(ctx, view, polygon, fill, stroke) {
  if (!polygon?.length) return;
  ctx.beginPath();
  polygon.forEach((point, index) => {
    const mapped = view.toCanvas(point);
    if (index === 0) ctx.moveTo(mapped.x, mapped.y);
    else ctx.lineTo(mapped.x, mapped.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCup(ctx, view, hole) {
  const center = view.toCanvas(hole.hole);
  const radius = Math.max(4, cupRadius(hole) * view.scale);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e4d4';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a16';
  ctx.fill();
}

function drawHoleFlag(ctx, view, hole) {
  const base = view.toCanvas(hole.hole);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(base.x, base.y - 22);
  ctx.strokeStyle = '#f4f1e6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(base.x, base.y - 22);
  ctx.lineTo(base.x + 10, base.y - 17);
  ctx.lineTo(base.x, base.y - 12);
  ctx.closePath();
  ctx.fillStyle = '#c44536';
  ctx.fill();
}

function drawBall(ctx, view, ball, scale) {
  const pos = view.toCanvas(ball);
  const radius = 4.4 * scale;
  ctx.beginPath();
  ctx.arc(pos.x + 1, pos.y + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f7f5ef';
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 40, 40, 0.35)';
  ctx.stroke();
}

function drawAim(ctx, view, ball, angle, length) {
  const end = {
    x: ball.x + Math.cos(angle) * length,
    y: ball.y + Math.sin(angle) * length,
  };
  const from = view.toCanvas(ball);
  const to = view.toCanvas(end);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = 'rgba(247, 245, 239, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#e7c56a';
  ctx.fill();
}

function drawYardMarkers(ctx, view, hole) {
  const bounds = holeBounds(hole);
  const teeY = hole.tee.y;
  ctx.fillStyle = 'rgba(243, 240, 230, 0.7)';
  ctx.font = '12px Georgia, Times, serif';
  ctx.textAlign = 'left';
  for (let yards = 50; yards <= bounds.maxY - teeY; yards += 50) {
    const point = view.toCanvas({ x: bounds.minX + 4, y: teeY + yards });
    ctx.fillText(`${yards} yds`, point.x, point.y);
  }
}

function drawWindBadge(ctx, wind) {
  const speed = wind?.speed ?? 0;
  const angle = wind?.angle ?? 0;
  const x = 28;
  const y = 28;
  ctx.fillStyle = 'rgba(13, 35, 24, 0.7)';
  const bx = x - 16;
  const by = y - 16;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, 92, 48, 10);
  } else {
    ctx.rect(bx, by, 92, 48);
  }
  ctx.fill();
  ctx.save();
  ctx.translate(x + 10, y + 8);
  ctx.rotate(-angle);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fillStyle = '#e7c56a';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f3f0e6';
  ctx.font = '12px Georgia, Times, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${speed.toFixed(1)} mph`, x + 28, y + 12);
}

export function estimatedShotLength(clubId, power) {
  const club = CLUBS.find((item) => item.id === clubId);
  if (!club) return 40;
  if (club.id === 'putter') return (club.maxRoll ?? 40) * power;
  return club.carry * power * (1 + club.rollFactor);
}

export { surfaceAt, distance };
