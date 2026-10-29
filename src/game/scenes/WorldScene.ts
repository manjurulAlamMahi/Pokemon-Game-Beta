// The overworld scene. One instance renders whichever map the player is on;
// changing maps restarts the scene with new data.
//
// Besides free roaming it exposes a small cutscene API (say / walkTo / emote /
// releaseCreature / camera focus) that story modules in src/game/story use.

import Phaser from 'phaser';
import type { DialogueScript, Direction, MapDefinition, MapId, NpcDefinition, StarterId, TilePos, Warp } from '../../types';
import { DialogueController } from '../dialogue/DialogueController';
import { followerLines } from '../dialogue/scripts';
import { NPCS } from '../data/npcs';
import { STARTERS } from '../data/starters';
import { TRAINER_NAMES } from '../data/trainers';
import { Character, DIR_VECTORS } from '../entities/Character';
import { Follower } from '../entities/Follower';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { getMap } from '../maps';
import { GameState } from '../state/GameState';
import { attachStory } from '../story';
import { addAmbientLife } from '../systems/Ambient';
import { CollisionGrid } from '../systems/CollisionGrid';
import * as Fx from '../systems/Effects';
import { InputSystem } from '../systems/InputSystem';
import { MapRenderer } from '../systems/MapRenderer';
import { Sfx } from '../systems/Sfx';
import { UI } from '../ui/UiController';
import { eventBus } from '../utils/EventBus';
import { SCENE_WORLD } from './BootScene';

const T = 16;
const FADE_MS = 220;
const BUMP_TALK_COOLDOWN_MS = 900;

export interface WorldSceneData {
  mapId: MapId;
  x: number;
  y: number;
  facing: Direction;
}

/** Who is speaking in a cutscene line: an NPC id, 'player', or null for narration. */
export type SpeakerId = string | 'player' | null;

export class WorldScene extends Phaser.Scene {
  map!: MapDefinition;
  private collision!: CollisionGrid;
  private mapRenderer!: MapRenderer;
  private controls!: InputSystem;
  player!: Player;
  npcs: Npc[] = [];
  follower: Follower | null = null;
  private transitioning = false;
  private cutsceneDepth = 0;
  private actionHandlers = new Map<string, (payload?: string) => void>();
  /** Story hook: return true to stop the player stepping onto a warp (and handle it). */
  exitGuard: ((warp: Warp) => boolean) | null = null;
  private baseZoom = 4;

  constructor() {
    super(SCENE_WORLD);
  }

  init(data: WorldSceneData): void {
    this.map = getMap(data.mapId);
    this.transitioning = false;
    this.npcs = [];
    this.follower = null;
    this.cutsceneDepth = 0;
    this.actionHandlers.clear();
    this.exitGuard = null;
    GameState.setPlayerLocation(data.mapId, { x: data.x, y: data.y }, data.facing);
  }

  create(data: WorldSceneData): void {
    const state = GameState.get();
    this.collision = new CollisionGrid(this.map, state);
    this.mapRenderer = new MapRenderer(this, this.map, state);
    this.mapRenderer.build();
    addAmbientLife(this, this.map);
    this.controls = new InputSystem(this);

    for (const spawn of this.map.npcs) {
      const def = NPCS[spawn.npcId];
      if (def && (!spawn.when || spawn.when(state))) this.npcs.push(new Npc(this, def, spawn));
    }
    this.player = new Player(this, state.player.gender, data.x, data.y, data.facing);
    // The partner follows once the lab scene is over (it joins mid-cutscene there).
    if (state.story.journeyStarted && state.story.playerStarter) this.spawnFollower(state.story.playerStarter);

    this.setupCamera();
    this.scale.on('resize', this.setupCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.setupCamera, this));

    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
    eventBus.emit('map:entered', { mapId: this.map.id, displayName: this.map.displayName });
    attachStory(this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50); // avoid tunnelling after tab switches
    this.mapRenderer.update(dt);
    this.controls.update();
    DialogueController.update(dt);

    // Overlays (starter panel, reveal) own the keyboard; swallow game input.
    let interact = this.controls.interactPressed();
    const held = this.controls.direction(); // always read so buffered taps are consumed
    if (UI.isBlocking() || UI.recentlyClosed()) interact = false;

    const talking = DialogueController.isOpen;
    if (talking && interact) DialogueController.advance();
    else if (!talking && interact && this.canAct()) this.tryInteract();

