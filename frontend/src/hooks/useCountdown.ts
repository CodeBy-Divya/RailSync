import { useState, useEffect, useMemo } from 'react';

export interface CountdownInfo {
  mode: 'COMPLETED' | 'ACTIVE' | 'OVERDUE' | 'NOT_STARTED';
  timeRemainingText: string;
  cardCountdownText: string;
  detailedRemainingText: string;
  startTimeText: string;
  endTimeText: string;
  targetWindowText: string;
  plannedDurationText: string;
  actualElapsedText: string;
  elapsedHHMMSS: string;
  completionTimeText: string;
  progressPercent: number;
}

function formatHHMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDurationHuman(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

// Session reference start timestamp to anchor relative mock countdowns consistently
const SESSION_INIT_MS = Date.now();

export function useCountdown(
  status: string,
  requestedStart: string,
  requestedEnd: string,
  completedAt?: string,
  eventId?: string
): CountdownInfo {
  const isCompleted =
    status === 'Completed' ||
    status === 'BLOCK_CLEARED' ||
    status === 'AUDIT_LOCKED' ||
    status === 'SAFETY_VERIFIED';

  const isSuspended =
    status?.includes('SUSPENDED') ||
    status === 'SUSPENDED - EMERGENCY STOP';

  const isNotStarted = status === 'Not Started' || status === 'DRAFT' || status === 'SUBMITTED';

  // Base dates from event data
  const rawStartDate = new Date(requestedStart);
  const rawEndDate = new Date(requestedEnd);

  const startTimeText = !isNaN(rawStartDate.getTime())
    ? rawStartDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '11:00';

  const endTimeText = !isNaN(rawEndDate.getTime())
    ? rawEndDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '15:00';

  // Target window: 15m before and 15m after planned end
  const targetWindowText = useMemo(() => {
    if (!isNaN(rawEndDate.getTime())) {
      const winStart = new Date(rawEndDate.getTime() - 15 * 60 * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const winEnd = new Date(rawEndDate.getTime() + 15 * 60 * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `Target window: ${winStart} - ${winEnd}`;
    }
    return 'Target window: 14:45 - 15:15';
  }, [requestedEnd]);

  // Determine effective end and start ms
  const { startMs, endMs, plannedDurationMs } = useMemo(() => {
    const rawStartMs = rawStartDate.getTime();
    const rawEndMs = rawEndDate.getTime();
    const planned = Math.max(0, rawEndMs - rawStartMs) || 4 * 3600 * 1000;

    // If dates are from an older static mock dataset (more than 18 hours in the past)
    const isMockPast = rawEndMs < SESSION_INIT_MS - 18 * 3600 * 1000;

    if (isMockPast) {
      // Provide realistic active countdown anchors for demo
      let offsetMs = 45 * 60 * 1000; // default 45m left
      if (eventId === 'EVT-ENG-2026-00109') {
        offsetMs = 45 * 60 * 1000 + 12 * 1000; // 00:45:12 remaining
      } else if (eventId === 'EVT-OHE-2026-00104') {
        offsetMs = 1 * 3600 * 1000 + 23 * 60 * 1000 + 45 * 1000; // 01:23:45 remaining
      } else if (eventId === 'EVT-SIG-2026-00114') {
        offsetMs = 2 * 3600 * 1000 + 10 * 60 * 1000; // 02:10:00 remaining
      } else if (eventId === 'EVT-PWY-2026-00116') {
        offsetMs = -1 * (14 * 60 * 1000 + 20 * 1000); // Overdue (+00:14:20)
      }

      const syntheticEndMs = SESSION_INIT_MS + offsetMs;
      const syntheticStartMs = syntheticEndMs - planned;
      return { startMs: syntheticStartMs, endMs: syntheticEndMs, plannedDurationMs: planned };
    }

    return { startMs: rawStartMs, endMs: rawEndMs, plannedDurationMs: planned };
  }, [requestedStart, requestedEnd, eventId]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isCompleted || isNotStarted || isSuspended) return;

    const intervalId = window.setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCompleted, isNotStarted, isSuspended]);

  const plannedDurationText = formatDurationHuman(plannedDurationMs);

  // If Suspended (Emergency Stop)
  if (isSuspended) {
    return {
      mode: 'NOT_STARTED',
      timeRemainingText: 'Paused (Suspended)',
      cardCountdownText: 'Paused (Suspended)',
      detailedRemainingText: 'Paused (Suspended) • Work halted by Emergency Stop',
      startTimeText,
      endTimeText,
      targetWindowText,
      plannedDurationText,
      actualElapsedText: 'Paused',
      elapsedHHMMSS: '00:00:00',
      completionTimeText: '',
      progressPercent: 50,
    };
  }

  // If Completed
  if (isCompleted) {
    const finishDate = completedAt ? new Date(completedAt) : new Date();
    const compTimeText = !isNaN(finishDate.getTime())
      ? finishDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
      : endTimeText;
    const elapsedMs = Math.max(0, finishDate.getTime() - startMs) || plannedDurationMs;
    const actualElapsedText = formatDurationHuman(elapsedMs);
    const elapsedHHMMSS = formatHHMMSS(elapsedMs);

    return {
      mode: 'COMPLETED',
      timeRemainingText: `Completed at ${compTimeText} (Total: ${actualElapsedText})`,
      cardCountdownText: `Completed at ${compTimeText}`,
      detailedRemainingText: `Completed at ${compTimeText} • Total Duration: ${actualElapsedText}`,
      startTimeText,
      endTimeText,
      targetWindowText,
      plannedDurationText,
      actualElapsedText,
      elapsedHHMMSS,
      completionTimeText: compTimeText,
      progressPercent: 100,
    };
  }

  // If Not Started
  if (isNotStarted) {
    return {
      mode: 'NOT_STARTED',
      timeRemainingText: `Not Started (Starts at ${startTimeText})`,
      cardCountdownText: `Starts at ${startTimeText}`,
      detailedRemainingText: `Not Started • Planned Start: ${startTimeText}`,
      startTimeText,
      endTimeText,
      targetWindowText,
      plannedDurationText,
      actualElapsedText: '0m',
      elapsedHHMMSS: '00:00:00',
      completionTimeText: '',
      progressPercent: 0,
    };
  }

  // Active / Overdue
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startMs);
  const elapsedHHMMSS = formatHHMMSS(elapsedMs);
  const actualElapsedText = formatDurationHuman(elapsedMs);

  if (now >= endMs) {
    const overdueMs = now - endMs;
    const overdueHHMMSS = formatHHMMSS(overdueMs);
    const overdueText = `Overdue (+${overdueHHMMSS})`;

    return {
      mode: 'OVERDUE',
      timeRemainingText: overdueText,
      cardCountdownText: overdueText,
      detailedRemainingText: `${overdueText} • ${elapsedHHMMSS} elapsed`,
      startTimeText,
      endTimeText,
      targetWindowText,
      plannedDurationText,
      actualElapsedText,
      elapsedHHMMSS,
      completionTimeText: '',
      progressPercent: 100,
    };
  }

  const remainingMs = endMs - now;
  const remainingHHMMSS = formatHHMMSS(remainingMs);
  const activeRemainingText = `${remainingHHMMSS} remaining`;

  const progressPercent = plannedDurationMs > 0
    ? Math.min(100, Math.round((elapsedMs / plannedDurationMs) * 100))
    : 50;

  return {
    mode: 'ACTIVE',
    timeRemainingText: activeRemainingText,
    cardCountdownText: activeRemainingText,
    detailedRemainingText: `${activeRemainingText} • ${elapsedHHMMSS} elapsed`,
    startTimeText,
    endTimeText,
    targetWindowText,
    plannedDurationText,
    actualElapsedText,
    elapsedHHMMSS,
    completionTimeText: '',
    progressPercent,
  };
}
