import { CanvasTexture, SRGBColorSpace } from '@iwsdk/core';
import type { Block, Energy, Task } from '../planner/types.js';
import { BLOCK_SIZE, SLOT_OFFSETS_Y, TOKEN_SIZE } from './layout.js';

/** Canvas labels, drawn once. Sizes stay within 256 x 128 (plan.md budgets). */
const TOKEN_CANVAS = { width: 256, height: 108 } as const;
const BLOCK_CANVAS = { width: 128, height: 128 } as const;
const END_CARD_CANVAS = { width: 256, height: 72 } as const;
const CHIP_CANVAS = { width: 256, height: 58 } as const;
const RESET_CANVAS_SIZE = 64;

const ENERGY_COLOURS: Readonly<Record<Energy, string>> = {
  high: '#d9622b',
  medium: '#8d8f94',
  low: '#2f7fc1',
};
const NO_ENERGY_COLOUR = '#2a2d3a';
const PANEL_COLOUR = '#14161f';
const CONTROL_COLOUR = '#3a3d4a';
const INK = '#ffffff';
const INK_DARK = '#1b1d26';
const URGENT_COLOUR = '#c62828';
const OUTLINE = 'rgba(255, 255, 255, 0.5)';

const BADGE_RADIUS = 16;
const BADGE_FIRST_X = 28;
const BADGE_STEP = 38;
const TEXT_PADDING = 12;
const MIN_FONT_PX = 10;

function font(sizePx: number): string {
  return `600 ${sizePx}px system-ui, sans-serif`;
}

function createContext(
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas is not available for labels');
  }
  return context;
}

function toTexture(context: CanvasRenderingContext2D): CanvasTexture {
  const texture = new CanvasTexture(context.canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function fillCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colour: string,
): void {
  context.fillStyle = colour;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Centred text, shrunk until it fits between left and right. */
function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  left: number,
  right: number,
  centreY: number,
  maxFontPx: number,
): void {
  let size = maxFontPx;
  context.font = font(size);
  while (context.measureText(text).width > right - left && size > MIN_FONT_PX) {
    size -= 2;
    context.font = font(size);
  }
  context.fillStyle = INK;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, (left + right) / 2, centreY);
}

function drawClockBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  fillCircle(context, x, y, BADGE_RADIUS, INK);
  context.strokeStyle = INK_DARK;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(x, y - BADGE_RADIUS * 0.6);
  context.lineTo(x, y);
  context.lineTo(x + BADGE_RADIUS * 0.45, y);
  context.stroke();
}

function drawUrgentBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  fillCircle(context, x, y, BADGE_RADIUS, INK);
  context.fillStyle = URGENT_COLOUR;
  context.font = font(BADGE_RADIUS * 1.7);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('!', x, y + 1);
}

/** Token face: energy colour, clock badge if fixed, "!" badge if urgent, label. */
export function createTokenTexture(task: Task): CanvasTexture {
  const { width, height } = TOKEN_CANVAS;
  const context = createContext(width, height);
  context.fillStyle =
    task.energy === undefined ? NO_ENERGY_COLOUR : ENERGY_COLOURS[task.energy];
  context.fillRect(0, 0, width, height);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);

  let badgeCount = 0;
  if (task.fixed !== undefined) {
    drawClockBadge(context, BADGE_FIRST_X + badgeCount * BADGE_STEP, height / 2);
    badgeCount += 1;
  }
  if (task.urgent === true) {
    drawUrgentBadge(context, BADGE_FIRST_X + badgeCount * BADGE_STEP, height / 2);
    badgeCount += 1;
  }
  const textLeft =
    badgeCount === 0
      ? TEXT_PADDING
      : BADGE_FIRST_X + (badgeCount - 1) * BADGE_STEP + BADGE_RADIUS + 8;
  drawFittedText(
    context,
    task.label,
    textLeft,
    width - TEXT_PADDING,
    height / 2,
    30,
  );
  return toTexture(context);
}

/** Block panel: label at the top and two dashed slot outlines. */
export function createBlockTexture(block: Block): CanvasTexture {
  const { width, height } = BLOCK_CANVAS;
  const context = createContext(width, height);
  const pxPerMetreX = width / BLOCK_SIZE.width;
  const pxPerMetreY = height / BLOCK_SIZE.height;
  context.fillStyle = PANEL_COLOUR;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.strokeRect(1, 1, width - 2, height - 2);
  drawFittedText(context, block.label, 8, width - 8, 14, 16);

  const slotWidth = TOKEN_SIZE.width * pxPerMetreX;
  const slotHeight = TOKEN_SIZE.height * pxPerMetreY;
  context.setLineDash([6, 4]);
  for (const offsetY of SLOT_OFFSETS_Y) {
    const centreY = height / 2 - offsetY * pxPerMetreY;
    context.strokeRect(
      (width - slotWidth) / 2,
      centreY - slotHeight / 2,
      slotWidth,
      slotHeight,
    );
  }
  return toTexture(context);
}

/** Draws a reason string onto a reusable chip canvas texture. */
export function createChipCanvas(): {
  readonly texture: CanvasTexture;
  readonly draw: (reason: string) => void;
} {
  const { width, height } = CHIP_CANVAS;
  const context = createContext(width, height);
  const texture = toTexture(context);
  const draw = (reason: string): void => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#1f2233';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#8b6cff';
    context.lineWidth = 4;
    context.strokeRect(2, 2, width - 4, height - 4);
    const display = reason.replace('->', '→');
    drawFittedText(context, display, 12, width - 12, height / 2, 24);
    texture.needsUpdate = true;
  };
  draw('');
  return { texture, draw };
}

/** "Day planned" end card face (AC-9). */
export function createEndCardTexture(): CanvasTexture {
  const { width, height } = END_CARD_CANVAS;
  const context = createContext(width, height);
  context.fillStyle = '#193829';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#5eead4';
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);
  drawFittedText(context, 'Day planned', 16, width - 16, height / 2, 32);
  return toTexture(context);
}

/** Reset control face: a circular arrow, no text. */
export function createResetTexture(): CanvasTexture {
  const size = RESET_CANVAS_SIZE;
  const centre = size / 2;
  const context = createContext(size, size);
  fillCircle(context, centre, centre, centre, CONTROL_COLOUR);
  context.strokeStyle = INK;
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.beginPath();
  context.arc(centre, centre, 15, -Math.PI * 0.35, Math.PI * 1.3);
  context.stroke();
  context.fillStyle = INK;
  context.beginPath();
  context.moveTo(47, 9);
  context.lineTo(48, 25);
  context.lineTo(33, 21);
  context.closePath();
  context.fill();
  return toTexture(context);
}
