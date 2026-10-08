'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, ArrowRight, Loader2, ShieldCheck, Star, Building2 } from 'lucide-react';
import type { UserProfile, BusinessInstance } from '@/types';
import { useFirestore, auth } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { add, format } from 'date-fns';
import { Badge } from '../ui/badge';
import { safeToDate, getCountryFromIP } from '@/lib/utils';
import { useCallback, useState, useEffect } from 'react';
import useFlutterwave from '@/hooks/use-flutterwave';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { track } from '@vercel/analytics';
import { AI_MONTHLY_LIMITS, effectivePlan, isPaidPlan, isPaidPlanExpired } from '@/lib/plan';
import { apiBase } from '@/lib/platform';
import { usePOS } from '@/context/pos-context';
import { useI18n } from '@/context/i18n-context';

const FLUTTERWAVE_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK-33162c3bb2bb347a6606f3e44645f1c9-X';

type PlanDef = {
    name: string;
    price: number;
    priceUSD: number;
    features: string[];
    planId: string;
};

const getPlans = (t: (key: string) => string): PlanDef[] => [
    {
        name: t('pricing.proName'),
        price: 10000,
        priceUSD: 10,
        features: [
            `${t('pricing.proF1')} & ${t('pricing.proF2')}`,
            t('pricing.proF3'),
            t('pricing.proF4'),
            t('pricing.proF5'),
            t('pricing.proF6'),
            t('pricing.proF7'),
            t('pricing.proF8'),
            t('pricing.proF9'),
            t('pricing.proF10'),
            t('pricing.proF12'),
            t('pricing.proF11'),
            t('pricing.proF13'),
            t('pricing.proF14'),
        ],
        planId: 'pro',
    },
    {
        name: t('pricing.bizName'),
        price: 30000,
        priceUSD: 30,
        features: [
            t('pricing.bizF1'),
            t('pricing.bizF2'),
            t('pricing.bizF8'),
            t('pricing.bizF9'),
            t('pricing.bizF3'),
            t('pricing.bizF4'),
            t('pricing.bizF5'),
            t('pricing.bizF6'),
            t('pricing.bizF7'),
            t('pricing.bizF10'),
            t('pricing.bizF11'),
            t('pricing.bizF12'),
        ],
        planId: 'business',
    }
];

const billingCycles = [
    { id: '1m', months: 1, label: '1 month', discount: 0 },
    { id: '3m', months: 3, label: '3 months', discount: 5 }, // 5% off
    { id: '6m', months: 6, label: '6 months', discount: 10 }, // 10% off
    { id: '12m', months: 12, label: '1 year', discount: 15 }, // 15% off
];

