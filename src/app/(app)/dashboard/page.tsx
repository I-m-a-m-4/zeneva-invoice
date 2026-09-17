'use client';
import *as React from 'react';
import PageTitle from '@/components/shared/page-title';
import SummaryCard from '@/components/dashboard/summary-card';
import {
  DollarSign,
  FileDigit,
  Clock,
  AlertTriangle,
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePOS } from '@/context/pos-context';
import { isBefore, format, addDays } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { useI18n } from '@/context/i18n-context';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { receipts, currencySymbol, isLoading: isPosLoading } = usePOS();
  const { t } = useI18n();

  const isNative = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
  const isLoading = isNative ? (isPosLoading && (!receipts || receipts.length === 0)) : isPosLoading; 

  const invoices = React.useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(r => r.paymentMethod === 'Invoice').sort((a, b) => {
        const dateA = safeToDate(a.createdAt);
        const dateB = safeToDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });
  }, [receipts]);

  const outstandingReceivables = React.useMemo(() => {
    return invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total || 0), 0);
  }, [invoices]);

  const totalInvoiced = React.useMemo(() => {
    return invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  }, [invoices]);

  const overdueInvoices = React.useMemo(() => {
    return invoices.filter(i => {
       if (i.status === 'paid') return false;
       const date = safeToDate(i.createdAt);
       // Assuming 30 days terms for overdue
       const dueDate = addDays(date, 30);
       return isBefore(dueDate, new Date());
    });
  }, [invoices]);

  if (isLoading && !receipts) {
    return <div className="p-4 sm:p-8"><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-8 pt-6 sm:pt-10 max-w-7xl mx-auto w-full gap-8 bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <PageTitle title="Invoicing Dashboard" />
          <p className="text-muted-foreground mt-1">Overview of your invoicing platform</p>
        </div>
        <Button asChild>
          <Link href="/sales/pos/select-products">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Invoiced"
          value={<CurrencyAmount amount={totalInvoiced} currency={currencySymbol} />}
          description="Lifetime invoiced value"
          icon={<FileDigit className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <SummaryCard
          title="Outstanding Receivables"
          value={<CurrencyAmount amount={outstandingReceivables} currency={currencySymbol} />}
          description="Total unpaid invoices"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <SummaryCard
          title="Overdue Reminders"
          value={overdueInvoices.length.toString()}
          description="Invoices past due date"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          loading={isLoading}
        />
        <SummaryCard
          title="Recent Invoices"
          value={invoices.slice(0, 30).length.toString()}
          description="Invoices created recently"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Card className="col-span-1 shadow-none border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your most recently created invoices.</CardDescription>
             </div>
             <Button variant="outline" size="sm" asChild>
                <Link href="/invoices">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
             </Button>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">No invoices found.</div>
            ) : (
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Invoice #</TableHead>
                       <TableHead>Customer</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead>Amount</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {invoices.slice(0, 10).map((invoice) => {
                       const invoiceId = invoice.id || '';
                       const rNumber = invoice.receiptNumber || `INV-${invoiceId.substring(0, 8)}`;
                       const isPaid = invoice.status === 'paid';
                       return (
                         <TableRow key={invoiceId}>
                           <TableCell className="font-medium">{rNumber}</TableCell>
                           <TableCell>{invoice.customer?.name || 'Walk-in'}</TableCell>
                           <TableCell>{format(safeToDate(invoice.createdAt), 'MMM d, yyyy')}</TableCell>
                           <TableCell><CurrencyAmount amount={invoice.total} currency={currencySymbol} /></TableCell>
                           <TableCell>
                             {isPaid ? (
                               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
                             ) : (
                               <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Unpaid</Badge>
                             )}
                           </TableCell>
                           <TableCell className="text-right">
                             {!isPaid && (
                               <Button variant="outline" size="sm" onClick={async () => {
                                 try {
                                   const res = await fetch('/api/invoices/send', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({
                                       invoiceId: invoice.id,
                                       email: invoice.customer?.email,
                                       name: invoice.customer?.name,
                                       amount: invoice.total,
                                       currency: currencySymbol
                                     })
                                   });
                                   if (!res.ok) throw new Error('Failed to send');
                                   alert('Invoice sent successfully!');
                                 } catch (e) {
                                   alert('Error sending invoice email');
                                 }
                               }}>
                                 Send to Client
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
