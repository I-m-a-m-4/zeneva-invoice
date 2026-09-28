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
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Expense {
  id?: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  createdAt: any;
}

export default function ExpensesPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [category, setCategory] = React.useState('Rent & Utilities');
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });
      setExpenses(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `businessInstances/${business.id}/expenses`), {
        category,
        description,
        amount: parseFloat(amount) || 0,
        paymentMode,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Expense Logged', description: `${category}: ${currencySymbol}${amount}` });
      setIsDialogOpen(false);
      setDescription('');
      setAmount('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error logging expense' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/expenses`, id));
      toast({ title: 'Expense record deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = expenses.filter(ex =>
    ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenseAmount = expenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Business Expenses" />
          <p className="text-xs text-muted-foreground mt-1">
            Track operational spending, office overhead, logistics, and company expenditures
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Log Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Logged Expenses</CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive"><CurrencyAmount amount={totalExpenseAmount} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Expense Records</CardDescription>
            <CardTitle className="text-2xl font-bold">{expenses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Top Category</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">Rent & Utilities</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Expense Log</CardTitle>
            <CardDescription>Audited ledger of company expenses</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Wallet className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Expenses Logged</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Keep your accounting clean by recording operational costs as they occur.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Log Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted font-medium">{ex.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ex.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ex.paymentMode || 'Cash'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ex.createdAt ? format(safeToDate(ex.createdAt), 'MMM d, yyyy') : 'Just now'}
                      </TableCell>
                      <TableCell className="font-bold text-destructive">
                        -<CurrencyAmount amount={ex.amount} currency={currencySymbol} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ex.id!)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
            <DialogTitle>Log Operating Expense</DialogTitle>
            <DialogDescription>Record business spending or overhead expenses.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exCat">Category *</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger id="exCat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rent & Utilities">Rent & Utilities</SelectItem>
                  <SelectItem value="Salaries & Wages">Salaries & Wages</SelectItem>
                  <SelectItem value="Logistics & Shipping">Logistics & Shipping</SelectItem>
                  <SelectItem value="Marketing & Ads">Marketing & Ads</SelectItem>
                  <SelectItem value="Equipment & Repairs">Equipment & Repairs</SelectItem>
                  <SelectItem value="Software & Cloud">Software & Cloud</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exDesc">Description / Reason *</Label>
              <Input id="exDesc" placeholder="e.g. Office Generator Fuel / Internet subscription" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exAmount">Amount ({currencySymbol}) *</Label>
                <Input id="exAmount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exMode">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                  <SelectTrigger id="exMode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Log Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
