// Hosts the Phaser canvas and the React HUD layered on top of it.

import { useEffect, useRef } from 'react';
import { createGame } from '../../game/createGame';
import { DialogueBox } from '../Dialogue/DialogueBox';
import { StarterPanel } from '../Menus/StarterPanel';
import { StarterReveal } from '../Menus/StarterReveal';
import { ControlsHint } from './ControlsHint';
import { LocationBanner } from './LocationBanner';
import { ObjectiveToast } from './ObjectiveToast';

export function GameView() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const game = createGame(hostRef.current);
    return () => game.destroy(true);
  }, []);

  return (
    <div className="game-view">
      <div className="game-host" ref={hostRef} />
      <LocationBanner />
      <ObjectiveToast />
      <ControlsHint />
      <DialogueBox />
      <StarterPanel />
      <StarterReveal />
    </div>
  );
}
