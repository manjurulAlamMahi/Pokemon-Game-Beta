// Slides in the location name whenever the player enters a map.

import { useEffect, useState } from 'react';
import { eventBus } from '../../game/utils/EventBus';

export function LocationBanner() {
  const [name, setName] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const off = eventBus.on('map:entered', ({ displayName }) => {
      setName(displayName);
      setKey((k) => k + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setName(null), 2600);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!name) return null;
  return (
    <div className="location-banner" key={key}>
      {name}
    </div>
  );
}
