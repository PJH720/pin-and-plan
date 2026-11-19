import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { createEndCardTexture } from '../design/canvas.js';
import { clamp01, easeOutBack, easeOutCubic } from '../design/motion.js';
import { RENDER_ORDER } from '../design/tokens.js';
import { END_CARD_SIZE, END_CARD_SPOT } from '../scene/layout.js';

const ENTER_DURATION = 0.34;

/**
 * Animated celebratory "Day planned" glass card (AC-9).
 * Zero per-frame allocations.
 */
export class EndCardController {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;
  private showing = false;
  private progress = 0;

  constructor(world: World, anchorEntity: Entity) {
    this.material = new MeshBasicMaterial({
      map: createEndCardTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    });
    this.mesh = new Mesh(
      new PlaneGeometry(END_CARD_SIZE.width, END_CARD_SIZE.height),
      this.material,
    );
    this.mesh.visible = false;
    this.mesh.renderOrder = RENDER_ORDER.endCard;
    world.createTransformEntity(this.mesh as Object3D, {
      parent: anchorEntity,
      persistent: true,
    });
    this.mesh.position.set(END_CARD_SPOT.x, END_CARD_SPOT.y, END_CARD_SPOT.z);
    this.mesh.rotation.set(0, END_CARD_SPOT.yaw, 0);
  }

  setVisible(visible: boolean): void {
    if (visible === this.showing) {
      return;
    }
    this.showing = visible;
    if (visible) {
      this.progress = 0;
      this.mesh.visible = true;
      this.material.opacity = 0;
      this.mesh.scale.set(0.86, 0.86, 1);
    } else {
      this.progress = 0;
      this.material.opacity = 0;
      this.mesh.visible = false;
    }
  }

  update(delta: number): void {
    if (!this.showing || this.progress >= 1) {
      return;
    }
    this.progress = clamp01(this.progress + delta / ENTER_DURATION);
    const s = 0.86 + 0.14 * easeOutBack(this.progress, 1.3);
    this.mesh.scale.set(s, s, 1);
    this.material.opacity = easeOutCubic(this.progress);
    this.mesh.position.y =
      END_CARD_SPOT.y - (1 - easeOutCubic(this.progress)) * 0.012;
  }
}
