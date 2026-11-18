import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { SLOT_SPOTS, TOKEN_SIZE, TRAY_SPOTS } from '../scene/layout.js';

const GHOST_COLOUR = '#c4b5fd';
const GHOST_LOOP_SEC = 1.6;
const GHOST_ARC_Y = 0.04;
const ORB_PULSE_SPEED = 5.0;
const ORB_PULSE_AMPLITUDE = 0.14;

/**
 * Non-text onboarding hint (AC-14):
 * - In "intro", a translucent ghost token travels from the tray to B2 in a loop.
 * - After the first pin and before the orb has been activated, the orb pulses.
 */
export class HintController {
  private readonly ghost: Mesh;
  private readonly orb: Object3D;
  private elapsed = 0;

  constructor(world: World, anchorEntity: Entity, orb: Object3D) {
    this.orb = orb;
    const geometry = new BoxGeometry(
      TOKEN_SIZE.width,
      TOKEN_SIZE.height,
      TOKEN_SIZE.depth,
    );
    const material = new MeshBasicMaterial({
      color: GHOST_COLOUR,
      transparent: true,
      opacity: 0.42,
      toneMapped: false,
    });
    this.ghost = new Mesh(geometry, material);
    world.createTransformEntity(this.ghost as Object3D, {
      parent: anchorEntity,
      persistent: true,
    });
  }

  update(delta: number, showGhost: boolean, pulseOrb: boolean): void {
    this.elapsed += delta;

    if (showGhost) {
      const from = TRAY_SPOTS[4];
      const to = SLOT_SPOTS.B2[0];
      const raw = (this.elapsed % GHOST_LOOP_SEC) / GHOST_LOOP_SEC;
      // Smooth ease-in-out between tray and B2 slot 0
      const u = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
      this.ghost.visible = true;
      this.ghost.position.set(
        from.x + (to.x - from.x) * u,
        from.y + (to.y - from.y) * u + Math.sin(Math.PI * u) * GHOST_ARC_Y,
        from.z + (to.z - from.z) * u,
      );
      this.ghost.rotation.set(0, from.yaw + (to.yaw - from.yaw) * u, 0);
    } else {
      this.ghost.visible = false;
    }

    if (pulseOrb) {
      const scale =
        1 + Math.sin(this.elapsed * ORB_PULSE_SPEED) * ORB_PULSE_AMPLITUDE;
      this.orb.scale.set(scale, scale, scale);
    } else {
      this.orb.scale.set(1, 1, 1);
    }
  }

  reset(): void {
    this.elapsed = 0;
    this.orb.scale.set(1, 1, 1);
  }
}
