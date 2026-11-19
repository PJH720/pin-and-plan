import type { Energy } from '../planner/types.js';

/**
 * Unified Design System tokens for Pin & Plan v2.0.
 * Shared across 3D canvas textures, GLSL shaders, motion curves, and Web HUD.
 */
export const CANVAS_BUDGETS = {
  /** Exact 0.19 : 0.27 aspect ratio (4x sharper than v1 128x128, zero stretch). */
  block: { width: 512, height: 728 },
  /** Exact 0.095 : 0.04 aspect ratio. */
  token: { width: 512, height: 216 },
  /** Crisp pill-shaped XAI reason chip. */
  chip: { width: 512, height: 118 },
  /** Celebratory "Day planned" glass card. */
  endCard: { width: 640, height: 192 },
  /** Circular frosted reset control. */
  reset: { size: 256 },
  /** Tactile gold pin emblem. */
  pin: { size: 128 },
  /** Subtle frosted tray shelf under unplaced tokens. */
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
  readonly pillBg: string;
  readonly pillInk: string;
  readonly tag: string;
}

export const ENERGY_PALETTES: Readonly<Record<Energy, TokenPalette>> = {
  high: {
    top: '#c2410c',
    bottom: '#7c2d12',
    accent: '#fb923c',
    rim: 'rgba(253, 186, 116, 0.45)',
    pillBg: 'rgba(255, 237, 213, 0.16)',
    pillInk: '#fed7aa',
    tag: 'HIGH ENERGY',
  },
  medium: {
    top: '#334155',
    bottom: '#1e293b',
    accent: '#38bdf8',
    rim: 'rgba(148, 163, 184, 0.42)',
    pillBg: 'rgba(226, 232, 240, 0.14)',
    pillInk: '#cbd5e1',
    tag: 'BALANCED',
  },
  low: {
    top: '#0369a1',
    bottom: '#0c4a6e',
    accent: '#7dd3fc',
    rim: 'rgba(125, 211, 252, 0.45)',
    pillBg: 'rgba(224, 242, 254, 0.16)',
    pillInk: '#bae6fd',
    tag: 'LOW ENERGY',
  },
};

export const NEUTRAL_TOKEN_PALETTE: TokenPalette = {
  top: '#1e2538',
  bottom: '#111625',
  accent: '#818cf8',
  rim: 'rgba(165, 180, 252, 0.34)',
  pillBg: 'rgba(129, 140, 248, 0.16)',
  pillInk: '#c7d2fe',
  tag: 'SCHEDULED',
};

export const PALETTE = {
  glassTop: 'rgba(19, 25, 42, 0.90)',
  glassBottom: 'rgba(10, 14, 26, 0.94)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
  glassSpecular: 'rgba(255, 255, 255, 0.34)',
  glassHoverValidBorder: 'rgba(99, 102, 241, 0.92)',
  glassHoverValidGlow: 'rgba(56, 189, 248, 0.24)',
  glassHoverFullBorder: 'rgba(248, 113, 113, 0.92)',
  glassHoverFullGlow: 'rgba(239, 68, 68, 0.22)',
  slotFill: 'rgba(255, 255, 255, 0.035)',
  slotStroke: 'rgba(203, 213, 225, 0.28)',
  slotValidStroke: 'rgba(125, 211, 252, 0.65)',
  slotFullStroke: 'rgba(248, 113, 113, 0.52)',
  inkPrimary: '#f8fafc',
  inkSecondary: '#94a3b8',
  inkMuted: '#64748b',
  urgentAccent: '#fb7185',
  urgentBg: 'rgba(244, 63, 94, 0.24)',
  fixedAccent: '#e2e8f0',
  fixedBg: 'rgba(248, 250, 252, 0.14)',
  pinGold: '#fbbf24',
  pinGlow: '#fef08a',
  pinCore: '#ffffff',
  orbIndigo: '#4f46e5',
  orbViolet: '#8b5cf6',
  orbCyan: '#38bdf8',
  orbEmerald: '#34d399',
  chipBgTop: 'rgba(24, 28, 48, 0.95)',
  chipBgBottom: 'rgba(15, 18, 34, 0.97)',
  chipBorder: 'rgba(139, 92, 246, 0.85)',
  chipDot: '#a78bfa',
  endBgTop: 'rgba(13, 52, 42, 0.94)',
  endBgBottom: 'rgba(8, 34, 28, 0.96)',
  endBorder: 'rgba(52, 211, 153, 0.78)',
  endAccent: '#34d399',
  ghostTint: '#a5b4fc',
  edgeBezel: '#0f1422',
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
  agentArcLift: 0.038,
  slideDuration: 0.24,
  snapSettleDuration: 0.2,
  refusedShakeDuration: 0.24,
  grabScale: 1.06,
  chipDuration: 2.0,
  chipEnterDuration: 0.18,
  chipExitDuration: 0.26,
  ghostLoopSec: 1.75,
  ghostArcY: 0.048,
} as const;

export const RENDER_ORDER = {
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
