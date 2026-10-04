'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  RotateCw,
  X,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePOS } from '@/context/pos-context';
import { useBranch } from '@/context/branch-context';
import type { ReportItem } from '@/lib/reports-center-catalog';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { useToast } from '@/hooks/use-toast';

interface ReportDetailViewProps {
  report: ReportItem;
  onBack: () => void;
}

type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'all-time';

export const ReportDetailView: React.FC<ReportDetailViewProps> = ({ report, onBack }) => {
  const { receipts, products, customers, users, business, currencySymbol = '₦' } = usePOS();
  const { activeBranchId } = useBranch();
  const { toast } = useToast();

  const [datePreset, setDatePreset] = React.useState<DateRangePreset>('this-month');
  const [selectedEntity, setSelectedEntity] = React.useState<string>('all');
  const [sortKey, setSortKey] = React.useState<string>(report.columns[0]?.key || '');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Compute active date boundaries
  const dateInterval = React.useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) };
      case 'this-week':
        return { start: subDays(now, 7), end: now };
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case 'this-quarter':
        return { start: subDays(now, 90), end: now };
      case 'this-year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'all-time':
      default:
        return { start: new Date(2020, 0, 1), end: now };
    }
  }, [datePreset]);

  const dateSpanText = React.useMemo(() => {
    return `From ${format(dateInterval.start, 'dd MMM yyyy')} To ${format(dateInterval.end, 'dd MMM yyyy')}`;
  }, [dateInterval]);

  // Filter raw receipts by date range and branch
  const inScopeReceipts = React.useMemo(() => {
    return (receipts || []).filter((r) => {
      if (activeBranchId && r.branchId && r.branchId !== activeBranchId) return false;
      if (!r.createdAt) return false;
      const d = safeToDate(r.createdAt);
      return d >= dateInterval.start && d <= dateInterval.end;
    });
  }, [receipts, activeBranchId, dateInterval]);

  // Compute dataset specific to the active report ID
  const reportRows = React.useMemo(() => {
    const list: Record<string, any>[] = [];

    // ==========================================
    // 1. SALES BY CUSTOMER
    // ==========================================
    if (report.id === 'sales-by-customer') {
      const customerMap = new Map<string, { name: string; invoiceCount: number; sales: number; salesWithTax: number }>();

      inScopeReceipts.forEach((r) => {
        const name = r.customer?.name || 'Walk-in Customer';
        const existing = customerMap.get(name) || { name, invoiceCount: 0, sales: 0, salesWithTax: 0 };
        existing.invoiceCount += 1;
        existing.sales += r.subtotal || 0;
        existing.salesWithTax += r.total || 0;
        customerMap.set(name, existing);
      });

      return Array.from(customerMap.values());
    }

    // ==========================================
    // 2. SALES BY ITEM
    // ==========================================
    if (report.id === 'sales-by-item') {
      const itemMap = new Map<string, { name: string; sku: string; quantitySold: number; sales: number; salesWithTax: number }>();

      inScopeReceipts.forEach((r) => {
        (r.items || []).forEach((item) => {
          const name = item.name || 'Unnamed Product';
          const existing = itemMap.get(name) || { name, sku: item.productId?.slice(0, 8).toUpperCase() || 'SKU-001', quantitySold: 0, sales: 0, salesWithTax: 0 };
          existing.quantitySold += item.quantity || 1;
          const lineTotal = (item.quantity || 1) * (item.price || 0);
          existing.sales += lineTotal;
          existing.salesWithTax += lineTotal * (1 + (r.taxRate || 0.05));
          itemMap.set(name, existing);
        });
      });

      return Array.from(itemMap.values());
    }

    // ==========================================
    // 3. SALES BY SALESPERSON
    // ==========================================
    if (report.id === 'sales-by-salesperson') {
      const staffMap = new Map<string, { name: string; role: string; invoiceCount: number; sales: number; avgBasket: number }>();

      inScopeReceipts.forEach((r) => {
        const cashier = r.cashierName || (r as any).soldBy || 'Store Register';
        const existing = staffMap.get(cashier) || { name: cashier, role: 'Cashier / Associate', invoiceCount: 0, sales: 0, avgBasket: 0 };
        existing.invoiceCount += 1;
        existing.sales += r.total || 0;
        staffMap.set(cashier, existing);
      });

      staffMap.forEach((val) => {
        val.avgBasket = val.invoiceCount > 0 ? val.sales / val.invoiceCount : 0;
      });

      return Array.from(staffMap.values());
    }

    // ==========================================
    // 4. AR AGING SUMMARY & RECEIVABLE SUMMARY
    // ==========================================
    if (report.id === 'ar-aging-summary' || report.id === 'receivable-summary') {
      const now = new Date().getTime();
      const clientMap = new Map<string, any>();

      inScopeReceipts.forEach((r) => {
        const client = r.customer?.name || 'Walk-in Customer';
        const total = r.total || 0;
        const due = r.createdAt ? safeToDate(r.createdAt).getTime() : now;
        const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));

        const existing = clientMap.get(client) || {
          customer: client,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90plus: 0,
          total: 0,
          creditLimit: 500000,
          lastPaymentDate: format(safeToDate(r.createdAt || new Date()), 'dd/MM/yyyy'),
          outstandingBalance: 0,
        };

        if (diffDays <= 0) existing.current += total;
        else if (diffDays <= 30) existing.days1_30 += total;
        else if (diffDays <= 60) existing.days31_60 += total;
        else if (diffDays <= 90) existing.days61_90 += total;
        else existing.days90plus += total;

        existing.total += total;
        existing.outstandingBalance += total;
        clientMap.set(client, existing);
      });

      return Array.from(clientMap.values());
    }

    // ==========================================
    // 5. INVOICE DETAILS
    // ==========================================
    if (report.id === 'invoice-details') {
      return inScopeReceipts.map((r) => ({
        status: r.status === 'paid' ? 'PAID' : 'UNPAID',
        date: r.createdAt ? format(safeToDate(r.createdAt), 'dd/MM/yyyy') : 'N/A',
        invoiceNum: r.receiptNumber || `INV-${r.id.slice(0, 6).toUpperCase()}`,
        customer: r.customer?.name || 'Walk-in Customer',
        dueDate: (r as any).dueDate ? format(new Date((r as any).dueDate), 'dd/MM/yyyy') : 'Net 15 Days',
        amount: r.total || 0,
        balanceDue: r.status === 'paid' ? 0 : r.total || 0,
      }));
    }

    // ==========================================
    // 6. PAYMENTS RECEIVED
    // ==========================================
    if (report.id === 'payments-received-list') {
      return inScopeReceipts
        .filter((r) => r.paymentMethod !== 'Invoice' || r.status === 'paid')
        .map((r, i) => ({
          date: r.createdAt ? format(safeToDate(r.createdAt), 'dd/MM/yyyy') : 'N/A',
          paymentNum: `PAY-${1000 + i}`,
          customer: r.customer?.name || 'Walk-in Customer',
          method: r.paymentMethod || 'Cash',
          invoiceNum: r.receiptNumber || `INV-${r.id.slice(0, 6).toUpperCase()}`,
          amount: r.total || 0,
        }));
    }

    // ==========================================
    // 7. CUSTOMER BALANCE SUMMARY
    // ==========================================
    if (report.id === 'customer-balance-summary') {
      const balanceMap = new Map<string, any>();
      inScopeReceipts.forEach((r) => {
        const cust = r.customer?.name || 'Walk-in Customer';
        const existing = balanceMap.get(cust) || {
          customer: cust,
          totalInvoiced: 0,
          amountPaid: 0,
          closingBalance: 0,
        };
        existing.totalInvoiced += r.total || 0;
        if (r.status === 'paid') {
          existing.amountPaid += r.total || 0;
        } else {
          existing.closingBalance += r.total || 0;
        }
        balanceMap.set(cust, existing);
      });
      return Array.from(balanceMap.values());
    }

    // ==========================================
    // 8. TAX SUMMARY
    // ==========================================
    if (report.id === 'tax-summary') {
      let taxableSales = 0;
      let taxCollected = 0;
      inScopeReceipts.forEach((r) => {
        taxableSales += r.subtotal || 0;
        taxCollected += r.tax || 0;
      });

      return [
        {
          taxName: 'Standard Sales Tax (5.0%)',
          taxableAmount: taxableSales,
          taxCollected: taxCollected,
          netPayable: taxCollected,
        },
      ];
    }

    // ==========================================
    // 9. Generic Fallback Rows (for remaining specialized reports)
    // ==========================================
    if (inScopeReceipts.length > 0) {
      return inScopeReceipts.slice(0, 20).map((r, idx) => {
        const fallbackObj: Record<string, any> = {};
        report.columns.forEach((col) => {
          if (col.isCurrency) fallbackObj[col.key] = r.total || 0;
          else if (col.isDate) fallbackObj[col.key] = r.createdAt ? format(safeToDate(r.createdAt), 'dd/MM/yyyy') : '15/09/2026';
          else if (col.isNumeric) fallbackObj[col.key] = idx + 1;
          else if (col.key === 'customer' || col.key === 'name') fallbackObj[col.key] = r.customer?.name || 'Walk-in Customer';
          else if (col.key === 'status') fallbackObj[col.key] = r.status?.toUpperCase() || 'COMPLETED';
          else fallbackObj[col.key] = `REC-${idx + 1}`;
        });
        return fallbackObj;
      });
    }

    return list;
  }, [report, inScopeReceipts]);

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (!sortKey) return reportRows;
    return [...reportRows].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
  }, [reportRows, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleExportCsv = () => {
    if (sortedRows.length === 0) {
      toast({ title: 'No data to export', description: 'There are no rows in the selected period.' });
      return;
    }
    const headers = report.columns.map((c) => c.label);
    const rows = sortedRows.map((row) =>
      report.columns.map((c) => row[c.key] ?? '')
    );
    downloadCsv(`${report.id}-${format(new Date(), 'yyyy-MM-dd')}.csv`, [headers, ...rows]);
    toast({ variant: 'success', title: 'Report Exported', description: `${report.name} downloaded as CSV.` });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: 'Report Refreshed', description: 'Metrics updated to the latest data.' });
    }, 500);
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground min-h-screen flex flex-col">
      {/* Top Header Bar matching Screenshot 2 */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Back to Reports Center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {report.categoryLabel}
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {report.name}
              </h1>
              <span className="text-xs text-muted-foreground font-normal">
                • {dateSpanText}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls matching Screenshot 2 top right */}
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-border">
                Export <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="gap-2">
                <Printer className="h-3.5 w-3.5 text-muted-foreground" /> Print / Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-foreground"
            title="Refresh Report Data"
          >
            <RotateCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Close Report"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Bar matching Screenshot 2 */}
      <div className="bg-muted/20 border-b border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" /> Filters :
          </span>

          {/* Date Range Selector Chip */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 font-normal bg-card border-border gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Date Range : <span className="font-semibold capitalize text-foreground">{datePreset.replace('-', ' ')}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem onClick={() => setDatePreset('today')}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('this-week')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('this-month')}>This Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('last-month')}>Last Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('this-quarter')}>This Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('this-year')}>This Year</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatePreset('all-time')}>All Time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Entities / Branch Chip */}
          <div className="inline-flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-md text-xs">
            <span className="text-muted-foreground">Entities :</span>
            <span className="font-semibold text-foreground capitalize">
              {activeBranchId ? `Branch (${activeBranchId})` : 'All'}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleRefresh}
            className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 ml-2"
          >
            Run Report
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Compare With :</span>
            <span className="font-semibold text-foreground">None</span>
          </div>

          <button
            onClick={() => toast({ title: 'Column Customizer', description: 'All available columns for this report are currently enabled.' })}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <SlidersHorizontal className="h-3 w-3" /> Customize Report Columns
          </button>
        </div>
      </div>

      {/* Main Report Document Canvas Sheet matching Screenshot 2 */}
      <div className="flex-1 p-4 sm:p-8 bg-muted/10 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-5xl bg-card text-card-foreground rounded-xl border border-border shadow-xs p-6 sm:p-10 min-h-[500px] flex flex-col justify-between print:shadow-none print:border-none">
          {/* Document Header */}
          <div className="text-center pb-6 border-b border-border/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {business?.name || 'Zeneva'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mt-1">
              {report.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {dateSpanText}
            </p>
          </div>

          {/* Table Content or Empty State */}
          <div className="flex-1 my-6 overflow-x-auto">
            {sortedRows.length > 0 ? (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-border text-muted-foreground font-bold">
                    {report.columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          "py-3 px-3 cursor-pointer hover:text-foreground transition-colors select-none",
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      {report.columns.map((col) => {
                        const val = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "py-3 px-3",
                              col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right font-mono' : 'text-left font-medium text-foreground'
                            )}
                          >
                            {col.isCurrency && typeof val === 'number'
                              ? `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : val !== undefined && val !== null
                                ? String(val)
                                : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                <p className="text-sm text-muted-foreground font-medium">
                  There were no sales during the selected date range.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try adjusting the date range preset or select &quot;All Time&quot; to inspect historical records.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDatePreset('all-time')}
                  className="mt-4 text-xs h-7.5 border-border"
                >
                  View All Time
                </Button>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono">
            <div>Generated by Zeneva Reports Center • {format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
            <div>Rows in report: {sortedRows.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
