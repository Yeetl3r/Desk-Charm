import { useRef } from "react";

export type RopePoint = { x: number; y: number; px: number; py: number; pinned: boolean };

export const SEGMENTS = 16;
const SEG_LEN = 7;
const GRAVITY = 0.45;
const DAMPING = 0.95;
const CONSTRAINT_ITERATIONS = 4;
const ELASTICITY = 0.65; // Adds a rubber-band feel

export function createRope(anchorX: number, anchorY: number): RopePoint[] {
  const points: RopePoint[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const y = anchorY + i * SEG_LEN;
    points.push({ x: anchorX, y, px: anchorX, py: y, pinned: i === 0 });
  }
  return points;
}

export function useRope(anchorX: number, anchorY: number) {
  const pointsRef = useRef<RopePoint[]>(createRope(anchorX, anchorY));
  return pointsRef;
}

export function stepRope(
  points: RopePoint[],
  anchorX: number,
  anchorY: number,
  windX: number,
  dragIndex: number | null,
  dragPos: { x: number; y: number } | null,
  bounds: { width: number; height: number; margin: number },
): boolean {
  points[0].x = anchorX;
  points[0].y = anchorY;
  points[0].px = anchorX;
  points[0].py = anchorY;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (dragIndex !== null && i === dragIndex && dragPos) {
      p.px = p.x;
      p.py = p.y;
      p.x = dragPos.x;
      p.y = dragPos.y;
      continue;
    }
    const vx = (p.x - p.px) * DAMPING;
    const vy = (p.y - p.py) * DAMPING;
    p.px = p.x;
    p.py = p.y;
    p.x += vx + windX;
    p.y += vy + GRAVITY;
  }

  for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const diff = (dist - SEG_LEN) / dist;
      const aPinned = a.pinned || (dragIndex !== null && i === dragIndex);
      const bPinned = b.pinned || (dragIndex !== null && i + 1 === dragIndex);
      if (aPinned && bPinned) continue;
      if (aPinned) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else if (bPinned) {
        a.x += dx * diff;
        a.y += dy * diff;
      } else {
        a.x += dx * diff * 0.5 * ELASTICITY;
        a.y += dy * diff * 0.5 * ELASTICITY;
        b.x -= dx * diff * 0.5 * ELASTICITY;
        b.y -= dy * diff * 0.5 * ELASTICITY;
      }
    }
  }

  let totalEnergy = 0;
  const { width, height, margin } = bounds;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const clampedX = Math.min(Math.max(p.x, margin), width - margin);
    const clampedY = Math.min(Math.max(p.y, -100), height - margin);
    if (clampedX !== p.x) p.px = clampedX;
    if (clampedY !== p.y) p.py = clampedY;
    p.x = clampedX;
    p.y = clampedY;
    
    totalEnergy += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
  }

  return totalEnergy < 0.15 && dragIndex === null;
}
