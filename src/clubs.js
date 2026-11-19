/**
 * Club bag and surface constants.
 *
 * Carry values are yards at 100% power, from the fairway, with no wind.
 * rollFactor is the share of that carry that would roll out on a fairway.
 */

export const CLUBS = [
  { id: 'driver', name: 'Driver', carry: 250, rollFactor: 0.18, loft: 10 },
  { id: '3-wood', name: '3 Wood', carry: 220, rollFactor: 0.16, loft: 15 },
  { id: '5-iron', name: '5 Iron', carry: 180, rollFactor: 0.12, loft: 27 },
  { id: '7-iron', name: '7 Iron', carry: 150, rollFactor: 0.10, loft: 34 },
  { id: '9-iron', name: '9 Iron', carry: 125, rollFactor: 0.08, loft: 41 },
  { id: 'wedge', name: 'Wedge', carry: 90, rollFactor: 0.05, loft: 56 },
  { id: 'putter', name: 'Putter', carry: 0, rollFactor: 1, loft: 3, maxRoll: 40 },
];

export const CLUB_BY_ID = Object.fromEntries(CLUBS.map((club) => [club.id, club]));

/** Multipliers applied to aerial carry, based on the lie at address. */
export const LIE_CARRY = {
  tee: 1,
  fairway: 1,
  green: 1,
  rough: 0.85,
  bunker: 0.65,
  water: 0,
  ob: 0,
};

/**
 * Rolling friction in yards per second squared.
 * Higher friction means the ball stops sooner.
 */
export const FRICTION = {
  tee: 12,
  fairway: 12,
  green: 8,
  rough: 28,
  bunker: 55,
};

export const PUTT = {
  maxRoll: 40,
  cupRadius: 0.75,
  maxHoleSpeed: 5,
  stopSpeed: 0.2,
};

/**
 * Yards of drift per mph of wind, per 100 yards of carry.
 * A 10 mph wind therefore moves a 200-yard carry by 16 yards.
 */
export const WIND_DRIFT = 0.8;

/** How strongly green slope steers a rolling ball (direction only). */
export const SLOPE_STEER = 18;

export const ROLL_STEP_SECONDS = 1 / 60;
export const ROLL_MAX_STEPS = 60 * 20;

export function getClub(id) {
  const club = CLUB_BY_ID[id];
  if (!club) {
    throw new Error(`Unknown club: ${id}`);
  }
  return club;
}

export function clubIds() {
  return CLUBS.map((club) => club.id);
}
