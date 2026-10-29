// Professor Max's lab: introductions, starter selection, the reveal, the
// rival's and Z's picks, the group moment, dreams, and the journey objective.
//
// Written as plain sequential steps on top of the WorldScene cutscene API so
// beats are easy to reorder or rewrite.

import Phaser from 'phaser';
import type { StarterId } from '../../types';
import { STARTERS } from '../data/starters';
import { oppositeSprite, TRAINER_NAMES } from '../data/trainers';
import { starterName } from '../dialogue/scripts';
import type { Npc } from '../entities/Npc';
import { LAB_BALL_TILES, LAB_DOOR_X, LAB_H } from '../maps/interiors';
import type { WorldScene } from '../scenes/WorldScene';
import { GameState } from '../state/GameState';
import * as Fx from '../systems/Effects';
import { Sfx } from '../systems/Sfx';
import { UI } from '../ui/UiController';

const { player: X, rival: Y, opposite: Z } = TRAINER_NAMES;
const PROF = 'professor_max';
const RIVAL = 'rival_y';

/** Where the player first stops in front of the table. */
const PLAYER_ARRIVAL = { x: 7, y: 5 };
/** Group moment: each trainer stands with their partner at their side. */
const LINEUP = {
  rival: { trainer: { x: 3, y: 6 }, creature: { x: 4, y: 6 } },
  player: { trainer: { x: 6, y: 6 }, creature: { x: 7, y: 6 } },
  opposite: { trainer: { x: 9, y: 6 }, creature: { x: 10, y: 6 } },
};
/** Professor walks round the table to face the line-up for the big talk. */
const PROF_FRONT = { x: 6, y: 8 };
const PROF_HOME = { x: 7, y: 3 };

type Phase = 'intro' | 'choosing' | 'busy' | 'done';

export class LabStory {
  private phase: Phase = 'intro';
  private preview: { id: StarterId; fx: { destroy(): void } } | null = null;
  private readonly zId: string;

  constructor(private readonly w: WorldScene) {
    this.zId = oppositeSprite(GameState.get().player.gender);
  }

  start(): void {
    const w = this.w;
    w.onAction('starter', (id) => void this.inspect(id as StarterId));
    w.exitGuard = () => {
      if (this.phase === 'done') return false;
      void this.blockExit();
      return true;
    };
    w.events.on(Phaser.Scenes.Events.UPDATE, this.updatePreview, this);
    w.events.once(Phaser.Scenes.Events.SHUTDOWN, () => w.events.off(Phaser.Scenes.Events.UPDATE, this.updatePreview, this));
    w.time.delayedCall(350, () => void this.intro());
  }

  // --- 1. Introductions -----------------------------------------------------

  private async intro(): Promise<void> {
    const w = this.w;
    await w.cutscene(async () => {
      const prof = w.npc(PROF)!;
      const rival = w.npc(RIVAL)!;
      const z = w.npc(this.zId)!;
      await w.walkTo(w.player, PLAYER_ARRIVAL.x, PLAYER_ARRIVAL.y);
      w.player.face('up');
      rival.faceTowards(w.player.tile);
      z.faceTowards(w.player.tile);
      w.emote(prof, 'exclaim', 800);
      await w.wait(500);
      GameState.updateStory({ professorMet: true });

      await w.say(PROF, [`Welcome, ${X}!`, `${Y} and ${Z} have been waiting for you to arrive.`]);
      await w.say(PROF, ["Now that you're all here...", "Let's begin choosing your first Pokémon."]);

      w.emote(rival, 'note', 1200);
      await w.hop(rival, 1);
      await w.say(RIVAL, ["I'll choose later.", `Let ${X} pick first.`]);
      await w.say(this.zId, ["That's fine with me.", `${X} can choose first.`, 'We can wait.']);

      prof.face('down');
      await w.say(PROF, ['Before you are three Poké Balls.', 'Inside each one is a Pokémon waiting for its new Trainer.']);
      GameState.updateStory({ objective: 'Choose your first Pokémon from the table.' });
    });
    this.phase = 'choosing';
  }

