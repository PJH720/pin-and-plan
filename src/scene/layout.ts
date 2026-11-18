import { BLOCKS, TASKS } from '../planner/content.js';

/**
 * Layout from specs/001-morning-planner/plan.md, in anchor space: the origin
 * is the head at session start, -z is forward, y is up from eye height.
 */
export interface Spot {
  x: number;
  y: number;
  z: number;
  /** Rotation about y that turns the object's front (+z) to the head. */
  yaw: number;
}

const DEG = Math.PI / 180;

export const TOKEN_SIZE = { width: 0.095, height: 0.04, depth: 0.01 } as const;
export const BLOCK_SIZE = { width: 0.19, height: 0.27 } as const;
export const END_CARD_SIZE = { width: 0.22, height: 0.06 } as const;
export const CHIP_SIZE = { width: 0.16, height: 0.036 } as const;
export const ORB_RADIUS = 0.035;
export const RESET_RADIUS = 0.03;
/** A release within this distance of a block centre is a drop on it (AC-1). */
export const DROP_RADIUS = 0.16;
/** Near-pinch activation radius for orb and reset control (spec.md). */
export const ACTIVATE_RADIUS = 0.06;
/** Slot centres relative to the block panel centre, + is up. */
export const SLOT_OFFSETS_Y = [0.06, -0.06] as const;
/** Head pose used on the flat page, before an AR session. */
export const FLAT_EYE = { x: 0, y: 1.6, z: 0 } as const;

/** Tokens sit this far in front of a block panel. */
const SLOT_LIFT = 0.008;
const BLOCK_ANGLES = [-36, -12, 12, 36];
const BLOCK_RADIUS = 0.5;
const BLOCK_BELOW = 0.2;
const TRAY_X = [-0.16, 0, 0.16] as const;
const TRAY_FORWARD = [0.42, 0.3] as const;
const TRAY_BELOW = 0.34;
const CONTROL_ANGLE = 52;
const CONTROL_RADIUS = 0.42;
const CONTROL_BELOW = 0.3;
const END_CARD_BELOW = 0.01;

function polar(angleDeg: number, radius: number, below: number): Spot {
  const angle = angleDeg * DEG;
  return {
    x: radius * Math.sin(angle),
    y: -below,
    z: -radius * Math.cos(angle),
    yaw: -angle,
  };
}

export const BLOCK_SPOTS: Readonly<Record<string, Spot>> = Object.fromEntries(
  BLOCKS.map((block, index) => [
    block.id,
    polar(BLOCK_ANGLES[index], BLOCK_RADIUS, BLOCK_BELOW),
  ]),
);

export const SLOT_SPOTS: Readonly<Record<string, readonly Spot[]>> =
  Object.fromEntries(
    BLOCKS.map((block, index) => [
      block.id,
      SLOT_OFFSETS_Y.map((offsetY) =>
        polar(
          BLOCK_ANGLES[index],
          BLOCK_RADIUS - SLOT_LIFT,
          BLOCK_BELOW - offsetY,
        ),
      ),
    ]),
  );

/** Tray: flat 3 x 2 metre grid; back row L->R then front row L->R. */
export const TRAY_SPOTS: readonly Spot[] = TASKS.map((_task, index) => {
  const x = TRAY_X[index % TRAY_X.length];
  const forward = TRAY_FORWARD[Math.floor(index / TRAY_X.length)];
  return {
    x,
    y: -TRAY_BELOW,
    z: -forward,
    yaw: Math.atan2(-x, forward),
  };
});

export const ORB_SPOT: Spot = polar(
  CONTROL_ANGLE,
  CONTROL_RADIUS,
  CONTROL_BELOW,
);
export const RESET_SPOT: Spot = polar(
  -CONTROL_ANGLE,
  CONTROL_RADIUS,
  CONTROL_BELOW,
);
export const END_CARD_SPOT: Spot = polar(0, BLOCK_RADIUS, END_CARD_BELOW);
