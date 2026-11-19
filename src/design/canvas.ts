import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from '@iwsdk/core';
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

function font(weight: number, sizePx: number): string {
  return `${weight} ${sizePx}px ${TYPOGRAPHY.family}`;
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
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = TEXTURE_ANISOTROPY;
  texture.generateMipmaps = true;
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
  const x =
    align === 'left' ? left : align === 'right' ? right : (left + right) / 2;
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
 * Tactile ceramic/stone spatial task tile (512 x 216).
 * Outer matte bezel wraps onto BoxGeometry thin edges (single draw call).
 */
export function createTokenTexture(task: Task): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.token;
  const ctx = createContext(width, height);
  const palette =
    task.energy === undefined
      ? NEUTRAL_TOKEN_PALETTE
      : ENERGY_PALETTES[task.energy];

  ctx.fillStyle = PALETTE.edgeBezel;
  ctx.fillRect(0, 0, width, height);

  const pad = 8;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  roundedRect(ctx, pad, pad, cardW, cardH, 26);
  const bgGrad = ctx.createLinearGradient(0, pad, 0, height - pad);
  bgGrad.addColorStop(0, palette.top);
  bgGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Gentle sunlit top matte highlight
  ctx.save();
  roundedRect(ctx, pad, pad, cardW, cardH, 26);
  ctx.clip();
  const sheenGrad = ctx.createLinearGradient(0, pad, 0, pad + cardH * 0.45);
  sheenGrad.addColorStop(0, 'rgba(255, 252, 245, 0.14)');
  sheenGrad.addColorStop(1, 'rgba(255, 252, 245, 0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(pad, pad, cardW, cardH * 0.45);

  // Subtle left vertical accent bar
  const barColour = task.urgent === true ? PALETTE.urgentAccent : palette.accent;
  ctx.fillStyle = barColour;
  roundedRect(ctx, pad + 14, pad + 28, 9, cardH - 56, 4.5);
  ctx.fill();
  ctx.restore();

  // Hairline bevel rim
  roundedRect(ctx, pad + 1.5, pad + 1.5, cardW - 3, cardH - 3, 25);
  ctx.strokeStyle = palette.rim;
  ctx.lineWidth = 3;
  ctx.stroke();

  let contentLeft = pad + 42;
  const iconRadius = 25;
  if (task.fixed !== undefined) {
    drawClockIcon(ctx, contentLeft + iconRadius, height / 2, iconRadius);
    contentLeft += iconRadius * 2 + 18;
  }
  if (task.urgent === true) {
    drawUrgentIcon(ctx, contentLeft + iconRadius, height / 2, iconRadius);
    contentLeft += iconRadius * 2 + 18;
  }

  const tagText =
    task.fixed !== undefined
      ? 'FIXED'
      : task.urgent === true
        ? 'URGENT'
        : palette.tag;
  const tagColour =
    task.urgent === true ? PALETTE.urgentAccent : palette.pillInk;
  ctx.font = font(700, 22);
  ctx.fillStyle = tagColour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, contentLeft, height * 0.3);

  drawFittedText(
    ctx,
    task.label,
    contentLeft,
    width - 28,
    height * 0.64,
    50,
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
  const cornerR = 40;

  if (state !== 'idle') {
    ctx.save();
    roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
    ctx.shadowColor =
      state === 'valid'
        ? PALETTE.glassHoverValidBorder
        : PALETTE.glassHoverFullBorder;
    ctx.shadowBlur = 18;
    ctx.fillStyle =
      state === 'valid'
        ? PALETTE.glassHoverValidGlow
        : PALETTE.glassHoverFullGlow;
    ctx.fill();
    ctx.restore();
  }

  // Warm smoked architectural glass panel
  roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
  const grad = ctx.createLinearGradient(0, margin, 0, height - margin);
  grad.addColorStop(0, PALETTE.glassTop);
  grad.addColorStop(1, PALETTE.glassBottom);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  roundedRect(ctx, margin, margin, panelW, panelH, cornerR);
  ctx.clip();

  const headerGlow = ctx.createLinearGradient(0, margin, 0, margin + 145);
  if (state === 'valid') {
    headerGlow.addColorStop(0, 'rgba(240, 212, 162, 0.24)');
    headerGlow.addColorStop(1, 'rgba(240, 212, 162, 0.0)');
  } else if (state === 'full') {
    headerGlow.addColorStop(0, 'rgba(224, 96, 84, 0.26)');
    headerGlow.addColorStop(1, 'rgba(224, 96, 84, 0.0)');
  } else {
    headerGlow.addColorStop(0, 'rgba(255, 250, 242, 0.07)');
    headerGlow.addColorStop(1, 'rgba(255, 250, 242, 0.0)');
  }
  ctx.fillStyle = headerGlow;
  ctx.fillRect(margin, margin, panelW, 145);

  ctx.strokeStyle = 'rgba(255, 250, 242, 0.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 32, margin + 124);
  ctx.lineTo(width - margin - 32, margin + 124);
  ctx.stroke();
  ctx.restore();

  roundedRect(ctx, margin + 2, margin + 2, panelW - 4, panelH - 4, cornerR - 1);
  ctx.strokeStyle =
    state === 'valid'
      ? PALETTE.glassHoverValidBorder
      : state === 'full'
        ? PALETTE.glassHoverFullBorder
        : PALETTE.glassBorder;
  ctx.lineWidth = state === 'idle' ? 3 : 5;
  ctx.stroke();

  // Warm daylight top specular line
  ctx.save();
  ctx.strokeStyle =
    state === 'idle' ? PALETTE.glassSpecular : 'rgba(255, 252, 245, 0.62)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + cornerR, margin + 2.5);
  ctx.lineTo(width - margin - cornerR, margin + 2.5);
  ctx.stroke();
  ctx.restore();

  const period = BLOCK_PERIODS[block.id] ?? 'BLOCK';
  const eyebrowColour =
    state === 'full'
      ? '#f8b4ad'
      : state === 'valid'
        ? '#f6deb0'
        : PALETTE.inkSecondary;
  ctx.font = font(700, 22);
  ctx.fillStyle = eyebrowColour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    state === 'full' ? `${period} · FULL` : period,
    width / 2,
    margin + 40,
  );

  const displayTime = block.label.replace('-', ' – ');
  drawFittedText(
    ctx,
    displayTime,
    margin + 24,
    width - margin - 24,
    margin + 88,
    48,
    700,
    PALETTE.inkPrimary,
    'center',
  );

  // Two recessed rounded slot wells
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

/**
 * Editorial warm cream-paper XAI reason pill (512 x 118).
 * High contrast against dark blocks and sunlit rooms—zero neon borders.
 */
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
    ctx.lineWidth = 3;
    ctx.stroke();

    // Terracotta editorial indicator dot
    const dotX = pad + 34;
    const dotY = height / 2;
    ctx.fillStyle = PALETTE.chipDot;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fill();

    const display = reason.replace('->', '→');
    drawFittedText(
      ctx,
      display,
      dotX + 22,
      width - pad - 24,
      height / 2,
      36,
      600,
      PALETTE.inkDark,
      'center',
    );
    texture.needsUpdate = true;
  };

  draw('');
  return { texture, draw };
}

