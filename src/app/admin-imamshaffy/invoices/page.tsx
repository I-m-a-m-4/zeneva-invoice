'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { format, isBefore, addDays } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import {
  FileDigit,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  Search,
  ExternalLink,
  Copy,
  RefreshCw,
  LayoutGrid,
  Filter,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PlatformInvoice {
  id: string;
  businessId?: string;
  receiptNumber?: string;
  total: number;
  subtotal?: number;
  status?: string;
  paymentMethod?: string;
  createdAt?: any;
  dueDate?: string;
  customer?: {
    name?: string;
    email?: string;
  };
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export default function AdminInvoicesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [invoices, setInvoices] = React.useState<PlatformInvoice[]>([]);
  const [businessesMap, setBusinessesMap] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');

  // Load platform invoices in real time
  React.useEffect(() => {
    if (!firestore) return;

    // Load business names map
    const fetchBusinesses = async () => {
      try {
        const bSnap = await getDocs(collection(firestore, 'businessInstances'));
        const bMap: Record<string, string> = {};
        bSnap.docs.forEach(d => {
          const data = d.data();
          bMap[d.id] = data.name || 'Unnamed Business';
        });
        setBusinessesMap(bMap);
      } catch (err) {
        console.error('Error fetching businesses map:', err);
      }
    };
    fetchBusinesses();

    // Listen to receipts
    const q = query(collection(firestore, 'receipts'), orderBy('createdAt', 'desc'), limit(150));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allReceipts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlatformInvoice[];

      // Filter for invoicing records
      const invoiceRecords = allReceipts.filter(r =>
        r.paymentMethod === 'Invoice' ||
        (r as any).type === 'invoice' ||
        !!r.receiptNumber?.startsWith('INV')
      );

      setInvoices(invoiceRecords);
      setIsLoading(false);
    }, (err) => {
      console.error('Invoices stream error:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Aggregated Analytics
  const metrics = React.useMemo(() => {
    let grossTotal = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;
    let overdueTotal = 0;
    const now = new Date();

    const businessCounter: Record<string, { count: number; volume: number }> = {};

    invoices.forEach(inv => {
      const amt = Number(inv.total) || 0;
      grossTotal += amt;

      const date = safeToDate(inv.createdAt);
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : addDays(date, 30);
      const isPaid = inv.status === 'paid';
      const isOverdue = !isPaid && isBefore(dueDate, now);

      if (isPaid) paidTotal += amt;
      else {
        unpaidTotal += amt;
        if (isOverdue) overdueTotal += amt;
      }

      if (inv.businessId) {
        if (!businessCounter[inv.businessId]) {
          businessCounter[inv.businessId] = { count: 0, volume: 0 };
        }
        businessCounter[inv.businessId].count += 1;
        businessCounter[inv.businessId].volume += amt;
      }
    });

    const collectionRate = grossTotal > 0 ? Math.round((paidTotal / grossTotal) * 100) : 0;

    const topBusinesses = Object.entries(businessCounter)
      .map(([bId, stat]) => ({
        id: bId,
        name: businessesMap[bId] || `Business ${bId.substring(0, 6)}`,
        count: stat.count,
        volume: stat.volume
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return {
      grossTotal,
      paidTotal,
      unpaidTotal,
      overdueTotal,
      collectionRate,
      activeBusinessesCount: Object.keys(businessCounter).length,
      topBusinesses
    };
  }, [invoices, businessesMap]);

  // Filtered List
  const filteredList = React.useMemo(() => {
    const now = new Date();
    return invoices.filter(inv => {
      const isPaid = inv.status === 'paid';
      const date = safeToDate(inv.createdAt);
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : addDays(date, 30);
      const isOverdue = !isPaid && isBefore(dueDate, now);

      if (statusFilter === 'paid' && !isPaid) return false;
      if (statusFilter === 'unpaid' && (isPaid || isOverdue)) return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const num = (inv.receiptNumber || inv.id).toLowerCase();
      const cust = (inv.customer?.name || '').toLowerCase();
      const bName = (businessesMap[inv.businessId || ''] || '').toLowerCase();
      return num.includes(q) || cust.includes(q) || bName.includes(q);
    });
  }, [invoices, statusFilter, searchTerm, businessesMap]);

  const copyPublicLink = (id: string) => {
    const url = `${window.location.origin}/invoice/details?id=${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copied', description: 'Public invoice link copied to clipboard.' });
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <FileDigit className="h-5 w-5" />
            </div>
            Invoices Control Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Global system invoice telemetry, tenant billing activity, and collection audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1">
            {invoices.length} Invoices Tracked
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Invoiced */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Gross Invoiced
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              ₦{metrics.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Total money invoiced across all businesses
          </CardContent>
        </Card>

        {/* Total Collected */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              Total Collected
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              ₦{metrics.paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">{metrics.collectionRate}%</span> collection efficiency
          </CardContent>
        </Card>

        {/* Overdue Receivables */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
              Overdue Receivables
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              ₦{metrics.overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Past due date across all tenants
          </CardContent>
        </Card>

        {/* Active Invoicing Businesses */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Invoicing Tenants
              <Building className="h-4 w-4 text-indigo-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {metrics.activeBusinessesCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-muted-foreground">
            Businesses issuing regular customer invoices
          </CardContent>
        </Card>
      </div>

      {/* Top Billers & Templates Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Businesses Leaderboard */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Top Invoicing Businesses
              </CardTitle>
              <CardDescription className="text-xs">
                Highest invoice volume creators on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {metrics.topBusinesses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No business invoices generated yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topBusinesses.map((b, i) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold w-5 text-muted-foreground">#{i + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-foreground">{b.name}</p>
                          <span className="text-[10px] text-muted-foreground">{b.count} invoices issued</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-foreground">
                          ₦{b.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Intelligence */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Invoicing Templates
              </CardTitle>
              <CardDescription className="text-xs">
                Platform template adoption & availability
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {[
                { name: 'Standard', desc: 'Popular corporate layout with left logo', tag: 'Most Used', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
                { name: 'Continental', desc: 'Executive banner with vibrant header', tag: 'Executive', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
                { name: 'Spreadsheet', desc: 'Bordered accounting ledger format', tag: 'Ledger', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
                { name: 'Compact', desc: 'Space-saving single page compression', tag: 'Minimal', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' }
              ].map(t => (
                <div key={t.name} className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground block">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                  </div>
                  <Badge className={`${t.color} text-[10px] border-none font-semibold`}>
                    {t.tag}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Invoices Table */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileDigit className="h-4 w-4 text-purple-600" />
              Live Invoices Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time feed of all invoices generated by tenants across the platform
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoice, customer, business..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8 bg-background border-border"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/40 text-xs">
              {(['all', 'paid', 'unpaid', 'overdue'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                    statusFilter === s ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4 text-left">INVOICE #</th>
                  <th className="py-3 px-4 text-left">BUSINESS</th>
                  <th className="py-3 px-4 text-left">CUSTOMER</th>
                  <th className="py-3 px-4 text-left">DATE</th>
                  <th className="py-3 px-4 text-left">STATUS</th>
                  <th className="py-3 px-4 text-right">TOTAL</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      {isLoading ? 'Loading platform invoices...' : 'No invoices matching the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const date = safeToDate(inv.createdAt);
                    const dueDate = inv.dueDate ? new Date(inv.dueDate) : addDays(date, 30);
                    const isOverdue = !isPaid && isBefore(dueDate, new Date());
                    const bName = businessesMap[inv.businessId || ''] || `Business (${inv.businessId?.substring(0, 6)})`;

                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          #{inv.receiptNumber || inv.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {bName}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {inv.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {format(date, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                              PAID
                            </Badge>
                          ) : isOverdue ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-[10px] font-semibold">
                              OVERDUE
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold">
                              UNPAID
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                          ₦{(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyPublicLink(inv.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Copy Share Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="View Invoice Document"
                            >
                              <Link href={`/invoice/details?id=${inv.id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
