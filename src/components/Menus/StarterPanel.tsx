// Starter preview: big animated creature, name, type and description, with
// keyboard browsing between the three capsules and a clear CHOOSE action.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { STARTER_ORDER, STARTERS } from '../../game/data/starters';
import { Sfx } from '../../game/systems/Sfx';
import { UI } from '../../game/ui/UiController';
import type { StarterId } from '../../types';
import { PixelCanvasView } from '../UI/PixelSprite';
import { getBall, getPortraitFrames } from '../UI/sheets';

/** Idle loop over the portrait frames: idle, breathe, idle, blink, flicker... */
const IDLE_SEQUENCE = [0, 1, 0, 3, 0, 1, 2, 0];

export function useIdleFrame(intervalMs = 260): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % IDLE_SEQUENCE.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return IDLE_SEQUENCE[i];
}

export function CreaturePortrait({ id, scale, className }: { id: StarterId; scale: number; className?: string }) {
  const frame = useIdleFrame();
  return <PixelCanvasView source={getPortraitFrames(id)[frame]} scale={scale} className={className} />;
}

function strongAgainst(id: StarterId): StarterId {
  return STARTER_ORDER.find((s) => STARTERS[s].weakTo === id)!;
}

export function StarterPanel() {
  const ui = useSyncExternalStore(UI.store.subscribe, UI.store.get);
  const panel = ui.starterPanel;

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = STARTER_ORDER.indexOf(panel.focus);
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        UI.setPanelFocus(STARTER_ORDER[(idx + 2) % 3]);
        Sfx.hover();
      } else if (k === 'arrowright' || k === 'd') {
        UI.setPanelFocus(STARTER_ORDER[(idx + 1) % 3]);
        Sfx.hover();
      } else if (k === 'enter' || k === 'e' || k === ' ') {
        Sfx.select();
        UI.closeStarterPanel(panel.focus);
      } else if (k === 'escape' || k === 'backspace' || k === 'q') {
        Sfx.advance();
        UI.closeStarterPanel(null);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  if (!panel) return null;
  const s = STARTERS[panel.focus];
  const style = { '--type': s.colors.primary, '--type-light': s.colors.light, '--type-dark': s.colors.dark } as React.CSSProperties;

  return (
    <div className="starter-panel" style={style} role="dialog" aria-label="Choose your starter">
      <div className="starter-panel__card" key={s.id}>
        <div className="starter-panel__tabs">
          {STARTER_ORDER.map((id) => (
            <button
              key={id}
              className={`starter-tab ${id === panel.focus ? 'is-active' : ''}`}
              style={{ '--tab': STARTERS[id].colors.primary } as React.CSSProperties}
              onClick={() => UI.setPanelFocus(id)}
            >
              <PixelCanvasView source={getBall('closed')} scale={2} />
              <span>{STARTERS[id].name}</span>
            </button>
          ))}
        </div>

        <div className="starter-panel__body">
          <div className="starter-stage">
            <div className="starter-stage__glow" />
            <div className="starter-stage__pedestal" />
            <CreaturePortrait id={s.id} scale={3} className="starter-stage__creature" />
          </div>
          <div className="starter-info">
            <h2 className="starter-info__name">{s.name}</h2>
            <div className="starter-info__meta">
              <span className="type-badge">{s.type.toUpperCase()}</span>
              <span className="starter-info__species">{s.species}</span>
            </div>
            <p className="starter-info__desc">{s.description}</p>
            <div className="starter-info__matchups">
              <span>Strong vs <b>{STARTERS[strongAgainst(s.id)].type}</b></span>
              <span>Weak vs <b>{STARTERS[s.weakTo].type}</b></span>
            </div>
            <div className="starter-info__actions">
              <button
                className="pixel-button pixel-button--primary starter-choose"
                onMouseEnter={Sfx.hover}
                onClick={() => {
                  Sfx.select();
                  UI.closeStarterPanel(s.id);
                }}
              >
                CHOOSE {s.name}
              </button>
              <button className="pixel-button starter-back" onClick={() => UI.closeStarterPanel(null)}>
                BACK
              </button>
            </div>
          </div>
        </div>
        <p className="starter-panel__hint">◀ ▶ Browse · ENTER Choose · ESC Back</p>
      </div>
    </div>
  );
}
