import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { mountEnterArControl } from './scene/enter-ar.js';
import { FLAT_EYE } from './scene/layout.js';
import { PlannerSystem } from './scene/planner-system.js';

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
  world.camera.position.set(FLAT_EYE.x, FLAT_EYE.y, FLAT_EYE.z);
  world.registerSystem(PlannerSystem);
  mountEnterArControl(world);
});
