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
  Trash2,
  Download,
  Printer,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import ReceiptDetails from '@/components/receipts/receipt-details';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import type { Receipt } from '@/types';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTitle
} from '@/components/ui/dialog';
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
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const [previewInvoice, setPreviewInvoice] = React.useState<Receipt | null>(null);
  const [previewTemplate, setPreviewTemplate] = React.useState<string>('standard');
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const hiddenPrintRef = React.useRef<HTMLDivElement>(null);
  const [hiddenInvoice, setHiddenInvoice] = React.useState<Receipt | null>(null);

  const handleQuickDownload = async (inv: Receipt) => {
    setDownloadingId(inv.id);
    toast({ title: 'Generating A4 PDF...', description: `Formatting Invoice #${inv.receiptNumber || inv.id.substring(0, 8)}` });
    try {
      setHiddenInvoice(inv);
      await new Promise(r => setTimeout(r, 150));
      if (hiddenPrintRef.current) {
        const invNum = inv.receiptNumber || `INV-${inv.id.substring(0, 8).toUpperCase()}`;
        await downloadInvoicePDF(hiddenPrintRef.current, `Invoice-${invNum}.pdf`);
        toast({ variant: 'success', title: 'Downloaded', description: `Invoice-${invNum}.pdf has been saved.` });
      }
    } catch (err) {
      console.error('Quick download failed:', err);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate PDF.' });
    } finally {
      setDownloadingId(null);
      setHiddenInvoice(null);
    }
  };

  const handleDownloadPreview = async () => {
    if (!previewRef.current || !previewInvoice) return;
    setDownloadingId(previewInvoice.id);
    toast({ title: 'Generating A4 PDF...', description: 'Preparing high-resolution invoice.' });
    try {
      const invNum = previewInvoice.receiptNumber || `INV-${previewInvoice.id.substring(0, 8).toUpperCase()}`;
      await downloadInvoicePDF(previewRef.current, `Invoice-${invNum}.pdf`);
      toast({ variant: 'success', title: 'Downloaded', description: `Invoice-${invNum}.pdf saved.` });
    } catch (err) {
      console.error('Preview download failed:', err);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

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
    <div className="flex flex-col flex-1 w-full space-y-6 pb-12">
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
            asChild
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 px-4 rounded-md shadow-sm transition-all flex items-center gap-1.5"
          >
            <Link href="/invoices/new">
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </Link>
          </Button>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
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
                  <div className="h-1.5 w-12 bg-orange-500 rounded-full" />
                  <div className="h-1 w-full bg-muted-foreground/30 rounded-full" />
                  <div className="h-1 w-3/4 bg-muted-foreground/20 rounded-full" />
                  <div className="h-1 w-5/6 bg-muted-foreground/20 rounded-full" />
                </div>
                <div className="h-2 w-10 bg-orange-500 rounded-full self-end mb-1" />
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 tracking-tight">
              It&apos;s time to get paid!
            </h2>

            {/* Subtext */}
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              We don&apos;t want to boast too much, but sending amazing invoices and getting paid is easier than ever. Go ahead! Try it yourself.
            </p>

            {/* Add Invoice Button */}
            <Button
              asChild
              className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-6 rounded-md shadow-md transition-all"
            >
              <Link href="/invoices/new">
                Add Invoice
              </Link>
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
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground tabular-nums">
                          {format(dateCreated, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            #{inv.receiptNumber || inv.id.substring(0, 8).toUpperCase()}
                          </span>
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
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {format(dueDate, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          <CurrencyAmount symbol={currencySymbol || '₦'} amount={inv.total || 0} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkPaid(inv.id)}
                                disabled={updatingId === inv.id}
                                className="h-7 text-[11px] border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2"
                              >
                                {updatingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleQuickDownload(inv)}
                              disabled={downloadingId === inv.id}
                              title="Download A4 PDF"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                            >
                              {downloadingId === inv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPreviewInvoice(inv);
                                setPreviewTemplate((business?.settings as any)?.invoiceTemplate || 'standard');
                              }}
                              title="Quick Preview"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Open Full Details">
                              <Link href={`/invoice/details?id=${inv.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
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


      {/* Quick View / Invoice Preview Dialog */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-background text-foreground border-border p-4 sm:p-6">
          <DialogHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-orange-500" />
              <span>Invoice #{previewInvoice?.receiptNumber || previewInvoice?.id?.substring(0, 8)}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button
                size="sm"
                disabled={downloadingId === previewInvoice?.id}
                onClick={handleDownloadPreview}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-8 text-xs gap-1.5 shadow-sm"
              >
                {downloadingId === previewInvoice?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download A4 PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Style bar */}
          <div className="flex items-center justify-between gap-2 py-2 border-b border-border/60 text-xs bg-muted/20 px-2 rounded-lg">
            <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Template:</span>
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
              {[
                { id: 'standard', name: 'Standard' },
                { id: 'continental', name: 'Continental' },
                { id: 'spreadsheet', name: 'Spreadsheet' },
                { id: 'universal', name: 'Universal' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPreviewTemplate(t.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                    previewTemplate === t.id
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {previewInvoice && (
            <div ref={previewRef} className="my-3 border border-border/60 rounded-xl overflow-hidden shadow-xs bg-card">
              <ReceiptDetails
                receipt={previewInvoice}
                business={business}
                currencySymbol={currencySymbol}
                isInvoice={true}
                overrideTemplate={previewTemplate}
                showAdminDetails={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Off-screen container for background 1-click A4 PDF export */}
      {hiddenInvoice && (
        <div style={{ position: 'fixed', left: -9999, top: 0, width: '794px', zIndex: -100 }}>
          <div ref={hiddenPrintRef}>
            <ReceiptDetails
              receipt={hiddenInvoice}
              business={business}
              currencySymbol={currencySymbol}
              isInvoice={true}
              overrideTemplate="standard"
              showAdminDetails={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
