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
  Building,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Vendor {
  id?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: any;
}

export default function VendorsPage() {
  const { business } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [contactPerson, setContactPerson] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [taxId, setTaxId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/vendors`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Vendor[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Vendor);
      });
      setVendors(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const openAdd = () => {
    setEditingVendor(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxId('');
    setIsDialogOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditingVendor(v);
    setName(v.name || '');
    setContactPerson(v.contactPerson || '');
    setEmail(v.email || '');
    setPhone(v.phone || '');
    setAddress(v.address || '');
    setTaxId(v.taxId || '');
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Vendor name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVendor?.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/vendors`, editingVendor.id), {
          name,
          contactPerson,
          email,
          phone,
          address,
          taxId,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Vendor updated successfully' });
      } else {
        await addDoc(collection(firestore, `businessInstances/${business.id}/vendors`), {
          name,
          contactPerson,
          email,
          phone,
          address,
          taxId,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Vendor added to directory' });
      }

      setIsDialogOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving vendor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/vendors`, id));
      toast({ title: 'Vendor deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete vendor' });
    }
  };

  const handleBillVendor = async (v: Vendor) => {
    if (!business?.id || !firestore) return;
    try {
      const bNum = `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(firestore, `businessInstances/${business.id}/bills`), {
        billNumber: bNum,
        vendorName: v.name,
        amount: 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        notes: `Bill initiated for ${v.name}. Contact: ${v.contactPerson || 'N/A'}, Phone: ${v.phone || 'N/A'}`,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Bill Drafted', description: `Drafted Bill #${bNum} for ${v.name}` });
      router.push('/bills');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not draft bill' });
    }
  };

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Vendors & Suppliers" />
          <p className="text-xs text-muted-foreground mt-1">
            Supplier CRM directory for goods procurement and vendor payables
          </p>
        </div>
        <Button onClick={openAdd} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Active Vendors</CardDescription>
            <CardTitle className="text-2xl font-bold">{vendors.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Vendors with Tax ID</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {vendors.filter(v => !!v.taxId).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Directory Status</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">Active</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Vendor Directory</CardTitle>
            <CardDescription>Manage supplier contact details and tax references</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Building className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Vendors Added</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add suppliers to track purchase orders and accounts payable.</p>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Vendor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold text-sm">{v.name}</TableCell>
                      <TableCell className="text-sm">{v.contactPerson || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {v.phone && <div className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3 shrink-0" /> {v.phone}</div>}
                        {v.email && <div className="text-muted-foreground">{v.email}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.address || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            onClick={() => handleBillVendor(v)}
                            title="Draft bill for this vendor"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Bill
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(v.id!)}>
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
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>Store supplier details for purchase orders and bills.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vName">Vendor Company Name *</Label>
              <Input id="vName" placeholder="e.g. Acme Supplies Ltd" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vPerson">Contact Representative</Label>
                <Input id="vPerson" placeholder="John Doe" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vPhone">Phone</Label>
                <Input id="vPhone" placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vEmail">Email</Label>
                <Input id="vEmail" type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vTax">Tax Identification No.</Label>
                <Input id="vTax" placeholder="TIN-12345" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vAddr">Office Address</Label>
              <Input id="vAddr" placeholder="Physical address..." value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editingVendor ? 'Update Vendor' : 'Save Vendor'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
