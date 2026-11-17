// 楼层作为一台机器：一张粗网格给寻路，墙矩形给视线与身体，动态卷帘门/门板改的是同一张网格。
// 具体是哪一层由 cases.js 决定，这里只保留「当前的案子」。

import { TUNING, VIEW } from './config.js';

const CELL = TUNING.cell;

let ACTIVE = null;
let EXTRA = [];

export function setWorld(caseData) {
  ACTIVE = caseData;
  EXTRA = [];
}

// 动态实体（卷帘门、防火门、门板）：铁板一块，挡人也挡视线。
export function setExtras(level, rects) {
  EXTRA = rects || [];
  if (level) paint(level);
}

function hits(cx, cy, list, pad) {
  for (const [x, y, w, h] of list) {
    if (cx > x - pad && cx < x + w + pad && cy > y - pad && cy < y + h + pad) return true;
  }
  return false;
}

function paint(level) {
  const { cols, rows, blocked } = level;
  const c = ACTIVE;
  blocked.fill(0);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const cx = gx * CELL + CELL / 2;
      const cy = gy * CELL + CELL / 2;
      const hit = hits(cx, cy, c.walls, 14)
        || hits(cx, cy, c.props, 12)
        || hits(cx, cy, c.soft || [], 12)
        || hits(cx, cy, EXTRA, 14);
      if (hit) blocked[gy * cols + gx] = 1;
    }
  }
}

export function buildLevel() {
  const cols = Math.ceil(VIEW.width / CELL);
  const rows = Math.ceil(VIEW.height / CELL);
  const level = { cols, rows, blocked: new Uint8Array(cols * rows) };
  paint(level);
  return level;
}

// 身体走不过去：墙、家具、水田、此刻关着的门。sight = true 时不看水田（水面挡人，不挡目光）。
export function solid(x, y, margin = 0, sight = false) {
  const c = ACTIVE;
  if (!c) return false;
  if (hits(x, y, c.walls, margin)) return true;
  if (hits(x, y, c.props, margin)) return true;
  if (!sight && hits(x, y, c.soft || [], margin)) return true;
  if (hits(x, y, EXTRA, margin)) return true;
  return false;
}

// Walls and furniture, but not water: the things that live in the field wade through the paddies.
export function hardSolid(x, y, margin = 0) {
  const c = ACTIVE;
  if (!c) return false;
  if (hits(x, y, c.walls, margin)) return true;
  if (hits(x, y, c.props, margin)) return true;
  if (hits(x, y, EXTRA, margin)) return true;
  return false;
}

// Sight: sample the segment; anything solid between stops it. Cheap and exact enough at 6 px.
export function lineClear(x1, y1, x2, y2, margin = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    if (solid(x1 + (dx * i) / steps, y1 + (dy * i) / steps, margin, true)) return false;
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

  // string pull, with walking clearance so a pulled line is a line the body can actually take.
  // If even the first cell centre cannot be reached (the body is hugging a corner), step onto its
  // own cell centre first: one short, always-legal move, then pull again from there.
  const path = [];
  let anchor = { x: fromX, y: fromY };
  let i = 0;
  if (cells.length && !walkClear(anchor.x, anchor.y, cells[0].x, cells[0].y)) {
    const own = { x: start.x * CELL + CELL / 2, y: start.y * CELL + CELL / 2 };
    if (walkClear(fromX, fromY, own.x, own.y)) {
      path.push(own);
      anchor = { x: own.x, y: own.y };
    }
  }
  while (i < cells.length) {
    let furthest = i;
    for (let j = cells.length - 1; j >= i; j -= 1) {
      if (walkClear(anchor.x, anchor.y, cells[j].x, cells[j].y)) {
        furthest = j;
        break;
      }
    }
    path.push(cells[furthest]);
    anchor.x = cells[furthest].x;
    anchor.y = cells[furthest].y;
    i = furthest + 1;
  }
  return path;
}
