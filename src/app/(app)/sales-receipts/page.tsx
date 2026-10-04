'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  FileText,
  Search,
  Printer,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Eye,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function SalesReceiptsPage() {
  const { receipts, currencySymbol } = usePOS();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedMethod, setSelectedMethod] = React.useState<string>('all');

  const salesReceipts = React.useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(r => r.paymentMethod !== 'Invoice' || r.status === 'paid').sort((a, b) => {
      const dateA = safeToDate(a.createdAt);
      const dateB = safeToDate(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [receipts]);

  const filtered = salesReceipts.filter(r => {
    const matchesSearch = 
      (r.receiptNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = selectedMethod === 'all' || r.paymentMethod === selectedMethod;
    return matchesSearch && matchesMethod;
  });

  const totalReceiptsAmount = filtered.reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <PageTitle title="Sales Receipts" />
          <p className="text-xs text-muted-foreground mt-1">
            Complete transaction repository of paid sales and instant store receipts
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-md shadow-sm">
          <Link href="/sales/pos/select-products">
            <CreditCard className="h-4 w-4 mr-2" /> New POS Sale
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Receipts Collected</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground"><CurrencyAmount amount={totalReceiptsAmount} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Transactions</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">{filtered.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Sale Value</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              <CurrencyAmount amount={filtered.length > 0 ? totalReceiptsAmount / filtered.length : 0} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Receipt Log</CardTitle>
            <CardDescription className="text-xs">Audited list of verified customer receipts</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs bg-background border-border"
              />
            </div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="text-xs border border-border bg-background rounded-md h-8 px-2 font-medium"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Transfer">Bank Transfer</option>
              <option value="Split">Split</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed m-6 rounded-xl bg-muted/20">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Sales Receipts Recorded</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Completed store sales automatically populate receipts here.</p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
                <Link href="/sales/pos/select-products">Start a Sale</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">RECEIPT #</TableHead>
                    <TableHead className="text-xs font-semibold">CUSTOMER</TableHead>
                    <TableHead className="text-xs font-semibold">DATE & TIME</TableHead>
                    <TableHead className="text-xs font-semibold">METHOD</TableHead>
                    <TableHead className="text-xs font-semibold">TOTAL</TableHead>
                    <TableHead className="text-xs font-semibold text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filtered.map((r) => {
                    const rId = r.id || '';
                    const rNum = r.receiptNumber || `REC-${rId.substring(0, 8)}`;
                    const detailLink = r.paymentMethod === 'Invoice' ? `/invoice/details?id=${rId}` : `/receipts/details?id=${rId}`;

                    return (
                      <TableRow key={rId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-foreground">#{rNum}</TableCell>
                        <TableCell className="font-medium text-foreground">{r.customer?.name || 'Walk-in Customer'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {r.createdAt ? format(safeToDate(r.createdAt), 'dd MMM yyyy, h:mm a') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-muted/60 text-foreground border-border text-[10px]">
                            {r.paymentMethod || 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold font-mono text-foreground">
                          <CurrencyAmount amount={r.total} currency={currencySymbol} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs border-border hover:bg-muted font-medium">
                              <Link href={detailLink}>
                                <Eye className="h-3.5 w-3.5 mr-1" /> View & Print
                              </Link>
                            </Button>
                          </div>
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
  );
}
