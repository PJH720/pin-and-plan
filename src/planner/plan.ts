import type { Block, Energy, Pins, Placement, Task } from './types.js';

export const SLOTS_PER_BLOCK = 2;

export const REASON_PINNED = 'Your choice';
export const REASON_FIXED = 'Fixed time';
export const REASON_URGENT = 'Urgent -> first';

const ENERGY_RULES: Readonly<
  Record<Energy, { blockId: string; reason: string }>
> = {
  high: { blockId: 'B1', reason: 'High energy -> morning' },
  medium: { blockId: 'B2', reason: 'Medium energy -> afternoon' },
  low: { blockId: 'B4', reason: 'Low energy -> night' },
};

/**
 * Places every task in a block slot. Four passes, each over the tasks in the
 * given order: pinned, fixed, urgent, energy. Pure: inputs are not changed and
 * the result does not depend on the key order of `pins`.
 */
export function plan(
  tasks: readonly Task[],
  blocks: readonly Block[],
  pins: Pins,
): Placement[] {
  const used = new Map<string, number>(blocks.map((block) => [block.id, 0]));
  const placed = new Map<string, Placement>();

  const hasRoom = (blockId: string): boolean =>
    (used.get(blockId) ?? SLOTS_PER_BLOCK) < SLOTS_PER_BLOCK;

  const firstWithRoom = (fromIndex: number): Block | undefined =>
    blocks.slice(fromIndex).find((block) => hasRoom(block.id));

  const put = (
    task: Task,
    blockId: string,
    reason: string,
    pinned: boolean,
  ): void => {
    const slot = used.get(blockId);
    if (slot === undefined) {
      throw new Error(`Task "${task.id}": unknown block "${blockId}"`);
    }
    used.set(blockId, slot + 1);
    placed.set(task.id, { taskId: task.id, blockId, slot, reason, pinned });
  };

  const putEarliest = (task: Task, reason: string): void => {
    const block = firstWithRoom(0);
    if (block === undefined) {
      throw new Error(`Task "${task.id}": no block has room`);
    }
    put(task, block.id, reason, false);
  };

  // Rule 5: wanted block full -> next later block with room, else the earliest.
  const putWanted = (task: Task, wantedId: string, reason: string): void => {
    if (hasRoom(wantedId)) {
      put(task, wantedId, reason, false);
      return;
    }
    const wantedIndex = blocks.findIndex((block) => block.id === wantedId);
    const wanted = blocks[wantedIndex];
    if (wanted === undefined) {
      throw new Error(`Task "${task.id}": unknown block "${wantedId}"`);
    }
    const fallbackReason = `${wanted.label} full -> next`;
    const later = firstWithRoom(wantedIndex + 1);
    if (later !== undefined) {
      put(task, later.id, fallbackReason, false);
      return;
    }
    putEarliest(task, fallbackReason);
  };

  for (const task of tasks) {
    const pinnedBlock = pins[task.id];
    if (pinnedBlock !== undefined) {
      put(task, pinnedBlock, REASON_PINNED, true);
    }
  }

  for (const task of tasks) {
    if (!placed.has(task.id) && task.fixed !== undefined) {
      putWanted(task, task.fixed, REASON_FIXED);
    }
  }

  for (const task of tasks) {
    if (!placed.has(task.id) && task.urgent === true) {
      putEarliest(task, REASON_URGENT);
    }
  }

  for (const task of tasks) {
    if (!placed.has(task.id) && task.energy !== undefined) {
      const rule = ENERGY_RULES[task.energy];
      putWanted(task, rule.blockId, rule.reason);
    }
  }

  return tasks.map((task) => {
    const placement = placed.get(task.id);
    if (placement === undefined) {
      throw new Error(`Task "${task.id}" matches no planner rule`);
    }
    return placement;
  });
}
