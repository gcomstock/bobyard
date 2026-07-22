import type { Point } from './model';

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

export function distToPolyline(p: Point, pts: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    min = Math.min(min, distToSegment(p, pts[i], pts[i + 1]));
  }
  return min;
}

/** Ramer–Douglas–Peucker simplification. */
export function simplify(pts: Point[], tolerance: number): Point[] {
  if (pts.length <= 2) return pts.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  let maxDist = -1;
  let maxIdx = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToSegment(pts[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist <= tolerance) return [first, last];
  const left = simplify(pts.slice(0, maxIdx + 1), tolerance);
  const right = simplify(pts.slice(maxIdx), tolerance);
  return left.slice(0, -1).concat(right);
}

/** Snap nearly-horizontal/vertical edges to axis, mimicking pipe runs on plans. */
export function straighten(pts: Point[], angleTolDeg = 12): Point[] {
  if (pts.length < 2) return pts.slice();
  const out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i];
    const b = out[i + 1];
    const ang = (Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180) / Math.PI;
    if (ang < angleTolDeg) b.y = a.y;
    else if (ang > 90 - angleTolDeg) b.x = a.x;
  }
  return out;
}

export function polylineToPath(pts: Point[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}
