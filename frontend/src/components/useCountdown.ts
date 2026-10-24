/**
 * useCountdown.ts
 * ───────────────
 * Custom hook: returns formatted time remaining for a target ISO timestamp.
 * If completed (target passed), returns null.
 * Otherwise returns { hh, mm, ss, isOverdue, overdueDuration, formatted }.
 * Updates every second. Cleans up on unmount.
 */

import { useState, useEffect } from 'react';

export interface CountdownResult {
  hh: string;
  mm: string;
  ss: string;
  isOverdue: boolean;
  overdueDuration: string;
  formatted: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useCountdown(targetIso: string): CountdownResult | null {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    // Target has passed – completed
    return null;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hh = pad(Math.floor(totalSeconds / 3600));
  const mm = pad(Math.floor((totalSeconds % 3600) / 60));
  const ss = pad(totalSeconds % 60);
  const formatted = `${hh}:${mm}:${ss}`;

  return {
    hh,
    mm,
    ss,
    isOverdue: false,
    overdueDuration: '',
    formatted,
  };
}

/**
 * useOverdueCountdown: variant that shows overdue duration if past target.
 * Returns an object with isOverdue flag regardless of completion state.
 */
export function useOverdueCountdown(targetIso: string): {
  remaining: CountdownResult | null;
  isOverdue: boolean;
  overdueDuration: string;
  elapsed: string;
} {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    const overdueSecs = Math.floor(Math.abs(diffMs) / 1000);
    return {
      remaining: null,
      isOverdue: true,
      overdueDuration: formatDuration(overdueSecs),
      elapsed: formatDuration(overdueSecs),
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hh = pad(Math.floor(totalSeconds / 3600));
  const mm = pad(Math.floor((totalSeconds % 3600) / 60));
  const ss = pad(totalSeconds % 60);
  const formatted = `${hh}:${mm}:${ss}`;

  return {
    remaining: { hh, mm, ss, isOverdue: false, overdueDuration: '', formatted },
    isOverdue: false,
    overdueDuration: '',
    elapsed: formatDuration(Math.floor((now.getTime() - target.getTime()) / 1000)),
  };
}

export default useCountdown;
