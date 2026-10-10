'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { createUserProfileDocument } from '@/firebase/users';
import { AppConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle, Laptop, ArrowRight } from 'lucide-react';

function DesktopAuthContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [loading, setLoading] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Validate session on mount
  React.useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided. Please launch authentication from Zeneva Desktop.');
      setCheckingSession(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch(`/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (res.status === 404 || data.status === 'not_found') {
          setError('Invalid or expired authentication session. Please try again from Zeneva Desktop.');
        } else if (data.status === 'expired') {
          setError('This sign-in session has expired. Please initiate sign-in again from Zeneva Desktop.');
        } else if (data.status === 'completed') {
          setIsSuccess(true);
        }
      } catch (err: any) {
        console.warn('Session verification warning:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    verifySession();
  }, [sessionId]);

  const handleGoogleSignIn = async () => {
    if (!sessionId) return;
    if (!auth) {
      setError('Authentication service is not available. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Run Google popup sign-in in the real browser
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Ensure user profile document exists in Firestore
      if (firestore) {
        try {
          const userDocRef = doc(firestore, `users/${user.uid}`);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            await createUserProfileDocument(
              firestore,
              user,
              user.displayName || '',
              user.phoneNumber || '',
              ''
            );
          }
        } catch (profileErr) {
          console.warn('Profile creation fallback:', profileErr);
        }
      }

      // Get fresh Firebase ID Token
      const idToken = await user.getIdToken(true);

      // Exchange ID token with the desktop session endpoint
      const res = await fetch('/api/auth/desktop-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          sessionId,
          idToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to link session with Zeneva Desktop');
      }

      setIsSuccess(true);

      // Attempt to invoke the desktop deep link protocol if registered
      try {
        window.location.href = 'zeneva://auth';
      } catch {
        // Deep link is best-effort; polling on desktop takes over automatically
      }
    } catch (err: any) {
      console.error('Browser Google sign-in failed:', err);
      const isCancellation =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled';

      if (!isCancellation) {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Connecting with Zeneva Desktop...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-border/40 overflow-hidden relative">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-primary" />

        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AppConfig.logoUrl} alt="Zeneva" className="h-12 w-auto" />
          </div>

          {isSuccess ? (
            <>
              <div className="mx-auto my-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Sign-in Complete!
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                You are now securely logged into Zeneva Desktop.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto my-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Laptop className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Zeneva Desktop Sign-in
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Authenticate your account in your browser to proceed to the desktop app.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-center">
                <p className="text-sm text-foreground/80 font-medium">
                  You can safely close this browser tab and return to the Zeneva Desktop window on your computer.
                </p>
              </div>

              <Button
                variant="default"
                className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                onClick={() => {
                  try {
                    window.location.href = 'zeneva://auth';
                  } catch {
                    // Fallback
                  }
                }}
              >
                <span>Return to Desktop App</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 flex items-center justify-center gap-3 text-base font-medium border-border/80 hover:bg-muted/50 transition-all shadow-sm"
                onClick={handleGoogleSignIn}
                disabled={loading || !!error}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground/70">
                Signing in will instantly sync your credentials with your active desktop session.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DesktopAuthPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DesktopAuthContent />
    </React.Suspense>
  );
}
