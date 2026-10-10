import { apiBase, browserAuthBase, openExternal } from '@/lib/platform';
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
 * 2. Launches the user's default browser to zeneva.space/auth/desktop?session=...
 * 3. Polls the backend until the browser completes Google Sign-in.
 * 4. Signs the desktop app in with the minted Firebase custom token.
 */
export async function startDesktopGoogleAuth(
  options: DesktopAuthOptions
): Promise<DesktopAuthController> {
  const base = apiBase();
  const res = await fetch(`${base}/api/auth/desktop-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create' }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create desktop authentication session.');
  }

  const { sessionId } = await res.json();
  const authUrl = `${browserAuthBase()}/auth/desktop?session=${encodeURIComponent(sessionId)}`;

  // Open the system browser
  await openExternal(authUrl);

  let isCancelled = false;
  let timerId: any = null;

  const cancel = () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
    // Cleanup session on backend
    fetch(`${base}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    options.onCancel?.();
  };

  const openBrowserAgain = async () => {
    await openExternal(authUrl);
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
        `${base}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`
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
          fetch(`${base}/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`, {
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
