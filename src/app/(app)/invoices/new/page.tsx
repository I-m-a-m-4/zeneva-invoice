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
  Loader2,
  Settings,
  HelpCircle,
  Search,
  Image as ImageIcon,
  Edit2,
  X,
  Package,
  Check,
  Send
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplatePickerModal } from '@/components/invoices/template-picker-modal';

interface LineItem {
  id: string;
  productId?: string;
  description: string;
  qty: number;
  rate: number;
  taxRate: number; // percentage, e.g. 7.5
}

export default function NewInvoicePage() {
  const { business, customers, products, currencySymbol = '₦', triggerRefresh } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  // Invoice Metadata
  const [invoiceNumber, setInvoiceNumber] = React.useState(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [terms, setTerms] = React.useState('15');
  const [customDueDate, setCustomDueDate] = React.useState('');
  const [salesperson, setSalesperson] = React.useState('');
  const [subject, setSubject] = React.useState('');

  // Customer State
  const [customerId, setCustomerId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = React.useState(false);

  // Line Items
  const [items, setItems] = React.useState<LineItem[]>([
    {
      id: '1',
      description: 'Consulting & Implementation Services',
      qty: 1,
      rate: 50000,
      taxRate: 7.5
    }
  ]);

  // Adjustments & Taxes
  const [discountType, setDiscountType] = React.useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [shippingCharges, setShippingCharges] = React.useState<number>(0);
  const [applyTaxOnShipping, setApplyTaxOnShipping] = React.useState(false);
  const [adjustment, setAdjustment] = React.useState<number>(0);

  // Notes & Terms
  const [notes, setNotes] = React.useState('Thanks for your business. Please remit payment via bank transfer.');
  const [termsAndConditions, setTermsAndConditions] = React.useState(
    '1. Goods once sold are not returnable.\n2. Payment is due within the stipulated credit terms.\n3. Late payments may accrue 2% monthly interest.'
  );

  // Selected Template
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>(
    (business?.settings as any)?.invoiceTemplate || 'standard'
  );
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);
  const [isBulkItemModalOpen, setIsBulkItemModalOpen] = React.useState(false);
  const [selectedBulkProductIds, setSelectedBulkProductIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate Due Date based on terms
  const calculatedDueDate = React.useMemo(() => {
    if (terms === 'custom' && customDueDate) {
      return customDueDate;
    }
    const days = parseInt(terms) || 0;
    return format(addDays(new Date(invoiceDate), days), 'yyyy-MM-dd');
  }, [invoiceDate, terms, customDueDate]);

  // Calculate Subtotals & Grand Totals
  const subtotal = React.useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.qty) || 0) * (Number(curr.rate) || 0), 0);
  }, [items]);

  const discountAmount = React.useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * (Number(discountValue) || 0)) / 100;
    }
    return Number(discountValue) || 0;
  }, [subtotal, discountType, discountValue]);

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  const totalItemTax = React.useMemo(() => {
    return items.reduce((acc, curr) => {
      const lineTotal = (Number(curr.qty) || 0) * (Number(curr.rate) || 0);
      const lineTax = (lineTotal * (Number(curr.taxRate) || 0)) / 100;
      return acc + lineTax;
    }, 0);
  }, [items]);

  const shippingTax = applyTaxOnShipping ? (shippingCharges * 7.5) / 100 : 0;
  const totalTax = totalItemTax + shippingTax;

  const grandTotal = Math.max(0, subtotalAfterDiscount + totalTax + Number(shippingCharges) + Number(adjustment));

  // Item Handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        description: '',
        qty: 1,
        rate: 0,
        taxRate: 7.5
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof LineItem, val: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  const handleSelectProductForLine = (lineId: string, productId: string) => {
    const prod = products?.find(p => p.id === productId);
    if (!prod) return;
    setItems(prev =>
      prev.map(item => {
        if (item.id === lineId) {
          return {
            ...item,
            productId: prod.id,
            description: prod.name,
            rate: prod.price || 0
          };
        }
        return item;
      })
    );
  };

  const handleAddBulkItems = () => {
    if (selectedBulkProductIds.length === 0) return;
    const newItems: LineItem[] = selectedBulkProductIds.map(id => {
      const p = products?.find(prod => prod.id === id);
      return {
        id: Math.random().toString(36).substring(2, 9),
        productId: p?.id,
        description: p?.name || 'Item',
        qty: 1,
        rate: p?.price || 0,
        taxRate: 7.5
      };
    });

    setItems(prev => {
      // If only one empty item, replace it
      if (prev.length === 1 && !prev[0].description && prev[0].rate === 0) {
        return newItems;
      }
      return [...prev, ...newItems];
    });

    setSelectedBulkProductIds([]);
    setIsBulkItemModalOpen(false);
  };

  // Submit Invoice Handler
  const handleSaveInvoice = async (status: 'draft' | 'unpaid') => {
    if (!business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Business context missing' });
      return;
    }

    const cName = customerName || customers?.find(c => c.id === customerId)?.name || 'Valued Customer';
    const cEmail = customerEmail || customers?.find(c => c.id === customerId)?.email || '';

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'receipts'), {
        businessId: business.id,
        receiptNumber: invoiceNumber,
        referenceNumber: referenceNumber || null,
        paymentMethod: 'Invoice',
        type: 'invoice',
        status: status,
        salesperson: salesperson || null,
        subject: subject || null,
        customer: {
          id: customerId || null,
          name: cName,
          email: cEmail
        },
        items: items.map(item => ({
          name: item.description || 'Custom Item',
          price: Number(item.rate) || 0,
          quantity: Number(item.qty) || 1,
          taxRate: Number(item.taxRate) || 0,
          total: (Number(item.qty) || 1) * (Number(item.rate) || 0)
        })),
        subtotal,
        discount: discountAmount,
        discountType,
        discountValue,
        shippingCharges,
        adjustment,
        taxAmount: totalTax,
        total: grandTotal,
        notes,
        termsAndConditions,
        template: selectedTemplate,
        createdAt: serverTimestamp(),
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(calculatedDueDate).toISOString()
      });

      toast({
        variant: 'success',
        title: status === 'draft' ? 'Invoice Saved as Draft' : 'Invoice Created & Issued!',
        description: `Invoice #${invoiceNumber} is now ready in your records.`
      });

      if (triggerRefresh) triggerRefresh();
      router.push('/invoices');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error creating invoice', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full space-y-6 pb-20 font-sans">
      {/* Top Header Bar matching Zoho reference */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80 sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">New Invoice</h1>
            <p className="text-xs text-muted-foreground">Fill in the fields below to create and issue a professional invoice.</p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/invoices')}
            className="border-border text-muted-foreground hover:text-foreground text-xs h-9 px-4 rounded-md"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveInvoice('draft')}
            disabled={isSubmitting || grandTotal <= 0}
            className="text-xs h-9 px-4 font-semibold rounded-md border border-border"
          >
            Save as Draft
          </Button>

          <Button
            type="button"
            onClick={() => handleSaveInvoice('unpaid')}
            disabled={isSubmitting || grandTotal <= 0}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-5 rounded-md shadow-sm transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save and Send
          </Button>
        </div>
      </div>

      {/* Main Creation Card Form Container */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-6 sm:p-8 shadow-sm space-y-8">
        {/* Customer Information Row */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-3 flex items-center gap-1.5 pt-2">
              <Label className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                <span>Customer Name*</span>
              </Label>
              <span title="Select an existing customer or enter customer information" className="text-muted-foreground/70 cursor-help">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="md:col-span-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
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
                  <SelectTrigger className="w-full bg-background border-border text-foreground text-xs h-9">
                    <SelectValue placeholder="Please select a customer name" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                    {(customers || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-semibold">{c.name}</span>
                          {c.email && <span className="text-[11px] text-muted-foreground">{c.email}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Customer Search / Add Button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCustomerSearchOpen(true)}
                className="h-9 w-9 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30 shrink-0"
                title="Search or Add Customer"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Custom Customer Input (if custom walk-in or new) */}
          {(!customerId || customerName) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3 text-xs text-muted-foreground">
                Customer Email / Billing
              </div>
              <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Customer Name (e.g. Acme Corporation)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                />
                <Input
                  type="email"
                  placeholder="billing@customer.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60" />

        {/* Invoice Numbers, Dates & Terms Row */}
        <div className="space-y-4">
          {/* Invoice# and Reference# */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-3 flex items-center justify-between">
              <Label className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                <span>Invoice#*</span>
                <button
                  type="button"
                  title="Configure auto-numbering"
                  onClick={() => setInvoiceNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5 text-orange-500" />
                </button>
              </Label>
            </div>
            <div className="md:col-span-4">
              <Input
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="bg-background border-border text-foreground font-mono text-xs h-9 font-semibold"
                required
              />
            </div>

            <div className="md:col-span-2 text-xs font-semibold text-muted-foreground md:text-right">
              Reference#
            </div>
            <div className="md:col-span-3">
              <Input
                placeholder="PO or Reference #"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
              />
            </div>
          </div>

          {/* Invoice Date & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold text-rose-500">Invoice Date*</Label>
            </div>
            <div className="md:col-span-4">
              <Input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
                required
              />
            </div>

            <div className="md:col-span-2 text-xs font-semibold text-muted-foreground md:text-right">
              Terms
            </div>
            <div className="md:col-span-3">
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                  <SelectItem value="0">Due on Receipt</SelectItem>
                  <SelectItem value="15">Net 15 Days</SelectItem>
                  <SelectItem value="30">Net 30 Days</SelectItem>
                  <SelectItem value="45">Net 45 Days</SelectItem>
                  <SelectItem value="60">Net 60 Days</SelectItem>
                  <SelectItem value="custom">Custom Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date Display / Input */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold text-muted-foreground">Due Date</Label>
            </div>
            <div className="md:col-span-4">
              {terms === 'custom' ? (
                <Input
                  type="date"
                  value={customDueDate || calculatedDueDate}
                  onChange={e => setCustomDueDate(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                />
              ) : (
                <div className="px-3 py-2 rounded-md bg-muted/30 border border-border/60 text-xs font-mono text-muted-foreground flex items-center justify-between">
                  <span>{calculatedDueDate ? format(new Date(calculatedDueDate), 'dd MMM yyyy') : 'N/A'}</span>
                  <span className="text-[11px] text-orange-600 dark:text-orange-400 font-sans font-semibold">Auto-calculated</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2 text-xs font-semibold text-muted-foreground md:text-right">
              Salesperson
            </div>
            <div className="md:col-span-3">
              <Input
                placeholder="Select or Add Salesperson"
                value={salesperson}
                onChange={e => setSalesperson(e.target.value)}
                className="bg-background border-border text-foreground text-xs h-9"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-3 flex items-center gap-1.5 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground">Subject</Label>
              <span title="Let your customer know what this Invoice is for" className="text-muted-foreground/70 cursor-help">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="md:col-span-9">
              <Textarea
                rows={2}
                placeholder="Let your customer know what this Invoice is for..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="bg-background border-border text-foreground text-xs resize-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Item Details Table matching Zoho Screenshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span>Item Details</span>
            </h3>
          </div>

          {/* Table Container */}
          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border select-none">
                <tr>
                  <th className="py-3 px-3 text-left">ITEM DETAILS</th>
                  <th className="py-3 px-3 text-center w-24">QUANTITY</th>
                  <th className="py-3 px-3 text-right w-36">RATE</th>
                  <th className="py-3 px-3 text-left w-36">TAX</th>
                  <th className="py-3 px-3 text-right w-36">AMOUNT</th>
                  <th className="py-3 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {items.map((item) => {
                  const lineTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Item description & Catalog Auto-complete */}
                      <td className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                            <ImageIcon className="h-4 w-4" />
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <Input
                              placeholder="Type or click to select an item..."
                              value={item.description}
                              onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                              className="bg-background border-border text-foreground text-xs h-9 font-medium"
                              required
                            />

                            {/* Catalog Quick Pick Shortcut if products available */}
                            {products && products.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>Quick pick:</span>
                                <div className="flex flex-wrap gap-1">
                                  {products.slice(0, 3).map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectProductForLine(item.id, p.id)}
                                      className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 border border-border/60 transition-colors"
                                    >
                                      {p.name} ({currencySymbol}{p.price})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-3 text-center align-top">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.qty}
                          onChange={e => handleItemChange(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 mx-auto bg-background border-border text-foreground text-xs h-9 text-center font-mono"
                          required
                        />
                      </td>

                      {/* Rate */}
                      <td className="p-3 text-right align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate || ''}
                          onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-32 ml-auto bg-background border-border text-foreground text-xs h-9 text-right font-mono font-medium"
                          required
                        />
                      </td>

                      {/* Tax */}
                      <td className="p-3 align-top">
                        <Select
                          value={String(item.taxRate)}
                          onValueChange={val => handleItemChange(item.id, 'taxRate', parseFloat(val) || 0)}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                            <SelectValue placeholder="Select a Tax" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground text-xs">
                            <SelectItem value="0">None (0%)</SelectItem>
                            <SelectItem value="5">Service Tax (5%)</SelectItem>
                            <SelectItem value="7.5">VAT (7.5%)</SelectItem>
                            <SelectItem value="10">Standard (10%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Amount */}
                      <td className="p-3 text-right align-top font-mono font-bold text-foreground text-sm pt-4">
                        {currencySymbol}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Delete Action */}
                      <td className="p-3 text-center align-top pt-4">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                            title="Remove Line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons Below Table matching Zoho Screenshot */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 border-orange-500/30 h-8 gap-1.5 font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Line Item
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkItemModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground border-border h-8 gap-1.5"
            >
              <Package className="h-3.5 w-3.5" />
              Add Items in Bulk
            </Button>
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Bottom Section: Left Notes/Terms + Right Totals Widget matching Screenshot 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Template, Customer Notes, Terms & Conditions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Selector Callout */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold">Template :</span>
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen(true)}
                className="font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1.5 capitalize"
              >
                <span>{selectedTemplate} Template</span>
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Customer Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Customer Notes</Label>
              <Textarea
                rows={3}
                placeholder="Enter any notes to be displayed in your transaction..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="bg-background border-border text-foreground text-xs leading-relaxed"
              />
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Terms & Conditions</Label>
              <Textarea
                rows={3}
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction..."
                value={termsAndConditions}
                onChange={e => setTermsAndConditions(e.target.value)}
                className="bg-background border-border text-foreground text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Financial Calculations Card matching Zoho Screenshot 2 */}
          <div className="lg:col-span-5 bg-muted/20 border border-border/80 rounded-xl p-5 space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-muted-foreground">Sub Total</span>
              <span className="font-mono font-semibold text-foreground text-sm">
                {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center text-xs gap-3">
              <span className="font-semibold text-muted-foreground">Discount</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-md overflow-hidden bg-background">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 text-xs font-mono border-0 text-right pr-2 focus-visible:ring-0"
                    placeholder="0"
                  />
                  <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                    <SelectTrigger className="h-8 border-0 border-l border-border bg-muted/30 text-xs px-2 w-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-xs">
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="amount">{currencySymbol}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="font-mono text-muted-foreground text-xs w-20 text-right">
                  -{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Shipping Charges */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs gap-3">
                <span className="font-semibold text-muted-foreground">Shipping Charges</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={shippingCharges || ''}
                    onChange={e => setShippingCharges(parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-xs font-mono text-right bg-background border-border"
                    placeholder="0.00"
                  />
                  <span className="font-mono text-muted-foreground text-xs w-20 text-right">
                    {Number(shippingCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {shippingCharges > 0 && (
                <div className="flex justify-end pt-1">
                  <label className="text-[11px] text-orange-600 dark:text-orange-400 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyTaxOnShipping}
                      onChange={e => setApplyTaxOnShipping(e.target.checked)}
                      className="rounded border-border text-orange-600"
                    />
                    <span>Apply TAX on Shipping Charge (7.5%)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Total Tax breakdown */}
            {totalTax > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Tax</span>
                <span className="font-mono text-foreground">
                  {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Adjustment (+/-) */}
            <div className="flex justify-between items-center text-xs gap-3">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-muted-foreground">Adjustment</span>
                <span title="Add a positive or negative manual adjustment" className="text-muted-foreground/70 cursor-help">
                  <HelpCircle className="h-3 w-3" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  value={adjustment || ''}
                  onChange={e => setAdjustment(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-xs font-mono text-right bg-background border-border"
                  placeholder="+/- 0.00"
                />
                <span className="font-mono text-muted-foreground text-xs w-20 text-right">
                  {Number(adjustment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border-t border-border/80 pt-3" />

            {/* Grand Total */}
            <div className="flex justify-between items-baseline pt-1">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-foreground">Total ( {currencySymbol} )</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-xl text-orange-600 dark:text-orange-500">
                  {currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save & Cancel Bar */}
        <div className="border-t border-border/80 pt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/invoices')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveInvoice('draft')}
              disabled={isSubmitting || grandTotal <= 0}
              className="text-xs h-9 px-4 font-semibold border-border"
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              onClick={() => handleSaveInvoice('unpaid')}
              disabled={isSubmitting || grandTotal <= 0}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-6 rounded-md shadow-md flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save and Send
            </Button>
          </div>
        </div>
      </div>

      {/* Template Picker Modal */}
      <TemplatePickerModal
        open={isTemplatePickerOpen}
        onOpenChange={setIsTemplatePickerOpen}
        currentTemplateId={selectedTemplate}
        onSelectTemplate={(tmplId) => {
          setSelectedTemplate(tmplId);
          setIsTemplatePickerOpen(false);
          toast({ title: 'Template Selected', description: `Invoice will format using the ${tmplId} template.` });
        }}
      />

      {/* Add Items in Bulk Dialog */}
      <Dialog open={isBulkItemModalOpen} onOpenChange={setIsBulkItemModalOpen}>
        <DialogContent className="max-w-xl bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              Add Items in Bulk from Inventory
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Select items from your catalogue to quickly append them to this invoice.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2 divide-y divide-border/40">
              {(!products || products.length === 0) ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No items registered in your inventory yet.
                </div>
              ) : (
                products.map(p => {
                  const isSelected = selectedBulkProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulkProductIds(prev => [...prev, p.id]);
                            } else {
                              setSelectedBulkProductIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded border-border text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {p.sku && <span className="text-[10px] text-muted-foreground block font-mono">SKU: {p.sku}</span>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        {currencySymbol}{(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkItemModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddBulkItems}
              disabled={selectedBulkProductIds.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 px-4"
            >
              Add {selectedBulkProductIds.length} Item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Quick Search Modal */}
      <Dialog open={isCustomerSearchOpen} onOpenChange={setIsCustomerSearchOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Search className="h-4 w-4 text-orange-600" />
              Find Customer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Input
              placeholder="Search by name, email or phone..."
              value={customerSearchQuery}
              onChange={e => setCustomerSearchQuery(e.target.value)}
              className="bg-background border-border text-xs h-9"
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-border/40 border border-border rounded-lg p-1.5">
              {(customers || [])
                .filter(c => {
                  if (!customerSearchQuery) return true;
                  const q = customerSearchQuery.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                })
                .slice(0, 8)
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerName(c.name || '');
                      setCustomerEmail(c.email || '');
                      setIsCustomerSearchOpen(false);
                    }}
                    className="w-full text-left p-2 rounded hover:bg-muted/60 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{c.name}</div>
                      {c.email && <div className="text-[11px] text-muted-foreground">{c.email}</div>}
                    </div>
                    <Check className="h-4 w-4 text-orange-600 opacity-0 hover:opacity-100" />
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
