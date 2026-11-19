import { CanvasTexture, LinearFilter, SRGBColorSpace } from '@iwsdk/core';
import type { Block, Task } from '../planner/types.js';
import { BLOCK_SIZE, SLOT_OFFSETS_Y, TOKEN_SIZE } from '../scene/layout.js';
import {
  BLOCK_PERIODS,
  CANVAS_BUDGETS,
  ENERGY_PALETTES,
  NEUTRAL_TOKEN_PALETTE,
  PALETTE,
  TYPOGRAPHY,
} from './tokens.js';

export type BlockHighlight = 'idle' | 'valid' | 'full';

export interface BlockTextureSet {
  readonly idle: CanvasTexture;
  readonly valid: CanvasTexture;
  readonly full: CanvasTexture;
}

const TEXTURE_ANISOTROPY = 4;

function font(weight: number, sizePx: number, mono = false): string {
  return `${weight} ${sizePx}px ${mono ? TYPOGRAPHY.mono : TYPOGRAPHY.family}`;
}

function createContext(
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D canvas is not available for spatial textures');
  }
  return ctx;
}

function toTexture(ctx: CanvasRenderingContext2D): CanvasTexture {
  const texture = new CanvasTexture(ctx.canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = TEXTURE_ANISOTROPY;
  texture.generateMipmaps = false;
  return texture;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  left: number,
  right: number,
  centreY: number,
  maxFontPx: number,
  weight: number,
  colour: string,
  align: CanvasTextAlign = 'center',
): void {
  let size = maxFontPx;
  ctx.font = font(weight, size);
  const maxWidth = right - left;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 2;
    ctx.font = font(weight, size);
  }
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x = align === 'left' ? left : align === 'right' ? right : (left + right) / 2;
  ctx.fillText(text, x, centreY);
}

function drawClockIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.fillStyle = PALETTE.fixedBg;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.fixedAccent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.42);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + radius * 0.34, cy + radius * 0.12);
  ctx.stroke();
}

function drawUrgentIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.fillStyle = PALETTE.urgentBg;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.urgentAccent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.urgentAccent;
  ctx.font = font(800, Math.round(radius * 1.35));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + 2);
}

/**
 * Tactile spatial task card face (512 x 216).
 * Outer bezel wraps cleanly onto BoxGeometry thin edges; inner face presents
 * calibrated energy gradient, left glow stripe, vector badge, and crisp label.
 */
export function createTokenTexture(task: Task): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.token;
  const ctx = createContext(width, height);
  const palette =
    task.energy === undefined ? NEUTRAL_TOKEN_PALETTE : ENERGY_PALETTES[task.energy];

  // Solid bezel background so thin BoxGeometry side walls look metallic obsidian
  ctx.fillStyle = PALETTE.edgeBezel;
  ctx.fillRect(0, 0, width, height);

  // Inner rounded glass card body
  const pad = 8;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  roundedRect(ctx, pad, pad, cardW, cardH, 28);
  const bgGrad = ctx.createLinearGradient(0, pad, 0, height - pad);
  bgGrad.addColorStop(0, palette.top);
  bgGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Subtle top specular glass sheen
  ctx.save();
  roundedRect(ctx, pad, pad, cardW, cardH, 28);
  ctx.clip();
  const sheenGrad = ctx.createLinearGradient(0, pad, 0, pad + cardH * 0.48);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(pad, pad, cardW, cardH * 0.48);

  // Left vertical energy accent bar
  const barColour = task.urgent === true ? PALETTE.urgentAccent : palette.accent;
  ctx.fillStyle = barColour;
  roundedRect(ctx, pad + 14, pad + 26, 10, cardH - 52, 5);
  ctx.fill();
  ctx.restore();

  // Crisp inner rim stroke
  roundedRect(ctx, pad + 1.5, pad + 1.5, cardW - 3, cardH - 3, 27);
  ctx.strokeStyle = palette.rim;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Optional clock / urgent badge
  let contentLeft = pad + 44;
  const iconRadius = 26;
  if (task.fixed !== undefined) {
    drawClockIcon(ctx, contentLeft + iconRadius, height / 2, iconRadius);
    contentLeft += iconRadius * 2 + 18;
  }
  if (task.urgent === true) {
    drawUrgentIcon(ctx, contentLeft + iconRadius, height / 2, iconRadius);
    contentLeft += iconRadius * 2 + 18;
  }

  // Subtle metadata tag above task title for visual hierarchy
  const tagText =
    task.fixed !== undefined
      ? 'FIXED'
      : task.urgent === true
        ? 'URGENT'
        : palette.tag;
  const tagColour =
    task.urgent === true ? PALETTE.urgentAccent : palette.pillInk;
  ctx.font = font(700, 20);
  ctx.fillStyle = tagColour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, contentLeft, height * 0.31);

  // Primary task label
  drawFittedText(
    ctx,
    task.label,
    contentLeft,
    width - 34,
    height * 0.63,
    46,
    700,
    PALETTE.inkPrimary,
    'left',
  );

  return toTexture(ctx);
}

