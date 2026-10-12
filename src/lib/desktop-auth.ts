import { apiBase, browserAuthBase, openExternal, DEFAULT_HOSTED_URL } from '@/lib/platform';
import { auth } from '@/firebase';
import { signInWithCustomToken, UserCredential } from 'firebase/auth';

export interface DesktopAuthSessionController {
  sessionId: string;
  authUrl: string;
  openBrowserAgain: () => Promise<void>;
  cancel: () => void;
}

export interface DesktopAuthOptions {
  onSuccess: (credential: UserCredential) => void;
  onError: (error: Error) => void;
  onCancel?: () => void;
}

/**
 * Initiates the browser-assisted Google Authentication flow for the desktop shell.
 * 1. Creates an exchange session on the backend.
 * 2. Launches the user's default browser to /auth/desktop?session=...
 * 3. Polls the backend until the browser completes Google Sign-in.
 * 4. Signs the desktop app in with the minted Firebase custom token.
 */
export async function startDesktopGoogleAuth(
  options: DesktopAuthOptions
): Promise<DesktopAuthController> {
  const primaryBase = apiBase();
  const fallbackBase = DEFAULT_HOSTED_URL;

  // Resolve candidate backend base URLs to try
  const candidates: string[] = [];
  if (primaryBase && !primaryBase.includes('zeneva.space')) {
    candidates.push(primaryBase.replace(/\/+$/, ''));
  }
  if (!candidates.includes(fallbackBase)) {
    candidates.push(fallbackBase);
  }

  let sessionId = '';
  let workingBase = candidates[0];
  let lastError = '';

  for (const candidate of candidates) {
    try {
      const res = await fetch(`${candidate}/api/auth/desktop-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          sessionId = data.sessionId;
          workingBase = candidate;
          break;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        lastError = data.error || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }
  }

  if (!sessionId) {
    throw new Error(
      lastError
        ? `Could not connect to authentication service (${lastError}). Please check your internet connection.`
        : 'Failed to create desktop authentication session.'
    );
  }

  // Build the browser URL using the hosted web base
  let webBase = browserAuthBase() || DEFAULT_HOSTED_URL;
  if (webBase.includes('zeneva.space') || webBase.includes('localhost')) {
    webBase = DEFAULT_HOSTED_URL;
  }
  webBase = webBase.replace(/\/+$/, '');

  const authUrl = `${webBase}/auth/desktop?session=${encodeURIComponent(sessionId)}`;

  // Open the user's default browser
  try {
    await openExternal(authUrl);
  } catch (openErr) {
    console.warn('Failed to open external browser via shell, attempting window.open:', openErr);
    if (typeof window !== 'undefined') {
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    }
  }

  let isCancelled = false;
  let timerId: any = null;

  const cancel = () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
    // Cleanup session on backend
    fetch(`${workingBase}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    options.onCancel?.();
  };

  const openBrowserAgain = async () => {
    try {
      await openExternal(authUrl);
    } catch {
      if (typeof window !== 'undefined') {
        window.open(authUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const startTime = Date.now();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  const poll = async () => {
    if (isCancelled) return;

    if (Date.now() - startTime > timeoutMs) {
      cancel();
      options.onError(new Error('Sign-in session timed out. Please try again.'));
      return;
    }

    try {
      const pollRes = await fetch(
        `${workingBase}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`
      );
      if (pollRes.ok) {
        const data = await pollRes.json();

        if (data.status === 'completed' && data.customToken) {
          if (!auth) {
            throw new Error('Firebase Auth is not initialized');
          }

          // Sign in to Firebase Auth on desktop using the custom token
          const credential = await signInWithCustomToken(auth, data.customToken);

          // Cleanup session on backend
          fetch(`${workingBase}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
          }).catch(() => {});

          options.onSuccess(credential);
          return;
        }

        if (data.status === 'expired') {
          cancel();
          options.onError(new Error('Sign-in session has expired.'));
          return;
        }
      }
    } catch (err: any) {
      console.warn('Desktop auth poll warning:', err?.message);
    }

    if (!isCancelled) {
      timerId = setTimeout(poll, 1200);
    }
  };

  // Start polling
  timerId = setTimeout(poll, 1200);

  return {
    sessionId,
    authUrl,
    openBrowserAgain,
    cancel,
  };
}

export type DesktopAuthController = DesktopAuthSessionController;

