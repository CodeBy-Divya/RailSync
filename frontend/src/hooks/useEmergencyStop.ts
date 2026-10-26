import { useState, useEffect, useCallback, useMemo } from 'react';
import { OperationalEvent, AuditBlock } from '../types';
import { getEventCategory } from '../components/MiddleColumn';
import { INITIAL_OPERATIONAL_EVENTS } from '../data/corridorData';
import { syncClient } from '../syncClient';

export const USER_EVENTS_STORAGE_KEY = 'railsync_created_events_v2';
export const EMERGENCY_STOP_STORAGE_KEY = 'railsync_emergency_stop_state_v1';
export const AUDIT_BLOCKS_STORAGE_KEY = 'railsync_audit_blocks_v2';

export interface EmergencyStopState {
  isActive: boolean;
  suspendedCount: number;
  suspendedEventIds: string[];
  suspendedAt: string;
  suspendedBy: string;
  reason: string;
}

export const AUTHORIZED_ROLES = [
  'Station Master Desk',
  'Station Master',
  'Station Master / Junction In-Charge',
  'Section Controller',
  'Admin',
];

export function isUserAuthorized(role?: string | null): boolean {
  if (!role) return false;
  const roleClean = role.toLowerCase();
  return (
    roleClean.includes('station master') ||
    roleClean.includes('controller') ||
    roleClean.includes('admin') ||
    roleClean.includes('junction in-charge')
  );
}

