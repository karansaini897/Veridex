import { AuditEvent } from '../types/portal';
import { createRecordId, formatTimestampForDisplay, getCurrentIsoTimestamp } from './domain';
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuditLogPayload {
  actorName: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  targetType: AuditEvent['targetType'];
  targetId: string;
  details: string;
  institutionId?: string;
}

/**
 * Dispatches an audit log to the secure server endpoint (/api/audit/log).
 * Passes the verified Supabase Auth JWT token so the server can derive identity securely.
 */
export async function recordAuditEvent(
  payload: AuditLogPayload
): Promise<AuditEvent> {
  const fallbackEvent: AuditEvent = {
    id: createRecordId('AUD'),
    timestamp: formatTimestampForDisplay(getCurrentIsoTimestamp()),
    actorName: payload.actorName,
    actorUsername: payload.actorUsername,
    actorRole: payload.actorRole as AuditEvent['actorRole'],
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    details: payload.details,
  };

  try {
    let token: string | undefined;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    }

    if (!token) {
      // In unauthenticated or offline demo mode, server requires authentication to stamp authoritative logs.
      // Retain local client ledger safely without pretending server persisted it.
      return fallbackEvent;
    }

    const res = await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.event) {
        return {
          id: data.event.id,
          timestamp: formatTimestampForDisplay(data.event.timestamp),
          actorName: data.event.actorName,
          actorUsername: data.event.actorUsername,
          actorRole: data.event.actorRole as AuditEvent['actorRole'],
          action: data.event.action,
          targetType: data.event.targetType as AuditEvent['targetType'],
          targetId: data.event.targetId,
          details: data.event.details,
        };
      }
    } else {
      const errJson = await res.json().catch(() => null);
      console.warn('[VERIDEX Audit] Server rejected audit log dispatch:', res.status, errJson?.error);
    }
  } catch (err) {
    console.warn('[VERIDEX Audit] Server audit dispatch network error:', err);
  }

  return fallbackEvent;
}

/**
 * Fetches verified server audit events matching the authenticated user's institution/role scope.
 */
export async function fetchServerAuditEvents(): Promise<AuditEvent[]> {
  try {
    let token: string | undefined;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    }

    if (!token) {
      return [];
    }

    const res = await fetch('/api/audit/events', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        return data.events.map((e: any) => ({
          id: e.id,
          timestamp: formatTimestampForDisplay(e.timestamp),
          actorName: e.actorName,
          actorUsername: e.actorUsername,
          actorRole: e.actorRole as AuditEvent['actorRole'],
          action: e.action,
          targetType: e.targetType as AuditEvent['targetType'],
          targetId: e.targetId,
          details: e.details,
        }));
      }
    }
  } catch (err) {
    console.warn('[VERIDEX Audit] Could not fetch server audit events:', err);
  }
  return [];
}
