

'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { BusinessInstance, SubscriptionHistory, UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, ShieldCheck, Sparkles, FileText, CheckCircle2, CreditCard, HelpCircle, ArrowUpRight } from 'lucide-react';
import TrialCountdown from '@/components/settings/trial-countdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, safeToDate } from '@/lib/utils';
import RefreshButton from '@/components/shared/refresh-button';
import { usePOS } from '@/context/pos-context';
import { useI18n } from '@/context/i18n-context';
import { BillingBodySkeleton } from './skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SubscriptionSection = dynamic(
    () => import('@/components/settings/subscription-section'),
    { 
        ssr: false,
        loading: () => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <Card className="h-96"><CardContent className="p-6 h-full flex flex-col justify-between"><div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-1/3" /></div><div className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div><Skeleton className="h-12 w-full" /></CardContent></Card>
                <Card className="h-96"><CardContent className="p-6 h-full flex flex-col justify-between"><div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-1/3" /></div><div className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div><Skeleton className="h-12 w-full" /></CardContent></Card>
            </div>
        ),
    }
);

function BillingPageSkeleton() {
    return <BillingBodySkeleton />;
}

const LifetimeAccessStatus = () => {
    const { t } = useI18n();
    return (
        <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            <div>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{t('billing.lifetimeAccess')}</p>
                <p className="text-xs text-muted-foreground">{t('billing.lifetimeAccessDesc')}</p>
            </div>
        </div>
    );
};

function BillingPage() {
  const { user, isUserLoading } = useUser();
  const { business: currentBusiness, currentUserProfile: userProfile, isLoading: isPosLoading, isImpersonating } = usePOS();
  const firestore = useFirestore();
  const { t } = useI18n();

  const subscriptionHistoryQuery = useMemoFirebase(() => {
    if (!currentBusiness?.id || !firestore) return null;
    return query(collection(firestore, 'businessInstances', currentBusiness.id, 'subscription_history'), orderBy('timestamp', 'desc'), limit(50));
  }, [currentBusiness?.id, firestore]);
  const { data: subscriptionHistory, isLoading: isHistoryLoading } = useCollection<SubscriptionHistory>(subscriptionHistoryQuery);
  
  const isLoading = isUserLoading || isPosLoading || isHistoryLoading;

  if (isLoading) {
    return <BillingPageSkeleton />;
  }
  
  if (!currentBusiness || !userProfile) {
    return <div className="p-8 text-center text-muted-foreground">{t('billing.profileNotFound')}</div>;
  }

  const currentPlan = currentBusiness.plan || 'starter';
  const isLifetime = currentBusiness.accessLevel === 'lifetime';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <PageTitle title={t('billing.title')} subtitle={t('billing.subtitle')} />
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise-grade invoicing, automated payment collection & client management.
          </p>
        </div>
        <RefreshButton />
      </div>

      {isImpersonating && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">{t('billing.impersonationTitle')}</p>
            <p className="text-xs opacity-80">{t('billing.impersonationBody')}</p>
          </div>
        </div>
      )}

      {/* Invoicing Feature & Quota Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active License</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold capitalize text-foreground">{isLifetime ? 'Lifetime License' : `${currentPlan} Plan`}</span>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] font-bold">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isLifetime ? 'Permanent access to all features' : 'Includes automatic continuous updates'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoicing Quota</p>
              <p className="text-xl font-bold text-foreground">Unlimited</p>
              <p className="text-xs text-muted-foreground">
                Invoices, estimates, recurring bills & clients
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zen AI Billing Assistant</p>
              <p className="text-xl font-bold text-foreground">
                {currentPlan === 'business' ? '600' : currentPlan === 'pro' ? '150' : 'Included'} <span className="text-xs font-normal text-muted-foreground">credits/mo</span>
              </p>
              <p className="text-xs text-muted-foreground">
                AI invoice generation, debtor chasing & cashflow analysis
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Management & Upgrade Section */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('billing.sectionTitle')}
              </CardTitle>
              <CardDescription className="mt-1">
                Select a plan tailored for your business or agency. Change plans or billing cycles at any time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-xl bg-muted/40 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('billing.currentStatus')}</p>
                {isLifetime ? (
                    <LifetimeAccessStatus />
                ) : (
                    <TrialCountdown business={currentBusiness} />
                )}
            </div>
            <SubscriptionSection userProfile={userProfile} businessInstance={currentBusiness} />
        </CardContent>
      </Card>

      {/* Subscription & Payment History Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <History className="h-5 w-5 text-primary" />
                  {t('billing.historyTitle')}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Complete record of your subscription payments, renewals, and invoices.
                </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-64 rounded-md border">
                 <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="font-semibold">Description / Plan</TableHead>
                            <TableHead className="font-semibold">{t('billing.colAmount')}</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptionHistory && subscriptionHistory.length > 0 ? (
                            subscriptionHistory
                              .filter(item => !(item.amount === 0 && !item.action.includes('Admin Grant')))
                              .map(item => (
                                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-foreground">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span>{item.action}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      {item.currency === 'USD' ? '$' : '₦'}{item.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                                        Completed
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs font-mono">
                                      {item.timestamp ? format(safeToDate(item.timestamp), 'PPp') : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                      <History className="h-8 w-8 opacity-40 text-muted-foreground" />
                                      <p className="font-medium">{t('billing.noHistory')}</p>
                                      <p className="text-xs text-muted-foreground">Your transaction receipts and renewal records will appear here.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>

      {/* Helpful Billing FAQs & Support Link */}
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Need custom invoicing limits, bank transfer receipt, or enterprise seats?</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our team can provide custom invoicing quotes, multi-entity setups, and dedicated onboarding.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                <Link href="/support">
                  Contact Support <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingPage;
