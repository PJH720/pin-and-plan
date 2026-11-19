import './styles/hud.css';
import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { attachDesktopPointer } from './scene/desktop-pointer.js';
import { FLAT_EYE } from './scene/layout.js';
import { PlannerSystem } from './scene/planner-system.js';
import { mountHud } from './ui/hud.js';

// Provide an initial read-only snapshot even before World.create resolves (AC-19).
Object.defineProperty(window, '__planner', {
  configurable: true,
  enumerable: true,
  get: () => ({ phase: 'intro' as const, pins: {}, placements: [] }),
});

function positionFlatCamera(world: World): void {
  if (world.visibilityState.value !== VisibilityState.NonImmersive) {
    return;
  }
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const vFovRad =
    (((world.camera as { fov?: number }).fov ?? 50) * Math.PI) / 180;
  const hHalfTan = Math.tan(vFovRad / 2) * aspect;
  // Ensure the full workspace arc (outer blocks + Reset + Pearl Orb, ~0.44 m half-span at z = -0.26)
  // fits comfortably inside narrow/portrait viewports without horizontal clipping.
  const requiredZ = -0.26 + 0.44 / Math.max(0.18, hHalfTan);
  const cameraZ = Math.min(1.45, Math.max(FLAT_EYE.z + 0.1, requiredZ));
  const extraPull = Math.max(0, cameraZ - (FLAT_EYE.z + 0.1));
  world.camera.position.set(
    FLAT_EYE.x,
    FLAT_EYE.y + 0.02 + extraPull * 0.16,
    cameraZ,
  );
  world.camera.lookAt(FLAT_EYE.x, FLAT_EYE.y - 0.25, FLAT_EYE.z - 0.46);
}

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  positionFlatCamera(world);
  window.addEventListener('resize', () => positionFlatCamera(world));
  world.visibilityState.subscribe((state) => {
    if (state === VisibilityState.NonImmersive) {
      positionFlatCamera(world);
    }
  });

  world.registerSystem(PlannerSystem);
  const planner = world.getSystem(PlannerSystem);
  if (planner !== undefined) {
    attachDesktopPointer(world, planner);
    mountHud(world, planner);
  }
});
