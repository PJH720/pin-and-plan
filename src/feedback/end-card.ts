import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Entity,
  type Object3D,
  type World,
} from '@iwsdk/core';
import { createEndCardTexture } from '../scene/labels.js';
import { END_CARD_SIZE, END_CARD_SPOT } from '../scene/layout.js';

/**
 * "Day planned" card shown when all six tasks are placed and no move is in
 * progress (AC-9).
 */
export function buildEndCard(world: World, anchorEntity: Entity): Mesh {
  const mesh = new Mesh(
    new PlaneGeometry(END_CARD_SIZE.width, END_CARD_SIZE.height),
    new MeshBasicMaterial({
      map: createEndCardTexture(),
      toneMapped: false,
    }),
  );
  mesh.visible = false;
  world.createTransformEntity(mesh as Object3D, {
    parent: anchorEntity,
    persistent: true,
  });
  mesh.position.set(END_CARD_SPOT.x, END_CARD_SPOT.y, END_CARD_SPOT.z);
  mesh.rotation.set(0, END_CARD_SPOT.yaw, 0);
  return mesh;
}
