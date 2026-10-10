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
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Check,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';

interface CreditNote {
  id?: string;
  creditNoteNumber: string;
  customerName: string;
  invoiceId?: string;
  invoiceReference?: string;
  amount: number;
  reason: string;
  status: 'open' | 'applied' | 'refunded';
  createdAt: any;
}

export default function CreditNotesPage() {
  const { business, receipts, currencySymbol, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [creditNotes, setCreditNotes] = React.useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [invoiceReference, setInvoiceReference] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Invoices to link credit notes to
  const invoiceList = React.useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(r => r.paymentMethod === 'Invoice' || r.type === 'invoice');
  }, [receipts]);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/creditNotes`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: CreditNote[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as CreditNote);
      });
      setCreditNotes(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoiceList.find(i => i.id === invId);
    if (inv) {
      setInvoiceReference(inv.receiptNumber || `INV-${inv.id.substring(0, 8)}`);
      setCustomerName(inv.customer?.name || 'Customer');
      setAmount(String(inv.total || ''));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const cnNum = `CN-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/creditNotes`), {
        creditNoteNumber: cnNum,
        customerName,
        invoiceId: selectedInvoiceId || null,
        invoiceReference: invoiceReference || null,
        amount: parseFloat(amount) || 0,
        reason: reason || 'Customer return / billing adjustment',
        status: 'open',
        createdAt: serverTimestamp(),
      });

      toast({ variant: 'success', title: 'Credit Note Created', description: `Credit Note #${cnNum}` });
      setIsDialogOpen(false);
      setSelectedInvoiceId('');
      setCustomerName('');
      setInvoiceReference('');
      setAmount('');
      setReason('');
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create credit note' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'open' | 'applied' | 'refunded') => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/creditNotes`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Credit note marked as ${status}` });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update credit note status' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit note?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/creditNotes`, id));
      toast({ title: 'Credit note deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete credit note' });
    }
  };

  const filtered = creditNotes.filter(cn =>
    cn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOpenCredits = creditNotes
    .filter(cn => cn.status === 'open')
    .reduce((sum, cn) => sum + (cn.amount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <PageTitle title="Credit Notes" />
          <p className="text-xs text-muted-foreground mt-1">
            Manage billing adjustments, customer refunds, and credit allocations
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-md shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Credit Note
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Credit Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground"><CurrencyAmount amount={totalOpenCredits} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Credit Notes</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {creditNotes.filter(cn => cn.status === 'open').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Adjustments Issued</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{creditNotes.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Credit Notes Log</CardTitle>
            <CardDescription className="text-xs">Customer credits and adjustment vouchers</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search credit notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-background border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed m-6 rounded-xl bg-muted/20">
              <RotateCcw className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Credit Notes Issued</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Issue credit notes to handle customer returns, billing corrections, or fee discounts.</p>
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Credit Note
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">CREDIT NOTE #</TableHead>
                    <TableHead className="text-xs font-semibold">CUSTOMER</TableHead>
                    <TableHead className="text-xs font-semibold">INVOICE REF</TableHead>
                    <TableHead className="text-xs font-semibold">DATE</TableHead>
                    <TableHead className="text-xs font-semibold">REASON</TableHead>
                    <TableHead className="text-xs font-semibold">AMOUNT</TableHead>
                    <TableHead className="text-xs font-semibold">STATUS</TableHead>
                    <TableHead className="text-xs font-semibold text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filtered.map((cn) => {
                    const id = cn.id || '';
                    return (
                      <TableRow key={id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-foreground">#{cn.creditNoteNumber}</TableCell>
                        <TableCell className="font-medium text-foreground">{cn.customerName}</TableCell>
                        <TableCell className="text-xs">
                          {cn.invoiceId ? (
                            <Link href={`/invoice/details?id=${cn.invoiceId}`} className="text-primary font-bold hover:underline flex items-center gap-1">
                              {cn.invoiceReference || 'Invoice'}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{cn.invoiceReference || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {cn.createdAt ? format(safeToDate(cn.createdAt), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{cn.reason}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          <CurrencyAmount amount={cn.amount} currency={currencySymbol} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-semibold uppercase ${
                              cn.status === 'open'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                : cn.status === 'applied'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {cn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {cn.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(id, 'applied')}
                                className="h-7 text-xs border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                <Check className="h-3 w-3 mr-1" /> Mark Applied
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete Entry"
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
              <RotateCcw className="h-5 w-5 text-primary" />
              Issue Credit Note
            </DialogTitle>
            <DialogDescription className="text-xs">
              Credit a customer balance or offset an existing invoice
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {invoiceList.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Link to Customer Invoice (Optional)</Label>
                <Select value={selectedInvoiceId} onValueChange={handleSelectInvoice}>
                  <SelectTrigger className="bg-background border-border text-xs h-9">
                    <SelectValue placeholder="Choose an invoice to adjust..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-xs">
                    {invoiceList.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.receiptNumber || inv.id.substring(0, 8)} &mdash; {inv.customer?.name || 'Customer'} ({currencySymbol || '₦'}{inv.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <div className="space-y-1.5">
              <Label className="text-xs">Credit Amount ({currencySymbol || '₦'}) *</Label>
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
              <Label className="text-xs">Adjustment Reason</Label>
              <Input
                placeholder="e.g. Returned goods, courtesy billing discount"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-5">
                {isSubmitting ? 'Creating...' : 'Issue Credit Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
