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
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Eye,
  FileCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface ProformaInvoice {
  id?: string;
  proformaNumber: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'converted';
  createdAt: any;
  notes?: string;
}

export default function ProformaInvoicesPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [proformas, setProformas] = React.useState<ProformaInvoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Real-time listener
  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/proformaInvoices`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ProformaInvoice[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ProformaInvoice);
      });
      setProformas(items);
      setIsLoading(false);
    }, (err) => {
      console.warn('Proforma listener:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Missing required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const pNumber = `PRO-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/proformaInvoices`), {
        proformaNumber: pNumber,
        customerName,
        customerEmail,
        amount: parseFloat(amount) || 0,
        status: 'draft',
        notes,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Proforma Invoice Created', description: `Number: ${pNumber}` });
      setIsDialogOpen(false);
      setCustomerName('');
      setCustomerEmail('');
      setAmount('');
      setNotes('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error creating proforma invoice' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToInvoice = async (p: ProformaInvoice) => {
    if (!business?.id || !firestore) return;
    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = p.amount || 0;

      await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: p.customerName,
        customerEmail: p.customerEmail || '',
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: amount,
        tax: 0,
        total: amount,
        items: [
          {
            id: p.id || 'proforma-item',
            name: `Proforma #${p.proformaNumber} Services/Goods`,
            price: amount,
            quantity: 1,
            amount: amount,
          }
        ],
        notes: `Converted from Proforma Invoice #${p.proformaNumber}. ${p.notes || ''}`,
        createdAt: serverTimestamp(),
      });

      if (p.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/proformaInvoices`, p.id), {
          status: 'converted',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Converted to Invoice!',
        description: `Generated Invoice #${invNumber} for ${p.customerName}.`,
      });

      router.push('/invoices');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to convert to invoice' });
    }
  };

  const handleStatusChange = async (id: string, status: 'sent' | 'converted') => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/proformaInvoices`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Status updated to ${status}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proforma invoice?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/proformaInvoices`, id));
      toast({ title: 'Proforma Invoice deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filteredProformas = proformas.filter(p =>
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proformaNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = proformas.reduce((sum, p) => sum + (p.amount || 0), 0);
  const convertedCount = proformas.filter(p => p.status === 'converted').length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Proforma Invoices" />
          <p className="text-xs text-muted-foreground mt-1">
            Issue preliminary invoices & binding quotes to clients prior to final delivery
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> New Proforma Invoice
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Proforma Value</CardDescription>
            <CardTitle className="text-2xl font-bold"><CurrencyAmount amount={totalValue} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Issued Proformas</CardDescription>
            <CardTitle className="text-2xl font-bold">{proformas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Converted to Tax Invoice</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">{convertedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Proforma Register</CardTitle>
            <CardDescription>Manage and convert proformas into final tax invoices</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search proformas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProformas.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Proforma Invoices Found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first proforma to outline estimated charges for clients.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create Proforma
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proforma #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProformas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-medium">{p.proformaNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{p.customerName}</div>
                        {p.customerEmail && <div className="text-xs text-muted-foreground">{p.customerEmail}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.createdAt ? format(safeToDate(p.createdAt), 'MMM d, yyyy') : 'Just now'}
                      </TableCell>
                      <TableCell className="font-semibold"><CurrencyAmount amount={p.amount} currency={currencySymbol} /></TableCell>
                      <TableCell>
                        {p.status === 'converted' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Converted</Badge>}
                        {p.status === 'sent' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>}
                        {p.status === 'draft' && <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status !== 'converted' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40" onClick={() => handleConvertToInvoice(p)}>
                              <FileCheck className="h-3.5 w-3.5 mr-1 text-green-600" /> Convert to Invoice
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id!)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Proforma Invoice</DialogTitle>
            <DialogDescription>Create a formal preliminary invoice quote for your customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cName">Customer Name *</Label>
              <Input id="cName" placeholder="Client or company name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cEmail">Customer Email</Label>
              <Input id="cEmail" type="email" placeholder="client@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pAmount">Total Amount ({currencySymbol}) *</Label>
              <Input id="pAmount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pNotes">Scope / Notes</Label>
              <Input id="pNotes" placeholder="Payment terms or delivery timeframe..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create Proforma</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
