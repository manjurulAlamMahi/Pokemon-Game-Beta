// Story modules attach to the world scene for specific maps / story states.
// Keeping them here means scenes stay generic and story beats stay readable.

import type { WorldScene } from '../scenes/WorldScene';
import { GameState } from '../state/GameState';
import { LabStory } from './LabStory';

export function attachStory(scene: WorldScene): void {
  const story = GameState.get().story;
  if (scene.map.id === 'lab' && !story.journeyStarted) new LabStory(scene).start();
}
