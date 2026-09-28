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
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  PackageCheck,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface PurchaseOrder {
  id?: string;
  poNumber: string;
  vendorName: string;
  amount: number;
  status: 'draft' | 'ordered' | 'received';
  createdAt: any;
  notes?: string;
}

export default function PurchaseOrdersPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = React.useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [vendorName, setVendorName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/purchaseOrders`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as PurchaseOrder);
      });
      setOrders(items);
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
      const poNum = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/purchaseOrders`), {
        poNumber: poNum,
        vendorName,
        amount: parseFloat(amount) || 0,
        status: 'draft',
        notes,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Purchase Order Created', description: `PO #${poNum}` });
      setIsDialogOpen(false);
      setVendorName('');
      setAmount('');
      setNotes('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error creating purchase order' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: PurchaseOrder['status']) => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/purchaseOrders`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `PO status marked as ${status}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    }
  };

  const handleConvertToBill = async (o: PurchaseOrder) => {
    if (!business?.id || !firestore) return;
    try {
      const bNum = `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/bills`), {
        billNumber: bNum,
        vendorName: o.vendorName,
        amount: o.amount || 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        notes: `Generated from Purchase Order #${o.poNumber}. ${o.notes || ''}`,
        createdAt: serverTimestamp(),
      });

      if (o.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/purchaseOrders`, o.id), {
          status: 'received',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Vendor Bill Created!',
        description: `Billed #${bNum} created from PO #${o.poNumber}.`,
      });

      router.push('/bills');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to convert PO to Bill' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/purchaseOrders`, id));
      toast({ title: 'Purchase order deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = orders.filter(o =>
    o.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Purchase Orders" />
          <p className="text-xs text-muted-foreground mt-1">
            Order stock and raw materials from vendors with automated restock tracking
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> New Purchase Order
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Orders Value</CardDescription>
            <CardTitle className="text-2xl font-bold"><CurrencyAmount amount={totalPoValue} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Purchase Orders Count</CardDescription>
            <CardTitle className="text-2xl font-bold">{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Received Stock Orders</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'received').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Purchase Orders Log</CardTitle>
            <CardDescription>Track vendor procurement and delivery status</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Purchase Orders</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Draft purchase orders to buy inventory from vendors.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create PO
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono font-medium">{o.poNumber}</TableCell>
                      <TableCell className="font-medium">{o.vendorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.createdAt ? format(safeToDate(o.createdAt), 'MMM d, yyyy') : 'Just now'}
                      </TableCell>
                      <TableCell className="font-semibold"><CurrencyAmount amount={o.amount} currency={currencySymbol} /></TableCell>
                      <TableCell>
                        {o.status === 'received' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Received</Badge>}
                        {o.status === 'ordered' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ordered</Badge>}
                        {o.status === 'draft' && <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status !== 'received' ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(o.id!, 'received')}>
                              <PackageCheck className="h-3.5 w-3.5 mr-1 text-green-600" /> Mark Received
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                              onClick={() => handleConvertToBill(o)}
                              title="Generate vendor bill from this purchase order"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> Convert to Bill
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(o.id!)}>
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
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Draft a formal purchase order to send to a vendor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="poVendor">Vendor Name *</Label>
              <Input id="poVendor" placeholder="Supplier or vendor company" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poAmount">Total Order Amount ({currencySymbol}) *</Label>
              <Input id="poAmount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poNotes">Order Items / Notes</Label>
              <Input id="poNotes" placeholder="Stock items list..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create PO</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
