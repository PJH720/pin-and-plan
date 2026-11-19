import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { createChipCanvas } from '../design/canvas.js';
import { clamp01, easeOutBack, easeOutCubic } from '../design/motion.js';
import { MOTION, RENDER_ORDER } from '../design/tokens.js';
import { CHIP_SIZE, SLOT_SPOTS } from '../scene/layout.js';

const CHIP_POOL_SIZE = 4;
/** Vertical offset below the slot centre so the chip sits cleanly beneath the token. */
const CHIP_OFFSET_Y = -0.036;
/** Forward lift in front of the slot so the chip never z-fights with the token. */
const CHIP_FORWARD_LIFT = 0.009;

interface ChipSlot {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly draw: (reason: string) => void;
  elapsed: number;
  active: boolean;
}

/**
 * Fixed pool of four animated XAI reason chips (AC-6).
 * Pop-in overshoot on enter, crisp 2.0 s hold, graceful fade-out, zero allocations in update().
 */
export class ChipPool {
  private readonly slots: readonly ChipSlot[];
  private nextIndex = 0;

  constructor(world: World, anchorEntity: Entity) {
    const geometry = new PlaneGeometry(CHIP_SIZE.width, CHIP_SIZE.height);
    const slots: ChipSlot[] = [];
    for (let i = 0; i < CHIP_POOL_SIZE; i += 1) {
      const { texture, draw } = createChipCanvas();
      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 1,
        toneMapped: false,
      });
      const mesh = new Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = RENDER_ORDER.chip;
      world.createTransformEntity(mesh as Object3D, {
        parent: anchorEntity,
        persistent: true,
      });
      slots.push({ mesh, material, draw, elapsed: 0, active: false });
    }
    this.slots = slots;
  }

  show(blockId: string, slot: number, reason: string): void {
    const spot = SLOT_SPOTS[blockId]?.[slot];
    if (spot === undefined) {
      return;
    }
    const chip = this.slots[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.slots.length;
    chip.draw(reason);
    chip.mesh.position.set(
      spot.x - Math.sin(spot.yaw) * CHIP_FORWARD_LIFT,
      spot.y + CHIP_OFFSET_Y,
      spot.z + Math.cos(spot.yaw) * CHIP_FORWARD_LIFT,
    );
    chip.mesh.rotation.set(0, spot.yaw, 0);
    chip.mesh.scale.set(0.84, 0.84, 1);
    chip.material.opacity = 0;
    chip.mesh.visible = true;
    chip.elapsed = 0;
    chip.active = true;
  }

  update(delta: number): void {
    const total = MOTION.chipDuration;
    const enterDur = MOTION.chipEnterDuration;
    const exitStart = total - MOTION.chipExitDuration;

    for (let i = 0; i < this.slots.length; i += 1) {
      const chip = this.slots[i];
      if (!chip.active) {
        continue;
      }
      chip.elapsed += delta;
      if (chip.elapsed >= total) {
        chip.active = false;
        chip.mesh.visible = false;
        continue;
      }

      if (chip.elapsed < enterDur) {
        const u = clamp01(chip.elapsed / enterDur);
        const s = 0.84 + 0.16 * easeOutBack(u, 1.35);
        chip.mesh.scale.set(s, s, 1);
        chip.material.opacity = easeOutCubic(u);
      } else if (chip.elapsed > exitStart) {
        const u = clamp01((chip.elapsed - exitStart) / MOTION.chipExitDuration);
        const fade = 1 - easeOutCubic(u);
        chip.mesh.scale.set(0.96 + 0.04 * fade, 0.96 + 0.04 * fade, 1);
        chip.material.opacity = fade;
      } else {
        chip.mesh.scale.set(1, 1, 1);
        chip.material.opacity = 1;
      }
    }
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i += 1) {
      const chip = this.slots[i];
      chip.active = false;
      chip.elapsed = 0;
      chip.material.opacity = 0;
      chip.mesh.visible = false;
    }
  }
}
