import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: planner tests run in plain node,
// without the IWSDK dev plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/planner/**/*.test.ts', 'src/design/**/*.test.ts'],
  },
});
