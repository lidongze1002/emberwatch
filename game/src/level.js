// The floor plan as a machine: a coarse grid for pathing, the wall rectangles for sight and for
// the body, and a string-pulled path so agents walk lines instead of staircases.

import { PROPS, TUNING, VIEW, WALLS } from './config.js';

const CELL = TUNING.cell;

export function buildLevel() {
  const cols = Math.ceil(VIEW.width / CELL);
  const rows = Math.ceil(VIEW.height / CELL);
  const blocked = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const cx = gx * CELL + CELL / 2;
      const cy = gy * CELL + CELL / 2;
      const hit = WALLS.some(([x, y, w, h]) => cx > x - 14 && cx < x + w + 14 && cy > y - 14 && cy < y + h + 14)
        || PROPS.some(([x, y, w, h]) => cx > x - 12 && cx < x + w + 12 && cy > y - 12 && cy < y + h + 12);
      if (hit) blocked[gy * cols + gx] = 1;
    }
  }
  return { cols, rows, blocked };
}

// A point is solid if it is inside a wall block or a piece of furniture, with the body's margin.
export function solid(x, y, margin = 0) {
  for (const [wx, wy, ww, wh] of WALLS) {
    if (x > wx - margin && x < wx + ww + margin && y > wy - margin && y < wy + wh + margin) return true;
  }
  for (const [px, py, pw, ph] of PROPS) {
    if (x > px - margin && x < px + pw + margin && y > py - margin && y < py + ph + margin) return true;
  }
  return false;
}

// Sight: sample the segment; anything solid between stops it. Cheap and exact enough at 6 px.
export function lineClear(x1, y1, x2, y2, margin = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    if (solid(x1 + (dx * i) / steps, y1 + (dy * i) / steps, margin)) return false;
  }
  return true;
}

// Walking clearance is stricter than sight: furniture counts, and the body has a radius.
export function walkClear(x1, y1, x2, y2, margin = TUNING.agentRadius + 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 5));
  for (let i = 1; i <= steps; i += 1) {
    if (solid(x1 + (dx * i) / steps, y1 + (dy * i) / steps, margin)) return false;
  }
  return true;
}

const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

function nearestFreeCell(level, gx, gy) {
  const { cols, rows, blocked } = level;
  for (let r = 0; r < 6; r += 1) {
    for (let oy = -r; oy <= r; oy += 1) {
      for (let ox = -r; ox <= r; ox += 1) {
        const x = gx + ox;
        const y = gy + oy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        if (!blocked[y * cols + x]) return { x, y };
      }
    }
  }
  return null;
}

// A* on the grid, then pull the string tight: any waypoint the body can see past is dropped.
export function findPath(level, fromX, fromY, toX, toY) {
  const { cols, rows, blocked } = level;
  const start = nearestFreeCell(level, Math.floor(fromX / CELL), Math.floor(fromY / CELL));
  const goal = nearestFreeCell(level, Math.floor(toX / CELL), Math.floor(toY / CELL));
  if (!start || !goal) return [{ x: toX, y: toY }];

  const count = cols * rows;
  const open = [];
  const came = new Int32Array(count).fill(-1);
  const gScore = new Float32Array(count).fill(Infinity);
  const closed = new Uint8Array(count);
  const startId = start.y * cols + start.x;
  const goalId = goal.y * cols + goal.x;
  const h = (id) => Math.hypot((id % cols) - goal.x, Math.floor(id / cols) - goal.y);
  gScore[startId] = 0;
  open.push({ id: startId, f: h(startId) });

  while (open.length) {
    let bestAt = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bestAt].f) bestAt = i;
    const current = open.splice(bestAt, 1)[0];
    if (current.id === goalId) break;
    if (closed[current.id]) continue;
    closed[current.id] = 1;

    const cx = current.id % cols;
    const cy = Math.floor(current.id / cols);
    for (const [ox, oy, cost] of NEIGHBOURS) {
      const nx = cx + ox;
      const ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nid = ny * cols + nx;
      if (blocked[nid] || closed[nid]) continue;
      // no squeezing through a corner
      if (ox && oy && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
      const tentative = gScore[current.id] + cost;
      if (tentative >= gScore[nid]) continue;
      gScore[nid] = tentative;
      came[nid] = current.id;
      open.push({ id: nid, f: tentative + h(nid) });
    }
  }

  const cells = [];
  let cursor = goalId;
  if (came[cursor] === -1 && cursor !== startId) return [{ x: toX, y: toY }];
  while (cursor !== -1 && cursor !== startId) {
    cells.push({ x: (cursor % cols) * CELL + CELL / 2, y: Math.floor(cursor / cols) * CELL + CELL / 2 });
    cursor = came[cursor];
  }
  cells.reverse();
  cells.push({ x: toX, y: toY });

  // string pull, with walking clearance so a pulled line is a line the body can actually take
  const path = [];
  let anchor = { x: fromX, y: fromY };
  let i = 0;
  while (i < cells.length) {
    let furthest = i;
    for (let j = cells.length - 1; j >= i; j -= 1) {
      if (walkClear(anchor.x, anchor.y, cells[j].x, cells[j].y)) {
        furthest = j;
        break;
      }
    }
    path.push(cells[furthest]);
    anchor = cells[furthest];
    i = furthest + 1;
  }
  return path;
}