export function saveAuditBlock(block: AuditBlock) {
  try {
    const existingStr = localStorage.getItem(AUDIT_BLOCKS_STORAGE_KEY);
    const existing: AuditBlock[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [block, ...existing.filter(b => b.block_number !== block.block_number)];
    localStorage.setItem(AUDIT_BLOCKS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save audit block', err);
  }
}

export function useEmergencyStop(
  events: OperationalEvent[],
  setEvents: React.Dispatch<React.SetStateAction<OperationalEvent[]>>,
  currentUser: { username: string; name: string; role: string; station: string } | null,
  onAddAmbientNotification: (msg: string) => void,
  onWorkResumed?: (resumedCount: number, remainingCount: number, resumedIds: string[]) => void
) {
  // Count how many events are currently suspended
  const suspendedEvents = useMemo(() => {
    return events.filter(e => Boolean(e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP'));
  }, [events]);

  const ongoingCount = useMemo(() => {
    return events.filter(e => getEventCategory(e) === 0).length;
  }, [events]);

  // Emergency state persisted in localStorage
  const [emergencyState, setEmergencyState] = useState<EmergencyStopState>(() => {
    try {
      const saved = localStorage.getItem(EMERGENCY_STOP_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return {
      isActive: false,
      suspendedCount: 0,
      suspendedEventIds: [],
      suspendedAt: '',
      suspendedBy: '',
      reason: '',
    };
  });

  // Sync state if no events are suspended anymore or if count mismatches
  useEffect(() => {
    const actualSuspended = events.filter(e => Boolean(e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP'));
    if (actualSuspended.length === 0) {
      if (emergencyState.isActive || emergencyState.suspendedCount !== 0) {
        setEmergencyState({
          isActive: false,
          suspendedCount: 0,
          suspendedEventIds: [],
          suspendedAt: '',
          suspendedBy: '',
          reason: '',
        });
        try {
          localStorage.removeItem(EMERGENCY_STOP_STORAGE_KEY);
        } catch (_) {}
      }
    } else {
      if (!emergencyState.isActive || emergencyState.suspendedCount !== actualSuspended.length) {
        setEmergencyState(prev => {
          const first = actualSuspended[0];
          const next: EmergencyStopState = {
            isActive: true,
            suspendedCount: actualSuspended.length,
            suspendedEventIds: actualSuspended.map(e => e.id),
            suspendedAt: prev.suspendedAt || first.suspended_at || new Date().toISOString(),
            suspendedBy: prev.suspendedBy || first.suspended_by || 'Station Master Desk',
            reason: prev.reason || first.suspension_reason || 'Emergency Safety Suspension',
          };
          try {
            localStorage.setItem(EMERGENCY_STOP_STORAGE_KEY, JSON.stringify(next));
          } catch (_) {}
          return next;
        });
      }
    }
  }, [events, emergencyState.isActive, emergencyState.suspendedCount]);

  // Activate Emergency Stop
  const activateEmergencyStop = useCallback((reason: string): boolean => {
    // 1. Identify ongoing works
    const ongoing = events.filter(e => getEventCategory(e) === 0);
    if (ongoing.length === 0) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const userDisplay = currentUser?.name
      ? `${currentUser.name} (${currentUser.role})`
      : 'Divya Singh (Station Master Desk)';
    const affectedIds = ongoing.map(e => e.id);

    // 2. Update events: mark ongoing as suspended atomically
    setEvents(prev => {
      const updatedEvents = prev.map(e => {
        if (getEventCategory(e) === 0) {
          return {
            ...e,
            is_suspended: true,
            status: 'SUSPENDED - EMERGENCY STOP' as any,
            suspended_at: nowIso,
            suspended_by: userDisplay,
            suspension_reason: reason.trim(),
            previous_status: e.status,
            previous_fsm_stage: e.fsm_stage,
            status_color: '#DC2626',
          };
        }
        return e;
      });

      // Persist updated events to localStorage
      try {
        localStorage.setItem(USER_EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
      } catch (err) {
        console.error('Failed to save events to localStorage', err);
      }

      return updatedEvents;
    });

    // 3. Update and persist emergency state
    const newEmergencyState: EmergencyStopState = {
      isActive: true,
      suspendedCount: ongoing.length,
      suspendedEventIds: affectedIds,
      suspendedAt: nowIso,
      suspendedBy: userDisplay,
      reason: reason.trim(),
    };
    setEmergencyState(newEmergencyState);
    try {
      localStorage.setItem(EMERGENCY_STOP_STORAGE_KEY, JSON.stringify(newEmergencyState));
    } catch (_) {}

    // Multi-origin broadcast to Field App via shared serverless API
    syncClient.activateEmergencyStop(reason.trim(), userDisplay).catch(() => {});

    // 4. Append Audit Block to Ledger
    const auditBlockNumber = 2050 + Math.floor(Math.random() * 500);
    const auditBlock: AuditBlock = {
      block_number: auditBlockNumber,
      event_id: 'ALL-ONGOING-WORKS',
      timestamp: nowIso,
      prev_hash: '9f2c81e997ed255198f3ca9b12a4d81e997ed25519b12a4d81e997e1a495991b',
      merkle_root: 'e7c4f19b882da19f20c99a8b19d4ed81e997ed25519tpcngp013e1b71948536',
      block_hash: 'emg_' + Math.random().toString(16).substring(2, 12) + '_' + Date.now().toString(16),
      consensus_proof: 'EMERGENCY_STOP: Statutory Suspension Executive Override',
      worm_status: 'WORM LEGAL HOLD ACTIVE',
      storage_tier: 'AWS S3 Object Lock (Retention: 7 Years)',
      multi_signatures: [
        {
          department: 'OPERATING',
          role: currentUser?.role || 'Station Master Desk',
          officer_id: currentUser?.name || 'Divya Singh',
          signature_hash: 'sig_em_' + Math.random().toString(16).substring(2, 10),
          signed_at: nowIso,
        },
      ],
      leaves: [
        {
          leaf_id: `LEAF-EMERGENCY-STOP-${auditBlockNumber}`,
          title: `Emergency Stop Executed: ${ongoing.length} track work(s) suspended`,
          hash: 'hash_em_' + Math.random().toString(16).substring(2, 10),
          payload_summary: `Action: EMERGENCY_STOP | Reason: ${reason.trim()} | Suspended items: ${affectedIds.join(', ')} | Authorized by: ${userDisplay}`,
        },
      ],
    };
    saveAuditBlock(auditBlock);

    // 5. Ambient Notification (+1)
    onAddAmbientNotification(
      `${timeShort}Z [EMERGENCY-STOP]: EMERGENCY STOP: ${ongoing.length} ongoing track works suspended by ${userDisplay} — Reason: ${reason.trim()}`
    );

    return true;
  }, [events, currentUser, onAddAmbientNotification, setEvents]);

  // Unified Resumption Logic: Re-approves and resumes specified suspended events
  const resumeWorks = useCallback((targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const targetIdSet = new Set(targetIds);

    const nowIso = new Date().toISOString();
    const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const userDisplay = currentUser?.name
      ? `${currentUser.name} (${currentUser.role})`
      : 'Divya Singh (Station Master Desk)';

    let resumedCount = 0;
    let remainingSuspendedCount = 0;
    const actualResumedIds: string[] = [];

    setEvents(prevEvents => {
      const updated = prevEvents.map(e => {
        const matchesTarget = targetIdSet.has(e.id);
        const isEventSuspended = Boolean(e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP');

        if (matchesTarget && isEventSuspended) {
          resumedCount++;
          actualResumedIds.push(e.id);

          const suspendedAtMs = e.suspended_at ? new Date(e.suspended_at).getTime() : Date.now();
          const pausedDurationMs = Math.max(0, Date.now() - suspendedAtMs);
          const endMs = new Date(e.requested_end).getTime();
          const newEndIso = !isNaN(endMs)
            ? new Date(endMs + pausedDurationMs).toISOString()
            : e.requested_end;

          const restoredStatus = (!e.previous_status || e.previous_status === 'SUSPENDED - EMERGENCY STOP')
            ? 'ACTIVE_IN_PROGRESS'
            : e.previous_status;
          const restoredStage = (typeof e.previous_fsm_stage === 'number' && e.previous_fsm_stage > 0)
            ? e.previous_fsm_stage
            : 6;

          const cleanEvent: OperationalEvent = {
            ...e,
            is_suspended: false,
            status: restoredStatus as any,
            fsm_stage: restoredStage,
            requested_end: newEndIso,
            status_color: '#DC2626',
            station_actions: {
              ...e.station_actions,
              power_cut_granted: true,
              traffic_block_granted: true,
              points_clamped_confirmed: true,
            },
          };

          delete (cleanEvent as any).suspended_at;
          delete (cleanEvent as any).suspended_by;
          delete (cleanEvent as any).suspension_reason;
          delete (cleanEvent as any).previous_status;
          delete (cleanEvent as any).previous_fsm_stage;

          return cleanEvent;
        }
        return e;
      });

      const remaining = updated.filter(e => Boolean(e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP'));
      remainingSuspendedCount = remaining.length;

      try {
        localStorage.setItem(USER_EVENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save events to localStorage', err);
      }

      return updated;
    });

    if (resumedCount === 0) return;

    // Immediately update emergency state
    if (remainingSuspendedCount === 0) {
      setEmergencyState({
        isActive: false,
        suspendedCount: 0,
        suspendedEventIds: [],
        suspendedAt: '',
        suspendedBy: '',
        reason: '',
      });
      try {
        localStorage.removeItem(EMERGENCY_STOP_STORAGE_KEY);
      } catch (_) {}
    } else {
      setEmergencyState(prev => {
        const next: EmergencyStopState = {
          ...prev,
          isActive: true,
          suspendedCount: remainingSuspendedCount,
          suspendedEventIds: prev.suspendedEventIds.filter(id => !targetIdSet.has(id)),
        };
        try {
          localStorage.setItem(EMERGENCY_STOP_STORAGE_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }

    // Append Audit Block to Ledger
    const isBulk = actualResumedIds.length > 1;
    const auditBlockNumber = 2100 + Math.floor(Math.random() * 500);
    const auditBlock: AuditBlock = {
      block_number: auditBlockNumber,
      event_id: isBulk ? 'ALL-SUSPENDED-WORKS' : actualResumedIds[0],
      timestamp: nowIso,
      prev_hash: '9f2c81e997ed255198f3ca9b12a4d81e997ed25519b12a4d81e997e1a495991b',
      merkle_root: 'e7c4f19b882da19f20c99a8b19d4ed81e997ed25519tpcngp013e1b71948536',
      block_hash: 'reappr_' + Math.random().toString(16).substring(2, 12) + '_' + Date.now().toString(16),
      consensus_proof: isBulk
        ? 'WORK_REAPPROVED_ALL: Bulk Track Possession Re-instated'
        : 'WORK_REAPPROVED: Statutory Resumption Authorized',
      worm_status: 'WORM LEGAL HOLD ACTIVE',
      storage_tier: 'AWS S3 Object Lock (Retention: 7 Years)',
      multi_signatures: [
        {
          department: 'OPERATING',
          role: currentUser?.role || 'Station Master Desk',
          officer_id: currentUser?.name || 'Divya Singh',
          signature_hash: 'sig_reappr_' + Math.random().toString(16).substring(2, 10),
          signed_at: nowIso,
        },
      ],
      leaves: [
        {
          leaf_id: `LEAF-WORK-REAPPROVED-${auditBlockNumber}`,
          title: isBulk
            ? `All ${resumedCount} Suspended Works Re-approved and Resumed`
            : `Work ${actualResumedIds[0]} Re-approved and Resumed`,
          hash: 'hash_reappr_' + Math.random().toString(16).substring(2, 10),
          payload_summary: isBulk
            ? `Action: WORK_REAPPROVED_ALL | Affected: ${actualResumedIds.join(', ')} | Resumed by: ${userDisplay}`
            : `Action: WORK_REAPPROVED | Target: ${actualResumedIds[0]} | Resumed by: ${userDisplay}`,
        },
      ],
    };
    saveAuditBlock(auditBlock);

    // Ambient Notification (+1)
    onAddAmbientNotification(
      isBulk
        ? `${timeShort}Z [RE-APPROVAL]: All ${resumedCount} suspended track works re-approved and resumed by ${userDisplay}`
        : `${timeShort}Z [RE-APPROVAL]: Work ${actualResumedIds[0]} re-approved and resumed by ${userDisplay}`
    );

    // Notify caller with resumption summary
    if (onWorkResumed) {
      onWorkResumed(resumedCount, remainingSuspendedCount, actualResumedIds);
    }

    // Multi-origin broadcast resumption to Field App via shared serverless API
    syncClient.resumeEmergency().catch(() => {});
  }, [currentUser, onAddAmbientNotification, onWorkResumed, setEvents]);

  // Re-approve single suspended event
  const reapproveEvent = useCallback((eventId: string) => {
    resumeWorks([eventId]);
  }, [resumeWorks]);

  // Re-approve all suspended items
  const reapproveAllSuspended = useCallback(() => {
    const suspendedIds = events
      .filter(e => Boolean(e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP'))
      .map(e => e.id);
    if (suspendedIds.length > 0) {
      resumeWorks(suspendedIds);
    }
  }, [events, resumeWorks]);

  return {
    emergencyState,
    suspendedEvents,
    ongoingCount,
    activateEmergencyStop,
    reapproveEvent,
    reapproveAllSuspended,
  };
}

