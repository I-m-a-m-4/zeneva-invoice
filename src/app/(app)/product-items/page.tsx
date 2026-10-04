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
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  FilePlus,
  Package,
  AlertTriangle,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';

export default function ProductItemsPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Product | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [category, setCategory] = React.useState('General Goods');
  const [price, setPrice] = React.useState('');
  const [costPrice, setCostPrice] = React.useState('');
  const [stock, setStock] = React.useState('');
  const [variantName, setVariantName] = React.useState('');
  const [variantValue, setVariantValue] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/products`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      setProducts(items);
      setIsLoading(false);
    }, (err) => {
      console.warn('Product listener error:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory('General Goods');
    setPrice('');
    setCostPrice('');
    setStock('10');
    setVariantName('');
    setVariantValue('');
    setDescription('');
    setIsDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingItem(p);
    setName(p.name || '');
    setSku(p.sku || '');
    setCategory(p.category || 'General Goods');
    setPrice(p.price ? p.price.toString() : '');
    setCostPrice(p.costPrice ? p.costPrice.toString() : '');
    setStock(p.stock ? p.stock.toString() : '0');
    setVariantName(p.variantName || '');
    setVariantValue(p.variantValue || '');
    setDescription(p.description || '');
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Product> = {
        name,
        lowercaseName: name.toLowerCase(),
        sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
        category,
        price: parseFloat(price) || 0,
        costPrice: parseFloat(costPrice) || 0,
        stock: parseInt(stock, 10) || 0,
        variantName: variantName || undefined,
        variantValue: variantValue || undefined,
        type: variantName ? 'variant' : 'single',
        description,
        businessId: business.id,
        categoryType: 'product',
        updatedAt: serverTimestamp(),
      };

      if (editingItem?.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/products`, editingItem.id), payload);
        toast({ title: 'Item Updated', description: `${name} has been updated.` });
      } else {
        await addDoc(collection(firestore, `businessInstances/${business.id}/products`), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Product Item Added', description: `${name} added to catalog.` });
      }

      setIsDialogOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product item?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/products`, id));
      toast({ title: 'Item deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  // Convert to Invoice Action
  const handleCreateInvoiceForItem = async (item: Product) => {
    if (!business?.id || !firestore) return;

    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const itemPrice = item.price || 0;

      const invoiceDoc = await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: 'Valued Client',
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: itemPrice,
        tax: 0,
        total: itemPrice,
        items: [
          {
            id: item.id || 'custom-item',
            name: item.variantValue ? `${item.name} (${item.variantValue})` : item.name,
            price: itemPrice,
            quantity: 1,
            amount: itemPrice,
            sku: item.sku || ''
          }
        ],
        notes: `Direct invoice for product: ${item.name}`,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Invoice Drafted',
        description: `Created invoice #${invNumber} with ${item.name}.`,
      });

      router.push(`/invoices`);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not create invoice' });
    }
  };

  // Unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filtered = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.variantValue && p.variantValue.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalValuation = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
  const variantItemsCount = products.filter(p => p.variantName || p.type === 'variant').length;
  const lowStockCount = products.filter(p => (p.stock || 0) <= 5).length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Product Items & Variants" />
          <p className="text-xs text-muted-foreground mt-1">
            Manage your inventory catalog, SKU variants, unit rates, and instant invoicing
          </p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Item / Variant
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Catalog Items</CardDescription>
            <CardTitle className="text-2xl font-bold">{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Variant Items</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600">{variantItemsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Inventory Value</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              <CurrencyAmount amount={totalValuation} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Low Stock Alerts</CardDescription>
            <CardTitle className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {lowStockCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table & Filters */}
      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Catalog Directory</CardTitle>
            <CardDescription>Track items, stock on hand, and invoice items directly</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Catalog Items Found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add your inventory products and variant SKUs to bill clients quickly.</p>
              <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-1.5" /> Add First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item & SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Variant Spec</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Stock Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="font-bold text-sm text-foreground">{item.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.category || 'Goods'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.variantName && item.variantValue ? (
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 text-[11px]">
                            {item.variantName}: {item.variantValue}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Standard</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        <CurrencyAmount amount={item.price} currency={currencySymbol} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <CurrencyAmount amount={item.costPrice || 0} currency={currencySymbol} />
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs font-medium px-2 py-0.5 rounded ${
                          (item.stock || 0) <= 5 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'text-foreground'
                        }`}>
                          {item.stock ?? 0} in stock
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleCreateInvoiceForItem(item)}
                            title="Generate invoice for this item"
                          >
                            <FilePlus className="h-3.5 w-3.5 mr-1" /> Invoice
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id!)}>
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

      {/* Item Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Product Item' : 'New Product Item & Variant'}</DialogTitle>
            <DialogDescription>
              Specify item rates, SKU attributes, and opening inventory stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="iName">Item Name *</Label>
              <Input
                id="iName"
                placeholder="e.g. Ergonomic Office Chair / Cloud Hosting Package"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="iSku">SKU / Item Code</Label>
                <Input
                  id="iSku"
                  placeholder="SKU-1001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iCategory">Category</Label>
                <Input
                  id="iCategory"
                  placeholder="e.g. Furniture / IT Services"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="iPrice">Selling Price ({currencySymbol}) *</Label>
                <Input
                  id="iPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iCost">Cost Price ({currencySymbol})</Label>
                <Input
                  id="iCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iStock">Stock Quantity</Label>
                <Input
                  id="iStock"
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
            </div>

            {/* Variant Spec */}
            <div className="border border-border/60 rounded-xl p-3 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-foreground">Optional Variant Specifier</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vName" className="text-xs">Variant Type</Label>
                  <Input
                    id="vName"
                    placeholder="e.g. Size, Color, License"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vVal" className="text-xs">Variant Value</Label>
                  <Input
                    id="vVal"
                    placeholder="e.g. XL, Matte Black, Annual"
                    value={variantValue}
                    onChange={(e) => setVariantValue(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iDesc">Item Description / Invoice Line Detail</Label>
              <Input
                id="iDesc"
                placeholder="Appears on client invoice line item"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {editingItem ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
