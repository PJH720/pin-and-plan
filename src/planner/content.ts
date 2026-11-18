import type { Block, Task } from './types.js';

/** Fixed content from specs/001-morning-planner/spec.md, in the fixed order. */
export const BLOCKS: readonly Block[] = [
  { id: 'B1', label: '09:00-12:00' },
  { id: 'B2', label: '13:00-18:00' },
  { id: 'B3', label: '19:00-21:00' },
  { id: 'B4', label: '22:00' },
];

export const TASKS: readonly Task[] = [
  { id: 'morning-routine', label: 'Morning routine', fixed: 'B1' },
  { id: 'key-priority', label: 'Key priority', urgent: true },
  { id: 'deep-work', label: 'Deep work', energy: 'high' },
  { id: 'team-sync', label: 'Team sync 14:00', fixed: 'B2' },
  { id: 'exercise', label: 'Exercise', energy: 'medium' },
  { id: 'evening-reflection', label: 'Evening reflection', energy: 'low' },
];
