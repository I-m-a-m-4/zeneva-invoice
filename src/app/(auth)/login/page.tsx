"use client";

import React, { useEffect, useState, useRef } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader, ChevronLeft, Sparkles, TrendingUp, CheckCircle2, Zap } from "lucide-react";
import { AppConfig } from "@/lib/config";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { trackLaunchStage } from "@/lib/launch-telemetry";
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from "@/context/i18n-context";
import { isNativeApp } from "@/lib/platform";
import { startDesktopGoogleAuth, DesktopAuthController } from "@/lib/desktop-auth";
import { DesktopAuthDialog } from "@/components/desktop/DesktopAuthDialog";

// Titles and descriptions are keys resolved at render — the array is module-level
// and cannot reach `t()`. The word-highlight below still matches on English, so
// other locales draw the headline plain rather than part-italic.
const loginSlides = [
  {
    image: '/images/auth/slide-1.jpg',
    titleKey: 'auth.loginSlide1Title',
    descKey: 'auth.loginSlide1Desc',
    badgeText: 'Smart Checkout Active',
    notifTitle: 'New Sale Completed',
    notifDesc: 'POS Terminal #01 · ₦42,500.00',
    notifType: 'sale',
  },
  {
    image: '/images/auth/slide-2.jpg',
    titleKey: 'auth.loginSlide2Title',
    descKey: 'auth.loginSlide2Desc',
    badgeText: 'Live Inventory Analytics',
    notifTitle: 'Weekly Target Exceeded',
    notifDesc: '+38.4% revenue increase',
    notifType: 'growth',
  },
  {
    image: '/images/auth/slide-3.jpg',
    titleKey: 'auth.loginSlide3Title',
    descKey: 'auth.loginSlide3Desc',
    badgeText: 'Real-time Cloud Sync',
    notifTitle: 'Multi-Store Synchronized',
    notifDesc: 'All inventory updated live',
    notifType: 'sync',
  }
];

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % loginSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [desktopAuthController, setDesktopAuthController] = useState<DesktopAuthController | null>(null);

  useEffect(() => {
    return () => {
      desktopAuthController?.cancel();
    };
  }, [desktopAuthController]);

  // Handle getRedirectResult when the page mounts after a Google redirect login
  useEffect(() => {
    if (!auth) return;
    
    let isMounted = true;
    
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result || !isMounted) return;
        // User is successfully signed in. AuthLayout handles the redirection to POS page.
      })
      .catch((error: any) => {
        console.error("Redirect auth error:", error);
        const isCancellation =
          error?.code === 'auth/popup-closed-by-user' ||
          error?.code === 'auth/cancelled-popup-request' ||
          error?.code === 'auth/user-cancelled' ||
          error?.code === 'auth/redirect-cancelled-by-user';

        // Recorded even when it is a cancellation: on the desktop shell a
        // "cancelled" redirect is indistinguishable from a webview that could
        // never have completed one, and telling those apart is the point.
        void trackLaunchStage('login_failed', `redirect:${error?.code ?? 'unknown'}`);

        if (!isCancellation) {
          toast({
            variant: "destructive",
            title: t('auth.authFailedTitle'),
            description: error.message || t('auth.redirectSignInFailed'),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [auth, toast, t]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setIsGoogleLoading(true);
    void trackLaunchStage('login_attempted', 'google');

    // Desktop shell: open the system browser on the user's PC to authenticate smoothly
    if (isNativeApp()) {
      try {
        const controller = await startDesktopGoogleAuth({
          onSuccess: () => {
            setIsGoogleLoading(false);
            setDesktopAuthController(null);
            void trackLaunchStage('login_succeeded', 'google-desktop');
          },
          onError: (err) => {
            setIsGoogleLoading(false);
            setDesktopAuthController(null);
            void trackLaunchStage('login_failed', `google-desktop:${err.message}`);
            toast({
              variant: "destructive",
              title: t('auth.googleAuthFailedTitle'),
              description: err.message || t('auth.tryAgainShort'),
            });
          },
          onCancel: () => {
            setIsGoogleLoading(false);
            setDesktopAuthController(null);
          },
        });
        setDesktopAuthController(controller);
        return;
      } catch (err: any) {
        setIsGoogleLoading(false);
        setDesktopAuthController(null);
        toast({
          variant: "destructive",
          title: t('auth.googleAuthFailedTitle'),
          description: err.message || t('auth.tryAgainShort'),
        });
        return;
      }
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        await signInWithPopup(auth, provider);
        // AuthLayout handles the redirection once auth state changes
        void trackLaunchStage('login_succeeded', 'google-popup');
      } catch (popupError: any) {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768 && !/Mobi|Android/i.test(navigator.userAgent);
        
        if (popupError?.code === 'auth/internal-error') {
            // Firebase internal errors are usually transient. Wait briefly and retry once.
            await new Promise(resolve => setTimeout(resolve, 1200));
            await signInWithPopup(auth, provider);
            void trackLaunchStage('login_succeeded', 'google-popup');
            return;
        }

        if (
          popupError?.code === 'auth/operation-not-supported-in-this-environment' ||
          (popupError?.code === 'auth/popup-blocked' && !isDesktop) || 
          (!isDesktop && popupError?.code === 'auth/network-request-failed')
        ) {
          // The webview cannot host a popup, or mobile browser blocked it.
          // This branch navigates the whole shell away.
          void trackLaunchStage(
            'login_failed',
            `popup-fallback:${popupError?.code ?? 'unknown'}`,
          );
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      const isCancellation =
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/user-cancelled' ||
        error?.code === 'auth/redirect-cancelled-by-user';

      if (!isCancellation) {
          console.error("Google auth error:", error);
      }

      void trackLaunchStage('login_failed', `google:${error?.code ?? 'unknown'}`);

      if (!isCancellation) {
        const errorDesc = error?.code === 'auth/internal-error'
          ? t('auth.googleTemporaryIssue')
          : error?.code === 'auth/popup-blocked'
          ? t('auth.popupBlocked')
          : (error.message || t('auth.tryAgainShort'));
        toast({
          variant: "destructive",
          title: t('auth.googleAuthFailedTitle'),
          description: errorDesc,
        });
      }
      setIsGoogleLoading(false);
    }
  };


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        title: t('auth.serviceUnavailable'),
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    void trackLaunchStage('login_attempted', 'password');
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        void trackLaunchStage('login_succeeded', 'password');
        const isSuperAdmin = user.email === 'belloimam431@gmail.com';
        
        // Check for MFA enrollment if Super Admin
        if (isSuperAdmin && user.providerData[0].providerId === 'password') {
          const enrolledFactors = (user as any).multiFactor?.enrolledFactors || [];
          if (enrolledFactors.length === 0) {
              console.warn("MFA Requirement: Super Admin must enroll in MFA.");
              // We'll handle redirection in the AuthLayout or here if preferred.
          }
        }
      })
      .catch((error) => {
        let description = t('auth.invalidCredentials');
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = t('auth.invalidCredentialsDetailed');
        }
        // The code, never the email or password. This endpoint is
        // unauthenticated, so nothing identifying may leave the device — and
        // `auth/invalid-api-key` versus `auth/invalid-credential` is the whole
        // difference between a broken build and a genuine wrong password, which
        // the toast above shows identically.
        void trackLaunchStage('login_failed', `password:${error?.code ?? 'unknown'}`);
        toast({
          variant: 'destructive',
          title: t('auth.loginFailedTitle'),
          description: description,
        });
        setIsLoading(false); // Only set loading to false on failure.
      });
  };

  return (
    <div className="w-full min-h-screen lg:h-screen flex lg:grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col min-h-screen lg:min-h-0 lg:h-full lg:overflow-y-auto relative w-full px-4 sm:px-6 py-8">
        <div className="absolute top-8 left-4 sm:left-8 z-20">
          <Button variant="ghost" asChild>
            <Link href="/signup">
              {t('auth.createAccountLink')}
            </Link>
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center w-full py-12">
          <div className="mx-auto grid w-full max-w-[350px] gap-6">
            <div className="grid gap-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- logo URL is configured at runtime and may be an external or data: URL */}
                <img src={AppConfig.logoUrl} alt={t('auth.logoAlt')} className="h-16 w-auto" />
              </div>
              <h1 className="text-3xl font-bold">{t('auth.loginTitle')}</h1>
              <p className="text-balance text-muted-foreground">
                {t('auth.loginSubtitle')}
              </p>
            </div>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2 focus-within-glow rounded-md">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2 focus-within-glow rounded-md">
                <div className="flex items-center">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline"
                  >
                    {t('auth.forgotPasswordLink')}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full button-glow" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.loginButton')}
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
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
                  <span>Google</span>
                </>
              )}
            </Button>
            <div className="mt-4 text-center text-sm">
              {t('auth.noAccountPrompt')}{" "}
              <Link href="/signup" className="underline">
                {t('auth.signUpLink')}
              </Link>
            </div>
          </div>
        </div>
        <div className="w-full text-center mt-auto pb-4">
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed max-w-[340px] mx-auto">
            {t('auth.legalSignIn')}{' '}
            <Link href="/legal/terms-of-service" className="text-primary underline hover:opacity-80" target="_blank">
              {t('footer.linkTerms')}
            </Link>{' '}
            {t('auth.legalAnd')}{' '}
            <Link href="/legal/privacy-policy" className="text-primary underline hover:opacity-80" target="_blank">
              {t('footer.linkPrivacyPolicy')}
            </Link>.
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-col p-3 sm:p-4 lg:p-5 h-full">
        <div className="relative w-full h-full overflow-hidden rounded-2xl lg:rounded-3xl bg-black shadow-2xl border border-black/5 dark:border-white/10">
          {/* Animated Background Images with smooth transitions */}
          {loginSlides.map((slide, index) => (
            <motion.div
              key={index}
              animate={index === currentSlide ? { opacity: 0.9, scale: [1, 1.05] } : { opacity: 0, scale: 1 }}
              transition={{ duration: 7, ease: "easeInOut" }}
              className={`absolute inset-0 h-full w-full ${
                index === currentSlide ? 'z-[0]' : 'pointer-events-none z-[-1]'
              }`}
            >
              <Image
                src={slide.image}
                alt={t(slide.titleKey)}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </motion.div>
          ))}

          {/* Warm tint overlay */}
          <div className="absolute inset-0 bg-orange-600/10 mix-blend-multiply z-[1] pointer-events-none" />

          {/* Dual gradient overlays for high-contrast readability at top and bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 z-[2] pointer-events-none" />

          {/* Upper Animated Content Overlay */}
          <div className="absolute top-6 left-6 right-6 lg:top-8 lg:left-8 lg:right-8 z-10 flex flex-col gap-3 pointer-events-none">
            <div className="flex items-center justify-between">
              {/* Live Operating Status */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-lg"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Zeneva OS Live</span>
              </motion.div>

              {/* Dynamic Animated Status Chip */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-primary-foreground text-xs font-semibold shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>{loginSlides[currentSlide].badgeText}</span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Floating Live Activity Glass Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 25, y: -5 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -25, y: -5 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="self-end mt-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl max-w-[320px]"
              >
                <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary">
                  {loginSlides[currentSlide].notifType === 'sale' && <CheckCircle2 className="h-4 w-4" />}
                  {loginSlides[currentSlide].notifType === 'growth' && <TrendingUp className="h-4 w-4" />}
                  {loginSlides[currentSlide].notifType === 'sync' && <Zap className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {loginSlides[currentSlide].notifTitle}
                  </p>
                  <p className="text-[11px] text-white/70 truncate">
                    {loginSlides[currentSlide].notifDesc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-8 left-8 right-8 lg:bottom-10 lg:left-10 lg:right-10 p-0 bg-transparent z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <h2 className="text-white text-3xl lg:text-4xl font-bold font-headline leading-tight tracking-tight drop-shadow-lg">
                  {t(loginSlides[currentSlide].titleKey).split(" ").map((word, i) => (
                    <React.Fragment key={i}>
                      {word === "for" || word === "Galaxy" || word === "System" ? <span className="text-primary italic"> {word} </span> : word + " "}
                    </React.Fragment>
                  ))}
                </h2>
                <p className="text-white/90 mt-3 lg:mt-4 text-lg lg:text-xl font-light leading-relaxed drop-shadow-md max-w-[560px]">
                  {t(loginSlides[currentSlide].descKey)}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-3">
              {loginSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "h-1.5 transition-all duration-500 rounded-full cursor-pointer focus:outline-none",
                    currentSlide === i ? "w-12 bg-primary shadow-[0_0_12px_rgba(255,165,0,0.6)]" : "w-2.5 bg-white/40 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <DesktopAuthDialog
        controller={desktopAuthController}
        open={!!desktopAuthController}
        onOpenChange={(open) => {
          if (!open) {
            desktopAuthController?.cancel();
            setDesktopAuthController(null);
            setIsGoogleLoading(false);
          }
        }}
      />
    </div>
  )
}
