import { describe, expect, it } from 'vitest';
import {
  arcLift,
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  refusedShakeX,
  smoothBellFade,
  snapSettleScale,
} from './motion.js';

describe('spatial motion curves', () => {
  it('clamp01 bounds out-of-range inputs', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.8)).toBe(1);
  });

  it('easeOutCubic and easeInOutCubic hit exact endpoints and stay monotonic', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);

    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('easeOutBack overshoots gently and settles cleanly at 1', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 6);
    expect(easeOutBack(0.65)).toBeGreaterThan(1);
    expect(easeOutBack(1)).toBeCloseTo(1, 6);
  });

  it('arcLift peaks at midpoint and touches 0 at both ends', () => {
    expect(arcLift(0, 0.04)).toBe(0);
    expect(arcLift(0.5, 0.04)).toBeCloseTo(0.04, 6);
    expect(arcLift(1, 0.04)).toBe(0);
  });

  it('snapSettleScale and refusedShakeX return to neutral rest at t = 1', () => {
    expect(snapSettleScale(1)).toBe(1);
    expect(snapSettleScale(0.25)).toBeGreaterThan(1);
    expect(refusedShakeX(0)).toBe(0);
    expect(refusedShakeX(1)).toBe(0);
    expect(Math.abs(refusedShakeX(0.125))).toBeGreaterThan(0);
  });

  it('smoothBellFade fades cleanly at loop edges and holds 1 in the middle', () => {
    expect(smoothBellFade(0)).toBe(0);
    expect(smoothBellFade(0.5)).toBe(1);
    expect(smoothBellFade(1)).toBe(0);
  });
});
