import { describe, expect, it } from 'vitest';
import { BLOCKS, TASKS } from './content.js';
import { diff } from './diff.js';
import { plan } from './plan.js';
import type { Pins, Placement } from './types.js';

const YOUR_CHOICE = 'Your choice';
const FIXED = 'Fixed time';
const URGENT = 'Urgent -> first';
const HIGH = 'High energy -> morning';
const MEDIUM = 'Medium energy -> afternoon';
const LOW = 'Low energy -> night';
const B1_FULL = '09:00-12:00 full -> next';
const B2_FULL = '13:00-18:00 full -> next';
const B4_FULL = '22:00 full -> next';

function byRule(
  taskId: string,
  blockId: string,
  slot: number,
  reason: string,
): Placement {
  return { taskId, blockId, slot, reason, pinned: false };
}

function byPin(taskId: string, blockId: string, slot: number): Placement {
  return { taskId, blockId, slot, reason: YOUR_CHOICE, pinned: true };
}

interface PlannerCase {
  name: string;
  pins: Pins;
  expected: Placement[];
}

// Expected placements are listed in the fixed task order (spec.md, planner cases).
const P1: PlannerCase = {
  name: 'P1 no pins',
  pins: {},
  expected: [
    byRule('morning-routine', 'B1', 0, FIXED),
    byRule('key-priority', 'B1', 1, URGENT),
    byRule('deep-work', 'B2', 1, B1_FULL),
    byRule('team-sync', 'B2', 0, FIXED),
    byRule('exercise', 'B3', 0, B2_FULL),
    byRule('evening-reflection', 'B4', 0, LOW),
  ],
};

const P2: PlannerCase = {
  name: 'P2 all pinned',
  pins: {
    'morning-routine': 'B4',
    'key-priority': 'B4',
    'deep-work': 'B3',
    'team-sync': 'B3',
    exercise: 'B1',
    'evening-reflection': 'B2',
  },
  expected: [
    byPin('morning-routine', 'B4', 0),
    byPin('key-priority', 'B4', 1),
    byPin('deep-work', 'B3', 0),
    byPin('team-sync', 'B3', 1),
    byPin('exercise', 'B1', 0),
    byPin('evening-reflection', 'B2', 0),
  ],
};

const P3: PlannerCase = {
  name: 'P3 one pin forces a bump',
  pins: { exercise: 'B1' },
  expected: [
    byRule('morning-routine', 'B1', 1, FIXED),
    byRule('key-priority', 'B2', 1, URGENT),
    byRule('deep-work', 'B3', 0, B1_FULL),
    byRule('team-sync', 'B2', 0, FIXED),
    byPin('exercise', 'B1', 0),
    byRule('evening-reflection', 'B4', 0, LOW),
  ],
};

const P4A: PlannerCase = {
  name: 'P4a re-plan keeps every pin (deep-work B4)',
  pins: { 'deep-work': 'B4' },
  expected: [
    byRule('morning-routine', 'B1', 0, FIXED),
    byRule('key-priority', 'B1', 1, URGENT),
    byPin('deep-work', 'B4', 0),
    byRule('team-sync', 'B2', 0, FIXED),
    byRule('exercise', 'B2', 1, MEDIUM),
    byRule('evening-reflection', 'B4', 1, LOW),
  ],
};

const P4B: PlannerCase = {
  name: 'P4b re-plan keeps every pin (deep-work B4, exercise B1)',
  pins: { 'deep-work': 'B4', exercise: 'B1' },
  expected: [
    byRule('morning-routine', 'B1', 1, FIXED),
    byRule('key-priority', 'B2', 1, URGENT),
    byPin('deep-work', 'B4', 0),
    byRule('team-sync', 'B2', 0, FIXED),
    byPin('exercise', 'B1', 0),
    byRule('evening-reflection', 'B4', 1, LOW),
  ],
};

const P5: PlannerCase = {
  name: 'P5 fixed block full of pins',
  pins: { 'key-priority': 'B1', 'deep-work': 'B1' },
  expected: [
    byRule('morning-routine', 'B2', 0, B1_FULL),
    byPin('key-priority', 'B1', 0),
    byPin('deep-work', 'B1', 1),
    byRule('team-sync', 'B2', 1, FIXED),
    byRule('exercise', 'B3', 0, B2_FULL),
    byRule('evening-reflection', 'B4', 0, LOW),
  ],
};

