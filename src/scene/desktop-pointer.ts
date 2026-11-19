import {
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  VisibilityState,
  type Object3D,
  type World,
} from '@iwsdk/core';
import type { PlannerSystem } from './planner-system.js';
import type { TokenView } from './rig.js';

/**
 * Interactive Desktop / Mobile Preview adapter.
 * Active ONLY while `visibilityState === NonImmersive` so visitors without a
 * Quest 3 headset or IWER emulator can drag tokens, trigger the Agent Orb,
 * take back tasks, and reset directly on the 3D stage.
 * Automatically inert during WebXR sessions (AC-11 100% hands-only preserved).
 */
export function attachDesktopPointer(
  world: World,
  planner: PlannerSystem,
): () => void {
  const dom = world.renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const dragPlane = new Plane();
  const planeNormal = new Vector3();
  const hitWorld = new Vector3();
  const tokenWorld = new Vector3();
  const dragOffset = new Vector3();

  let activeToken: TokenView | null = null;
  let activePointerId: number | null = null;

  const isNonImmersive = (): boolean =>
    world.visibilityState.value === VisibilityState.NonImmersive;

  const updateRay = (event: PointerEvent): void => {
    const rect = dom.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, world.camera);
  };

  const getInteractables = (): Object3D[] => {
    const rig = planner.getRig();
    const list: Object3D[] = [];
    for (let i = 0; i < rig.tokens.length; i += 1) {
      list.push(rig.tokens[i].object);
    }
    list.push(rig.orbObject, rig.resetObject);
    return list;
  };

  const findToken = (object: Object3D): TokenView | undefined => {
    const tokens = planner.getRig().tokens;
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i].object === object || tokens[i].pinMark === object) {
        return tokens[i];
      }
    }
    return undefined;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!isNonImmersive() || event.button !== 0 || activePointerId !== null) {
      return;
    }
    updateRay(event);
    const rig = planner.getRig();
    const hits = raycaster.intersectObjects(getInteractables(), false);
    if (hits.length === 0) {
      return;
    }

    const hitObj = hits[0].object;
    if (hitObj === rig.orbObject) {
      planner.triggerOrb();
      return;
    }
    if (hitObj === rig.resetObject) {
      planner.triggerReset();
      return;
    }

    const token = findToken(hitObj);
    if (token === undefined) {
      return;
    }
    if (!planner.desktopGrab(token)) {
      return;
    }

    activeToken = token;
    activePointerId = event.pointerId;
    dom.setPointerCapture(event.pointerId);
    dom.style.cursor = 'grabbing';

    token.object.getWorldPosition(tokenWorld);
    world.camera.getWorldDirection(planeNormal).negate();
    // Float held token slightly closer to the camera so it never clips curved side panels.
    tokenWorld.addScaledVector(planeNormal, 0.04);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, tokenWorld);

    if (raycaster.ray.intersectPlane(dragPlane, hitWorld) !== null) {
      dragOffset.copy(tokenWorld).sub(hitWorld);
    } else {
      dragOffset.set(0, 0, 0);
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!isNonImmersive()) {
      return;
    }
    updateRay(event);

    if (activeToken !== null && event.pointerId === activePointerId) {
      if (raycaster.ray.intersectPlane(dragPlane, hitWorld) !== null) {
        hitWorld.add(dragOffset);
        const anchor = planner.getRig().anchor;
        anchor.updateWorldMatrix(true, false);
        anchor.worldToLocal(hitWorld);
        activeToken.object.position.copy(hitWorld);
      }
      return;
    }

    // Hover cursor feedback on desktop
    const hits = raycaster.intersectObjects(getInteractables(), false);
    if (hits.length === 0) {
      dom.style.cursor = 'default';
    } else {
      const target = hits[0].object;
      const rig = planner.getRig();
      dom.style.cursor =
        target === rig.orbObject || target === rig.resetObject
          ? 'pointer'
          : 'grab';
    }
  };

  const releaseActive = (event: PointerEvent): void => {
    if (activeToken === null || event.pointerId !== activePointerId) {
      return;
    }
    const token = activeToken;
    activeToken = null;
    activePointerId = null;
    if (dom.hasPointerCapture(event.pointerId)) {
      dom.releasePointerCapture(event.pointerId);
    }
    dom.style.cursor = 'default';
    planner.desktopRelease(token);
  };

  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerup', releaseActive);
  dom.addEventListener('pointercancel', releaseActive);

  return () => {
    dom.removeEventListener('pointerdown', onPointerDown);
    dom.removeEventListener('pointermove', onPointerMove);
    dom.removeEventListener('pointerup', releaseActive);
    dom.removeEventListener('pointercancel', releaseActive);
    dom.style.cursor = 'default';
  };
}