// Flutterwave unified subscription button (Supports NGN, USD, Cards, Transfers, USSD)
const FlutterwaveSubscriptionButton = ({ 
    plan, 
    cycle,
    finalAmount,
    userProfile, 
    businessInstance, 
    isCurrentPlan, 
    isProcessing, 
    setProcessingPlan,
    currency
}: { 
    plan: PlanDef, 
    cycle: typeof billingCycles[0],
    finalAmount: number,
    userProfile: UserProfile, 
    businessInstance: BusinessInstance,
    isCurrentPlan: boolean,
    isProcessing: boolean,
    setProcessingPlan: (planId: string | null) => void;
    currency: 'NGN' | 'USD';
}) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { initializePayment, isSdkReady } = useFlutterwave();
    const { isImpersonating } = usePOS();

    const handleSuccessfulPayment = useCallback(async (transaction: any) => {
        if (!userProfile || !businessInstance) {
            toast({ variant: 'destructive', title: 'Session Expired', description: 'Please refresh the page and try again.' });
            setProcessingPlan(null);
            return;
        }

        const txRef = transaction?.tx_ref || transaction?.reference || '';
        const transactionId = transaction?.transaction_id || transaction?.id || '';

        if (!txRef && !transactionId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Payment reference missing from payment gateway. Please contact support.' });
            setProcessingPlan(null);
            return;
        }

        try {
            toast({ title: "Activating Subscription...", description: "Verifying your payment securely with Flutterwave." });

            const { activateSubscription } = await import('@/actions/subscription');
            const { idToken } = await import('@/lib/id-token');

            const result = await activateSubscription({
                idToken: await idToken(),
                reference: txRef,
                transactionId,
                planId: plan.planId,
                cycleId: cycle.id,
                currency,
                gateway: 'flutterwave',
            });

            if (!result.ok) {
                throw new Error(result.error);
            }

            try {
                track('billing_checkout_success', {
                    plan: plan.name,
                    cycle: cycle.label,
                    amount: finalAmount,
                    currency,
                    gateway: 'Flutterwave',
                    businessId: businessInstance.id
                });
            } catch (trackErr) {
                console.warn("Failed to track checkout success event:", trackErr);
            }

            toast({
                variant: 'success',
                title: 'Subscription Activated! 🎉',
                description: `You are now on the ${plan.name} plan (${cycle.label}).`,
            });

            // Reload after brief delay so client Firestore listeners and entitlements reflect
            if (typeof window !== 'undefined') {
                setTimeout(() => window.location.reload(), 1200);
            }
        } catch (error: any) {
            console.error("Flutterwave activation error:", error);
            toast({
                variant: 'destructive',
                title: 'Subscription Activation Failed',
                description: error.message || 'Payment was received but automatic activation encountered an issue. Please contact support.',
            });
        } finally {
            setProcessingPlan(null);
        }
    }, [userProfile, businessInstance, plan, cycle, finalAmount, currency, toast, setProcessingPlan]);

    const handleSubscribe = useCallback(() => {
        if (isImpersonating) {
            toast({
                variant: 'destructive',
                title: 'Action Blocked',
                description: 'You cannot initiate billing on behalf of a user while impersonating.',
            });
            return;
        }
        if (isProcessing) return;

        if (!FLUTTERWAVE_PUBLIC_KEY || FLUTTERWAVE_PUBLIC_KEY.includes('your_public_key')) {
            toast({
                variant: 'destructive',
                title: 'Configuration Error',
                description: 'Flutterwave public key is not configured. Please contact administrator.',
            });
            return;
        }

        if (!userProfile?.email) {
            toast({
                variant: 'destructive',
                title: 'Email Required',
                description: 'An email address is required to process billing.',
            });
            return;
        }

        setProcessingPlan(plan.planId);

        try {
            track('billing_checkout_initiated', {
                plan: plan.name,
                cycle: cycle.label,
                amount: finalAmount,
                currency,
                gateway: 'Flutterwave',
                businessId: businessInstance.id
            });
        } catch (trackErr) {
            console.warn("Failed to track checkout start event:", trackErr);
        }

        // Log checkout attempt to Firestore
        try {
            if (firestore) {
                addDoc(collection(firestore, 'checkout_attempts'), {
                    userId: userProfile.id,
                    userEmail: userProfile.email || '',
                    userName: userProfile.name || '',
                    businessId: businessInstance.id,
                    businessName: businessInstance.name || '',
                    plan: plan.name,
                    cycle: cycle.label,
                    amount: finalAmount,
                    currency,
                    gateway: 'Flutterwave',
                    timestamp: serverTimestamp(),
                    status: 'initiated'
                });
            }
        } catch (dbErr) {
            console.error("Failed to log checkout attempt:", dbErr);
        }

        const tx_ref = `tx-sub-${businessInstance.id.substring(0, 6)}-${Date.now()}`;

        initializePayment({
            public_key: FLUTTERWAVE_PUBLIC_KEY,
            tx_ref,
            amount: finalAmount,
            currency,
            payment_options: 'card,banktransfer,ussd',
            customer: {
                email: userProfile.email,
                name: userProfile.name || (businessInstance as any)?.ownerName || 'Valued Customer',
                phonenumber: (userProfile as any)?.phone || '',
            },
            customizations: {
                title: 'Zeneva Invoicing',
                description: `${isCurrentPlan ? 'Renewal for' : 'Subscription to'} ${plan.name} Plan (${cycle.label})`,
                logo: 'https://zeneva.space/logo.png',
            },
            callback: (response: any) => {
                if (response.status === 'successful' || response.status === 'completed') {
                    handleSuccessfulPayment(response);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Payment Incomplete',
                        description: `Payment status: ${response.status || 'not completed'}.`,
                    });
                    setProcessingPlan(null);
                }
            },
            onclose: () => {
                setProcessingPlan(null);
            }
        });
    }, [isImpersonating, isProcessing, userProfile, plan, cycle, finalAmount, currency, businessInstance, initializePayment, handleSuccessfulPayment, toast, setProcessingPlan, firestore, isCurrentPlan]);

    const buttonLabel = isCurrentPlan
        ? `Renew Subscription (${currency === 'NGN' ? '₦' : '$'}${finalAmount.toLocaleString()})`
        : `Upgrade to ${plan.name} (${currency === 'NGN' ? '₦' : '$'}${finalAmount.toLocaleString()})`;

    return (
        <div className="w-full space-y-2">
            <Button
                onClick={handleSubscribe}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 transition-all"
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {buttonLabel}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
                Secured by Flutterwave • Cards, Bank Transfer, USSD
            </p>
        </div>
    );
};

