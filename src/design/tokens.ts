import type { Energy } from '../planner/types.js';

/**
 * Architectural Morning Desk Design System tokens for Pin & Plan.
 * Calibrated for natural readability in bright sunlit passthrough rooms
 * (Meta Quest 3 / 3S) and tactile physicality without neon/AI-slop glare.
 */
export const CANVAS_BUDGETS = {
  /** Exact 0.19 : 0.27 aspect ratio (4x sharper than 128x128, zero stretch). */
  block: { width: 512, height: 728 },
  /** Exact 0.095 : 0.04 aspect ratio. */
  token: { width: 512, height: 216 },
  /** Crisp warm-paper pill XAI reason chip. */
  chip: { width: 512, height: 118 },
  /** Calm sage-glass "Day planned" banner. */
  endCard: { width: 640, height: 192 },
  /** Circular frosted stone reset control. */
  reset: { size: 256 },
  /** Brushed solid brass pin emblem. */
  pin: { size: 128 },
  /** Subtle smoked-stone tray mat under unplaced tokens. */
  trayRail: { width: 512, height: 128 },
} as const;

export const BLOCK_PERIODS: Readonly<Record<string, string>> = {
  B1: 'MORNING',
  B2: 'AFTERNOON',
  B3: 'EVENING',
  B4: 'NIGHT',
};

export interface TokenPalette {
  readonly top: string;
  readonly bottom: string;
  readonly accent: string;
  readonly rim: string;
  readonly pillInk: string;
  readonly tag: string;
}

export const ENERGY_PALETTES: Readonly<Record<Energy, TokenPalette>> = {
  high: {
    top: '#ba5230',
    bottom: '#923d21',
    accent: '#f5c2a8',
    rim: 'rgba(255, 224, 206, 0.36)',
    pillInk: '#fde3d4',
    tag: 'HIGH ENERGY',
  },
  medium: {
    top: '#4a685b',
    bottom: '#374f45',
    accent: '#b7d6c6',
    rim: 'rgba(208, 232, 220, 0.34)',
    pillInk: '#d7ebe0',
    tag: 'BALANCED',
  },
  low: {
    top: '#3c5f78',
    bottom: '#2c475b',
    accent: '#b0d1e6',
    rim: 'rgba(202, 226, 242, 0.36)',
    pillInk: '#d5e9f5',
    tag: 'LOW ENERGY',
  },
};

export const NEUTRAL_TOKEN_PALETTE: TokenPalette = {
  top: '#2e2d2a',
  bottom: '#201f1d',
  accent: '#d6cbb9',
  rim: 'rgba(245, 239, 230, 0.28)',
  pillInk: '#c8bfb0',
  tag: 'SCHEDULED',
};

export const PALETTE = {
  glassTop: 'rgba(32, 31, 29, 0.84)',
  glassBottom: 'rgba(20, 19, 18, 0.90)',
  glassBorder: 'rgba(255, 249, 240, 0.20)',
  glassSpecular: 'rgba(255, 252, 247, 0.42)',
  glassHoverValidBorder: 'rgba(240, 212, 162, 0.94)',
  glassHoverValidGlow: 'rgba(232, 194, 128, 0.20)',
  glassHoverFullBorder: 'rgba(224, 96, 84, 0.92)',
  glassHoverFullGlow: 'rgba(216, 76, 64, 0.20)',
  slotFill: 'rgba(255, 250, 242, 0.04)',
  slotStroke: 'rgba(235, 229, 218, 0.30)',
  slotValidStroke: 'rgba(245, 220, 175, 0.78)',
  slotFullStroke: 'rgba(232, 114, 102, 0.60)',
  inkPrimary: '#faf7f2',
  inkDark: '#1c1917',
  inkSecondary: '#bdb5a8',
  inkMuted: '#8a8275',
  urgentAccent: '#f07468',
  urgentBg: 'rgba(224, 82, 70, 0.22)',
  fixedAccent: '#efe9df',
  fixedBg: 'rgba(250, 245, 238, 0.14)',
  pinGold: '#e5a93c',
  pinRim: '#f9dfa2',
  pinCore: '#fffdf7',
  /** Physical frosted pearl-opal Agent Orb tones (sunlit glass, zero neon). */
  orbCore: '#4a4640',
  orbPearl: '#dfd6c8',
  orbWarm: '#d89b5e',
  orbRim: '#fffaf0',
  orbDone: '#6ea88c',
  /** Editorial warm cream paper reason chips. */
  chipBgTop: 'rgba(252, 249, 244, 0.97)',
  chipBgBottom: 'rgba(242, 236, 226, 0.98)',
  chipBorder: 'rgba(28, 25, 23, 0.18)',
  chipDot: '#ba5230',
  /** Serene botanical sage end card. */
  endBgTop: 'rgba(28, 52, 43, 0.93)',
  endBgBottom: 'rgba(19, 38, 31, 0.96)',
  endBorder: 'rgba(154, 198, 174, 0.72)',
  endAccent: '#9ac6ae',
  edgeBezel: '#1b1a18',
} as const;

export const TYPOGRAPHY = {
  family:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
} as const;

export const MOTION = {
  /** AC-5: agent moves start 0.5 s apart, ~0.4 s duration. */
  agentStepInterval: 0.5,
  agentMoveDuration: 0.4,
  agentArcLift: 0.036,
  slideDuration: 0.24,
  snapSettleDuration: 0.2,
  refusedShakeDuration: 0.24,
  grabScale: 1.06,
  chipDuration: 2.0,
  chipEnterDuration: 0.18,
  chipExitDuration: 0.26,
  ghostLoopSec: 1.75,
  ghostArcY: 0.046,
} as const;

export const RENDER_ORDER = {
  room: -10,
  trayRail: 0,
  block: 1,
  token: 2,
  orb: 3,
  pinMark: 4,
  orbHalo: 4,
  hint: 5,
  chip: 6,
  endCard: 7,
} as const;
