// A* over the walkable floor grid. Diagonals allowed, but never through a corner.
export function findPath(grid, start, goal) {
  const W = grid.length, D = grid[0].length;
  const inside = (x, z) => x >= 0 && z >= 0 && x < W && z < D;
  const ok = (x, z) => inside(x, z) && grid[x][z];
  if (!ok(goal.x, goal.z)) goal = nearestFree(grid, goal);
  if (!goal || !ok(start.x, start.z)) return null;

  const key = (x, z) => x * D + z;
  const open = new Map();
  const came = new Map();
  const gScore = new Map();
  const h = (x, z) => Math.hypot(x - goal.x, z - goal.z);

  const sk = key(start.x, start.z);
  gScore.set(sk, 0);
  open.set(sk, { x: start.x, z: start.z, f: h(start.x, start.z) });

  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let guard = 0;

  while (open.size && guard++ < 6000) {
    let bestK = null, best = null;
    for (const [k, n] of open) if (!best || n.f < best.f) { best = n; bestK = k; }
    open.delete(bestK);

    if (best.x === goal.x && best.z === goal.z) {
      const path = [];
      let k = bestK, cur = best;
      while (cur) { path.push({ x: cur.x, z: cur.z }); cur = came.get(k); k = cur ? key(cur.x, cur.z) : null; }
      return path.reverse();
    }

    for (const [dx, dz] of NB) {
      const nx = best.x + dx, nz = best.z + dz;
      if (!ok(nx, nz)) continue;
      if (dx && dz && (!ok(best.x + dx, best.z) || !ok(best.x, best.z + dz))) continue;
      const nk = key(nx, nz);
      const step = (dx && dz) ? 1.414 : 1;
      const tentative = gScore.get(key(best.x, best.z)) + step;
      if (gScore.has(nk) && tentative >= gScore.get(nk)) continue;
      gScore.set(nk, tentative);
      came.set(nk, { x: best.x, z: best.z });
      open.set(nk, { x: nx, z: nz, f: tentative + h(nx, nz) });
    }
  }
  return null;
}

export function nearestFree(grid, cell) {
  const W = grid.length, D = grid[0].length;
  for (let r = 0; r < 8; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const x = cell.x + dx, z = cell.z + dz;
      if (x >= 0 && z >= 0 && x < W && z < D && grid[x][z]) return { x, z };
    }
  }
  return null;
}

/** Trim waypoints that lie on the same straight run. */
export function simplify(path) {
  if (!path || path.length < 3) return path;
  const out = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1], b = path[i], c = path[i + 1];
    if ((b.x - a.x) !== (c.x - b.x) || (b.z - a.z) !== (c.z - b.z)) out.push(b);
  }
  out.push(path[path.length - 1]);
  return out;
}
