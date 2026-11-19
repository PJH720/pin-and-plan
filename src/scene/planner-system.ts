import {
  createSystem,
  Grabbed,
  GrabSystem,
  Pressed,
  Vector3,
  VisibilityState,
  type Entity,
  type Object3D,
} from '@iwsdk/core';
import type { BlockHighlight } from '../design/canvas.js';
import {
  arcLift,
  easeOutCubic,
  refusedShakeX,
  snapSettleScale,
} from '../design/motion.js';
import { MOTION } from '../design/tokens.js';
import type { OrbVisualState } from '../feedback/hint.js';
import {
  playAgentMoveSound,
  playFinishSound,
  playGrabSound,
  playRefusedSound,
  playSnapSound,
  unlockAudio,
} from '../feedback/sounds.js';
import { BLOCKS, TASKS } from '../planner/content.js';
import { diff } from '../planner/diff.js';
import { plan, SLOTS_PER_BLOCK } from '../planner/plan.js';
import type { Pins, Placement } from '../planner/types.js';
import type { MoveCommand, SceneCommand } from './commands.js';
import {
  ACTIVATE_RADIUS,
  BLOCK_SPOTS,
  DROP_RADIUS,
  FLAT_EYE,
  SLOT_SPOTS,
  TRAY_SPOTS,
} from './layout.js';
import { buildRig, type Rig, type TokenView } from './rig.js';

export type Phase = 'intro' | 'pinning' | 'agent' | 'done';

export interface PlannerSnapshot {
  phase: Phase;
  pins: Record<string, string>;
  placements: Placement[];
}

export type StateListener = (snapshot: PlannerSnapshot) => void;

declare global {
  interface Window {
    __planner: PlannerSnapshot;
  }
}

/** The head pose is zero on the first XR frames; wait for a real one. */
const MIN_HEAD_DISTANCE_SQ = 1e-6;
const HANDEDNESSES = ['left', 'right'] as const;

/**
 * Planner state, hand interactions (pin, hand over, take back, reset), staged
 * command queue, spatial feedback, and the read-only `window.__planner` test hook.
 */