function drawBlockFace(block: Block, state: BlockHighlight): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.block;
  const ctx = createContext(width, height);
  const pxPerMetreX = width / BLOCK_SIZE.width;
  const pxPerMetreY = height / BLOCK_SIZE.height;

  ctx.clearRect(0, 0, width, height);

  const margin = 10;
  const panelW = width - margin * 2;
  const panelH = height - margin * 2;
  const cornerR = 44;

  // Ambient hover outer glow (pre-drop affordance & error prevention)
  if (state !== 'idle') {
    ctx.save();
    roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
    ctx.shadowColor =
      state === 'valid'
        ? PALETTE.glassHoverValidBorder
        : PALETTE.glassHoverFullBorder;
    ctx.shadowBlur = 22;
    ctx.fillStyle =
      state === 'valid'
        ? PALETTE.glassHoverValidGlow
        : PALETTE.glassHoverFullGlow;
    ctx.fill();
    ctx.restore();
  }

  // VisionOS dark obsidian frosted glass body
  roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
  const grad = ctx.createLinearGradient(0, margin, 0, height - margin);
  grad.addColorStop(0, PALETTE.glassTop);
  grad.addColorStop(1, PALETTE.glassBottom);
  ctx.fillStyle = grad;
  ctx.fill();

  // Top specular rim & subtle header tint
  ctx.save();
  roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
  ctx.clip();

  const headerGlow = ctx.createLinearGradient(0, margin, 0, margin + 150);
  if (state === 'valid') {
    headerGlow.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
    headerGlow.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
  } else if (state === 'full') {
    headerGlow.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
    headerGlow.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
  } else {
    headerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    headerGlow.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  }
  ctx.fillStyle = headerGlow;
  ctx.fillRect(margin, margin, panelW, 150);

  // Subtle horizontal divider below header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 32, margin + 122);
  ctx.lineTo(width - margin - 32, margin + 122);
  ctx.stroke();
  ctx.restore();

  // Glass border rim
  roundedRect(ctx, margin + 2, margin + 2, panelW - 4, panelH - 4, cornerR - 1);
  ctx.strokeStyle =
    state === 'valid'
      ? PALETTE.glassHoverValidBorder
      : state === 'full'
        ? PALETTE.glassHoverFullBorder
        : PALETTE.glassBorder;
  ctx.lineWidth = state === 'idle' ? 3 : 5;
  ctx.stroke();

  // Top edge specular glint
  ctx.save();
  ctx.strokeStyle =
    state === 'idle' ? PALETTE.glassSpecular : 'rgba(255, 255, 255, 0.52)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + cornerR, margin + 2.5);
  ctx.lineTo(width - margin - cornerR, margin + 2.5);
  ctx.stroke();
  ctx.restore();

  // Period eyebrow label (MORNING / AFTERNOON / EVENING / NIGHT)
  const period = BLOCK_PERIODS[block.id] ?? 'BLOCK';
  const eyebrowColour =
    state === 'full'
      ? '#fca5a5'
      : state === 'valid'
        ? '#93c5fd'
        : PALETTE.inkSecondary;
  ctx.font = font(700, 20);
  ctx.fillStyle = eyebrowColour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state === 'full' ? `${period} · FULL` : period, width / 2, margin + 42);

  // Crisp time-range header with proper en-dash
  const displayTime = block.label.replace('-', ' – ');
  drawFittedText(
    ctx,
    displayTime,
    margin + 28,
    width - margin - 28,
    margin + 86,
    46,
    700,
    PALETTE.inkPrimary,
    'center',
  );

  // Two recessed rounded slot wells aligned exactly to SLOT_OFFSETS_Y
  const slotW = TOKEN_SIZE.width * pxPerMetreX + 20;
  const slotH = TOKEN_SIZE.height * pxPerMetreY + 20;
  const slotX = (width - slotW) / 2;

  for (const offsetY of SLOT_OFFSETS_Y) {
    const centreY = height / 2 - offsetY * pxPerMetreY;
    const slotY = centreY - slotH / 2;

    roundedRect(ctx, slotX, slotY, slotW, slotH, 24);
    ctx.fillStyle = PALETTE.slotFill;
    ctx.fill();

    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle =
      state === 'valid'
        ? PALETTE.slotValidStroke
        : state === 'full'
          ? PALETTE.slotFullStroke
          : PALETTE.slotStroke;
    ctx.lineWidth = state === 'idle' ? 3 : 4;
    roundedRect(ctx, slotX, slotY, slotW, slotH, 24);
    ctx.stroke();
    ctx.restore();
  }

  return toTexture(ctx);
}