// Main component that uses the button
export default function SubscriptionSection({ userProfile, businessInstance }: { userProfile: UserProfile; businessInstance: BusinessInstance; }) {
    const { t } = useI18n();
    const plans = getPlans(t);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [globalCycleId, setGlobalCycleId] = useState('12m');
    const [activeSelection, setActiveSelection] = useState<{ planId: string, cycleId: string }>({ planId: 'pro', cycleId: '12m' });
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('USD');

    useEffect(() => {
        getCountryFromIP().then((country) => {
            if (country === 'Nigeria') {
                setCurrency('NGN');
            } else {
                setCurrency('USD');
            }
        });
    }, []);

    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobileApp = isTauri && isMobile;

    const handleCycleChange = (planId: string, cycleId: string) => {
        setActiveSelection({ planId, cycleId });
    };

    if (businessInstance.accessLevel === 'lifetime') {
        return (
            <Card className="mt-6 border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg text-green-700">Lifetime Access Active</CardTitle>
                    </div>
                    <CardDescription>
                        Permanent access granted. No further payments required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-green-600/80">
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Unlimited invoices & clients</div>
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Unlimited team members</div>
                        <div className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Zen AI Invoicing Insights</div>
                    </div>
                </CardContent>
            </Card>
        );
    }



    return (
        <div className="space-y-6 mt-6">
            {/* Currency Toggle */}
            <div className="flex justify-center border-b pb-6">
                <div className="inline-flex p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setCurrency('USD')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                            currency === 'USD'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        USD ($)
                    </button>
                    <button
                        onClick={() => setCurrency('NGN')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                            currency === 'NGN'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Naira (₦)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan) => {
                    const isSelectedPlan = activeSelection.planId === plan.planId;
                    const visualCycleId = isSelectedPlan ? activeSelection.cycleId : '';
                    const computationCycleId = isSelectedPlan ? activeSelection.cycleId : '1m';
                    
                    const selectedCycle = billingCycles.find(c => c.id === computationCycleId)!;
                    
                    const displayBasePrice = currency === 'NGN' ? plan.price : (plan as any).priceUSD;
                    const finalAmount = displayBasePrice * selectedCycle.months * (1 - selectedCycle.discount / 100);
                    
                    const isCurrentPlan = plan.planId === businessInstance.plan;

                    return (
                        <Card key={plan.name} className={`flex flex-col ${isCurrentPlan ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-2">
                                        {plan.planId === 'pro' ? (
                                            <Star className="h-5 w-5 text-primary shrink-0" />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-primary shrink-0" />
                                        )}
                                        {plan.name}
                                    </CardTitle>
                                    {isCurrentPlan && <Badge variant="secondary" className="font-bold">Current Plan</Badge>}
                                </div>
                                <CardDescription>
                                    <span className="text-3xl font-bold text-foreground">
                                        {currency === 'NGN' ? '₦' : '$'}{displayBasePrice.toLocaleString()}
                                    </span>
                                    <span className="text-muted-foreground ml-1">/ month</span>

                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <ul className="space-y-2">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="space-y-3 pt-4 border-t">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Billing Cycle</Label>
                                    <RadioGroup 
                                        value={visualCycleId}
                                        onValueChange={(value) => handleCycleChange(plan.planId, value)}
                                        className="grid gap-2"
                                    >
                                        {billingCycles.map(cycle => {
                                            const cyclePriceNGN = plan.price * cycle.months;
                                            const discountedPriceNGN = cyclePriceNGN * (1 - cycle.discount / 100);
                                            const discountedPriceUSD = ((plan as any).priceUSD * cycle.months) * (1 - cycle.discount / 100);

                                            return (
                                                <Label 
                                                    key={cycle.id}
                                                    htmlFor={`${plan.planId}-${cycle.id}`}
                                                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                                                        visualCycleId === cycle.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value={cycle.id} id={`${plan.planId}-${cycle.id}`} className="mt-0.5 shrink-0" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{cycle.label}</span>
                                                            {cycle.discount > 0 && <span className="text-[10px] text-green-600 font-bold">-{cycle.discount}% OFF</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold">
                                                            {currency === 'NGN' ? '₦' : '$'}{currency === 'NGN' ? discountedPriceNGN.toLocaleString() : discountedPriceUSD.toLocaleString()}
                                                        </span>

                                                    </div>
                                                </Label>
                                            )
                                        })}
                                    </RadioGroup>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <FlutterwaveSubscriptionButton
                                    plan={plan}
                                    cycle={selectedCycle}
                                    finalAmount={finalAmount}
                                    userProfile={userProfile}
                                    businessInstance={businessInstance}
                                    isCurrentPlan={isCurrentPlan}
                                    isProcessing={processingPlan === plan.planId}
                                    setProcessingPlan={setProcessingPlan}
                                    currency={currency}
                                />
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
