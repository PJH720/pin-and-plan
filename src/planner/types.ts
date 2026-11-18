export type Energy = 'high' | 'medium' | 'low';

export interface Block {
  readonly id: string;
  readonly label: string;
}

export interface Task {
  readonly id: string;
  readonly label: string;
  /** Block id this task is fixed to. */
  readonly fixed?: string;
  readonly urgent?: boolean;
  readonly energy?: Energy;
}

/** `{ [taskId]: blockId }` for the tasks the user placed. */
export type Pins = Readonly<Partial<Record<string, string>>>;

export interface Placement {
  taskId: string;
  blockId: string;
  slot: number;
  reason: string;
  pinned: boolean;
}

export interface Diff {
  /** Tasks that are newly placed or changed block, in the order of `next`. */
  moves: Placement[];
  /** Tasks that stay in their block but changed slot, in the order of `next`. */
  slides: Placement[];
}
