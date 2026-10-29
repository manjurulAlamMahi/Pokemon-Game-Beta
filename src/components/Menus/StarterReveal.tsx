// The "you received a Pokémon" presentation: light rays, the capsule drops
// and bursts open, the creature materialises with sparkles, then its name.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { STARTERS } from '../../game/data/starters';
import { Sfx } from '../../game/systems/Sfx';
import { UI } from '../../game/ui/UiController';
import { PixelCanvasView } from '../UI/PixelSprite';
import { getBall } from '../UI/sheets';
import { CreaturePortrait } from './StarterPanel';

// Timeline (ms): drop -> open -> creature -> name banner -> ready.
const T_OPEN = 1150;
const T_CREATURE = 1320;
const T_BANNER = 1950;
const T_READY = 2600;

type Stage = 'drop' | 'open' | 'creature' | 'banner' | 'ready' | 'leaving';

export function StarterReveal() {
  const ui = useSyncExternalStore(UI.store.subscribe, UI.store.get);
  const reveal = ui.reveal;
  const [stage, setStage] = useState<Stage>('drop');

  // Sparkle particles with randomised directions (stable per reveal).
  const sparkles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const d = 120 + Math.random() * 140;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8, delay: Math.random() * 120, size: 6 + Math.random() * 10 };
      }),
    [reveal?.starter],
  );

  useEffect(() => {
    if (!reveal) return;
    setStage('drop');
    const s = STARTERS[reveal.starter];
    const timers = [
      setTimeout(() => Sfx.ballThrow(), 80),
      setTimeout(() => {
        setStage('open');
        Sfx.ballOpen();
        Sfx.sparkle();
      }, T_OPEN),
      setTimeout(() => {
        setStage('creature');
        Sfx.cry(s.cry);
      }, T_CREATURE),
      setTimeout(() => {
        setStage('banner');
        Sfx.fanfare();
      }, T_BANNER),
      setTimeout(() => setStage('ready'), T_READY),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reveal]);

  useEffect(() => {
    if (stage !== 'ready') return;
    const finish = () => {
      setStage('leaving');
      Sfx.advance();
      setTimeout(() => UI.closeReveal(), 280);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['enter', 'e', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', finish);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', finish);
    };
  }, [stage]);

  if (!reveal) return null;
  const s = STARTERS[reveal.starter];
  const style = { '--type': s.colors.primary, '--type-light': s.colors.light, '--type-dark': s.colors.dark } as React.CSSProperties;
  const opened = stage !== 'drop';
  const showCreature = stage === 'creature' || stage === 'banner' || stage === 'ready' || stage === 'leaving';
  const showBanner = stage === 'banner' || stage === 'ready' || stage === 'leaving';

  return (
    <div className={`reveal stage-${stage}`} style={style} aria-live="polite">
      <div className="reveal__rays" />
      <div className="reveal__vignette" />
      {opened && <div className="reveal__flash" />}

      <div className="reveal__center">
        <div className="reveal__floor" />
        {!showCreature || stage === 'creature' ? (
          <div className={`reveal__ball ${opened ? 'is-open' : ''}`}>
            <PixelCanvasView source={getBall(opened ? 'open' : 'closed')} scale={7} />
          </div>
        ) : null}
        {opened && (
          <div className="reveal__sparkles">
            {sparkles.map((p, i) => (
              <span
                key={i}
                style={
                  {
                    '--dx': `${p.dx}px`,
                    '--dy': `${p.dy}px`,
                    '--size': `${p.size}px`,
                    animationDelay: `${p.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
        {showCreature && (
          <div className="reveal__creature">
            <CreaturePortrait id={s.id} scale={5} />
          </div>
        )}
      </div>

      {showBanner && (
        <div className="reveal__banner">
          <div className="reveal__name">{s.name}</div>
          <div className="reveal__sub">
            <span className="type-badge">{s.type.toUpperCase()}</span>
            {reveal.trainer} received {s.name}!
          </div>
        </div>
      )}
      {stage === 'ready' && <div className="reveal__prompt">▼ Press ENTER</div>}
    </div>
  );
}
