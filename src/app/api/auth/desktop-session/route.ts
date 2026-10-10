import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// In-memory fallback cache to ensure instant exchange across local development or serverless instances
type SessionData = {
  status: 'pending' | 'completed' | 'expired';
  customToken?: string;
  uid?: string;
  createdAt: number;
  expiresAt: number;
};

const memorySessions: Map<string, SessionData> =
  (globalThis as any).__desktopAuthSessions ||
  ((globalThis as any).__desktopAuthSessions = new Map<string, SessionData>());

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session');
  if (!sessionId) {
    return jsonResponse({ error: 'Session ID is required' }, 400);
  }

  const now = Date.now();

  // 1. Check in-memory store
  const mem = memorySessions.get(sessionId);
  if (mem) {
    if (now > mem.expiresAt) {
      memorySessions.delete(sessionId);
      return jsonResponse({ status: 'expired' });
    }
    if (mem.status === 'completed' && mem.customToken) {
      return jsonResponse({ status: 'completed', customToken: mem.customToken });
    }
    return jsonResponse({ status: mem.status });
  }

  // 2. Check Firestore
  if (adminFirestore) {
    try {
      const snap = await adminFirestore
        .collection('desktop_auth_sessions')
        .doc(sessionId)
        .get();

      if (!snap.exists) {
        return jsonResponse({ status: 'not_found' }, 404);
      }

      const data = snap.data() as SessionData;
      if (now > data.expiresAt) {
        snap.ref.delete().catch(() => {});
        return jsonResponse({ status: 'expired' });
      }

      if (data.status === 'completed' && data.customToken) {
        return jsonResponse({ status: 'completed', customToken: data.customToken });
      }

      return jsonResponse({ status: data.status || 'pending' });
    } catch (err: any) {
      console.error('Error fetching desktop auth session:', err);
    }
  }

  return jsonResponse({ status: 'not_found' }, 404);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, sessionId, idToken } = body;

    const now = Date.now();
    const ttlMs = 5 * 60 * 1000; // 5 minutes validity

    // Action: Initialize a new desktop auth session
    if (action === 'create' || !action) {
      const newSessionId = crypto.randomUUID();
      const sessionData: SessionData = {
        status: 'pending',
        createdAt: now,
        expiresAt: now + ttlMs,
      };

      memorySessions.set(newSessionId, sessionData);

      if (adminFirestore) {
        try {
          await adminFirestore
            .collection('desktop_auth_sessions')
            .doc(newSessionId)
            .set(sessionData);
        } catch (dbErr) {
          console.warn('Firestore desktop session creation fallback to memory:', dbErr);
        }
      }

      return jsonResponse({ sessionId: newSessionId, expiresAt: sessionData.expiresAt });
    }

    // Action: Complete the session with verified credentials from browser
    if (action === 'complete') {
      if (!sessionId || !idToken) {
        return jsonResponse({ error: 'sessionId and idToken are required' }, 400);
      }

      if (!adminAuth) {
        return jsonResponse({ error: 'Firebase Admin Auth is not configured' }, 500);
      }

      // Check session validity
      let valid = false;
      const mem = memorySessions.get(sessionId);
      if (mem && now <= mem.expiresAt) {
        valid = true;
      } else if (adminFirestore) {
        const snap = await adminFirestore
          .collection('desktop_auth_sessions')
          .doc(sessionId)
          .get();
        if (snap.exists && now <= (snap.data() as SessionData).expiresAt) {
          valid = true;
        }
      }

      if (!valid) {
        return jsonResponse({ error: 'Session expired or not found' }, 400);
      }

      // Verify the user's ID token issued by Google authentication in the browser
      const decoded = await adminAuth.verifyIdToken(idToken);
      const uid = decoded.uid;

      // Mint a custom Firebase token for desktop authentication
      const customToken = await adminAuth.createCustomToken(uid);

      const completedData: SessionData = {
        status: 'completed',
        customToken,
        uid,
        createdAt: mem?.createdAt || now,
        expiresAt: now + ttlMs,
      };

      memorySessions.set(sessionId, completedData);

      if (adminFirestore) {
        try {
          await adminFirestore
            .collection('desktop_auth_sessions')
            .doc(sessionId)
            .set(completedData, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore desktop session completion fallback to memory:', dbErr);
        }
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error('Desktop auth session error:', err);
    return jsonResponse({ error: err.message || 'Internal server error' }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session');
  if (sessionId) {
    memorySessions.delete(sessionId);
    if (adminFirestore) {
      adminFirestore
        .collection('desktop_auth_sessions')
        .doc(sessionId)
        .delete()
        .catch(() => {});
    }
  }
  return jsonResponse({ success: true });
}
