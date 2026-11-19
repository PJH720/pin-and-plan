import './styles/hud.css';
import { World } from '@iwsdk/core';
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

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.camera.position.set(FLAT_EYE.x, FLAT_EYE.y + 0.02, FLAT_EYE.z + 0.1);
  world.camera.lookAt(FLAT_EYE.x, FLAT_EYE.y - 0.26, FLAT_EYE.z - 0.46);
  world.registerSystem(PlannerSystem);
  const planner = world.getSystem(PlannerSystem);
  if (planner !== undefined) {
    attachDesktopPointer(world, planner);
    mountHud(world, planner);
  }
});
