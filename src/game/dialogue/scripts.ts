// All NPC and object dialogue lives here, separate from map and NPC data.
// Scripts can branch on game state and on how often the player has talked.

import type { DialogueScript, GameStateData, StarterId } from '../../types';
import { STARTERS } from '../data/starters';
import { PROFESSOR_NAME, TRAINER_NAMES, zWords } from '../data/trainers';

const X = TRAINER_NAMES.player;
const Z = TRAINER_NAMES.opposite;

/** Display name of a starter, e.g. "Charmander". */
export function starterName(id: StarterId | null): string {
  if (!id) return '???';
  const n = STARTERS[id].name;
  return n[0] + n.slice(1).toLowerCase();
}

const chose = (s: Readonly<GameStateData>) => s.story.starterChosen && s.story.playerStarter !== null;

export const SCRIPTS = {
  // --- Player's house -------------------------------------------------------
  mom: ({ timesTalked, state }) => {
    if (chose(state)) {
      return [
        'Oh!',
        `You chose ${starterName(state.story.playerStarter)}? What a wonderful Pokémon!`,
        'Nice choice.',
        'I hope you have an amazing journey.',
      ];
    }
    return timesTalked === 0
      ? ['Good morning!', 'You should go meet the Professor.', 'Your rivals have already gone to the lab.']
      : ["Don't keep the Professor waiting!"];
  },

  // --- Male rival's (Y's) house ----------------------------------------------
  rivalBoyMom: ({ state }) =>
    chose(state)
      ? [
          "He's already gone ahead.",
          'He wants to become better than his father.',
          'His father is the Gym Leader of Thornvale City.',
          'He wants to prove that he can become even better than his father.',
        ]
      : ["My son went to the Professor's lab to choose his first creature.", "I wonder what he'll choose..."],
  rivalBoyBrother: ["One day I'll be older and I'll get to choose my own starter!", "I'm definitely picking the Water-type!"],

  // --- Opposite character's (Z's) house -------------------------------------
  zMom: ({ state }) => {
    const w = zWords(state);
    return chose(state)
      ? [`My ${w.child} is upstairs.`, `${w.They} hasn't taken ${w.their} eyes off that Pokémon since ${w.they} got home!`]
      : [`My ${w.child} went to the Professor's lab to choose ${w.their} first creature.`, `${w.They}'s been waiting for this day forever!`];
  },
  z: ({ state }) => [
    `Seeing a real ${starterName(state.story.oppositeStarter)} this close...`,
    "It's my first time.",
    'I want to learn more about Pokémon like this.',
  ],
  zBed: ({ state }) => {
    const w = zWords(state);
    return ['A perfectly made bed.', `${w.They} left early this morning... but still made ${w.their} bed.`];
  },

  // --- Elders' house --------------------------------------------------------
  oldMan: ({ timesTalked, state }) =>
    timesTalked === 0
      ? ['I used to be quite the trainer when I was young.', 'These days, my Charizard and I just need a little rest.']
      : [
          `Heh. You've got that same spark I had, young ${state.player.gender === 'boy' ? 'man' : 'lady'}.`,
          'These days, my Charizard and I just need a little rest.',
        ],
  oldWoman: ({ state }) =>
    chose(state)
      ? [
          'Oh!',
          `You chose ${starterName(state.story.playerStarter)}!`,
          "That's a nice choice.",
          'I hope you have a wonderful journey.',
          'When your Pokémon reaches its final evolution...',
          'Come back and see me.',
          "I'll have a special gift waiting for you.",
        ]
      : ['So, what starter did you pick?', 'Oh...', "You haven't picked one yet.", "Choose the one you think you'll like the most."],

  // --- Outside NPCs ---------------------------------------------------------
  poolKid: ['If I had a fishing rod...', "I'd catch a Magikarp from this pool!"],
  hiker: ['The outside world is full of wild creatures.', "You never know what you'll find in the tall grass."],
  guard: ({ timesTalked, state }) => {
    if (chose(state)) {
      return ["You're back already?", "Looks like you've chosen your first Pokémon.", "But the road ahead isn't ready for you yet."];
    }
    return timesTalked === 0
      ? ['Hey!', "You can't go out there yet.", 'You should meet the Professor first.']
      : ["Sorry, you can't go this way yet.", 'Go meet the Professor first.'];
  },

  // --- Professor Max's lab ----------------------------------------------------
  professor: ({ state }) =>
    state.story.journeyStarted
      ? [
          `Your journey has begun, ${X}!`,
          'Visit the market in the next town.',
          'Tell my friend there that I sent you.',
        ]
      : [`Go on, ${X}. Take a look at the Poké Balls on the table.`],
  labComputer: ['The screen shows research notes on the three Pokémon.', '"Grass, Fire and Water... each strong against the next."'],
  labMachine: ['A machine humming with blinking lights.', 'The gauge reads "STABLE".'],
  labTank: ['A tank of bubbling water with a sprouting plant inside.', 'A label reads: "Growth sample #12".'],
  labDesk: [`${PROFESSOR_NAME}'s desk is buried under papers.`, 'One page is titled "Partners and their Trainers."'],
  labBench: ['Glassware filled with brightly coloured liquids.', 'Better not touch anything...'],

  // --- Signs and objects ----------------------------------------------------
  townSign: ['WILLOWBROOK', 'A quiet little town where every journey begins.'],
  labSign: [`${PROFESSOR_NAME.toUpperCase()}'S LABORATORY`, 'Pokémon research in progress. Visitors welcome.'],
  routeSign: ['ROUTE 1  ↓', 'Tall grass ahead. Wild creatures may appear!'],
  playerHouseSign: ["It's your house!"],
  rivalBoyHouseSign: ['THE HOLLIS FAMILY', 'Two pairs of muddy boots sit by the door.'],
  rivalGirlHouseSign: ['THE WREN FAMILY', 'The flower boxes are trimmed to perfection.'],
  charizard: ['Charizard is snoozing in the warm sun.', 'Its tail flame flickers gently with every breath...'],
  pc: ['You booted up the PC.', 'No creatures stored yet... One day this will fill up!'],
  tvConsole: ['A game console is hooked up to the TV.', "There's no time for games today!"],
  rivalNotes: ['A notebook full of creature sketches.', 'Every page says "MY FIRST PARTNER!!" in big letters.'],
  elderHouseSign: ['A cosy old cottage. It smells faintly of smoke and tea.'],
  pool: ['The water is clear and calm.', 'Something small just rippled under the surface...'],
  mailbox: ['Nothing in the mailbox today.'],

  tv: ["There's a show about creature trainers on TV.", "They all look like they're having so much fun!"],
  bookshelf: ['Books about creatures and their habitats.', 'There\'s a well-worn one titled "Your First Partner."'],
  bed: ['Your bed. It still looks comfy...', "...but today isn't a day for sleeping in!"],
  otherBed: ["Someone's neatly made bed."],
  kitchen: ['Something delicious is simmering on the stove.'],
  toybox: ['A box crammed with toy creatures.', 'Most of them are blue.'],
  cushion: ['A huge, scorched cushion.', 'Something very large and very warm must sleep here.'],
  fireplace: ['The fire crackles warmly.'],
  window: ['Sunlight streams in through the window.'],
} satisfies Record<string, DialogueScript>;

/** Lines when the player talks to their own following Pokémon. */
export function followerLines(id: StarterId): string[] {
  const name = starterName(id);
  return [`${name} looks up at you happily.`, `It seems excited to see what's out there!`];
}

/** Lines for Z's starter in Z's room. */
export function zCreatureLines(id: StarterId): string[] {
  return [`${starterName(id)} is curiously sniffing around ${Z}'s room.`];
}
