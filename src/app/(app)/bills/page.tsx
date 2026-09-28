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
import { format, addDays, isBefore } from 'date-fns';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Bill {
  id?: string;
  billNumber: string;
  vendorName: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: any;
  notes?: string;
}

export default function BillsPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [bills, setBills] = React.useState<Bill[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [vendorName, setVendorName] = React.useState('');
  const [billNumber, setBillNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/bills`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Bill[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Bill);
      });
      setBills(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const bNum = billNumber || `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/bills`), {
        billNumber: bNum,
        vendorName,
        amount: parseFloat(amount) || 0,
        dueDate: dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        status: 'pending',
        notes,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Bill Logged', description: `Bill #${bNum}` });
      setIsDialogOpen(false);
      setVendorName('');
      setBillNumber('');
      setAmount('');
      setDueDate('');
      setNotes('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error logging bill' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Bill['status']) => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/bills`, id), {
        status,
        updatedAt: serverTimestamp(),
      });

      if (status === 'paid') {
        const bill = bills.find(b => b.id === id);
        if (bill) {
          await addDoc(collection(firestore, `businessInstances/${business.id}/expenses`), {
            category: 'Vendor Bills & Cost of Goods',
            description: `Settlement for Bill #${bill.billNumber} to ${bill.vendorName}`,
            amount: bill.amount,
            paymentMode: 'Bank Transfer',
            billId: id,
            createdAt: serverTimestamp(),
          });
        }
        toast({ title: 'Bill marked as Paid', description: 'Recorded in business expenses & accounts payable ledger.' });
      } else {
        toast({ title: `Bill marked as ${status}` });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/bills`, id));
      toast({ title: 'Bill deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = bills.filter(b =>
    b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayables = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Vendor Bills" />
          <p className="text-xs text-muted-foreground mt-1">
            Accounts payable management for supplier invoices and utility bills
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Log Vendor Bill
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Outstanding Payables</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600"><CurrencyAmount amount={totalPayables} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Paid Bills</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600"><CurrencyAmount amount={totalPaid} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Pending Bills Count</CardDescription>
            <CardTitle className="text-2xl font-bold">{bills.filter(b => b.status !== 'paid').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Bills Register</CardTitle>
            <CardDescription>Track accounts payable and due dates</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Vendor Bills Logged</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Log bills received from suppliers to track upcoming due dates.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Log Bill
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.billNumber}</TableCell>
                      <TableCell className="font-medium">{b.vendorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.dueDate || '—'}</TableCell>
                      <TableCell className="font-semibold"><CurrencyAmount amount={b.amount} currency={currencySymbol} /></TableCell>
                      <TableCell>
                        {b.status === 'paid' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>}
                        {b.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                        {b.status === 'overdue' && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.status !== 'paid' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(b.id!, 'paid')}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Mark Paid
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id!)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Vendor Bill</DialogTitle>
            <DialogDescription>Record a bill or supplier invoice payable.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="bVendor">Vendor Name *</Label>
              <Input id="bVendor" placeholder="Supplier or utility company" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bNo">Vendor Bill Ref #</Label>
                <Input id="bNo" placeholder="e.g. INV-9901" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bAmount">Amount ({currencySymbol}) *</Label>
                <Input id="bAmount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bDue">Payment Due Date</Label>
              <Input id="bDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Log Bill</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
