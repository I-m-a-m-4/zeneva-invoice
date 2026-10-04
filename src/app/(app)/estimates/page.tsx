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
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  FileCheck,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Estimate {
  id?: string;
  estimateNumber: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdAt: any;
  notes?: string;
}

export default function EstimatesPage() {
  const { business, currencySymbol, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [estimates, setEstimates] = React.useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);

  // Form
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/estimates`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Estimate[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Estimate);
      });
      setEstimates(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const estNum = `EST-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/estimates`), {
        estimateNumber: estNum,
        customerName,
        customerEmail,
        amount: parseFloat(amount) || 0,
        status: 'draft',
        notes,
        createdAt: serverTimestamp(),
      });

      toast({ variant: 'success', title: 'Quote Created', description: `Estimate #${estNum} has been recorded.` });
      setIsDialogOpen(false);
      setCustomerName('');
      setCustomerEmail('');
      setAmount('');
      setNotes('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to create quote' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'sent' | 'accepted' | 'declined') => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/estimates`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Quote marked as ${status}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    }
  };

  // Convert Quote into an official Invoice in Firestore
  const handleConvertToInvoice = async (est: Estimate) => {
    if (!est.id || !business?.id || !firestore) return;
    setConvertingId(est.id);
    try {
      const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const newInvoiceRef = await addDoc(collection(firestore, 'receipts'), {
        businessId: business.id,
        receiptNumber: invNum,
        paymentMethod: 'Invoice',
        type: 'invoice',
        status: 'unpaid',
        customer: {
          name: est.customerName,
          email: est.customerEmail || ''
        },
        items: [
          {
            name: `Project Quote: ${est.estimateNumber}`,
            price: Number(est.amount),
            quantity: 1,
            total: Number(est.amount)
          }
        ],
        subtotal: Number(est.amount),
        total: Number(est.amount),
        notes: est.notes || `Converted from Quote #${est.estimateNumber}`,
        createdAt: serverTimestamp(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Update quote status to accepted
      await updateDoc(doc(firestore, `businessInstances/${business.id}/estimates`, est.id), {
        status: 'accepted',
        invoiceId: newInvoiceRef.id,
        updatedAt: serverTimestamp()
      });

      if (triggerRefresh) triggerRefresh();
      toast({ variant: 'success', title: 'Converted to Invoice!', description: `Invoice #${invNum} is ready.` });
      router.push(`/invoice/details?id=${newInvoiceRef.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error converting quote', description: err.message });
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/estimates`, id));
      toast({ title: 'Quote deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete quote' });
    }
  };

  const filtered = estimates.filter(e =>
    e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = estimates.reduce((sum, e) => sum + (e.amount || 0), 0);
  const acceptedCount = estimates.filter(e => e.status === 'accepted').length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full bg-background text-foreground">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <PageTitle title="Quotes & Estimates" />
          <p className="text-xs text-muted-foreground mt-1">
            Create cost proposals, track client acceptances, and convert directly to invoices
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-md shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Quote
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Quotes Value</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground"><CurrencyAmount amount={totalValue} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Estimates Issued</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">{estimates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Accepted Proposals</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{acceptedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quotes Table */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Quotes Log</CardTitle>
            <CardDescription className="text-xs">Review quotes and convert accepted proposals into invoices</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-background border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed m-6 rounded-xl bg-muted/20">
              <Calculator className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Quotes Found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Provide cost quotes to prospective clients before starting work.</p>
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Quote
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">ESTIMATE #</TableHead>
                    <TableHead className="text-xs font-semibold">CUSTOMER</TableHead>
                    <TableHead className="text-xs font-semibold">DATE</TableHead>
                    <TableHead className="text-xs font-semibold">AMOUNT</TableHead>
                    <TableHead className="text-xs font-semibold">STATUS</TableHead>
                    <TableHead className="text-xs font-semibold text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filtered.map((e) => {
                    const id = e.id || '';
                    return (
                      <TableRow key={id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-foreground">#{e.estimateNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{e.customerName}</div>
                          {e.customerEmail && <div className="text-[11px] text-muted-foreground">{e.customerEmail}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {e.createdAt ? format(safeToDate(e.createdAt), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          <CurrencyAmount amount={e.amount} currency={currencySymbol} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-semibold uppercase ${
                              e.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : e.status === 'declined'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                : e.status === 'sent'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-400 border border-sky-300 dark:border-sky-800'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Convert to Invoice Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConvertToInvoice(e)}
                              disabled={convertingId === id}
                              className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                              title="Convert to Live Invoice"
                            >
                              {convertingId === id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <ArrowRight className="h-3 w-3 mr-1" />
                              )}
                              Invoice
                            </Button>

                            {e.status !== 'accepted' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(id, 'accepted')}
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Accept Quote"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete"
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
              <Plus className="h-5 w-5 text-primary" />
              Create Project Quote
            </DialogTitle>
            <DialogDescription className="text-xs">
              Prepare a formal estimate for a prospective client
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer / Client Name *</Label>
              <Input
                placeholder="e.g. Globex Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Customer Email</Label>
              <Input
                type="email"
                placeholder="billing@globex.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Amount ({currencySymbol || '₦'}) *</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs">Scope / Deliverables Notes</Label>
              <Input
                placeholder="Brief summary of work covered..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5">
                {isSubmitting ? 'Creating...' : 'Save Quote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
