# Golf Game

A top-down 2D golf game that runs in the browser. The shot rules, wind, hazards and scoring live in a pure engine that does not touch the page, so they can be tested on their own. The canvas and controls are a thin layer on top.

The first course, Meadow Park, has three holes: a par 3, a par 4 and a par 5.

## Requirements

- Node 22 or newer
- A current browser

There are no other packages to install.

## How to run

From this folder:

```bash
npm start
```

Then open http://127.0.0.1:3000. The server uses only Node built-ins and serves files from this folder.

You can set `PORT` and `HOST` if you need to:

```bash
PORT=4173 npm start
```

Opening `index.html` as a file may fail to load the course JSON, depending on the browser. Use the server for a reliable start.

## How to play

- Choose a club, or use the up and down keys.
- Aim by dragging on the course, or with the left and right keys. **Aim at cup** points the shot at the hole.
- Set power with the slider, or hold **Hold to swing** (or the space bar) to fill the meter and release to play the shot.
- Water costs one penalty stroke and the ball is dropped at the point where it crossed the water.
- Out of bounds is stroke and distance: the shot and a penalty stroke are counted, and you play again from the last spot.
- After a hole is finished, use **Next hole**. The scorecard shows strokeplay against par and Stableford points.

## Tests

```bash
npm test
```

The tests cover:

- Shot determinism (the same seed and shot land in the same place)
- Club carry order
- Lie penalties for rough and bunkers
- Water penalty and drop
- Out of bounds
- Putting, green slope and holing
- Strokeplay and Stableford scoring, including handicap strokes
- Course JSON validation, including the sample course

## Project structure

```
src/                 Game engine (no page, no canvas)
  rng.js             Seeded random numbers and per-hole wind
  geometry.js        Distances, polygons and path tracing
  clubs.js           Club bag, lie and friction constants
  surfaces.js        Lie detection from course polygons
  physics.js         Carry, roll, wind, hazards and putting
  scoring.js         Strokeplay, Stableford and handicap strokes
  course.js          Course JSON validation
  game.js            Round state, shots and the scorecard
data/courses/        Course JSON files
js/                  Browser drawing and controls
css/styles.css
server.js            Tiny static file server
test/                node:test unit tests
```

World units are yards. The hole runs toward +y. Angle 0 aims to the right; `Math.PI / 2` aims toward the green. The renderer flips y so the tee sits at the bottom of the screen.

## How to add holes and courses

Courses are JSON files under `data/courses/`. To add a hole, append an object to the `holes` array in a course file. To add a course, add a new JSON file and list it in `data/courses/index.json`.

A hole needs:

- `number`, `par` (3, 4 or 5) and `strokeIndex`
- `tee` and `hole` as `{ "x", "y" }`; the cup may include `radius` (yards)
- `surfaces`: polygons of type `rough`, `fairway`, `tee`, `green`, `bunker` or `water`
- Optional `name`, `greenSlope` (`{ "x", "y" }`), `windSeed` and `bounds`

The large `rough` polygon is the in-bounds area. Anything outside it is out of bounds. If surfaces overlap, the engine prefers water, then bunker, green, tee, fairway, then rough. The cup must sit inside a green polygon.

Run `npm test` after you edit a course. `course.js` will reject missing fields, unknown surface types, a cup off the green, and duplicate hole numbers or stroke indexes.

To add a club, append an entry to `CLUBS` in `src/clubs.js` with a unique `id`, a name, a fairway carry in yards, and a `rollFactor`. The putter uses `maxRoll` instead of carry.

Handicap defaults to 0. Pass `{ handicap: 12 }` into `createGame` to give strokes by stroke index.

## Licence

MIT. See `LICENSE`.