/** Pre-renders idle, valid-drop, and full-block glass states once at startup. */
export function createBlockTextures(block: Block): BlockTextureSet {
  return {
    idle: drawBlockFace(block, 'idle'),
    valid: drawBlockFace(block, 'valid'),
    full: drawBlockFace(block, 'full'),
  };
}

/** Reusable pill-shaped XAI reason chip texture (512 x 118). */
export function createChipCanvas(): {
  readonly texture: CanvasTexture;
  readonly draw: (reason: string) => void;
} {
  const { width, height } = CANVAS_BUDGETS.chip;
  const ctx = createContext(width, height);
  const texture = toTexture(ctx);

  const draw = (reason: string): void => {
    ctx.clearRect(0, 0, width, height);
    if (reason.length === 0) {
      texture.needsUpdate = true;
      return;
    }

    const pad = 8;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const r = h / 2;

    roundedRect(ctx, pad, pad, w, h, r);
    const bg = ctx.createLinearGradient(0, pad, 0, height - pad);
    bg.addColorStop(0, PALETTE.chipBgTop);
    bg.addColorStop(1, PALETTE.chipBgBottom);
    ctx.fillStyle = bg;
    ctx.fill();

    roundedRect(ctx, pad + 2, pad + 2, w - 4, h - 4, r - 1);
    ctx.strokeStyle = PALETTE.chipBorder;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Luminous agent indicator dot on the left
    const dotX = pad + 34;
    const dotY = height / 2;
    ctx.save();
    ctx.shadowColor = PALETTE.chipDot;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.chipDot;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const display = reason.replace('->', '→');
    drawFittedText(
      ctx,
      display,
      dotX + 22,
      width - pad - 24,
      height / 2,
      36,
      600,
      PALETTE.inkPrimary,
      'center',
    );
    texture.needsUpdate = true;
  };

  draw('');
  return { texture, draw };
}

/** Celebratory "Day planned" VisionOS emerald-glass banner (AC-9). */
export function createEndCardTexture(): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.endCard;
  const ctx = createContext(width, height);
  ctx.clearRect(0, 0, width, height);

  const pad = 10;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const r = h / 2;

  roundedRect(ctx, pad, pad, w, h, r);
  const bg = ctx.createLinearGradient(0, pad, 0, height - pad);
  bg.addColorStop(0, PALETTE.endBgTop);
  bg.addColorStop(1, PALETTE.endBgBottom);
  ctx.fillStyle = bg;
  ctx.fill();

  roundedRect(ctx, pad + 2, pad + 2, w - 4, h - 4, r - 1);
  ctx.strokeStyle = PALETTE.endBorder;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Crisp checkmark badge on the left
  const badgeX = pad + 64;
  const badgeY = height / 2;
  ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.endAccent;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(badgeX - 14, badgeY + 1);
  ctx.lineTo(badgeX - 3, badgeY + 12);
  ctx.lineTo(badgeX + 16, badgeY - 11);
  ctx.stroke();

  drawFittedText(
    ctx,
    'Day planned',
    badgeX + 52,
    width - pad - 44,
    height * 0.43,
    50,
    700,
    PALETTE.inkPrimary,
    'left',
  );

  ctx.font = font(500, 22);
  ctx.fillStyle = '#a7f3d0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('All 6 tasks scheduled · Pinch reset anytime', badgeX + 54, height * 0.72);

  return toTexture(ctx);
}

