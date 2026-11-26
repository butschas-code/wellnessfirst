/**
 * Wellness Waves — one tab plays at a time.
 *
 * When this tab starts playing it tells the others (BroadcastChannel); any other
 * tab that is playing pauses itself and shows a short note. Returns true while
 * another tab has taken over and this one is not playing.
 */

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../sessions/playerContext';

const CHANNEL = 'wellness-waves';
type Msg = { type: 'playing'; tab: string };

const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());

export function useSingleTab(): boolean {
  const { status, togglePlayPause } = usePlayer();
  const [otherTab, setOtherTab] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const toggleRef = useRef(togglePlayPause);
  toggleRef.current = togglePlayPause;

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data?.type !== 'playing' || e.data.tab === TAB_ID) return;
      setOtherTab(true);
      if (statusRef.current === 'playing') void toggleRef.current();
    };
    return () => {
      ch.close();
      channel.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    setOtherTab(false);
    channel.current?.postMessage({ type: 'playing', tab: TAB_ID } satisfies Msg);
  }, [status]);

  return otherTab && status !== 'playing';
}