export class PlannerSystem extends createSystem({
  grabbed: { required: [Grabbed] },
  pressed: { required: [Pressed] },
}) {
  private rig!: Rig;
  private tokensByEntity = new Map<number, TokenView>();
  private tokensByTask = new Map<string, TokenView>();
  private listeners = new Set<StateListener>();
  private pins: Pins = {};
  private placements: Placement[] = [];
  private phase: Phase = 'intro';
  private agentHasRun = false;
  private agentQueue: MoveCommand[] = [];
  private agentStepTimer = 0;
  private agentMoveTailTimer = 0;
  private agentStepCount = 0;
  private immersive: boolean | undefined;
  private anchorPending = false;
  private headPosition!: Vector3;
  private headForward!: Vector3;
  private tokenPosition!: Vector3;
  private blockPosition!: Vector3;
  private controlPosition!: Vector3;
  private handPosition!: Vector3;

  init(): void {
    this.headPosition = new Vector3();
    this.headForward = new Vector3();
    this.tokenPosition = new Vector3();
    this.blockPosition = new Vector3();
    this.controlPosition = new Vector3();
    this.handPosition = new Vector3();
    this.rig = buildRig(this.world);
    for (const token of this.rig.tokens) {
      this.tokensByEntity.set(token.entity.index, token);
      this.tokensByTask.set(token.taskId, token);
    }

    Object.defineProperty(window, '__planner', {
      configurable: true,
      enumerable: true,
      get: (): PlannerSnapshot => this.getSnapshot(),
    });

    this.cleanupFuncs.push(
      this.queries.grabbed.subscribe('qualify', (entity) =>
        this.onGrab(entity),
      ),
      this.queries.grabbed.subscribe('disqualify', (entity) =>
        this.onRelease(entity),
      ),
      this.queries.pressed.subscribe('qualify', (entity) =>
        this.onPressed(entity),
      ),
      this.visibilityState.subscribe((state) => this.onVisibility(state)),
    );
  }

  getRig(): Rig {
    return this.rig;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Non-XR desktop preview grab entry point. */
  desktopGrab(token: TokenView): boolean {
    if (this.phase === 'agent') {
      return false;
    }
    unlockAudio();
    playGrabSound();
    token.held = true;
    token.moving = false;
    token.settleElapsed = -1;
    token.shakeElapsed = -1;
    token.object.scale.set(
      MOTION.grabScale,
      MOTION.grabScale,
      MOTION.grabScale,
    );
    return true;
  }

  /** Non-XR desktop preview drop entry point. */
  desktopRelease(token: TokenView): void {
    this.finishRelease(token);
  }

  /** Triggers the Agent Orb (callable by hand pinch or desktop preview click). */
  triggerOrb(): void {
    this.activateOrb();
  }

  /** Triggers Reset (callable by hand pinch or desktop preview click). */
  triggerReset(): void {
    this.activateReset();
  }

  update(delta: number): void {
    if (this.anchorPending) {
      this.tryAnchorToHead();
    }

    this.checkNearPinchControls();
    this.updateAgentQueue(delta);
    this.updateTokens(delta);
    this.updateBlockHighlights();
    this.rig.chips.update(delta);
    this.rig.endCard.update(delta);

    const orbState: OrbVisualState =
      this.phase === 'agent'
        ? 'thinking'
        : this.phase === 'done'
          ? 'done'
          : this.phase === 'pinning' && !this.agentHasRun
            ? 'ready'
            : 'intro';

    this.rig.hint.update(delta, this.phase === 'intro', orbState);
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) {
      return;
    }
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private getSnapshot(): PlannerSnapshot {
    const pins: Record<string, string> = {};
    for (const [taskId, blockId] of Object.entries(this.pins)) {
      if (blockId !== undefined) {
        pins[taskId] = blockId;
      }
    }
    const placements: Placement[] = [];
    for (const task of TASKS) {
      const found = this.placements.find((p) => p.taskId === task.id);
      if (found !== undefined) {
        placements.push({
          taskId: found.taskId,
          blockId: found.blockId,
          slot: found.slot,
          reason: found.reason,
          pinned: found.pinned,
        });
      }
    }
    return {
      phase: this.phase,
      pins,
      placements,
    };
  }

  /** The layout is anchored once per session, to the head at session start. */
  private onVisibility(state: VisibilityState): void {
    const immersive = state !== VisibilityState.NonImmersive;
    if (immersive === this.immersive) {
      return;
    }
    this.immersive = immersive;
    this.rig.roomBackdrop.visible = !immersive;
    if (immersive) {
      this.anchorPending = true;
      return;
    }
    this.anchorPending = false;
    this.rig.anchor.position.set(FLAT_EYE.x, FLAT_EYE.y, FLAT_EYE.z);
    this.rig.anchor.rotation.set(0, 0, 0);
  }

  private tryAnchorToHead(): void {
    const head = this.player.head;
    head.updateWorldMatrix(true, false);
    this.headPosition.setFromMatrixPosition(head.matrixWorld);
    if (this.headPosition.lengthSq() < MIN_HEAD_DISTANCE_SQ) {
      return;
    }
    this.headForward.setFromMatrixColumn(head.matrixWorld, 2).negate();
    const yaw = Math.atan2(-this.headForward.x, -this.headForward.z);
    this.rig.anchor.position.copy(this.headPosition);
    this.rig.anchor.rotation.set(0, yaw, 0);
    this.anchorPending = false;
  }

  private onPressed(entity: Entity): void {
    if (entity.index === this.rig.orbEntity.index) {
      this.activateOrb();
    } else if (entity.index === this.rig.resetEntity.index) {
      this.activateReset();
    }
  }

  /**
   * Near-pinch activation (spec.md): pinching with the hand within 0.06 m of
   * the orb or reset control centre activates it even if the ray misses.
   */
  private checkNearPinchControls(): void {
    for (let i = 0; i < HANDEDNESSES.length; i += 1) {
      const hand = HANDEDNESSES[i];
      const select = this.input.xr.getSelectState(hand);
      if (!select.start) {
        continue;
      }
      if (this.isHandNear(hand, this.rig.resetObject)) {
        this.activateReset();
      } else if (this.isHandNear(hand, this.rig.orbObject)) {
        this.activateOrb();
      }
    }
  }

  private isHandNear(hand: 'left' | 'right', target: Object3D): boolean {
    target.getWorldPosition(this.controlPosition);
    const indexTip = this.player.indexTipSpaces[hand];
    indexTip.getWorldPosition(this.handPosition);
    if (
      this.handPosition.lengthSq() > MIN_HEAD_DISTANCE_SQ &&
      this.handPosition.distanceTo(this.controlPosition) <= ACTIVATE_RADIUS
    ) {
      return true;
    }
    const raySpace = this.player.raySpaces[hand];
    raySpace.getWorldPosition(this.handPosition);
    return (
      this.handPosition.lengthSq() > MIN_HEAD_DISTANCE_SQ &&
      this.handPosition.distanceTo(this.controlPosition) <= ACTIVATE_RADIUS
    );
  }

  private onGrab(entity: Entity): void {
    const token = this.tokensByEntity.get(entity.index);
    if (token === undefined) {
      return;
    }
    if (this.phase === 'agent') {
      // Edge case (spec.md): during "agent", user grab changes no state.
      this.world.getSystem(GrabSystem)?.forceRelease(entity);
      token.held = false;
      this.returnToken(token);
      return;
    }
    unlockAudio();
    playGrabSound();
    token.held = true;
    token.moving = false;
    token.settleElapsed = -1;
    token.shakeElapsed = -1;
    token.object.scale.set(
      MOTION.grabScale,
      MOTION.grabScale,
      MOTION.grabScale,
    );
  }

  private onRelease(entity: Entity): void {
    const token = this.tokensByEntity.get(entity.index);
    if (token === undefined) {
      return;
    }
    this.finishRelease(token);
  }

  private finishRelease(token: TokenView): void {
    token.object.scale.set(1, 1, 1);
    if (!token.held || this.phase === 'agent') {
      token.held = false;
      this.returnToken(token);
      return;
    }
    token.held = false;
    const blockId = this.nearestBlock(token);
    if (blockId === null) {
      this.returnToken(token);
      return;
    }
    const outcome = this.tryPin(token.taskId, blockId);
    if (outcome === 'refused') {
      playRefusedSound();
      token.shakeElapsed = 0;
      this.returnToken(token);
    } else if (outcome === 'missed') {
      this.returnToken(token);
    }
  }

  /**
   * Real-time drop target affordance & Error Prevention (MIT Media Lab HAX #5):
   * Illuminates the hovered block indigo when drop is valid, crimson when full (2 pins).
   * Zero per-frame allocations.
   */
  private updateBlockHighlights(): void {
    let hoveredBlockId: string | null = null;
    let hoveredTaskId: string | null = null;

    const tokens = this.rig.tokens;
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i].held) {
        hoveredBlockId = this.nearestBlock(tokens[i]);
        hoveredTaskId = tokens[i].taskId;
        break;
      }
    }

    const blocks = this.rig.blocks;
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      let nextState: BlockHighlight = 'idle';
      if (hoveredBlockId === block.blockId && hoveredTaskId !== null) {
        nextState = this.isBlockFullOfOtherPins(block.blockId, hoveredTaskId)
          ? 'full'
          : 'valid';
      }
      if (block.highlight !== nextState) {
        block.highlight = nextState;
        block.material.map = block.textures[nextState];
        block.material.needsUpdate = true;
      }
    }
  }

  private isBlockFullOfOtherPins(blockId: string, taskId: string): boolean {
    let count = 0;
    for (const pinnedTask in this.pins) {
      if (this.pins[pinnedTask] === blockId && pinnedTask !== taskId) {
        count += 1;
      }
    }
    return count >= SLOTS_PER_BLOCK;
  }

  /** The block whose centre is nearest to the token, within DROP_RADIUS. */
  private nearestBlock(token: TokenView): string | null {
    const anchor = this.rig.anchor;
    anchor.updateWorldMatrix(true, false);
    token.object.getWorldPosition(this.tokenPosition);
    let nearest: string | null = null;
    let nearestDistance = DROP_RADIUS;
    for (let i = 0; i < BLOCKS.length; i += 1) {
      const block = BLOCKS[i];
      const spot = BLOCK_SPOTS[block.id];
      this.blockPosition.set(spot.x, spot.y, spot.z);
      anchor.localToWorld(this.blockPosition);
      const distance = this.blockPosition.distanceTo(this.tokenPosition);
      if (distance <= nearestDistance) {
        nearest = block.id;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  /**
   * Pins the task to the block and applies or queues the resulting commands.
   */
  private tryPin(
    taskId: string,
    blockId: string,
  ): 'pinned' | 'refused' | 'missed' {
    const shown = this.placements.find((p) => p.taskId === taskId);
    if (shown?.blockId === blockId) {
      return 'missed';
    }
    const pinnedThere = Object.values(this.pins).filter(
      (pinnedBlock) => pinnedBlock === blockId,
    ).length;
    if (pinnedThere >= SLOTS_PER_BLOCK) {
      return 'refused';
    }

    const pins: Pins = { ...this.pins, [taskId]: blockId };
    this.pins = pins;

    if (!this.agentHasRun) {
      // Before the agent has run, only pinned placements are applied; the
      // other tokens stay in the tray (AC-1).
      const next = plan(TASKS, BLOCKS, pins).filter((p) => p.pinned);
      const changes = diff(this.placements, next);
      for (const move of changes.moves) {
        this.applyCommand({
          type: 'MOVE',
          taskId: move.taskId,
          blockId: move.blockId,
          slot: move.slot,
          reason: move.reason,
          pinned: move.pinned,
          by: 'user',
        });
      }
      for (const slide of changes.slides) {
        this.applyCommand({
          type: 'MOVE',
          taskId: slide.taskId,
          blockId: slide.blockId,
          slot: slide.slot,
          reason: slide.reason,
          pinned: slide.pinned,
          by: 'slide',
        });
      }
      this.applyCommand({
        type: 'UPDATE',
        phase: this.placements.length === TASKS.length ? 'done' : 'pinning',
      });
      this.notifyListeners();
      return 'pinned';
    }

    // Take back and re-plan (AC-7): the user's dropped token pins immediately,
    // same-block slot changes slide silently, and only unpinned tasks whose
    // block changed are queued as staged agent moves.
    const fullNext = plan(TASKS, BLOCKS, pins);
    const userPlacement = fullNext.find((p) => p.taskId === taskId);
    if (userPlacement === undefined) {
      return 'missed';
    }
    this.applyCommand({
      type: 'MOVE',
      taskId: userPlacement.taskId,
      blockId: userPlacement.blockId,
      slot: userPlacement.slot,
      reason: userPlacement.reason,
      pinned: userPlacement.pinned,
      by: 'user',
    });

    const agentMoves: MoveCommand[] = [];
    for (const target of fullNext) {
      if (target.taskId === taskId) {
        continue;
      }
      const current = this.placements.find((p) => p.taskId === target.taskId);
      if (current !== undefined && current.blockId === target.blockId) {
        if (current.slot !== target.slot) {
          this.applyCommand({
            type: 'MOVE',
            taskId: target.taskId,
            blockId: target.blockId,
            slot: target.slot,
            reason: target.reason,
            pinned: target.pinned,
            by: 'slide',
          });
        } else {
          this.upsertPlacement(target);
        }
      } else {
        agentMoves.push({
          type: 'MOVE',
          taskId: target.taskId,
          blockId: target.blockId,
          slot: target.slot,
          reason: target.reason,
          pinned: target.pinned,
          by: 'agent',
        });
      }
    }

    if (agentMoves.length > 0) {
      this.enqueueAgentMoves(agentMoves);
    } else {
      this.applyCommand({
        type: 'UPDATE',
        phase: this.placements.length === TASKS.length ? 'done' : 'pinning',
      });
    }
    this.notifyListeners();
    return 'pinned';
  }

  /**
   * Hand over to the agent (AC-4, AC-5, AC-6): places every unpinned task one
   * at a time, 0.5 s apart, with a reason chip per move.
   */
  private activateOrb(): void {
    if (this.phase === 'agent') {
      return;
    }
    unlockAudio();
    const next = plan(TASKS, BLOCKS, this.pins);
    const changes = diff(this.placements, next);
    if (changes.moves.length === 0 && changes.slides.length === 0) {
      this.agentHasRun = true;
      this.notifyListeners();
      return;
    }
    this.agentHasRun = true;
    for (const slide of changes.slides) {
      this.applyCommand({
        type: 'MOVE',
        taskId: slide.taskId,
        blockId: slide.blockId,
        slot: slide.slot,
        reason: slide.reason,
        pinned: slide.pinned,
        by: 'slide',
      });
    }
    const agentMoves: MoveCommand[] = changes.moves.map((move) => ({
      type: 'MOVE',
      taskId: move.taskId,
      blockId: move.blockId,
      slot: move.slot,
      reason: move.reason,
      pinned: move.pinned,
      by: 'agent',
    }));
    if (agentMoves.length > 0) {
      this.enqueueAgentMoves(agentMoves);
    } else {
      this.applyCommand({
        type: 'UPDATE',
        phase: this.placements.length === TASKS.length ? 'done' : 'pinning',
      });
    }
    this.notifyListeners();
  }

  /**
   * Reset control (AC-10): cancels pending agent moves, returns all six tokens
   * to the tray, clears pins, chips and end card, and restarts the intro hint.
   */
  private activateReset(): void {
    unlockAudio();
    this.agentQueue.length = 0;
    this.agentStepTimer = 0;
    this.agentMoveTailTimer = 0;
    this.agentStepCount = 0;
    this.agentHasRun = false;
    this.pins = {};
    this.placements = [];

    const grabSystem = this.world.getSystem(GrabSystem);
    for (let i = 0; i < this.rig.tokens.length; i += 1) {
      const token = this.rig.tokens[i];
      if (token.held) {
        grabSystem?.forceRelease(token.entity);
        token.held = false;
      }
      token.settleElapsed = -1;
      token.shakeElapsed = -1;
      token.object.scale.set(1, 1, 1);
      this.applyCommand({
        type: 'SPAWN',
        taskId: token.taskId,
        trayIndex: i,
      });
    }
    this.rig.chips.clear();
    this.rig.hint.reset();
    this.applyCommand({ type: 'UPDATE', phase: 'intro' });
    this.notifyListeners();
  }

  private enqueueAgentMoves(moves: readonly MoveCommand[]): void {
    this.agentQueue = moves.slice(1);
    this.agentStepTimer = MOTION.agentStepInterval;
    this.agentStepCount = 0;
    this.applyCommand({ type: 'UPDATE', phase: 'agent' });
    this.applyCommand(moves[0]);
  }

  private updateAgentQueue(delta: number): void {
    if (this.phase !== 'agent') {
      return;
    }
    if (this.agentQueue.length > 0) {
      this.agentStepTimer -= delta;
      while (this.agentStepTimer <= 0 && this.agentQueue.length > 0) {
        const nextCmd = this.agentQueue.shift()!;
        this.applyCommand(nextCmd);
        this.agentStepTimer += MOTION.agentStepInterval;
      }
      this.notifyListeners();
      return;
    }
    this.agentMoveTailTimer -= delta;
    if (this.agentMoveTailTimer <= 0) {
      this.agentMoveTailTimer = 0;
      this.applyCommand({
        type: 'UPDATE',
        phase: this.placements.length === TASKS.length ? 'done' : 'pinning',
      });
      this.notifyListeners();
    }
  }

  private applyCommand(command: SceneCommand): void {
    if (command.type === 'SPAWN') {
      const token = this.tokensByTask.get(command.taskId);
      const spot = TRAY_SPOTS[command.trayIndex];
      if (token === undefined || spot === undefined) {
        return;
      }
      token.pinMark.visible = false;
      this.startTokenMotion(
        token,
        spot.x,
        spot.y,
        spot.z,
        spot.yaw,
        MOTION.slideDuration,
        0,
      );
      return;
    }

    if (command.type === 'MOVE') {
      const token = this.tokensByTask.get(command.taskId);
      const spot = SLOT_SPOTS[command.blockId]?.[command.slot];
      if (token === undefined || spot === undefined) {
        throw new Error(
          `No token or slot for "${command.taskId}" in "${command.blockId}" slot ${command.slot}`,
        );
      }
      this.upsertPlacement({
        taskId: command.taskId,
        blockId: command.blockId,
        slot: command.slot,
        reason: command.reason,
        pinned: command.pinned,
      });
      token.pinMark.visible = command.pinned;

      if (command.by === 'user') {
        token.home.set(spot.x, spot.y, spot.z);
        token.homeYaw = spot.yaw;
        token.object.position.copy(token.home);
        token.object.rotation.set(0, spot.yaw, 0);
        token.moving = false;
        token.settleElapsed = 0;
        playSnapSound();
      } else if (command.by === 'agent') {
        this.startTokenMotion(
          token,
          spot.x,
          spot.y,
          spot.z,
          spot.yaw,
          MOTION.agentMoveDuration,
          MOTION.agentArcLift,
        );
        this.agentMoveTailTimer = MOTION.agentMoveDuration;
        this.rig.chips.show(command.blockId, command.slot, command.reason);
        playAgentMoveSound(this.agentStepCount);
        this.agentStepCount += 1;
      } else {
        this.startTokenMotion(
          token,
          spot.x,
          spot.y,
          spot.z,
          spot.yaw,
          MOTION.slideDuration,
          0,
        );
      }
      return;
    }

    if (command.taskId !== undefined && command.pinned !== undefined) {
      const token = this.tokensByTask.get(command.taskId);
      if (token !== undefined) {
        token.pinMark.visible = command.pinned;
      }
    }
    if (command.phase !== undefined) {
      const previousPhase = this.phase;
      this.phase = command.phase;
      this.rig.endCard.setVisible(command.phase === 'done');
      if (command.phase === 'done' && previousPhase !== 'done') {
        playFinishSound();
      }
    }
  }

  private upsertPlacement(placement: Placement): void {
    const next: Placement[] = [];
    for (const task of TASKS) {
      if (task.id === placement.taskId) {
        next.push({ ...placement });
      } else {
        const existing = this.placements.find((p) => p.taskId === task.id);
        if (existing !== undefined) {
          next.push(existing);
        }
      }
    }
    this.placements = next;
  }

  private startTokenMotion(
    token: TokenView,
    targetX: number,
    targetY: number,
    targetZ: number,
    targetYaw: number,
    duration: number,
    arcHeight: number,
  ): void {
    token.startPos.copy(token.object.position);
    token.startYaw = token.object.rotation.y;
    token.home.set(targetX, targetY, targetZ);
    token.homeYaw = targetYaw;
    token.moveElapsed = 0;
    token.moveDuration = duration;
    token.moveArc = arcHeight;
    token.moving = true;
  }

  private returnToken(token: TokenView): void {
    this.startTokenMotion(
      token,
      token.home.x,
      token.home.y,
      token.home.z,
      token.homeYaw,
      MOTION.slideDuration,
      0,
    );
  }

  private updateTokens(delta: number): void {
    const tokens = this.rig.tokens;
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.held) {
        continue;
      }

      // 1. Flight / slide motion with parabolic arc lift
      if (token.moving) {
        token.moveElapsed += delta;
        const t = Math.min(1, token.moveElapsed / token.moveDuration);
        const eased = easeOutCubic(t);
        token.object.position.lerpVectors(token.startPos, token.home, eased);
        if (token.moveArc > 0) {
          token.object.position.y += arcLift(t, token.moveArc);
          token.object.position.z += arcLift(t, token.moveArc * 0.45);
        }
        token.object.rotation.set(
          0,
          token.startYaw + (token.homeYaw - token.startYaw) * eased,
          0,
        );
        if (t >= 1) {
          token.object.position.copy(token.home);
          token.object.rotation.set(0, token.homeYaw, 0);
          token.moving = false;
        }
      }

      // 2. Tactile snap-settle pulse after user pin
      if (token.settleElapsed >= 0) {
        token.settleElapsed += delta;
        const u = token.settleElapsed / MOTION.snapSettleDuration;
        if (u >= 1) {
          token.settleElapsed = -1;
          token.object.scale.set(1, 1, 1);
        } else {
          const s = snapSettleScale(u);
          token.object.scale.set(s, s, s);
        }
      }

      // 3. Subtle horizontal shake on refused drop (AC-2)
      if (token.shakeElapsed >= 0) {
        token.shakeElapsed += delta;
        const u = token.shakeElapsed / MOTION.refusedShakeDuration;
        if (u >= 1) {
          token.shakeElapsed = -1;
        } else {
          token.object.position.x += refusedShakeX(u);
        }
      }
    }
  }
}
