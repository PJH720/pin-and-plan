/**
 * Pure, allocation-free spatial animation curves inspired by the
 * 12 Principles of Animation (Slow-in/out, Arc, Follow-through, Anticipation).
 */

export function clamp01(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

/** Smooth deceleration curve for token flight and UI settles. */
export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

/** Smooth S-curve for looping onboarding arcs. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Tactile overshoot curve (Squash & Stretch / Follow-through) for
 * snapping chips, end card, and pin settles into place.
 */
export function easeOutBack(t: number, overshoot = 1.4): number {
  const x = clamp01(t) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
}

/** Parabolic flight arc height: 0 at endpoints, peak `height` at t = 0.5. */
export function arcLift(t: number, height: number): number {
  const x = clamp01(t);
  return 4 * x * (1 - x) * height;
}

/**
 * Tactile snap-settle scale pulse: starts slightly expanded (1.05),
 * compresses softly (0.985), and settles cleanly to 1.0.
 */
export function snapSettleScale(t: number): number {
  const x = clamp01(t);
  if (x >= 1) {
    return 1;
  }
  return 1 + Math.sin(x * Math.PI * 1.5) * (1 - x) * 0.055;
}

/**
 * Short damped horizontal shake for refused drops onto a full block (AC-2).
 * Returns 0 at t = 0 and t = 1.
 */
export function refusedShakeX(t: number, amplitude = 0.011): number {
  const x = clamp01(t);
  if (x <= 0 || x >= 1) {
    return 0;
  }
  return Math.sin(x * Math.PI * 4) * (1 - x) * amplitude;
}

/**
 * Smooth fade-in and fade-out envelope so looping hints appear and vanish
 * gracefully instead of popping abruptly at loop boundaries.
 */
export function smoothBellFade(
  t: number,
  fadeInEnd = 0.18,
  fadeOutStart = 0.82,
): number {
  const x = clamp01(t);
  if (x < fadeInEnd) {
    return easeOutCubic(x / fadeInEnd);
  }
  if (x > fadeOutStart) {
    return easeOutCubic((1 - x) / (1 - fadeOutStart));
  }
  return 1;
}
