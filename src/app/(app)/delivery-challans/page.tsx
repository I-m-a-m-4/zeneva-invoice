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
import { safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  MapPin,
  UserCheck,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface DeliveryChallan {
  id?: string;
  challanNumber: string;
  customerName: string;
  deliveryAddress: string;
  driverName?: string;
  vehicleNumber?: string;
  status: 'pending' | 'in_transit' | 'delivered';
  createdAt: any;
  itemsDescription?: string;
}

export default function DeliveryChallansPage() {
  const { business } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [challans, setChallans] = React.useState<DeliveryChallan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [customerName, setCustomerName] = React.useState('');
  const [deliveryAddress, setDeliveryAddress] = React.useState('');
  const [driverName, setDriverName] = React.useState('');
  const [vehicleNumber, setVehicleNumber] = React.useState('');
  const [itemsDescription, setItemsDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/deliveryChallans`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: DeliveryChallan[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as DeliveryChallan);
      });
      setChallans(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !deliveryAddress || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const chNum = `DC-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/deliveryChallans`), {
        challanNumber: chNum,
        customerName,
        deliveryAddress,
        driverName,
        vehicleNumber,
        itemsDescription,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Delivery Challan Created', description: `Challan #${chNum}` });
      setIsDialogOpen(false);
      setCustomerName('');
      setDeliveryAddress('');
      setDriverName('');
      setVehicleNumber('');
      setItemsDescription('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error creating delivery note' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: DeliveryChallan['status']) => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/deliveryChallans`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Delivery status updated to ${status.replace('_', ' ')}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update delivery status' });
    }
  };

  const handleInvoiceChallan = async (c: DeliveryChallan) => {
    if (!business?.id || !firestore) return;
    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

      await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: c.customerName,
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: 0,
        tax: 0,
        total: 0,
        items: [
          {
            id: c.id || 'challan-delivery',
            name: `Goods Delivery: ${c.itemsDescription || 'Dispatched Items'}`,
            price: 0,
            quantity: 1,
            amount: 0,
          }
        ],
        notes: `Invoiced following delivery of Challan #${c.challanNumber} to ${c.deliveryAddress}. Vehicle: ${c.vehicleNumber || 'Standard freight'}`,
        createdAt: serverTimestamp(),
      });

      if (c.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/deliveryChallans`, c.id), {
          status: 'delivered',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Invoice Drafted from Delivery!',
        description: `Created Invoice #${invNumber} for ${c.customerName}.`,
      });

      router.push('/invoices');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to generate invoice' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery challan?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/deliveryChallans`, id));
      toast({ title: 'Challan deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete challan' });
    }
  };

  const filtered = challans.filter(c =>
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deliveredCount = challans.filter(c => c.status === 'delivered').length;
  const transitCount = challans.filter(c => c.status === 'in_transit').length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Delivery Challans" />
          <p className="text-xs text-muted-foreground mt-1">
            Dispatch notes, waybills, and logistics delivery verification documents
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> New Delivery Challan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Shipments Logged</CardDescription>
            <CardTitle className="text-2xl font-bold">{challans.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">In Transit</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">{transitCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Delivered to Client</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">{deliveredCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Challan Registry</CardTitle>
            <CardDescription>Track goods dispatch and proof of delivery</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Truck className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Delivery Challans Created</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create dispatch notes for drivers and warehouse shipping verification.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create Delivery Challan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan #</TableHead>
                    <TableHead>Customer & Address</TableHead>
                    <TableHead>Logistics Info</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.challanNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{c.customerName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {c.deliveryAddress}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.driverName && <div>Driver: {c.driverName}</div>}
                        {c.vehicleNumber && <div className="text-muted-foreground">Vehicle: {c.vehicleNumber}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.createdAt ? format(safeToDate(c.createdAt), 'MMM d, yyyy') : 'Just now'}
                      </TableCell>
                      <TableCell>
                        {c.status === 'delivered' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>}
                        {c.status === 'in_transit' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Transit</Badge>}
                        {c.status === 'pending' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            onClick={() => handleInvoiceChallan(c)}
                            title="Generate invoice for this delivered dispatch"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
                          </Button>
                          {c.status !== 'delivered' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(c.id!, 'delivered')}>
                              <UserCheck className="h-3.5 w-3.5 mr-1 text-green-600" /> Mark Delivered
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id!)}>
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
            <DialogTitle>New Delivery Challan</DialogTitle>
            <DialogDescription>Create a goods dispatch waybill for delivery.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dcCustomer">Customer Name *</Label>
              <Input id="dcCustomer" placeholder="Recipient customer or store" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dcAddress">Delivery Address *</Label>
              <Input id="dcAddress" placeholder="Full delivery location" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dcDriver">Driver Name</Label>
                <Input id="dcDriver" placeholder="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dcVehicle">Vehicle No.</Label>
                <Input id="dcVehicle" placeholder="e.g. KJA-123XY" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dcItems">Dispatched Items / Description</Label>
              <Input id="dcItems" placeholder="5 Cartons of electronics..." value={itemsDescription} onChange={(e) => setItemsDescription(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create Challan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
