
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Clock, ShieldCheck, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { isPaidPlan, isPaidPlanExpired, effectivePlan, isTrialExpired, getTrialDaysRemaining } from '@/lib/plan';

interface TrialCountdownProps {
  /** The business whose billing status is being shown. */
  business?: any;
  /** Legacy prop kept so existing callers keep compiling. */
  expiryDate?: Date | null;
}

/**
 * Billing status for the current plan.
 *
 * All new users enjoy a 30-day free trial on the Pro plan.
 * When the trial concludes, users must subscribe to unlock full access.
 */
const TrialCountdown: React.FC<TrialCountdownProps> = ({ business, expiryDate }) => {
    const paid = isPaidPlan(business);
    const lapsed = isPaidPlanExpired(business);
    const trialExpired = isTrialExpired(business);
    const trialDays = getTrialDaysRemaining(business);
    const plan = effectivePlan(business);
    const isLifetime = business?.accessLevel === 'lifetime';

    const renewalDate = React.useMemo(() => {
        if (business?.trialExpiresAt) return safeToDate(business.trialExpiresAt);
        return expiryDate ?? null;
    }, [business, expiryDate]);

    const trialEndDate = React.useMemo(() => {
        if (business?.trialExpiresAt) {
            const exp = safeToDate(business.trialExpiresAt);
            if (exp && !Number.isNaN(exp.getTime())) return exp;
        }
        const created = safeToDate(business?.createdAt);
        if (created && !Number.isNaN(created.getTime())) {
            return new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        return null;
    }, [business]);

    const targetDate = paid ? renewalDate : trialEndDate;

    const [timeLeft, setTimeLeft] = useState<{
        days: number; hours: number; minutes: number; seconds: number;
    } | null>(null);

    useEffect(() => {
        if (isLifetime || lapsed || (trialExpired && !paid) || !targetDate) {
            setTimeLeft(null);
            return;
        }

        const calculate = () => {
            const distance = targetDate.getTime() - Date.now();
            if (distance <= 0) return null;
            return {
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            };
        };

        setTimeLeft(calculate());
        const id = setInterval(() => {
            const next = calculate();
            if (next === null) {
                clearInterval(id);
            }
            setTimeLeft(next);
        }, 1000);

        return () => clearInterval(id);
    }, [paid, lapsed, trialExpired, isLifetime, targetDate]);

    if (isLifetime) {
        return (
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <div>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Lifetime License — Active</p>
                    <p className="text-xs text-muted-foreground">Permanent access to all Zeneva Pro and Business features.</p>
                </div>
            </div>
        );
    }

    // A paid subscription that has run out.
    if (lapsed) {
        return (
            <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-destructive animate-spin" />
                <div>
                    <p className="text-lg font-semibold text-destructive">Subscription Expired — Account Locked</p>
                    <p className="text-xs text-muted-foreground">
                        Your subscription has ended. Renew your plan below to unlock your workspace and resume full operations.
                    </p>
                </div>
            </div>
        );
    }

    // Unpaid user: 30-Day Pro Trial with live real-time countdown
    if (!paid) {
        if (trialExpired || (!timeLeft && trialEndDate && trialEndDate.getTime() <= Date.now())) {
            return (
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
                    <div>
                        <p className="text-lg font-semibold text-destructive">30-Day Pro Trial Expired — Account Locked</p>
                        <p className="text-xs text-muted-foreground">
                            Your 30-day Pro trial has ended. Select a plan below to unlock your account and resume invoicing.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary animate-pulse" />
                <div>
                    <p className="text-lg font-semibold text-primary">
                        Pro Plan (30-Day Free Trial) · {timeLeft ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s remaining` : `${trialDays} days remaining`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {trialEndDate ? `Trial ends on ${format(trialEndDate, 'PPp')}. ` : ''}
                        Enjoy full Pro plan access. Choose a plan below at any time for uninterrupted operations.
                    </p>
                </div>
            </div>
        );
    }

    // Live paid subscription.
    return (
        <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary animate-pulse" />
            <div>
                <p className="text-lg font-semibold text-primary capitalize">
                    {timeLeft
                        ? `${plan} · ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s remaining`
                        : `${plan} plan active`}
                </p>
                {renewalDate && (
                    <p className="text-xs text-muted-foreground">
                        Renews on {format(renewalDate, 'PPp')}.
                    </p>
                )}
            </div>
        </div>
    );
};

export default TrialCountdown;
