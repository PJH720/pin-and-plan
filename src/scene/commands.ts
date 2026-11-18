import type { Phase } from './planner-system.js';

export type MoveBy = 'user' | 'agent' | 'slide';

export interface SpawnCommand {
  readonly type: 'SPAWN';
  readonly taskId: string;
  readonly trayIndex: number;
}

export interface MoveCommand {
  readonly type: 'MOVE';
  readonly taskId: string;
  readonly blockId: string;
  readonly slot: number;
  readonly reason: string;
  readonly pinned: boolean;
  readonly by: MoveBy;
}

export interface UpdateCommand {
  readonly type: 'UPDATE';
  readonly taskId?: string;
  readonly pinned?: boolean;
  readonly phase?: Phase;
}

export type SceneCommand = SpawnCommand | MoveCommand | UpdateCommand;