    if (this.player.scripted) {
      this.player.updateScripted(dt);
    } else {
      const locked = DialogueController.isOpen || this.transitioning || this.inCutscene || UI.isBlocking();
      this.player.control(dt, locked ? null : held, this.controls.running(), {
        canEnter: (x, y) => !this.guardedWarp(x, y) && this.canEnter(x, y, this.player),
        onArrive: (tile) => this.checkWarp(tile),
        onBlocked: (target) => this.onBlocked(target),
        onStep: (from, speed) => this.follower?.follow(from, speed),
      });
    }
    GameState.setPlayerLocation(this.map.id, this.player.tile, this.player.facing);

    const npcWorld = { canEnter: (x: number, y: number, who: Npc) => this.canEnter(x, y, who) && !this.isWarp(x, y) };
    for (const npc of this.npcs) npc.tick(dt, npcWorld);
    this.follower?.tick(dt, this.player);
  }

  private canAct(): boolean {
    return !this.player.isMoving && !this.transitioning && !this.inCutscene && !UI.isBlocking();
  }

  // --- Collision ------------------------------------------------------------

  /** Can `who` step onto (x, y)? The player may walk through its follower (they swap). */
  private canEnter(x: number, y: number, who?: Character): boolean {
    if (!this.collision.isWalkable(x, y)) return false;
    if (who !== this.player && this.player.occupies(x, y)) return false;
    if (who !== this.player && who !== this.follower && this.follower?.occupies(x, y)) return false;
    return !this.npcs.some((n) => n !== who && n.occupies(x, y));
  }

  /** Static terrain/object walkability, ignoring characters (dev tooling / tests). */
  isWalkableStatic(x: number, y: number): boolean {
    return this.collision.isWalkable(x, y);
  }

  /** Public walkability query for the player (used by dev tooling / tests). */
  isTileFree(x: number, y: number): boolean {
    return this.canEnter(x, y, this.player);
  }

  /** A warp the story currently forbids (the guard handles the feedback). */
  private guardedWarp(x: number, y: number): boolean {
    const warp = this.exitGuard && this.map.warps.find((w) => w.x === x && w.y === y);
    return !!warp && this.exitGuard!(warp);
  }

  private isWarp(x: number, y: number): boolean {
    return this.map.warps.some((w) => w.x === x && w.y === y);
  }

  private npcAt(pos: TilePos): Npc | undefined {
    return this.npcs.find((n) => n.occupies(pos.x, pos.y));
  }

  // --- Interaction ----------------------------------------------------------

  private tryInteract(): void {
    const target = this.player.facingTile();
    const npc = this.npcAt(target);
    if (npc) {
      this.talkTo(npc);
      return;
    }
    if (this.follower?.occupies(target.x, target.y)) {
      this.talkToFollower(this.follower);
      return;
    }
    const thing = this.map.interactables.find((i) => i.x === target.x && i.y === target.y);
    if (!thing) return;
    const handler = thing.action && this.actionHandlers.get(thing.action.type);
    if (handler) handler(thing.action!.payload);
    else this.sayScript(thing.id, thing.script, thing.speaker);
  }

  private talkTo(npc: Npc): void {
    npc.beginTalk(this.player.tile);
    this.sayScript(npc.def.id, npc.def.dialogue, npc.def.name, () => npc.endTalk(), npc.def.portrait ?? npc.def.sprite);
  }

  private talkToFollower(f: Follower): void {
    f.faceTowards(this.player.tile);
    Fx.emote(this, f.sprite, 'heart', 1100);
    Sfx.cry(STARTERS[f.starter].cry);
    DialogueController.open(followerLines(f.starter), undefined, undefined, STARTERS[f.starter].overworldSprite);
  }

  private sayScript(id: string, script: DialogueScript, speaker?: string, onClose?: () => void, portrait?: string): void {
    const state = GameState.get();
    const lines = typeof script === 'function' ? script({ state, timesTalked: GameState.timesTalked(id) }) : script;
    GameState.recordTalk(id);
    DialogueController.open(lines, speaker, onClose, portrait);
  }

  private onBlocked(target: TilePos): void {
    const npc = this.npcAt(target);
    if (!npc?.def.talkOnBump || DialogueController.isOpen) return;
    if (performance.now() - DialogueController.lastClosedAt < BUMP_TALK_COOLDOWN_MS) return;
    npc.showEmote('exclaim');
    this.talkTo(npc);
  }

  /** Story modules register handlers for interactables with an `action`. */
  onAction(type: string, handler: (payload?: string) => void): void {
    this.actionHandlers.set(type, handler);
  }

  // --- Follower ---------------------------------------------------------------

  /** Spawn the partner behind the player (or tucked in, if there's no room). */
  spawnFollower(starter: StarterId, at?: TilePos): Follower {
    this.follower?.destroy();
    const p = this.player;
    const back = DIR_VECTORS[p.facing];
    const behind = at ?? { x: p.tile.x - back.x, y: p.tile.y - back.y };
    const free = this.collision.isWalkable(behind.x, behind.y) && !this.isWarp(behind.x, behind.y) && !this.npcAt(behind);
    this.follower = free
      ? new Follower(this, starter, behind.x, behind.y, p.facing)
      : new Follower(this, starter, p.tile.x, p.tile.y, p.facing, true);
    return this.follower;
  }

  // --- Cutscene API -------------------------------------------------------------

  get inCutscene(): boolean {
    return this.cutsceneDepth > 0;
  }

  /** Run a scripted sequence with player control locked. */
  async cutscene(run: () => Promise<void>): Promise<void> {
    this.cutsceneDepth++;
    try {
      await run();
    } finally {
      this.cutsceneDepth--;
    }
  }

  npc(id: string): Npc | undefined {
    return this.npcs.find((n) => n.def.id === id);
  }

  /** Show lines from a speaker and wait until the player closes the box. */
  say(speaker: SpeakerId, lines: string[]): Promise<void> {
    let name: string | undefined;
    let portrait: string | undefined;
    if (speaker === 'player') {
      name = TRAINER_NAMES.player;
      portrait = this.player.textureKey;
    } else if (speaker) {
      const def = NPCS[speaker];
      name = def?.name ?? speaker;
      portrait = def?.portrait ?? def?.sprite;
    }
    return new Promise((resolve) => DialogueController.open(lines, name, resolve, portrait));
  }

  wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  /** Walk a character to a tile along the shortest free path. */
  walkTo(who: Character, x: number, y: number, tilesPerSecond = 3.5): Promise<void> {
    const path = this.findPath(who, who.tile, { x, y });
    return who.walkPath(path ?? [], tilesPerSecond);
  }

  /** Breadth-first search over walkable tiles (other characters block). */
  findPath(who: Character, from: TilePos, to: TilePos): Direction[] | null {
    const key = (p: TilePos) => `${p.x},${p.y}`;
    const prev = new Map<string, { from: string; dir: Direction } | null>([[key(from), null]]);
    const queue: TilePos[] = [from];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.x === to.x && cur.y === to.y) break;
      for (const dir of Object.keys(DIR_VECTORS) as Direction[]) {
        const n = { x: cur.x + DIR_VECTORS[dir].x, y: cur.y + DIR_VECTORS[dir].y };
        const k = key(n);
        if (prev.has(k)) continue;
        const isGoal = n.x === to.x && n.y === to.y;
        if (!this.canEnter(n.x, n.y, who) && !(isGoal && this.isWarp(n.x, n.y))) continue;
        prev.set(k, { from: key(cur), dir });
        queue.push(n);
      }
    }
    if (!prev.has(key(to))) return null;
    const dirs: Direction[] = [];
    let k = key(to);
    while (prev.get(k)) {
      const step = prev.get(k)!;
      dirs.unshift(step.dir);
      k = step.from;
    }
    return dirs;
  }

  emote(who: Character, kind: 'exclaim' | 'dots' | 'note' | 'heart', ms = 1000): void {
    Fx.emote(this, who.sprite, kind, ms);
  }

  /** Small hop, e.g. for laughter or excitement. */
  async hop(who: Character, times = 2): Promise<void> {
    const y = who.sprite.y;
    await new Promise<void>((r) =>
      this.tweens.add({ targets: who.sprite, y: y - 3, duration: 90, yoyo: true, repeat: times - 1, onComplete: () => r() }),
    );
    who.sprite.y = y;
  }

  /** Pixel position of a placed map object (by id). */
  objectPosition(id: string): { x: number; y: number } | null {
    const o = this.mapRenderer.getObject(id);
    return o ? { x: o.x + o.width / 2, y: o.y + o.height / 2 } : null;
  }

  removeObject(id: string): void {
    this.mapRenderer.getObject(id)?.destroy();
  }

  /** Spawn a creature as a temporary NPC (used during cutscenes). */
  addCreature(starter: StarterId, x: number, y: number, facing: Direction): Npc {
    const s = STARTERS[starter];
    const def: NpcDefinition = {
      id: `creature_${starter}`,
      name: s.name,
      sprite: s.overworldSprite,
      dialogue: [`${s.name} looks around the lab curiously.`],
      movement: { type: 'static' },
    };
    const npc = new Npc(this, def, { npcId: def.id, x, y, facing });
    this.npcs.push(npc);
    return npc;
  }

  removeNpc(npc: Npc, fade = true): Promise<void> {
    this.npcs = this.npcs.filter((n) => n !== npc);
    if (!fade) {
      npc.destroy();
      return Promise.resolve();
    }
    return new Promise((r) =>
      this.tweens.add({ targets: npc.sprite, alpha: 0, duration: 220, onComplete: () => (npc.destroy(), r()) }),
    );
  }

  /** Throw a capsule from `fromPx` to a tile, open it and materialise the creature there. */
  async releaseCreature(starter: StarterId, fromPx: { x: number; y: number }, tile: TilePos, facing: Direction): Promise<Npc> {
    const land = { x: tile.x * T + T / 2, y: tile.y * T + T - 5 };
    const ball = await Fx.throwBall(this, fromPx, land);
    await this.wait(120);
    await Fx.openBall(this, ball);
    const creature = this.addCreature(starter, tile.x, tile.y, facing);
    await Fx.materialize(this, creature.sprite, starter);
    return creature;
  }

  /** Beam a creature back toward its trainer, then remove it. */
  async recallCreature(creature: Npc, trainer: Character): Promise<void> {
    await Fx.recall(this, creature.sprite, { x: trainer.sprite.x, y: trainer.sprite.y - 10 });
    await this.removeNpc(creature, false);
  }

  /** Turn a cutscene creature into the player's follower in place. */
  makeFollower(creature: Npc, starter: StarterId): Follower {
    const at = { ...creature.tile };
    const facing = creature.facing;
    this.npcs = this.npcs.filter((n) => n !== creature);
    creature.destroy();
    const f = this.spawnFollower(starter, at);
    f.face(facing);
    return f;
  }

  /** Zoom in one step and centre on a tile area (cinematic framing). */
  focusCamera(tileX: number, tileY: number, durationMs = 600): Promise<void> {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(tileX * T + T / 2, tileY * T + T / 2, durationMs, 'Sine.easeInOut');
    cam.zoomTo(this.baseZoom + 1, durationMs, 'Sine.easeInOut');
    return this.wait(durationMs);
  }

  resetCamera(durationMs = 500): Promise<void> {
    const cam = this.cameras.main;
    cam.zoomTo(this.baseZoom, durationMs, 'Sine.easeInOut');
    if (this.map.kind === 'indoor') cam.pan(this.map.width * T / 2, this.map.height * T / 2 - 4, durationMs, 'Sine.easeInOut');
    return this.wait(durationMs).then(() => this.setupCamera());
  }

  // --- Map transitions ------------------------------------------------------

  private checkWarp(tile: TilePos): boolean {
    const warp = this.map.warps.find((w) => w.x === tile.x && w.y === tile.y);
    if (!warp) return false;
    this.warpTo(warp.to);
    return true;
  }

  warpTo(to: Warp['to']): void {
    if (this.transitioning) return;
    this.transitioning = true;
    Sfx.door();
    if (this.map.kind === 'outdoor') {
      this.player.setVisible(false); // stepped through the door
      this.follower?.setVisible(false);
    }
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: to.map, x: to.x, y: to.y, facing: to.facing } satisfies WorldSceneData);
    });
  }

  // --- Camera ---------------------------------------------------------------

  private setupCamera(): void {
    const cam = this.cameras.main;
    const { width, height } = this.scale.gameSize;
    const mapW = this.map.width * T;
    const mapH = this.map.height * T;

    // Integer zoom keeps pixels crisp; aim for ~12 tiles of vertical view.
    let zoom = Math.max(2, Math.round(height / (12.5 * T)));
    if (this.map.kind === 'outdoor') zoom = Math.max(zoom, Math.ceil(width / mapW), Math.ceil(height / mapH));
    this.baseZoom = zoom;
    cam.setZoom(zoom);
    cam.setRoundPixels(true);

    if (this.map.kind === 'indoor') {
      cam.removeBounds();
      cam.stopFollow();
      cam.centerOn(mapW / 2, mapH / 2 - 4);
    } else {
      cam.setBounds(0, 0, mapW, mapH);
      cam.startFollow(this.player.sprite, true, 0.2, 0.2, 0, 10);
    }
  }
}

