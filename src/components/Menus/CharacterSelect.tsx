import { useEffect, useState } from 'react';
import { Sfx } from '../../game/systems/Sfx';
import type { Gender } from '../../types';
import { PixelSprite } from '../UI/PixelSprite';
import { TitleBackdrop } from './TitleBackdrop';

interface Props {
  onSelect: (gender: Gender) => void;
}

const OPTIONS: { gender: Gender; label: string; look: string }[] = [
  { gender: 'boy', label: 'BOY', look: 'player_boy' },
  { gender: 'girl', label: 'GIRL', look: 'player_girl' },
];

// Walk cycle frames for the "down" direction: walkA, idle, walkB, idle.
const WALK = [1, 0, 2, 0];

export function CharacterSelect({ onSelect }: Props) {
  const [focused, setFocused] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 160);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        e.preventDefault();
        setFocused((f) => (f + 1) % 2);
        Sfx.hover();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        Sfx.select();
        onSelect(OPTIONS[focused].gender);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, onSelect]);

  return (
    <div className="menu-screen">
      <TitleBackdrop />
      <div className="menu-content">
        <h2 className="menu-heading">Choose your character</h2>
        <div className="character-options">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.gender}
              className={`character-card ${focused === i ? 'is-focused' : ''}`}
              onMouseEnter={() => {
                if (focused !== i) Sfx.hover();
                setFocused(i);
              }}
              onClick={() => {
                Sfx.select();
                onSelect(opt.gender);
              }}
            >
              <div className="character-card__stage">
                <PixelSprite look={opt.look} frame={focused === i ? WALK[tick % 4] : tick % 12 < 6 ? 0 : 3} />
              </div>
              <span className="character-card__label">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="menu-footer">← → to choose · Enter to confirm</p>
      </div>
    </div>
  );
}
