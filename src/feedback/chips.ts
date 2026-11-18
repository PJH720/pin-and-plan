import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { createChipCanvas } from '../scene/labels.js';
import { CHIP_SIZE, SLOT_SPOTS } from '../scene/layout.js';

/** Each reason chip stays visible for 2.0 s (AC-6). */
const CHIP_DURATION_SEC = 2.0;
const CHIP_POOL_SIZE = 4;
/** Vertical offset below the slot centre so the chip sits next to the token. */
const CHIP_OFFSET_Y = -0.033;
/** Forward lift in front of the slot so the chip never z-fights with the token. */
const CHIP_FORWARD_LIFT = 0.006;

interface ChipSlot {
  readonly mesh: Mesh;
  readonly draw: (reason: string) => void;
  remaining: number;
}

/**
 * Fixed pool of four reason chips (plan.md). Never allocates in update().
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
        toneMapped: false,
      });
      const mesh = new Mesh(geometry, material);
      mesh.visible = false;
      world.createTransformEntity(mesh as Object3D, {
        parent: anchorEntity,
        persistent: true,
      });
      slots.push({ mesh, draw, remaining: 0 });
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
    chip.mesh.visible = true;
    chip.remaining = CHIP_DURATION_SEC;
  }

  update(delta: number): void {
    for (let i = 0; i < this.slots.length; i += 1) {
      const chip = this.slots[i];
      if (chip.remaining <= 0) {
        continue;
      }
      chip.remaining -= delta;
      if (chip.remaining <= 0) {
        chip.remaining = 0;
        chip.mesh.visible = false;
      }
    }
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i += 1) {
      const chip = this.slots[i];
      chip.remaining = 0;
      chip.mesh.visible = false;
    }
  }
}
