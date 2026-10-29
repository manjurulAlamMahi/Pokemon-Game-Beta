// Shows the current story objective when it changes.

import { useEffect, useState } from 'react';
import { eventBus } from '../../game/utils/EventBus';

export function ObjectiveToast() {
  const [objective, setObjective] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const off = eventBus.on('objective:set', ({ objective: o }) => {
      if (!o) return;
      setObjective(o);
      setKey((k) => k + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setObjective(null), 4200);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!objective) return null;
  return (
    <div className="objective-toast" key={key}>
      <span className="objective-toast__label">NEW OBJECTIVE</span>
      <span className="objective-toast__text">{objective}</span>
    </div>
  );
}
