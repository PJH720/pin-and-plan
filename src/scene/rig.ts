import {
  BoxGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OneHandGrabbable,
  PlaneGeometry,
  RayInteractable,
  SphereGeometry,
  Vector3,
  type Entity,
  type Object3D,
  type Texture,
  type World,
} from '@iwsdk/core';
import { ChipPool } from '../feedback/chips.js';
import { buildEndCard } from '../feedback/end-card.js';
import { HintController } from '../feedback/hint.js';
import { BLOCKS, TASKS } from '../planner/content.js';
import {
  createBlockTexture,
  createResetTexture,
  createTokenTexture,
} from './labels.js';
import {
  BLOCK_SIZE,
  BLOCK_SPOTS,
  ORB_RADIUS,
  ORB_SPOT,
  RESET_RADIUS,
  RESET_SPOT,
  TOKEN_SIZE,
  TRAY_SPOTS,
  type Spot,
} from './layout.js';

const ORB_COLOUR = '#8b6cff';
const PIN_COLOUR = '#ffd400';
const PIN_RADIUS = 0.006;
const PIN_INSET = 0.008;

export interface TokenView {
  readonly taskId: string;
  readonly entity: Entity;
  readonly object: Mesh;
  readonly pinMark: Mesh;
  readonly startPos: Vector3;
  startYaw: number;
  /** Rest position in anchor space: a tray spot or a block slot. */
  readonly home: Vector3;
  homeYaw: number;
  moveElapsed: number;
  moveDuration: number;
  held: boolean;
  /** True while the token eases to `home`. */
  moving: boolean;
}

export interface Rig {
  /** Parent of every planner object; placed at the head at session start. */
  readonly anchor: Group;
  readonly anchorEntity: Entity;
  readonly tokens: readonly TokenView[];
  readonly orbEntity: Entity;
  readonly orbObject: Mesh;
  readonly resetEntity: Entity;
  readonly resetObject: Mesh;
  readonly endCard: Mesh;
  readonly chips: ChipPool;
  readonly hint: HintController;
}

function unlit(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, toneMapped: false });
}

/**
 * Builds blocks, tokens, orb, reset control, reason chips, hint and end card as
 * code geometry with unlit materials: one draw call per mesh, no lights, no shadows.
 */
export function buildRig(world: World): Rig {
  const anchor = new Group();
  const anchorEntity = world.createTransformEntity(anchor, {
    persistent: true,
  });

  const addAt = (object: Object3D, spot: Spot): Entity => {
    const entity = world.createTransformEntity(object, {
      parent: anchorEntity,
      persistent: true,
    });
    object.position.set(spot.x, spot.y, spot.z);
    object.rotation.set(0, spot.yaw, 0);
    return entity;
  };

  const blockGeometry = new PlaneGeometry(BLOCK_SIZE.width, BLOCK_SIZE.height);
  for (const block of BLOCKS) {
    addAt(
      new Mesh(blockGeometry, unlit(createBlockTexture(block))),
      BLOCK_SPOTS[block.id],
    );
  }

  const tokenGeometry = new BoxGeometry(
    TOKEN_SIZE.width,
    TOKEN_SIZE.height,
    TOKEN_SIZE.depth,
  );
  const pinGeometry = new CircleGeometry(PIN_RADIUS, 16);
  const pinMaterial = new MeshBasicMaterial({
    color: PIN_COLOUR,
    toneMapped: false,
  });
  const tokens = TASKS.map((task, index): TokenView => {
    const object = new Mesh(tokenGeometry, unlit(createTokenTexture(task)));
    const pinMark = new Mesh(pinGeometry, pinMaterial);
    pinMark.position.set(
      TOKEN_SIZE.width / 2 - PIN_INSET,
      TOKEN_SIZE.height / 2 - PIN_INSET,
      TOKEN_SIZE.depth / 2 + 0.001,
    );
    pinMark.visible = false;
    object.add(pinMark);

    const spot = TRAY_SPOTS[index];
    const entity = addAt(object, spot);
    entity.addComponent(OneHandGrabbable, { rotate: false, translate: true });
    return {
      taskId: task.id,
      entity,
      object,
      pinMark,
      startPos: new Vector3(spot.x, spot.y, spot.z),
      startYaw: spot.yaw,
      home: new Vector3(spot.x, spot.y, spot.z),
      homeYaw: spot.yaw,
      moveElapsed: 0,
      moveDuration: 0.25,
      held: false,
      moving: false,
    };
  });

  const orbObject = new Mesh(
    new SphereGeometry(ORB_RADIUS, 24, 16),
    new MeshBasicMaterial({ color: ORB_COLOUR, toneMapped: false }),
  );
  const orbEntity = addAt(orbObject, ORB_SPOT);
  orbEntity.addComponent(RayInteractable);

  const resetObject = new Mesh(
    new CircleGeometry(RESET_RADIUS, 24),
    unlit(createResetTexture()),
  );
  const resetEntity = addAt(resetObject, RESET_SPOT);
  resetEntity.addComponent(RayInteractable);

  const endCard = buildEndCard(world, anchorEntity);
  const chips = new ChipPool(world, anchorEntity);
  const hint = new HintController(world, anchorEntity, orbObject);

  return {
    anchor,
    anchorEntity,
    tokens,
    orbEntity,
    orbObject,
    resetEntity,
    resetObject,
    endCard,
    chips,
    hint,
  };
}
