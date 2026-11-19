/**
 * Strokeplay and Stableford scoring.
 *
 * Handicap strokes follow stroke index: a handicap of 12 receives one
 * stroke on holes with stroke index 1 to 12. Handicaps above 18 receive
 * a second stroke, starting again at stroke index 1.
 */

export function strokesReceived(handicap, strokeIndex) {
  const hcap = Math.max(0, Math.floor(Number(handicap) || 0));
  const index = Number(strokeIndex);
  if (!Number.isFinite(index) || index < 1) return 0;
  const extra = Math.floor(hcap / 18);
  const remainder = hcap % 18;
  return extra + (index <= remainder ? 1 : 0);
}

export function stablefordPoints(netVsPar) {
  return Math.max(0, 2 - netVsPar);
}

export function scoreHole({ strokes, par, strokeIndex, handicap = 0 }) {
  const received = strokesReceived(handicap, strokeIndex);
  const net = strokes - received;
  return {
    strokes,
    par,
    strokeIndex,
    handicap,
    strokesReceived: received,
    net,
    vsPar: strokes - par,
    netVsPar: net - par,
    stableford: stablefordPoints(net - par),
  };
}

export function totalScore(holeScores) {
  return holeScores.reduce(
    (total, hole) => {
      total.strokes += hole.strokes;
      total.par += hole.par;
      total.net += hole.net;
      total.vsPar += hole.vsPar;
      total.netVsPar += hole.netVsPar;
      total.stableford += hole.stableford;
      return total;
    },
    { strokes: 0, par: 0, net: 0, vsPar: 0, netVsPar: 0, stableford: 0 },
  );
}

export function formatVsPar(vsPar) {
  if (vsPar === 0) return 'E';
  if (vsPar > 0) return `+${vsPar}`;
  return String(vsPar);
}
