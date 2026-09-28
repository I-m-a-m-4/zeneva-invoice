'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { addDays, format } from 'date-fns';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewInvoicePage() {
  const { business, customers, currencySymbol, triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [customerId, setCustomerId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [terms, setTerms] = React.useState('15');
  const [notes, setNotes] = React.useState('Thanks for your business. Please remit payment via bank transfer.');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [items, setItems] = React.useState<Array<{ description: string; qty: number; rate: number }>>([
    { description: 'Consulting & Implementation Services', qty: 1, rate: 50000 }
  ]);

  const handleAddItem = () => {
    setItems(prev => [...prev, { description: '', qty: 1, rate: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: 'description' | 'qty' | 'rate', val: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const subtotal = items.reduce((acc, curr) => acc + curr.qty * (curr.rate || 0), 0);
  const taxRate = Number(business?.settings?.defaultTaxRate || 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Business context missing' });
      return;
    }

    const cName = customerName || customers?.find(c => c.id === customerId)?.name || 'Valued Customer';
    const cEmail = customerEmail || customers?.find(c => c.id === customerId)?.email || '';

    setIsSubmitting(true);
    try {
      const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const dueDate = addDays(new Date(invoiceDate), parseInt(terms) || 15);

      await addDoc(collection(firestore, 'receipts'), {
        businessId: business.id,
        receiptNumber: invNum,
        paymentMethod: 'Invoice',
        type: 'invoice',
        status: 'unpaid',
        customer: {
          id: customerId || null,
          name: cName,
          email: cEmail
        },
        items: items.map(item => ({
          name: item.description,
          price: Number(item.rate),
          quantity: Number(item.qty),
          total: Number(item.qty) * Number(item.rate)
        })),
        subtotal,
        taxAmount,
        total: grandTotal,
        notes,
        createdAt: serverTimestamp(),
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate.toISOString()
      });

      toast({ variant: 'success', title: 'Invoice created successfully!', description: `Invoice #${invNum} is ready.` });
      if (triggerRefresh) triggerRefresh();
      router.push('/invoices');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error creating invoice', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Link href="/invoices">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-foreground">New Invoice</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/invoices')}
              className="border-border text-muted-foreground text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || grandTotal <= 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save & Send
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Customer Name *</Label>
              <Select
                value={customerId}
                onValueChange={(val) => {
                  setCustomerId(val);
                  const cust = customers?.find(c => c.id === val);
                  if (cust) {
                    setCustomerName(cust.name || '');
                    setCustomerEmail(cust.email || '');
                  }
                }}
              >
                <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                  <SelectValue placeholder="Select or enter customer" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                  {(customers || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Custom Customer Name (if not in list)</Label>
              <Input
                placeholder="Enter customer name..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Customer Email</Label>
              <Input
                type="email"
                placeholder="customer@domain.com"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Payment Terms</Label>
              <Select value={terms} onValueChange={setTerms}>
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

          {/* Item Table */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Table</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddItem}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 h-7"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Item Line
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 text-left">ITEM & DESCRIPTION</th>
                    <th className="py-2.5 px-3 text-center w-20">QTY</th>
                    <th className="py-2.5 px-3 text-right w-32">RATE</th>
                    <th className="py-2.5 px-3 text-right w-32">AMOUNT</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <Input
                          placeholder="Item name / description..."
                          value={item.description}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          className="bg-background border-border text-foreground text-xs h-8"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="w-16 bg-background border-border text-foreground text-xs h-8 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate || ''}
                          onChange={e => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-background border-border text-foreground text-xs h-8 text-right font-mono"
                          required
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-semibold text-foreground">
                        {currencySymbol || 'NGN'}{(item.qty * (item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-muted-foreground hover:text-rose-500 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotals & Taxes */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Total:</span>
                  <span className="font-mono text-foreground">{currencySymbol || 'NGN'}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-mono text-foreground">{currencySymbol || 'NGN'}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total ({currencySymbol || 'NGN'}):</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">{currencySymbol || 'NGN'}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs text-muted-foreground">Customer Notes & Terms</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="bg-background border-border text-foreground text-xs"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
