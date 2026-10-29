import { useCallback, useState } from 'react';
import { CharacterSelect } from './components/Menus/CharacterSelect';
import { TitleScreen } from './components/Menus/TitleScreen';
import { GameView } from './components/UI/GameView';
import { GameState } from './game/state/GameState';
import type { Gender } from './types';

type Screen = 'title' | 'select' | 'game';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');

  const start = useCallback(() => setScreen('select'), []);
  const choose = useCallback((gender: Gender) => {
    GameState.start(gender);
    setScreen('game');
  }, []);

  return (
    <div className={`screen-fade screen-${screen}`} key={screen}>
      {screen === 'title' && <TitleScreen onStart={start} />}
      {screen === 'select' && <CharacterSelect onSelect={choose} />}
      {screen === 'game' && <GameView />}
    </div>
  );
}
