// Small on-screen controls reminder that fades after a while.

import { useEffect, useState } from 'react';

export function ControlsHint() {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFaded(true), 9000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={`controls-hint ${faded ? 'is-faded' : ''}`}>
      <span><kbd>WASD</kbd>/<kbd>↑↓←→</kbd> Move</span>
      <span><kbd>E</kbd>/<kbd>Space</kbd>/<kbd>Enter</kbd> Talk</span>
      <span><kbd>Shift</kbd> Run</span>
    </div>
  );
}