  // --- 2. Previewing and choosing ------------------------------------------------

  /** Hologram of the creature above whichever capsule the player is facing. */
  private updatePreview(): void {
    const w = this.w;
    const t = w.player.facingTile();
    const facingBall =
      this.phase === 'choosing' && !w.inCutscene && !w.player.isMoving && w.player.facing === 'up'
        ? (Object.keys(LAB_BALL_TILES) as StarterId[]).find((id) => LAB_BALL_TILES[id].x === t.x && LAB_BALL_TILES[id].y === t.y)
        : undefined;
    if (this.preview?.id === facingBall) return;
    this.preview?.fx.destroy();
    this.preview = null;
    w.data.set('preview', null);
    if (facingBall) {
      const tile = LAB_BALL_TILES[facingBall];
      this.preview = { id: facingBall, fx: Fx.hologram(w, facingBall, tile.x * 16 + 8, tile.y * 16 - 6) };
      w.data.set('preview', facingBall);
      Sfx.hover();
    }
  }

  private async inspect(id: StarterId): Promise<void> {
    if (this.phase !== 'choosing') return;
    this.phase = 'busy';
    const choice = await UI.openStarterPanel(id);
    if (!choice) {
      this.phase = 'choosing';
      return;
    }
    this.preview?.fx.destroy();
    this.preview = null;
    await this.receive(choice);
  }

  private async blockExit(): Promise<void> {
    const w = this.w;
    if (w.inCutscene || w.player.isMoving) return;
    await w.cutscene(async () => {
      w.emote(w.npc(PROF)!, 'exclaim', 800);
      await w.say(PROF, [`Wait, ${X}!`, "Don't leave without your first Pokémon!"]);
      await w.player.walkPath(['up']);
    });
  }

  // --- 3. The reveal, the others' picks, and the group moment -------------------------

  private ballPx(id: StarterId): { x: number; y: number } {
    const t = LAB_BALL_TILES[id];
    return this.w.objectPosition(`ball_${id}`) ?? { x: t.x * 16 + 8, y: t.y * 16 - 4 };
  }

  private async receive(id: StarterId): Promise<void> {
    const w = this.w;
    const s = STARTERS[id];
    await w.cutscene(async () => {
      const prof = w.npc(PROF)!;
      const rival = w.npc(RIVAL)!;
      const z = w.npc(this.zId)!;
      const ballTile = LAB_BALL_TILES[id];

      await w.walkTo(w.player, ballTile.x, ballTile.y + 1);
      w.player.face('up');
      await w.say(PROF, [`So, ${X}, you want ${s.name}, the ${s.type}-type Pokémon?`, 'An excellent choice!', 'Go on, let it out!']);

      // The capsule hops off the table and opens right in front of the player.
      w.player.face('down');
      const from = this.ballPx(id);
      w.removeObject(`ball_${id}`);
      const mine = await w.releaseCreature(id, from, { x: ballTile.x, y: ballTile.y + 2 }, 'up');
      const { rival: rivalId, opposite: zStarter } = GameState.chooseStarter(id);
      await UI.showReveal(id, X);
      w.emote(mine, 'heart', 1400);
      await w.say(null, [`${X} received ${s.name}!`]);

      // Y takes the starter that beats the player's.
      rival.face('right');
      w.emote(rival, 'exclaim', 700);
      await w.wait(300);
      await w.say(RIVAL, [`Then I'll take ${STARTERS[rivalId].name}!`]);
      const rivalPx = this.ballPx(rivalId);
      w.removeObject(`ball_${rivalId}`);
      rival.face('down');
      const rivalMon = await w.releaseCreature(rivalId, rivalPx, { x: 4, y: 6 }, 'up');
      await w.say(RIVAL, [`Heh. ${starterName(rivalId)} and I are going to be unstoppable.`]);

      // Z gets the remaining one.
      z.face('left');
      await w.say(this.zId, [`Then... this one must be mine.`]);
      const zPx = this.ballPx(zStarter);
      w.removeObject(`ball_${zStarter}`);
      z.face('down');
      const zMon = await w.releaseCreature(zStarter, zPx, { x: 10, y: 6 }, 'up');
      w.emote(zMon, 'heart', 1200);
      await w.say(this.zId, [`Hello, ${starterName(zStarter)}! Nice to meet you!`]);

      await this.groupMoment(mine);
      await this.dreams(rival, z);

      await w.say(PROF, [
        'Your journey is about to begin.',
        'You should visit the market in the next town.',
        'I have a friend there.',
        'Tell him I sent you.',
        'He will give you a special gift.',
      ]);
      GameState.updateStory({ journeyStarted: true, objective: 'Visit the market in the next town.' });
      await w.resetCamera();

      await this.departures(rival, rivalMon, z, zMon);
      await w.walkTo(prof, PROF_HOME.x, PROF_HOME.y, 3);
      prof.face('down');
      w.makeFollower(mine, id);
      await w.say(PROF, [`Off you go, ${X}! Your partner is ready when you are.`]);
    });
    this.phase = 'done';
  }

