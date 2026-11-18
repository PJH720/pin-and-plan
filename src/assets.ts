import { defineAssets } from '@iwsdk/core';

// The planner rig is built in code at runtime (src/scene/rig.ts): canvas labels
// need the DOM, which this manifest must not touch. No model, image or audio
// file is registered.
export default defineAssets({});
