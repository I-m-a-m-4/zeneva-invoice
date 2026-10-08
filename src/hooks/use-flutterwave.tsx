'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveCheckoutConfig) => void;
  }
}

export interface FlutterwaveCustomer {
  email: string;
  phonenumber?: string;
  name?: string;
}

export interface FlutterwaveCustomizations {
  title?: string;
  description?: string;
  logo?: string;
}

export interface FlutterwaveCheckoutConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: 'NGN' | 'USD' | string;
  payment_options?: string;
  customer: FlutterwaveCustomer;
  customizations?: FlutterwaveCustomizations;
  meta?: Record<string, any>;
  callback: (response: FlutterwaveTransactionResponse) => void;
  onclose?: () => void;
}

export interface FlutterwaveTransactionResponse {
  transaction_id: number | string;
  tx_ref: string;
  flw_ref?: string;
  status: 'successful' | 'completed' | 'failed' | string;
  amount?: number;
  currency?: string;
  customer?: FlutterwaveCustomer;
}

const SCRIPT_URL = 'https://checkout.flutterwave.com/v3.js';
const SCRIPT_ID = 'flutterwave-checkout-sdk';
let scriptPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.FlutterwaveCheckout) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.FlutterwaveCheckout) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => {
        scriptPromise = null;
        existing.remove();
        reject(new Error('Flutterwave SDK failed to load.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;

    const timeout = setTimeout(() => {
      scriptPromise = null;
      script.remove();
      reject(new Error('Flutterwave SDK load timed out. Check your internet connection.'));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      console.warn('Flutterwave SDK network timeout or blocked:', e);
      scriptPromise = null;
      script.remove();
      reject(new Error('Flutterwave SDK blocked or offline'));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
};

export default function useFlutterwave() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    loadScript()
      .then(() => {
        if (mounted) setIsSdkReady(true);
      })
      .catch((err) => {
        console.warn('Flutterwave initial script load deferred:', err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const initializePayment = useCallback(
    async (config: FlutterwaveCheckoutConfig) => {
      if (typeof window === 'undefined') return;

      if (!window.FlutterwaveCheckout) {
        setIsLoading(true);
        try {
          await loadScript();
          setIsSdkReady(true);
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Payment Gateway Unavailable',
            description: 'Could not connect to Flutterwave secure checkout. Please check your internet connection.',
          });
          setIsLoading(false);
          return;
        } finally {
          setIsLoading(false);
        }
      }

      if (!window.FlutterwaveCheckout) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Flutterwave checkout library could not be initialized.',
        });
        return;
      }

      try {
        window.FlutterwaveCheckout(config);
      } catch (err: any) {
        console.error('Error invoking Flutterwave checkout modal:', err);
        toast({
          variant: 'destructive',
          title: 'Checkout Error',
          description: err.message || 'Failed to open Flutterwave payment window.',
        });
      }
    },
    [toast]
  );

  return {
    initializePayment,
    isSdkReady,
    isLoading,
  };
}
