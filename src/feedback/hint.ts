import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { createGhostHintTexture } from '../design/canvas.js';
import { arcLift, easeInOutCubic, smoothBellFade } from '../design/motion.js';
import type { HaloUniforms, OrbUniforms } from '../design/shaders.js';
import { MOTION, RENDER_ORDER } from '../design/tokens.js';
import { SLOT_SPOTS, TOKEN_SIZE, TRAY_SPOTS } from '../scene/layout.js';

const ORB_PULSE_SPEED = 4.6;
const ORB_PULSE_AMPLITUDE = 0.11;

export type OrbVisualState = 'intro' | 'ready' | 'thinking' | 'done';

/**
 * Non-text spatial onboarding hint (AC-14) + Rive-inspired 4-state Agent Orb animator:
 * - In "intro", a soft rounded glowing ghost card glides smoothly along an arc from the tray to B2.
 * - Across phases, drives the Fresnel Orb shader & orbital halo ring with zero allocations.
 */
export class HintController {
  private readonly ghost: Mesh;
  private readonly ghostMaterial: MeshBasicMaterial;
  private readonly orb: Object3D;
  private readonly orbHalo: Object3D;
  private readonly orbUniforms: OrbUniforms;
  private readonly haloUniforms: HaloUniforms;
  private elapsed = 0;
  private currentActivity = 0;
  private currentDone = 0;

  constructor(
    world: World,
    anchorEntity: Entity,
    orb: Object3D,
    orbHalo: Object3D,
    orbUniforms: OrbUniforms,
    haloUniforms: HaloUniforms,
  ) {
    this.orb = orb;
    this.orbHalo = orbHalo;
    this.orbUniforms = orbUniforms;
    this.haloUniforms = haloUniforms;

    const geometry = new PlaneGeometry(TOKEN_SIZE.width, TOKEN_SIZE.height);
    this.ghostMaterial = new MeshBasicMaterial({
      map: createGhostHintTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    });
    this.ghost = new Mesh(geometry, this.ghostMaterial);
    this.ghost.renderOrder = RENDER_ORDER.hint;
    world.createTransformEntity(this.ghost as Object3D, {
      parent: anchorEntity,
      persistent: true,
    });
  }

  update(
    delta: number,
    showGhost: boolean,
    orbState: OrbVisualState,
  ): void {
    this.elapsed += delta;

    // 1. Non-text onboarding ghost arc (AC-14)
    if (showGhost) {
      const from = TRAY_SPOTS[4];
      const to = SLOT_SPOTS.B2[0];
      const raw = (this.elapsed % MOTION.ghostLoopSec) / MOTION.ghostLoopSec;
      const u = easeInOutCubic(raw);
      const fade = smoothBellFade(raw, 0.16, 0.82);

      this.ghost.visible = true;
      this.ghostMaterial.opacity = fade * 0.72;
      this.ghost.position.set(
        from.x + (to.x - from.x) * u,
        from.y + (to.y - from.y) * u + arcLift(u, MOTION.ghostArcY),
        from.z + (to.z - from.z) * u + arcLift(u, 0.015),
      );
      this.ghost.rotation.set(0, from.yaw + (to.yaw - from.yaw) * u, 0);
      const ghostScale = 0.94 + fade * 0.08;
      this.ghost.scale.set(ghostScale, ghostScale, 1);
    } else {
      this.ghost.visible = false;
    }

    // 2. Smooth 4-state Agent Orb visual machine
    const targetActivity =
      orbState === 'thinking' ? 1.0 : orbState === 'ready' ? 0.58 : 0.12;
    const targetDone = orbState === 'done' ? 1.0 : 0.0;
    const lerpRate = Math.min(1, delta * 5.0);
    this.currentActivity += (targetActivity - this.currentActivity) * lerpRate;
    this.currentDone += (targetDone - this.currentDone) * lerpRate;

    this.orbUniforms.uTime.value = this.elapsed;
    this.orbUniforms.uActivity.value = this.currentActivity;
    this.orbUniforms.uDone.value = this.currentDone;

    this.haloUniforms.uTime.value = this.elapsed;

    if (orbState === 'ready') {
      const wave = Math.sin(this.elapsed * ORB_PULSE_SPEED);
      const scale = 1 + wave * ORB_PULSE_AMPLITUDE;
      this.orb.scale.set(scale, scale, scale);
      const haloScale = 1.06 + (0.5 + 0.5 * wave) * 0.22;
      this.orbHalo.scale.set(haloScale, haloScale, 1);
      this.haloUniforms.uOpacity.value = 0.48 + 0.34 * (0.5 + 0.5 * wave);
    } else if (orbState === 'thinking') {
      const wave = Math.sin(this.elapsed * 9.0);
      const scale = 1.04 + wave * 0.05;
      this.orb.scale.set(scale, scale, scale);
      this.orbHalo.scale.set(1.22, 1.22, 1);
      this.orbHalo.rotation.z = this.elapsed * 2.2;
      this.haloUniforms.uOpacity.value = 0.78;
    } else {
      const breathe = 1 + Math.sin(this.elapsed * 1.8) * 0.025;
      this.orb.scale.set(breathe, breathe, breathe);
      this.orbHalo.scale.set(1.02, 1.02, 1);
      this.haloUniforms.uOpacity.value = orbState === 'done' ? 0.32 : 0.26;
    }
  }

  reset(): void {
    this.elapsed = 0;
    this.currentActivity = 0;
    this.currentDone = 0;
    this.orb.scale.set(1, 1, 1);
    this.orbHalo.scale.set(1, 1, 1);
  }
}
