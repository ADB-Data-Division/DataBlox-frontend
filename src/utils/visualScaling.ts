/**
 * Helpers for computing visual sizes for nodes/lines/text based on zoom.
 * Keep functions pure and configurable. This file contains safe defaults
 * that can be tuned by importing `VISUAL_CONFIG`.
 */

export const VISUAL_CONFIG = {
  // base screen radius (px) used as a multiplier for node size values
  baseScreenPx: 45,
  // exponent applied to node.size to compress dynamic range (0.5 = sqrt)
  sizeValueExp: 0.5,
  // screen exponent controls how screen size changes with zoom (s)
  // s=0 -> screen-constant, s=0.5 -> partial growth on zoom-in
  screenExponent: 0.0,
  // min/max allowed screen pixel sizes (before converting to data units)
  minScreenPx: 30,
  maxScreenPx: 50,
  baseStrokePx: 3,
  minStrokePx: 0.1,
  maxStrokePx: 6,
  baseFontPx: 10,
  minFontPx: 0.09,
  maxFontPx: 20,
  overlapPaddingPx: 2,
  maxShiftPx: 20,
  // dash pattern defaults (screen px)
  baseDashPx:32,
  baseGapPx: 8,
};

/**
 * Compute a data-space radius (value to set on circle[r]) such that
 * the visual screen-space radius follows the policy:
 *   desiredScreenPx = baseScreenPx * (baseRadius ^ sizeValueExp) * k^(screenExponent)
 * and since SVG group is transformed by k, dataRadius = desiredScreenPx / k
 */
export function computeRadius(baseRadius: number, zoomK: number, config = VISUAL_CONFIG) {
  const k = Math.max(zoomK, 0.0001);

  // compress the baseRadius value to reduce extreme ranges (e.g., sqrt)
  const valueScale = Math.pow(Math.max(0, baseRadius), config.sizeValueExp);

  const desiredScreenPx = config.baseScreenPx * valueScale * Math.pow(k, config.screenExponent);

  // clamp in screen space, then convert back to data units
  const clampedScreen = Math.max(config.minScreenPx, Math.min(config.maxScreenPx, desiredScreenPx));
  const dataRadius = clampedScreen / k;
  return dataRadius;
}

export function computeStrokeWidth(baseStroke: number, zoomK: number, config = VISUAL_CONFIG) {
  // Keep stroke visually consistent by inversely scaling but clamped
  const k = Math.max(zoomK, 0.0001);
  const w = baseStroke / k;
  return Math.max(config.minStrokePx, Math.min(config.maxStrokePx, w));
}

export function computeFontSize(baseFont: number, zoomK: number, config = VISUAL_CONFIG, useSqrt = true) {
  const k = Math.max(zoomK, 0.0001);
  const exp = useSqrt ? 0.5 : 1;
  const size = baseFont * Math.pow(k, -exp);
  return Math.max(config.minFontPx, Math.min(config.maxFontPx, size));
}

// Lightweight O(n^2) screen-space overlap resolver. Returns a map of id -> {dx,dy}
export function resolveScreenOverlaps(screenNodes: Array<{id: string, x: number, y: number, r: number}>, opts?: {padding?: number, maxShift?: number}) {
  const padding = opts?.padding ?? VISUAL_CONFIG.overlapPaddingPx;
  const maxShift = opts?.maxShift ?? VISUAL_CONFIG.maxShiftPx;

  const offsets = new Map<string, {dx: number, dy: number}>();
  // initialize
  for (const n of screenNodes) offsets.set(n.id, {dx: 0, dy: 0});

  const N = screenNodes.length;
  // Simple iterative pass (could be repeated for stronger separation but keep light)
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = screenNodes[i];
      const b = screenNodes[j];
      const oa = offsets.get(a.id)!;
      const ob = offsets.get(b.id)!;
      const ax = a.x + oa.dx;
      const ay = a.y + oa.dy;
      const bx = b.x + ob.dx;
      const by = b.y + ob.dy;
      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
      const minDist = a.r + b.r + padding;
      if (dist < minDist) {
        const overlap = (minDist - dist);
        // push each node away by half the overlap (scaled by small factor)
        const ux = dx / dist;
        const uy = dy / dist;
        const shift = overlap * 0.5;
        // apply small nudges (clamp to maxShift)
        const shiftAx = Math.max(-maxShift, Math.min(maxShift, -ux * shift));
        const shiftAy = Math.max(-maxShift, Math.min(maxShift, -uy * shift));
        const shiftBx = Math.max(-maxShift, Math.min(maxShift, ux * shift));
        const shiftBy = Math.max(-maxShift, Math.min(maxShift, uy * shift));

        oa.dx += shiftAx;
        oa.dy += shiftAy;
        ob.dx += shiftBx;
        ob.dy += shiftBy;
      }
    }
  }

  return offsets; // Map id -> {dx,dy} in screen pixels
}

/**
 * Compute a stroke-dasharray in data units so the dash appears roughly the same size
 * on screen regardless of zoom. Returns { dashArray, patternLengthScreenPx } where
 * dashArray is a string like 'd,g' in data units and patternLengthScreenPx is the
 * screen-pixel length of one dash+gap cycle (used for animation timing).
 */
export function computeDashPattern(zoomK: number, config = VISUAL_CONFIG) {
  const k = Math.max(zoomK, 0.0001);
  const dashScreen = config.baseDashPx;
  const gapScreen = config.baseGapPx;
  const patternScreen = dashScreen + gapScreen;
  // convert to data units by dividing by k so when group is scaled by k the dash equals screen px
  const dashData = dashScreen / k;
  const gapData = gapScreen / k;
  return {
    dashArray: `${dashData}, ${gapData}`,
    patternLengthScreenPx: patternScreen
  };
}

export default {
  VISUAL_CONFIG,
  computeRadius,
  computeStrokeWidth,
  computeFontSize,
  resolveScreenOverlaps
};
