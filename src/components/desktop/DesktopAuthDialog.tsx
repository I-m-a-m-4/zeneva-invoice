'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import type { DesktopAuthController } from '@/lib/desktop-auth';

interface DesktopAuthDialogProps {
  controller: DesktopAuthController | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesktopAuthDialog({
  controller,
  open,
  onOpenChange,
}: DesktopAuthDialogProps) {
  const [reopening, setReopening] = React.useState(false);

  const handleReopen = async () => {
    if (!controller) return;
    setReopening(true);
    try {
      await controller.openBrowserAgain();
    } finally {
      setTimeout(() => setReopening(false), 800);
    }
  };

  const handleCancel = () => {
    controller?.cancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        handleCancel();
      }
    }}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="text-center sm:text-center space-y-3 pt-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-primary border border-orange-500/20 shadow-inner">
            <div className="relative">
              <svg className="h-7 w-7" viewBox="0 0 24 24">
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
            </div>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Signing in with Google
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We opened your default browser to complete Google Sign-in securely outside the desktop window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/40">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block mb-0.5">
                Waiting for sign-in...
              </span>
              Complete Google authentication in your browser. This window will automatically log in as soon as you finish.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 gap-2 border-border/70"
              onClick={handleReopen}
              disabled={reopening}
            >
              <ExternalLink className="h-4 w-4" />
              <span>{reopening ? 'Opening...' : 'Reopen Browser'}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
