// Bottom-of-screen dialogue window. Pure view: state comes from the
// DialogueController, input is handled by the game scene.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { DialogueController } from '../../game/dialogue/DialogueController';
import { PixelSprite } from '../UI/PixelSprite';
import { getSheet } from '../UI/sheets';

/** Animated head-and-shoulders portrait for characters, full body for creatures. */
function Portrait({ sprite }: { sprite: string }) {
  const [breathe, setBreathe] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setBreathe((b) => !b), 650);
    return () => clearInterval(id);
  }, []);
  const sheet = getSheet(sprite);
  if (!sheet) return null;
  const creature = sheet.frameW !== 16;
  return (
    <div className={`dialogue__portrait ${creature ? 'is-creature' : ''}`}>
      {creature ? (
        <PixelSprite look={sprite} frame={breathe ? 3 : 0} scale={3.5} />
      ) : (
        <PixelSprite look={sprite} frame={breathe ? 3 : 0} scale={5} crop={{ x: 2, y: 1, w: 12, h: 16 }} />
      )}
    </div>
  );
}

export function DialogueBox() {
  const view = useSyncExternalStore(DialogueController.store.subscribe, DialogueController.store.get);
  // Keep the last content around briefly so the box can animate out.
  const [visible, setVisible] = useState(false);
  const [last, setLast] = useState(view);

  useEffect(() => {
    if (view.open) {
      setLast(view);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [view]);

  const shown = view.open ? view : last;
  if (!shown.text) return null;

  return (
    <div className={`dialogue ${visible ? 'dialogue--open' : 'dialogue--closed'}`} role="dialog" aria-live="polite">
      {shown.speaker && <div className="dialogue__name">{shown.speaker}</div>}
      <div className={`dialogue__panel ${shown.portrait ? 'has-portrait' : ''}`}>
        {shown.portrait && <Portrait sprite={shown.portrait} />}
        <p className="dialogue__text" key={shown.lineKey}>
          <span>{shown.text.slice(0, shown.shown)}</span>
          <span className="dialogue__hidden">{shown.text.slice(shown.shown)}</span>
        </p>
        {shown.lineDone && <span className={`dialogue__next ${shown.isLast ? 'is-last' : ''}`}>{shown.isLast ? '■' : '▼'}</span>}
      </div>
    </div>
  );
}
