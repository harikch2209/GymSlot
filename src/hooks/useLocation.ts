import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Coords, DEFAULT_CENTER } from '@/utils/geo';

type Status = 'idle' | 'requesting' | 'granted' | 'denied';

interface LocationState {
  coords: Coords | null;
  /** coords if granted, else the city-centre fallback — always safe to use. */
  effective: Coords;
  status: Status;
  request: () => Promise<void>;
}

/**
 * Foreground location with graceful fallback. Asks once on mount; if denied we
 * fall back to the city centre so distances/map still work (just less precise).
 */
export function useLocation(): LocationState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const request = useCallback(async () => {
    setStatus('requesting');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setStatus('granted');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { coords, effective: coords ?? DEFAULT_CENTER, status, request };
}
