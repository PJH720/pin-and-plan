import {
  CanvasTexture,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { RENDER_ORDER } from '../design/tokens.js';

/**
 * Procedural sunlit minimalist morning room backdrop (Non-XR desktop/mobile preview ONLY).
 * Zero external image/model downloads (AC-17).
 * Automatically hidden (`visible = false`) the instant a WebXR session starts so
 * Meta Quest 3 / 3S passthrough AR renders the user's real room with zero overhead.
 */
function createSunlitRoomTexture(): CanvasTexture {
  const width = 1600;
  const height = 1066;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D canvas is not available for room backdrop');
  }

  // 1. Soft warm morning plaster back wall
  const wallGrad = ctx.createLinearGradient(0, 0, width, height * 0.62);
  wallGrad.addColorStop(0, '#f5f0e7');
  wallGrad.addColorStop(0.55, '#eae2d6');
  wallGrad.addColorStop(1, '#dcd2c4');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle ceiling plane in soft perspective
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, 210);
  ceilGrad.addColorStop(0, '#ded6c9');
  ceilGrad.addColorStop(1, '#eee8dd');
  ctx.fillStyle = ceilGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width - 200, 195);
  ctx.lineTo(200, 195);
  ctx.closePath();
  ctx.fill();

  // Recessed warm ceiling downlights
  for (const lx of [540, 1060]) {
    const glow = ctx.createRadialGradient(lx, 118, 4, lx, 118, 52);
    glow.addColorStop(0, 'rgba(255, 252, 245, 0.92)');
    glow.addColorStop(0.45, 'rgba(255, 246, 228, 0.36)');
    glow.addColorStop(1, 'rgba(255, 246, 228, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(lx, 118, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Left wall & bright morning sunlit window
  const leftWall = ctx.createLinearGradient(0, 0, 240, 0);
  leftWall.addColorStop(0, '#efe8dd');
  leftWall.addColorStop(1, '#e1d8ca');
  ctx.fillStyle = leftWall;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(200, 195);
  ctx.lineTo(200, 625);
  ctx.lineTo(0, 820);
  ctx.closePath();
  ctx.fill();

  // Bright daylight window opening on left
  const winGrad = ctx.createLinearGradient(0, 190, 175, 580);
  winGrad.addColorStop(0, '#ffffff');
  winGrad.addColorStop(0.65, '#fffbf2');
  winGrad.addColorStop(1, '#f6ede0');
  ctx.fillStyle = winGrad;
  ctx.beginPath();
  ctx.moveTo(0, 190);
  ctx.lineTo(165, 248);
  ctx.lineTo(165, 575);
  ctx.lineTo(0, 680);
  ctx.closePath();
  ctx.fill();

  // Warm timber window frame
  ctx.strokeStyle = '#736150';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 190);
  ctx.lineTo(165, 248);
  ctx.lineTo(165, 575);
  ctx.lineTo(0, 680);
  ctx.stroke();

  // Sheer soft linen curtain draped along inner window edge
  const curtain = ctx.createLinearGradient(142, 0, 232, 0);
  curtain.addColorStop(0, 'rgba(251, 247, 240, 0.92)');
  curtain.addColorStop(0.5, 'rgba(236, 229, 218, 0.84)');
  curtain.addColorStop(1, 'rgba(222, 214, 202, 0.70)');
  ctx.fillStyle = curtain;
  ctx.fillRect(148, 202, 86, 430);
  ctx.strokeStyle = 'rgba(180, 168, 152, 0.26)';
  ctx.lineWidth = 2;
  for (let cx = 162; cx <= 220; cx += 16) {
    ctx.beginPath();
    ctx.moveTo(cx, 202);
    ctx.lineTo(cx - 5, 632);
    ctx.stroke();
  }

  // 4. Right side wall in gentle warm shade
  const rightWall = ctx.createLinearGradient(width - 200, 0, width, 0);
  rightWall.addColorStop(0, '#dbd2c4');
  rightWall.addColorStop(1, '#cbc1b3');
  ctx.fillStyle = rightWall;
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - 200, 195);
  ctx.lineTo(width - 200, 625);
  ctx.lineTo(width, 820);
  ctx.closePath();
  ctx.fill();

  // 5. Soft diagonal morning sunlight wash cast across the plaster back wall
  const sunWash = ctx.createLinearGradient(200, 240, 1080, 620);
  sunWash.addColorStop(0, 'rgba(255, 250, 238, 0.44)');
  sunWash.addColorStop(0.55, 'rgba(255, 246, 224, 0.16)');
  sunWash.addColorStop(1, 'rgba(255, 246, 224, 0)');
  ctx.fillStyle = sunWash;
  ctx.beginPath();
  ctx.moveTo(200, 230);
  ctx.lineTo(980, 390);
  ctx.lineTo(860, 625);
  ctx.lineTo(200, 625);
  ctx.closePath();
  ctx.fill();

  // 6. Subtle minimalist framed canvas on upper back wall (soft low-contrast linen tone)
  ctx.fillStyle = 'rgba(246, 241, 234, 0.72)';
  ctx.fillRect(686, 235, 228, 148);
  ctx.strokeStyle = 'rgba(139, 123, 107, 0.48)';
  ctx.lineWidth = 3;
  ctx.strokeRect(686, 235, 228, 148);
  ctx.fillStyle = 'rgba(182, 169, 154, 0.30)';
  ctx.beginPath();
  ctx.arc(788, 314, 42, 0, Math.PI * 2);
  ctx.fill();

  // 7. Cozy low warm-linen bedroom headboard / sofa silhouette in soft background
  const sofaGrad = ctx.createLinearGradient(0, 468, 0, 625);
  sofaGrad.addColorStop(0, '#d3cbc0');
  sofaGrad.addColorStop(1, '#bbb2a5');
  ctx.fillStyle = sofaGrad;
  ctx.beginPath();
  ctx.roundRect(450, 472, 700, 155, 28);
  ctx.fill();

  // Soft cushions
  ctx.fillStyle = '#e0d9ce';
  ctx.beginPath();
  ctx.roundRect(486, 492, 300, 92, 20);
  ctx.roundRect(814, 492, 300, 92, 20);
  ctx.fill();

  // Baseboard shadow separating wall and warm oak floor
  ctx.fillStyle = 'rgba(120, 104, 86, 0.22)';
  ctx.fillRect(0, 622, width, 6);

  // 8. Warm oak floor extending cleanly all the way to the bottom edge (zero seam)
  const floorGrad = ctx.createLinearGradient(0, 625, 0, height);
  floorGrad.addColorStop(0, '#ccb497');
  floorGrad.addColorStop(0.5, '#bca182');
  floorGrad.addColorStop(1, '#a98d6e');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 625, width, height - 625);

  // Subtle floor sunlight patch from left window
  const floorSun = ctx.createLinearGradient(100, 625, 760, height);
  floorSun.addColorStop(0, 'rgba(255, 249, 232, 0.44)');
  floorSun.addColorStop(1, 'rgba(255, 249, 232, 0)');
  ctx.fillStyle = floorSun;
  ctx.beginPath();
  ctx.moveTo(0, 628);
  ctx.lineTo(580, 628);
  ctx.lineTo(860, height);
  ctx.lineTo(100, height);
  ctx.closePath();
  ctx.fill();

  // Soft woven linen area rug extending smoothly to bottom of frame
  ctx.fillStyle = 'rgba(235, 227, 215, 0.68)';
  ctx.beginPath();
  ctx.moveTo(390, 650);
  ctx.lineTo(1210, 650);
  ctx.lineTo(1480, height);
  ctx.lineTo(120, height);
  ctx.closePath();
  ctx.fill();

  // 9. Minimal warm walnut morning table silhouette centered below workspace
  const deskGrad = ctx.createLinearGradient(0, 635, 0, 740);
  deskGrad.addColorStop(0, '#7d5e44');
  deskGrad.addColorStop(1, '#594230');
  ctx.fillStyle = deskGrad;
  ctx.beginPath();
  ctx.moveTo(596, 638);
  ctx.lineTo(1004, 638);
  ctx.lineTo(1042, 710);
  ctx.lineTo(558, 710);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#473425';
  ctx.fillRect(558, 710, 484, 18);

  // Gentle depth-of-field atmospheric haze over background so 3D spatial cards pop cleanly
  const haze = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    180,
    width * 0.5,
    height * 0.52,
    width * 0.72,
  );
  haze.addColorStop(0, 'rgba(248, 244, 237, 0.14)');
  haze.addColorStop(1, 'rgba(32, 27, 22, 0.18)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Builds a single-mesh sunlit morning room backdrop behind the workspace.
 * Oversized to eliminate seams across ultrawide, desktop, and tall portrait mobile viewports.
 * Hidden automatically during immersive WebXR sessions so real Quest 3 passthrough is 100% unobstructed.
 */
export function buildSunlitRoomBackdrop(
  world: World,
  anchorEntity: Entity,
): Group {
  const group = new Group();
  const backdrop = new Mesh(
    new PlaneGeometry(12.0, 8.0),
    new MeshBasicMaterial({
      map: createSunlitRoomTexture(),
      depthWrite: false,
      toneMapped: false,
    }),
  );
  backdrop.position.set(0, -0.82, -2.15);
  backdrop.renderOrder = RENDER_ORDER.room;
  group.add(backdrop);

  world.createTransformEntity(group as Object3D, {
    parent: anchorEntity,
    persistent: true,
  });
  return group;
}
