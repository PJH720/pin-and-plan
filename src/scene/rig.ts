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
import {
  createBlockTextures,
  createPinEmblemTexture,
  createResetTexture,
  createTokenTexture,
  createTrayRailTexture,
  type BlockHighlight,
  type BlockTextureSet,
} from '../design/canvas.js';
import { createOrbHaloMaterial, createOrbMaterial } from '../design/shaders.js';
import { RENDER_ORDER } from '../design/tokens.js';
import { ChipPool } from '../feedback/chips.js';
import { EndCardController } from '../feedback/end-card.js';
import { HintController } from '../feedback/hint.js';
import { BLOCKS, TASKS } from '../planner/content.js';
import {
  BLOCK_SIZE,
  BLOCK_SPOTS,
  ORB_HALO_RADIUS,
  ORB_RADIUS,
  ORB_SPOT,
  RESET_RADIUS,
  RESET_SPOT,
  TOKEN_SIZE,
  TRAY_RAIL_SIZE,
  TRAY_RAIL_SPOT,
  TRAY_SPOTS,
  type Spot,
} from './layout.js';

const PIN_EMBLEM_RADIUS = 0.0085;
const PIN_INSET_X = 0.009;
const PIN_INSET_Y = 0.008;

export interface BlockView {
  readonly blockId: string;
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly textures: BlockTextureSet;
  highlight: BlockHighlight;
}

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
  /** Peak parabolic vertical arc lift for this move (0 for flat slides). */
  moveArc: number;
  /** > 0 while playing tactile pop-settle scale pulse after user snap. */
  settleElapsed: number;
  /** > 0 while playing short horizontal shake on refused drop (AC-2). */
  shakeElapsed: number;
  held: boolean;
  /** True while the token eases to `home`. */
  moving: boolean;
}

export interface Rig {
  /** Parent of every planner object; placed at the head at session start. */
  readonly anchor: Group;
  readonly anchorEntity: Entity;
  readonly blocks: readonly BlockView[];
  readonly tokens: readonly TokenView[];
  readonly orbEntity: Entity;
  readonly orbObject: Mesh;
  readonly orbHalo: Mesh;
  readonly resetEntity: Entity;
  readonly resetObject: Mesh;
  readonly endCard: EndCardController;
  readonly chips: ChipPool;
  readonly hint: HintController;
}

function unlitOpaque(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, toneMapped: false });
}

function unlitGlass(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Builds the entire Pin & Plan v2.0 3D workspace procedurally (~26 draw calls,
 * zero external models/images/audio, zero shadows, zero post-processing).
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

  // Subtle frosted glass shelf anchoring the 6 unplaced tokens
  const trayRail = new Mesh(
    new PlaneGeometry(TRAY_RAIL_SIZE.width, TRAY_RAIL_SIZE.height),
    unlitGlass(createTrayRailTexture()),
  );
  trayRail.renderOrder = RENDER_ORDER.trayRail;
  world.createTransformEntity(trayRail, {
    parent: anchorEntity,
    persistent: true,
  });
  trayRail.position.set(TRAY_RAIL_SPOT.x, TRAY_RAIL_SPOT.y, TRAY_RAIL_SPOT.z);
  trayRail.rotation.set(-Math.PI / 2, 0, 0);

  // Four curved VisionOS frosted-glass time-block panels
  const blockGeometry = new PlaneGeometry(BLOCK_SIZE.width, BLOCK_SIZE.height);
  const blocks: BlockView[] = BLOCKS.map((block) => {
    const textures = createBlockTextures(block);
    const material = unlitGlass(textures.idle);
    const mesh = new Mesh(blockGeometry, material);
    mesh.renderOrder = RENDER_ORDER.block;
    addAt(mesh, BLOCK_SPOTS[block.id]);
    return {
      blockId: block.id,
      mesh,
      material,
      textures,
      highlight: 'idle',
    };
  });

  // Six tactile spatial task cards with luminous gold pin emblem.
  // Remap the 4 thin edge faces (+X, -X, +Y, -Y: vertices 0..15) to sample the
  // corner bezel pixel so side walls render as clean metallic obsidian (1 draw call).
  const tokenGeometry = new BoxGeometry(
    TOKEN_SIZE.width,
    TOKEN_SIZE.height,
    TOKEN_SIZE.depth,
  );
  const uv = tokenGeometry.attributes.uv;
  for (let i = 0; i < 16; i += 1) {
    uv.setXY(i, 0.005, 0.005);
  }
  uv.needsUpdate = true;
  const pinGeometry = new CircleGeometry(PIN_EMBLEM_RADIUS, 24);
  const pinMaterial = unlitGlass(createPinEmblemTexture());

  const tokens = TASKS.map((task, index): TokenView => {
    const object = new Mesh(tokenGeometry, unlitOpaque(createTokenTexture(task)));
    object.renderOrder = RENDER_ORDER.token;

    const pinMark = new Mesh(pinGeometry, pinMaterial);
    pinMark.position.set(
      TOKEN_SIZE.width / 2 - PIN_INSET_X,
      TOKEN_SIZE.height / 2 - PIN_INSET_Y,
      TOKEN_SIZE.depth / 2 + 0.0015,
    );
    pinMark.renderOrder = RENDER_ORDER.pinMark;
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
      moveArc: 0,
      settleElapsed: -1,
      shakeElapsed: -1,
      held: false,
      moving: false,
    };
  });

  // Procedural GLSL Fresnel Aurora Agent Orb + orbital halo ring
  const orbShader = createOrbMaterial();
  const orbObject = new Mesh(
    new SphereGeometry(ORB_RADIUS, 36, 24),
    orbShader.material,
  );
  orbObject.renderOrder = RENDER_ORDER.orb;
  const orbEntity = addAt(orbObject, ORB_SPOT);
  orbEntity.addComponent(RayInteractable);

  const haloShader = createOrbHaloMaterial();
  const orbHalo = new Mesh(
    new PlaneGeometry(ORB_HALO_RADIUS * 2, ORB_HALO_RADIUS * 2),
    haloShader.material,
  );
  orbHalo.renderOrder = RENDER_ORDER.orbHalo;
  addAt(orbHalo, ORB_SPOT);

  // Frosted circular reset button
  const resetObject = new Mesh(
    new CircleGeometry(RESET_RADIUS, 32),
    unlitGlass(createResetTexture()),
  );
  resetObject.renderOrder = RENDER_ORDER.orb;
  const resetEntity = addAt(resetObject, RESET_SPOT);
  resetEntity.addComponent(RayInteractable);

  const endCard = new EndCardController(world, anchorEntity);
  const chips = new ChipPool(world, anchorEntity);
  const hint = new HintController(
    world,
    anchorEntity,
    orbObject,
    orbHalo,
    orbShader.uniforms,
    haloShader.uniforms,
  );

  return {
    anchor,
    anchorEntity,
    blocks,
    tokens,
    orbEntity,
    orbObject,
    orbHalo,
    resetEntity,
    resetObject,
    endCard,
    chips,
    hint,
  };
}
