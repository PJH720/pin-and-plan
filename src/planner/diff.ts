import type { Diff, Placement } from './types.js';

/**
 * Compares what is shown with the next plan. A task that is new or changed
 * block is a move; a task in the same block with another slot is a slide.
 * Tasks that are only in `shown` are ignored: reset is the only way back to
 * the tray and does not go through diff().
 */
export function diff(
  shown: readonly Placement[],
  next: readonly Placement[],
): Diff {
  const shownByTask = new Map<string, Placement>(
    shown.map((placement) => [placement.taskId, placement]),
  );
  const moves: Placement[] = [];
  const slides: Placement[] = [];

  for (const placement of next) {
    const current = shownByTask.get(placement.taskId);
    if (current === undefined || current.blockId !== placement.blockId) {
      moves.push({ ...placement });
    } else if (current.slot !== placement.slot) {
      slides.push({ ...placement });
    }
  }

  return { moves, slides };
}
