'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import {
  Repeat,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  Play,
  Pause,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface RecurringInvoice {
  id?: string;
  profileName: string;
  customerName: string;
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  amount: number;
  status: 'active' | 'paused';
  nextRunDate: string;
  createdAt: any;
}

export default function RecurringInvoicesPage() {
  const { business, currencySymbol, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [profiles, setProfiles] = React.useState<RecurringInvoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [runningId, setRunningId] = React.useState<string | null>(null);

  // Form State
  const [profileName, setProfileName] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [frequency, setFrequency] = React.useState<'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [amount, setAmount] = React.useState('');
  const [nextRunDate, setNextRunDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/recurringInvoices`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: RecurringInvoice[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as RecurringInvoice);
      });
      setProfiles(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !customerName || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `businessInstances/${business.id}/recurringInvoices`), {
        profileName,
        customerName,
        frequency,
        amount: parseFloat(amount) || 0,
        status: 'active',
        nextRunDate: nextRunDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      toast({ variant: 'success', title: 'Recurring Schedule Created', description: `Profile: ${profileName}` });
      setIsDialogOpen(false);
      setProfileName('');
      setCustomerName('');
      setAmount('');
      setNextRunDate('');
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create recurring profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate an invoice immediately from this recurring profile
  const handleGenerateInvoiceNow = async (profile: RecurringInvoice) => {
    if (!profile.id || !business?.id || !firestore) return;
    setRunningId(profile.id);
    try {
      const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const dueDate = addDays(now, 15);

      const newInvRef = await addDoc(collection(firestore, 'receipts'), {
        businessId: business.id,
        receiptNumber: invNum,
        paymentMethod: 'Invoice',
        type: 'invoice',
        status: 'unpaid',
        customer: {
          name: profile.customerName,
          email: ''
        },
        items: [
          {
            name: `${profile.profileName} (${profile.frequency} Subscription)`,
            price: Number(profile.amount),
            quantity: 1,
            total: Number(profile.amount)
          }
        ],
        subtotal: Number(profile.amount),
        total: Number(profile.amount),
        notes: `Auto-generated from subscription profile #${profile.profileName}`,
        createdAt: serverTimestamp(),
        dueDate: dueDate.toISOString()
      });

      // Advance next run date
      const daysToAdd = profile.frequency === 'Weekly' ? 7 : profile.frequency === 'Monthly' ? 30 : profile.frequency === 'Quarterly' ? 90 : 365;
      const nextDate = addDays(now, daysToAdd).toISOString().split('T')[0];

      await updateDoc(doc(firestore, `businessInstances/${business.id}/recurringInvoices`, profile.id), {
        nextRunDate: nextDate,
        lastGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (triggerRefresh) triggerRefresh();
      toast({ variant: 'success', title: 'Invoice Issued!', description: `Invoice #${invNum} generated from recurring profile.` });
      router.push(`/invoice/details?id=${newInvRef.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error issuing invoice', description: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const handleToggleStatus = async (id: string, current: 'active' | 'paused') => {
    if (!business?.id || !firestore) return;
    try {
      const newStatus = current === 'active' ? 'paused' : 'active';
      await updateDoc(doc(firestore, `businessInstances/${business.id}/recurringInvoices`, id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Schedule marked as ${newStatus}` });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update schedule' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring schedule?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/recurringInvoices`, id));
      toast({ title: 'Schedule deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete schedule' });
    }
  };

  const filtered = profiles.filter(p =>
    p.profileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMonthlyRunRate = profiles
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <PageTitle title="Recurring Invoices" />
          <p className="text-xs text-muted-foreground mt-1">
            Automate retainer billing, subscriptions, and periodic client invoicing
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-md shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Recurring Profile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Run Rate</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-primary">
              <CurrencyAmount amount={totalMonthlyRunRate} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Schedules</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {profiles.filter(p => p.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Retainers</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">{profiles.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Recurring Profiles</CardTitle>
            <CardDescription className="text-xs">Scheduled invoice generation pipelines</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search profile or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-background border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed m-6 rounded-xl bg-muted/20">
              <Repeat className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Recurring Invoices Created</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Set up automated billing for recurring retainers, memberships, or SaaS.</p>
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Profile
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">PROFILE NAME</TableHead>
                    <TableHead className="text-xs font-semibold">CUSTOMER</TableHead>
                    <TableHead className="text-xs font-semibold">FREQUENCY</TableHead>
                    <TableHead className="text-xs font-semibold">AMOUNT</TableHead>
                    <TableHead className="text-xs font-semibold">NEXT RUN</TableHead>
                    <TableHead className="text-xs font-semibold">STATUS</TableHead>
                    <TableHead className="text-xs font-semibold text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const id = p.id || '';
                    return (
                      <TableRow key={id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-foreground">{p.profileName}</TableCell>
                        <TableCell className="font-medium text-foreground">{p.customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted/60 text-foreground border-border text-[10px]">
                            {p.frequency}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          <CurrencyAmount amount={p.amount} currency={currencySymbol} />
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.nextRunDate || 'Pending'}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-semibold uppercase ${
                              p.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Run Now Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateInvoiceNow(p)}
                              disabled={runningId === id}
                              className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                              title="Generate Live Invoice Now"
                            >
                              {runningId === id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <ArrowRight className="h-3 w-3 mr-1" />
                              )}
                              Run Now
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(id, p.status)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title={p.status === 'active' ? 'Pause' : 'Activate'}
                            >
                              {p.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-600" />}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete Profile"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              New Recurring Schedule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Automate scheduled invoice generation for your clients
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Subscription / Retainer Title *</Label>
              <Input
                placeholder="e.g. Monthly SEO Retainer"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Customer Name *</Label>
              <Input
                placeholder="e.g. Acme Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                  <SelectTrigger className="bg-background border-border text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-xs">
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Recurring Amount ({currencySymbol || '₦'}) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="bg-background border-border text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Start Date / Next Run</Label>
              <Input
                type="date"
                value={nextRunDate}
                onChange={(e) => setNextRunDate(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5">
                {isSubmitting ? 'Creating...' : 'Save Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