/** Calm botanical sage-glass "Day planned" card (AC-9). */
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

  const badgeX = pad + 64;
  const badgeY = height / 2;
  ctx.fillStyle = 'rgba(154, 198, 174, 0.22)';
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
  ctx.fillStyle = '#c5e2d2';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('All 6 tasks scheduled · Reset anytime', badgeX + 54, height * 0.72);

  return toTexture(ctx);
}

/** Crisp frosted warm-stone circular reset button (256 x 256, icon only). */
export function createResetTexture(): CanvasTexture {
  const { size } = CANVAS_BUDGETS.reset;
  const ctx = createContext(size, size);
  const c = size / 2;
  const r = size / 2 - 10;
  ctx.clearRect(0, 0, size, size);

  const bg = ctx.createRadialGradient(c, c - 24, 16, c, c, r);
  bg.addColorStop(0, 'rgba(54, 52, 48, 0.92)');
  bg.addColorStop(1, 'rgba(26, 25, 23, 0.96)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 250, 242, 0.28)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, c, r - 3, 0, Math.PI * 2);
  ctx.stroke();

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

/** Brushed solid brass pin emblem (128 x 128). */
export function createPinEmblemTexture(): CanvasTexture {
  const { size } = CANVAS_BUDGETS.pin;
  const ctx = createContext(size, size);
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Subtle dark contact shadow for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.arc(c, c + 4, 42, 0, Math.PI * 2);
  ctx.fill();

  // Solid brushed brass disc
  const brass = ctx.createRadialGradient(c - 10, c - 10, 6, c, c, 38);
  brass.addColorStop(0, PALETTE.pinRim);
  brass.addColorStop(0.55, PALETTE.pinGold);
  brass.addColorStop(1, '#b67d22');
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.arc(c, c, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.pinCore;
  ctx.beginPath();
  ctx.arc(c - 10, c - 10, 9, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(ctx);
}

/** Subtle smoked-stone frosted tray mat grounding the 6 unplaced tokens. */
export function createTrayRailTexture(): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.trayRail;
  const ctx = createContext(width, height);
  ctx.clearRect(0, 0, width, height);

  const pad = 10;
  const w = width - pad * 2;
  const h = height - pad * 2;
  roundedRect(ctx, pad, pad, w, h, 36);
  const grad = ctx.createLinearGradient(0, pad, 0, height - pad);
  grad.addColorStop(0, 'rgba(34, 32, 29, 0.42)');
  grad.addColorStop(1, 'rgba(22, 21, 19, 0.54)');
  ctx.fillStyle = grad;
  ctx.fill();

  roundedRect(ctx, pad + 2, pad + 2, w - 4, h - 4, 34);
  ctx.strokeStyle = 'rgba(255, 250, 242, 0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();

  return toTexture(ctx);
}

/** Soft warm-ivory rounded outline card for the non-text onboarding ghost hint. */
export function createGhostHintTexture(): CanvasTexture {
  const { width, height } = CANVAS_BUDGETS.token;
  const ctx = createContext(width, height);
  ctx.clearRect(0, 0, width, height);

  const pad = 12;
  const w = width - pad * 2;
  const h = height - pad * 2;

  roundedRect(ctx, pad, pad, w, h, 28);
  ctx.fillStyle = 'rgba(250, 244, 232, 0.24)';
  ctx.fill();

  ctx.save();
  ctx.setLineDash([16, 12]);
  roundedRect(ctx, pad + 3, pad + 3, w - 6, h - 6, 26);
  ctx.strokeStyle = 'rgba(255, 250, 240, 0.88)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  return toTexture(ctx);
}
