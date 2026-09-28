'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { format, isBefore, addDays } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Settings,
  ChevronDown,
  LayoutList,
  Eye,
  Search,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type InvoiceFilter = 'all' | 'draft' | 'unpaid' | 'overdue' | 'paid';

export default function InvoicesPage() {
  const { receipts, customers, currencySymbol, business, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = React.useState<InvoiceFilter>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // New Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [dueDateDays, setDueDateDays] = React.useState('15');
  const [invoiceItems, setInvoiceItems] = React.useState<Array<{ description: string; qty: number; rate: number }>>([
    { description: '', qty: 1, rate: 0 }
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (triggerRefresh) await triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleMarkPaid = async (id: string) => {
    if (!firestore) return;
    setUpdatingId(id);
    try {
      await updateDoc(doc(firestore, 'receipts', id), {
        status: 'paid',
        updatedAt: serverTimestamp()
      });
      toast({ variant: 'success', title: 'Invoice marked as paid!' });
      if (triggerRefresh) triggerRefresh();
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update invoice' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddItemRow = () => {
    setInvoiceItems(prev => [...prev, { description: '', qty: 1, rate: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: 'description' | 'qty' | 'rate', val: any) => {
    setInvoiceItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const invoiceSubtotal = React.useMemo(() => {
    return invoiceItems.reduce((acc, curr) => acc + (curr.qty * (curr.rate || 0)), 0);
  }, [invoiceItems]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Business context not loaded' });
      return;
    }

    const cName = customerName || customers?.find(c => c.id === selectedCustomerId)?.name || 'Valued Customer';
    const cEmail = customerEmail || customers?.find(c => c.id === selectedCustomerId)?.email || '';

    setIsSubmitting(true);
    try {
      const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const dueDate = addDays(now, parseInt(dueDateDays) || 15);

      await addDoc(collection(firestore, 'receipts'), {
        businessId: business.id,
        receiptNumber: invNum,
        paymentMethod: 'Invoice',
        type: 'invoice',
        status: 'unpaid',
        customer: {
          id: selectedCustomerId || null,
          name: cName,
          email: cEmail
        },
        items: invoiceItems.map(item => ({
          name: item.description || 'Custom Item',
          price: Number(item.rate),
          quantity: Number(item.qty),
          total: Number(item.qty) * Number(item.rate)
        })),
        subtotal: invoiceSubtotal,
        total: invoiceSubtotal,
        createdAt: serverTimestamp(),
        dueDate: dueDate.toISOString(),
      });

      toast({ title: 'Invoice Created!', description: `Invoice ${invNum} has been created.` });
      setIsCreateOpen(false);
      setInvoiceItems([{ description: '', qty: 1, rate: 0 }]);
      setCustomerName('');
      setCustomerEmail('');
      setSelectedCustomerId('');
      if (triggerRefresh) triggerRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error creating invoice', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Invoices
  const filteredInvoices = React.useMemo(() => {
    if (!receipts) return [];
    const now = new Date();

    return receipts
      .filter(r => r.paymentMethod === 'Invoice' || r.type === 'invoice' || !!r.receiptNumber?.startsWith('INV'))
      .filter(r => {
        const status = r.status || 'unpaid';
        const d = safeToDate(r.createdAt);
        const dueDate = addDays(d, 30);
        const isOverdue = status !== 'paid' && isBefore(dueDate, now);

        if (activeFilter === 'paid') return status === 'paid';
        if (activeFilter === 'unpaid') return status === 'unpaid' && !isOverdue;
        if (activeFilter === 'overdue') return isOverdue;
        if (activeFilter === 'draft') return status === 'draft';
        return true;
      })
      .filter(r => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        const num = (r.receiptNumber || r.id).toLowerCase();
        const cName = (r.customer?.name || '').toLowerCase();
        return num.includes(q) || cName.includes(q);
      })
      .sort((a, b) => safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime());
  }, [receipts, activeFilter, searchTerm]);

  const filterLabels: Record<InvoiceFilter, string> = {
    all: 'All',
    draft: 'Draft',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    paid: 'Paid'
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8 flex flex-col">
      {/* Top Header Bar matching Zoho reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
          <span className="text-muted-foreground/40 font-light">|</span>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{filterLabels[activeFilter]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border text-popover-foreground text-xs">
              <DropdownMenuItem onClick={() => setActiveFilter('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('unpaid')}>Unpaid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('overdue')}>Overdue</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('paid')}>Paid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('draft')}>Draft</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Action Icons & + New Button */}
        <div className="flex items-center gap-2">
          {/* + New Button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-md shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </Button>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          </Button>

          {/* View Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            title="Change View"
          >
            <LayoutList className="h-4 w-4" />
          </Button>

          {/* Settings */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            title="Settings"
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

          {/* Filter Options */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            title="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-6">
        {filteredInvoices.length === 0 ? (
          /* Empty State matching Zoho reference screenshot */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
            {/* Vector Illustration */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-muted rounded-2xl transform rotate-6 scale-95 blur-sm" />
              <div className="relative h-28 w-24 rounded-2xl bg-card border-2 border-border p-3 shadow-xl flex flex-col justify-between items-center">
                {/* Clip */}
                <div className="absolute -top-3 h-5 w-10 rounded-md bg-muted border border-border shadow-sm" />
                {/* Document preview lines */}
                <div className="w-full space-y-2 mt-3">
                  <div className="h-1.5 w-12 bg-purple-500 rounded-full" />
                  <div className="h-1 w-full bg-muted-foreground/30 rounded-full" />
                  <div className="h-1 w-3/4 bg-muted-foreground/20 rounded-full" />
                  <div className="h-1 w-5/6 bg-muted-foreground/20 rounded-full" />
                </div>
                <div className="h-2 w-10 bg-purple-500 rounded-full self-end mb-1" />
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
              It&apos;s time to get paid!
            </h2>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              We don&apos;t want to boast too much, but sending amazing invoices and getting paid is easier than ever. Go ahead! Try it yourself.
            </p>

            {/* Add Invoice Button */}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-6 rounded-md shadow-md transition-all"
            >
              Add Invoice
            </Button>
          </div>
        ) : (
          /* Invoices Table View */
          <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, customer name..."
                className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground text-xs h-9 rounded-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Responsive Table */}
            <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4 text-left">DATE</th>
                    <th className="py-3 px-4 text-left">INVOICE #</th>
                    <th className="py-3 px-4 text-left">CUSTOMER NAME</th>
                    <th className="py-3 px-4 text-left">STATUS</th>
                    <th className="py-3 px-4 text-right">DUE DATE</th>
                    <th className="py-3 px-4 text-right">AMOUNT</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filteredInvoices.map((inv) => {
                    const dateCreated = safeToDate(inv.createdAt);
                    const isPaid = inv.status === 'paid';
                    const dueDate = inv.dueDate ? new Date(inv.dueDate) : addDays(dateCreated, 30);
                    const isOverdue = !isPaid && isBefore(dueDate, new Date());

                    return (
                      <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {format(dateCreated, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          #{inv.receiptNumber || inv.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {inv.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                              PAID
                            </Badge>
                          ) : isOverdue ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-[10px] font-semibold">
                              OVERDUE
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold">
                              UNPAID
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                          {format(dueDate, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                          {currencySymbol || 'NGN'}{(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkPaid(inv.id)}
                                disabled={updatingId === inv.id}
                                className="h-7 text-[11px] border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              >
                                {updatingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
                              </Button>
                            )}
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                              <Link href={`/invoice/details?id=${inv.id}`} title="View Details">
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card text-card-foreground border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Existing Customer</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(val) => {
                    setSelectedCustomerId(val);
                    const cust = customers?.find(c => c.id === val);
                    if (cust) {
                      setCustomerName(cust.name || '');
                      setCustomerEmail(cust.email || '');
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                    {(customers || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Or Customer Name</Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Customer Email</Label>
                <Input
                  type="email"
                  placeholder="billing@acme.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                <Select value={dueDateDays} onValueChange={setDueDateDays}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                    <SelectItem value="0">Due on Receipt</SelectItem>
                    <SelectItem value="15">Net 15 Days</SelectItem>
                    <SelectItem value="30">Net 30 Days</SelectItem>
                    <SelectItem value="60">Net 60 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-foreground">Invoice Items</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItemRow}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 h-7"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {invoiceItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Item Description..."
                      value={item.description}
                      onChange={e => handleItemChange(idx, 'description', e.target.value)}
                      className="flex-1 bg-background border-border text-foreground text-xs h-8"
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                      className="w-16 bg-background border-border text-foreground text-xs h-8 text-center"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Rate"
                      value={item.rate || ''}
                      onChange={e => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-24 bg-background border-border text-foreground text-xs h-8 text-right font-mono"
                      required
                    />
                    {invoiceItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Display */}
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Invoice Amount:</span>
                <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                  {currencySymbol || 'NGN'}{invoiceSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-border text-muted-foreground text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || invoiceSubtotal <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-6"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save & Issue Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
