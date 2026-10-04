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
  Paintbrush,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  Clock,
  FilePlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface ServiceItem {
  id?: string;
  name: string;
  category?: string;
  rate: number;
  billingType: 'fixed' | 'hourly';
  description?: string;
  createdAt: any;
}

export default function ServicesPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [services, setServices] = React.useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ServiceItem | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('General Service');
  const [rate, setRate] = React.useState('');
  const [billingType, setBillingType] = React.useState<'fixed' | 'hourly'>('fixed');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/services`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ServiceItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ServiceItem);
      });
      setServices(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const openAdd = () => {
    setEditingService(null);
    setName('');
    setCategory('General Service');
    setRate('');
    setBillingType('fixed');
    setDescription('');
    setIsDialogOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditingService(s);
    setName(s.name || '');
    setCategory(s.category || 'General Service');
    setRate(s.rate ? s.rate.toString() : '');
    setBillingType(s.billingType || 'fixed');
    setDescription(s.description || '');
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rate || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Service name and rate are required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingService?.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/services`, editingService.id), {
          name,
          category,
          rate: parseFloat(rate) || 0,
          billingType,
          description,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Service updated' });
      } else {
        await addDoc(collection(firestore, `businessInstances/${business.id}/services`), {
          name,
          category,
          rate: parseFloat(rate) || 0,
          billingType,
          description,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Service added to catalog' });
      }

      setIsDialogOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving service' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvoiceForService = async (service: ServiceItem) => {
    if (!business?.id || !firestore) return;

    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const sRate = service.rate || 0;

      await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: 'Valued Client',
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: sRate,
        tax: 0,
        total: sRate,
        items: [
          {
            id: service.id || 'service-line',
            name: service.name,
            price: sRate,
            quantity: 1,
            amount: sRate,
          }
        ],
        notes: `Direct service invoice: ${service.name} (${service.billingType === 'hourly' ? 'Hourly consulting' : 'Fixed fee deliverable'})`,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Invoice Drafted for Service!',
        description: `Created Invoice #${invNumber} with ${service.name}.`,
      });

      router.push('/invoices');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not create invoice for service' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service item?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/services`, id));
      toast({ title: 'Service deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Service Catalog" />
          <p className="text-xs text-muted-foreground mt-1">
            Manage billable non-inventory services, consulting rates, and labor packages
          </p>
        </div>
        <Button onClick={openAdd} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Services Offered</CardDescription>
            <CardTitle className="text-2xl font-bold">{services.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Hourly Billing Items</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {services.filter(s => s.billingType === 'hourly').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Fixed Package Items</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {services.filter(s => s.billingType === 'fixed').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Services Register</CardTitle>
            <CardDescription>Catalog of services available for invoice line items</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Paintbrush className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Services Configured</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add billable services, consulting fees, or repair packages to select in invoices.</p>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Service
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billing Model</TableHead>
                    <TableHead>Rate / Fee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-bold text-sm">{s.name}</div>
                        {s.description && <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-muted font-normal">{s.category || 'General'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.billingType === 'hourly' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Hourly Rate</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fixed Rate</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">
                        <CurrencyAmount amount={s.rate} currency={currencySymbol} />
                        {s.billingType === 'hourly' && <span className="text-xs text-muted-foreground font-normal"> / hr</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleCreateInvoiceForService(s)}
                            title="Generate invoice for this service"
                          >
                            <FilePlus className="h-3.5 w-3.5 mr-1" /> Invoice
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id!)}>
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
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            <DialogDescription>Define service rate and billing type for client invoices.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sName">Service Title *</Label>
              <Input id="sName" placeholder="e.g. Graphic Design / HVAC Maintenance" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sCategory">Category</Label>
                <Input id="sCategory" placeholder="e.g. Consulting" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sType">Billing Type</Label>
                <Select value={billingType} onValueChange={(val: any) => setBillingType(val)}>
                  <SelectTrigger id="sType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Flat Fee</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sRate">Rate ({currencySymbol}) *</Label>
              <Input id="sRate" type="number" step="0.01" placeholder="0.00" value={rate} onChange={(e) => setRate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sDesc">Service Description</Label>
              <Input id="sDesc" placeholder="Scope of work included..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editingService ? 'Update Service' : 'Save Service'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