const P7: PlannerCase = {
  name: 'P7 last block full, wrap',
  pins: { 'key-priority': 'B4', 'deep-work': 'B4' },
  expected: [
    byRule('morning-routine', 'B1', 0, FIXED),
    byPin('key-priority', 'B4', 0),
    byPin('deep-work', 'B4', 1),
    byRule('team-sync', 'B2', 0, FIXED),
    byRule('exercise', 'B2', 1, MEDIUM),
    byRule('evening-reflection', 'B1', 1, B4_FULL),
  ],
};

const CASES: PlannerCase[] = [P1, P2, P3, P4A, P4B, P5, P7];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('plan() cases P1 to P5 and P7 (AC-21)', () => {
  it.each(CASES)('$name', ({ pins, expected }) => {
    expect(plan(TASKS, BLOCKS, pins)).toEqual(expected);
  });

  it('P4 every pin of a still holds in b', () => {
    const b = plan(TASKS, BLOCKS, P4B.pins);
    const deepWork = b.find((p) => p.taskId === 'deep-work');

    expect(deepWork).toEqual(byPin('deep-work', 'B4', 0));
  });

  it('rule 4 puts a high energy task in the morning when B1 has room', () => {
    const result = plan(TASKS, BLOCKS, { 'morning-routine': 'B4' });
    const deepWork = result.find((p) => p.taskId === 'deep-work');

    expect(deepWork).toEqual(byRule('deep-work', 'B1', 1, HIGH));
  });
});

describe('plan() P6 determinism (AC-20)', () => {
  it.each(CASES)('$name: two calls give deep-equal results', ({ pins }) => {
    expect(plan(TASKS, BLOCKS, pins)).toEqual(plan(TASKS, BLOCKS, pins));
  });

  it.each(CASES)(
    '$name: frozen inputs are accepted and not changed',
    ({ pins, expected }) => {
      const tasks = deepFreeze(clone(TASKS));
      const blocks = deepFreeze(clone(BLOCKS));
      const frozenPins = deepFreeze(clone(pins));

      const result = plan(tasks, blocks, frozenPins);

      expect(result).toEqual(expected);
      expect(tasks).toEqual(TASKS);
      expect(blocks).toEqual(BLOCKS);
      expect(frozenPins).toEqual(pins);
    },
  );

  it.each(CASES)(
    '$name: pins in either key order give the same result',
    ({ pins }) => {
      const reversed: Pins = Object.fromEntries(Object.entries(pins).reverse());

      expect(plan(TASKS, BLOCKS, reversed)).toEqual(plan(TASKS, BLOCKS, pins));
    },
  );
});

describe('diff()', () => {
  it('P1 -> P4a: the agent moves only exercise, evening-reflection slides', () => {
    const shown = plan(TASKS, BLOCKS, P1.pins);
    const next = plan(TASKS, BLOCKS, P4A.pins);

    const result = diff(shown, next);

    expect(result.moves).toEqual([
      byPin('deep-work', 'B4', 0),
      byRule('exercise', 'B2', 1, MEDIUM),
    ]);
    expect(result.moves.filter((move) => !move.pinned)).toEqual([
      byRule('exercise', 'B2', 1, MEDIUM),
    ]);
    expect(result.slides).toEqual([byRule('evening-reflection', 'B4', 1, LOW)]);
  });

  it('nothing shown: every placement is a move, in the fixed task order', () => {
    const next = plan(TASKS, BLOCKS, P1.pins);

    expect(diff([], next)).toEqual({ moves: P1.expected, slides: [] });
  });

  it('same plan: no moves and no slides', () => {
    const shown = plan(TASKS, BLOCKS, P3.pins);

    expect(diff(shown, plan(TASKS, BLOCKS, P3.pins))).toEqual({
      moves: [],
      slides: [],
    });
  });

  it('does not change its inputs', () => {
    const shown = deepFreeze(plan(TASKS, BLOCKS, P1.pins));
    const next = deepFreeze(plan(TASKS, BLOCKS, P4A.pins));

    expect(() => diff(shown, next)).not.toThrow();
  });
});