  private async groupMoment(mine: Npc): Promise<void> {
    const w = this.w;
    const prof = w.npc(PROF)!;
    const rival = w.npc(RIVAL)!;
    const z = w.npc(this.zId)!;
    await w.say(PROF, ['Wonderful!', 'Line up with your partners and let me get a good look at you all.']);

    // Partners first (they may be standing where their trainer is headed).
    await w.walkTo(mine, LINEUP.player.creature.x, LINEUP.player.creature.y);
    await Promise.all([
      w.walkTo(w.player, LINEUP.player.trainer.x, LINEUP.player.trainer.y),
      w.walkTo(rival, LINEUP.rival.trainer.x, LINEUP.rival.trainer.y),
      w.walkTo(z, LINEUP.opposite.trainer.x, LINEUP.opposite.trainer.y),
    ]);
    // The Professor comes round the table to stand in front of the group.
    await w.walkTo(prof, PROF_FRONT.x, PROF_FRONT.y, 3);
    prof.face('up');
    for (const c of w.npcs) if (c !== prof) c.face('down');
    w.player.face('down');
    await w.focusCamera(6.5, 6.6, 700);
    Fx.sparkleBurst(w, 6.5 * 16 + 8, 6 * 16, 16);
    await w.wait(1800);
  }

  private async dreams(rival: Npc, z: Npc): Promise<void> {
    const w = this.w;
    await w.say(PROF, ['So...', 'What are your dreams?']);
    await w.say('player', ["I'll become the best Pokémon Trainer in the world."]);
    rival.face('right');
    Sfx.laugh();
    w.emote(rival, 'note', 1200);
    await w.hop(rival, 3);
    await w.say(RIVAL, ['Ha!', "We'll see about that."]);
    rival.face('down');
    await w.say(RIVAL, ["I'll become the Pokémon Champion of the world."]);
    w.emote(z, 'dots', 1200);
    await w.say(this.zId, ['I just want to explore the world.', "I haven't decided what my dream is yet."]);
  }

  private async departures(rival: Npc, rivalMon: Npc, z: Npc, zMon: Npc): Promise<void> {
    const w = this.w;
    const exit = { x: LAB_DOOR_X, y: LAB_H - 1 };

    rival.face('right');
    await w.say(RIVAL, [`See you around, ${X}.`, 'Try to keep up!']);
    rival.face('down');
    await w.recallCreature(rivalMon, rival);
    await w.walkTo(rival, exit.x, exit.y, 4.5);
    await rival.walkPath(['down'], 4.5);
    await w.removeNpc(rival);

    z.face('left');
    await w.say(this.zId, ["I'm going to head home and get to know my partner.", `Come visit me sometime, ${X}!`]);
    z.face('down');
    await w.recallCreature(zMon, z);
    await w.walkTo(z, exit.x, exit.y, 3.5);
    await z.walkPath(['down'], 3.5);
    await w.removeNpc(z);
    w.player.face('up');
  }
}
