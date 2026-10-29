import { useEffect } from 'react';
import { Sfx } from '../../game/systems/Sfx';
import { TitleBackdrop } from './TitleBackdrop';

interface Props {
  onStart: () => void;
}

export function TitleScreen({ onStart }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        Sfx.select();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="menu-screen">
      <TitleBackdrop />
      <div className="menu-content">
        <h1 className="game-title">
          <span className="game-title__main">WILDBOUND</span>
          <span className="game-title__sub">A creature-collecting adventure</span>
        </h1>
        <button
          className="pixel-button pixel-button--primary"
          onMouseEnter={Sfx.hover}
          onClick={() => {
            Sfx.select();
            onStart();
          }}
        >
          START GAME
        </button>
        <p className="menu-footer">Prototype demo · press Enter</p>
      </div>
    </div>
  );
}