/** Crisp frosted circular reset button (256 x 256, icon only). */
export function createResetTexture(): CanvasTexture {
  const { size } = CANVAS_BUDGETS.reset;
  const ctx = createContext(size, size);
  const c = size / 2;
  const r = size / 2 - 10;
  ctx.clearRect(0, 0, size, size);

  const bg = ctx.createRadialGradient(c, c - 24, 16, c, c, r);
  bg.addColorStop(0, 'rgba(51, 65, 85, 0.94)');
  bg.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, r - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Clean vector circular refresh arrow
  ctx.strokeStyle = PALETTE.inkPrimary;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c, c, 54, -Math.PI * 0.36, Math.PI * 1.28);
  ctx.stroke();

  ctx.fillStyle = PALETTE.inkPrimary;
  ctx.beginPath();
  ctx.moveTo(c + 56, c - 72);
  ctx.lineTo(c + 64, c - 26);
  ctx.lineTo(c + 19, c - 38);
  ctx.closePath();
  ctx.fill();

  return toTexture(ctx);
}

/** Tactile luminous gold pin emblem (128 x 128). */
export function createPinEmblemTexture(): CanvasTexture {
  const { size } = CANVAS_BUDGETS.pin;
  const ctx = createContext(size, size);
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft gold aura
  const glow = ctx.createRadialGradient(c, c, 12, c, c, c - 4);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
  glow.addColorStop(0.58, 'rgba(251, 191, 36, 0.55)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fill();

  // Solid gold disc
  ctx.fillStyle = PALETTE.pinGold;
  ctx.beginPath();
  ctx.arc(c, c, 34, 0, Math.PI * 2);
  ctx.fill();

  // Crisp white specular core
  ctx.fillStyle = PALETTE.pinCore;
  ctx.beginPath();
  ctx.arc(c - 7, c - 7, 11, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(ctx);
}

/** Subtle frosted glass tray surface grounding the 6 unplaced tokens. */
export function createTrayRailTexture(): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.trayRail;
  const ctx = createContext(width, height);
  ctx.clearRect(0, 0, width, height);

  const pad = 10;
  const w = width - pad * 2;
  const h = height - pad * 2;
  roundedRect(ctx, pad, pad, w, h, 36);
  const grad = ctx.createLinearGradient(0, pad, 0, height - pad);
  grad.addColorStop(0, 'rgba(30, 41, 59, 0.52)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.68)');
  ctx.fillStyle = grad;
  ctx.fill();

  roundedRect(ctx, pad + 2, pad + 2, w - 4, h - 4, 34);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();

  return toTexture(ctx);
}

/** Glowing translucent rounded outline card for the non-text onboarding ghost hint. */
export function createGhostHintTexture(): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.token;
  const ctx = createContext(width, height);
  ctx.clearRect(0, 0, width, height);

  const pad = 12;
  const w = width - pad * 2;
  const h = height - pad * 2;

  roundedRect(ctx, pad, pad, w, h, 30);
  const bg = ctx.createLinearGradient(0, pad, width, height - pad);
  bg.addColorStop(0, 'rgba(129, 140, 248, 0.34)');
  bg.addColorStop(1, 'rgba(56, 189, 248, 0.24)');
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  ctx.setLineDash([16, 12]);
  roundedRect(ctx, pad + 3, pad + 3, w - 6, h - 6, 28);
  ctx.strokeStyle = 'rgba(199, 210, 254, 0.9)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  return toTexture(ctx);
}
