'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { safeToDate } from '@/lib/utils';
import { format, isBefore, addDays, differenceInDays } from 'date-fns';
import {
  Building2,
  ChevronDown,
  Info,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { business, currentUserProfile, user, receipts, currencySymbol } = usePOS();
  const firestore = useFirestore();

  const [fiscalFilter, setFiscalFilter] = React.useState<'year' | 'quarter' | 'month' | 'prev_year'>('year');
  const [expensesList, setExpensesList] = React.useState<any[]>([]);
  const [hoveredMonthIdx, setHoveredMonthIdx] = React.useState<number | null>(null);

  const userName = currentUserProfile?.name || user?.displayName || 'Bello Imam';
  const businessName = business?.name || 'Zeneva';

  // Fetch expenses if available in Firestore
  React.useEffect(() => {
    if (!business?.id || !firestore) return;
    const fetchExpenses = async () => {
      try {
        const expRef = collection(firestore, `businessInstances/${business.id}/expenses`);
        const snapshot = await getDocs(expRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExpensesList(data);
      } catch {
        setExpensesList([]);
      }
    };
    fetchExpenses();
  }, [business?.id, firestore]);

  // Invoice & Receivables Calculations
  const invoices = React.useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(r => r.paymentMethod === 'Invoice' || r.type === 'invoice' || !!r.receiptNumber?.startsWith('INV'));
  }, [receipts]);

  // Aging Buckets for Overdue
  const { totalReceivables, currentAmount, overdueAmount, bucket1, bucket2, bucket3, bucket4 } = React.useMemo(() => {
    let totRec = 0;
    let curr = 0;
    let over = 0;
    let b1 = 0; // 1-15
    let b2 = 0; // 16-30
    let b3 = 0; // 31-45
    let b4 = 0; // >45

    const now = new Date();

    invoices.forEach(inv => {
      if (inv.status === 'paid') return;
      const amt = inv.total || 0;
      totRec += amt;

      const date = safeToDate(inv.createdAt);
      const dueDate = addDays(date, 30);

      if (isBefore(dueDate, now)) {
        over += amt;
        const daysPast = differenceInDays(now, dueDate);
        if (daysPast <= 15) b1 += amt;
        else if (daysPast <= 30) b2 += amt;
        else if (daysPast <= 45) b3 += amt;
        else b4 += amt;
      } else {
        curr += amt;
      }
    });

    return {
      totalReceivables: totRec,
      currentAmount: curr,
      overdueAmount: over,
      bucket1: b1,
      bucket2: b2,
      bucket3: b3,
      bucket4: b4
    };
  }, [invoices]);

  // Monthly Data for Sales, Receipts, and Expenses (12 months: Jan-26 to Dec-26)
  const currentYear = new Date().getFullYear();
  const yearShort = String(currentYear).slice(2);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels = months.map(m => `${m}-${yearShort}`);

  const monthlyMetrics = React.useMemo(() => {
    const data = months.map((m, idx) => ({
      month: monthLabels[idx],
      sales: 0,
      receipts: 0,
      expenses: 0
    }));

    if (receipts) {
      receipts.forEach(r => {
        const d = safeToDate(r.createdAt);
        if (d.getFullYear() === currentYear) {
          const mIdx = d.getMonth();
          const amt = r.total || 0;
          data[mIdx].sales += amt;
          if (r.status === 'paid' || r.paymentMethod !== 'Invoice') {
            data[mIdx].receipts += amt;
          }
        }
      });
    }

    expensesList.forEach(e => {
      const d = safeToDate(e.date || e.createdAt);
      if (d.getFullYear() === currentYear) {
        const mIdx = d.getMonth();
        data[mIdx].expenses += (e.amount || 0);
      }
    });

    return data;
  }, [receipts, expensesList, currentYear, monthLabels]);

  const totalSales = React.useMemo(() => monthlyMetrics.reduce((s, m) => s + m.sales, 0), [monthlyMetrics]);
  const totalReceipts = React.useMemo(() => monthlyMetrics.reduce((s, m) => s + m.receipts, 0), [monthlyMetrics]);
  const totalExpenses = React.useMemo(() => monthlyMetrics.reduce((s, m) => s + m.expenses, 0), [monthlyMetrics]);

  const maxVal = Math.max(
    ...monthlyMetrics.map(m => Math.max(m.sales, m.receipts, m.expenses)),
    1
  );

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const getPoints = (key: 'sales' | 'receipts' | 'expenses') => {
    return monthlyMetrics.map((item, idx) => {
      const x = paddingX + (idx / (monthlyMetrics.length - 1)) * usableWidth;
      const normalized = item[key] / (maxVal * 1.15);
      const y = chartHeight - paddingY - normalized * usableHeight;
      return { x, y, val: item[key], month: item.month };
    });
  };

  const salesPoints = getPoints('sales');
  const receiptsPoints = getPoints('receipts');
  const expensesPoints = getPoints('expenses');

  const makePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  const formatCurrency = (val: number) => {
    return `${currencySymbol || 'NGN'}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const filterNames: Record<string, string> = {
    year: 'This Fiscal Year',
    prev_year: 'Previous Fiscal Year',
    quarter: 'This Quarter',
    month: 'This Month'
  };

  return (
    <TooltipProvider>
      <div className="flex-1 w-full bg-background text-foreground min-h-screen p-4 sm:p-6 md:p-8 space-y-6">
        {/* Top Greeting Card */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-sm">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Hi! {userName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {businessName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-sm"
            >
              <Link href="/invoices/new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Invoice
              </Link>
            </Button>
          </div>
        </div>

        {/* Section 1: Total Receivables */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              Total Receivables
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border text-xs">
                Total money owed to you by customers on unpaid invoices.
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Top Bar inside Card */}
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                Total Receivables:{' '}
                <span className="text-foreground font-bold ml-1">
                  {formatCurrency(totalReceivables)}
                </span>
              </span>
            </div>

            {/* Sub-row: Current vs Overdue with Aging Breakdown */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Current */}
              <div className="md:col-span-3 sm:border-r border-border pr-4 space-y-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block">
                  Current
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-foreground block">
                  {formatCurrency(currentAmount)}
                </span>
              </div>

              {/* Overdue Total & Aging Buckets */}
              <div className="md:col-span-9 space-y-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                    Overdue
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-foreground">
                    {formatCurrency(overdueAmount)}
                  </span>
                </div>

                {/* Aging Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold font-mono text-foreground block">
                      {formatCurrency(bucket1)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">1-15 days</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold font-mono text-foreground block">
                      {formatCurrency(bucket2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">16-30 days</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold font-mono text-foreground block">
                      {formatCurrency(bucket3)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">31-45 days</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold font-mono text-foreground block">
                      {formatCurrency(bucket4)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Above 45 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sales and Expenses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Sales and Expenses
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border-border text-xs">
                  Monthly breakdown of sales, receipts received, and business expenses.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card border-border hover:bg-muted text-foreground text-xs h-8 px-3 rounded-lg flex items-center gap-2"
                >
                  {filterNames[fiscalFilter]}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs">
                <DropdownMenuItem onClick={() => setFiscalFilter('year')}>
                  This Fiscal Year
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiscalFilter('prev_year')}>
                  Previous Fiscal Year
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiscalFilter('quarter')}>
                  This Quarter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiscalFilter('month')}>
                  This Month
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Responsive SVG Chart */}
              <div className="lg:col-span-9 w-full overflow-x-auto">
                <div className="min-w-[620px]">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    {/* Horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = paddingY + ratio * usableHeight;
                      return (
                        <g key={i}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}

                    {/* Chart Area/Lines */}
                    {/* Sales Line (Blue/Cyan) */}
                    <path
                      d={makePath(salesPoints)}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* Receipts Line (Emerald Green) */}
                    <path
                      d={makePath(receiptsPoints)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* Expenses Line (Rose / Red) */}
                    <path
                      d={makePath(expensesPoints)}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* Dots on Hover */}
                    {monthlyMetrics.map((item, idx) => {
                      const s = salesPoints[idx];
                      const r = receiptsPoints[idx];
                      const e = expensesPoints[idx];
                      const isHovered = hoveredMonthIdx === idx;

                      return (
                        <g
                          key={idx}
                          onMouseEnter={() => setHoveredMonthIdx(idx)}
                          onMouseLeave={() => setHoveredMonthIdx(null)}
                          className="cursor-pointer"
                        >
                          {/* Hover Vertical Guide Line */}
                          {isHovered && (
                            <line
                              x1={s.x}
                              y1={paddingY}
                              x2={s.x}
                              y2={chartHeight - paddingY}
                              stroke="currentColor"
                              className="text-muted-foreground/50"
                              strokeDasharray="3 3"
                              strokeWidth="1"
                            />
                          )}

                          {/* Sales Dot */}
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={isHovered ? 5 : 3}
                            fill="#0284c7"
                            className="transition-all"
                          />
                          {/* Receipts Dot */}
                          <circle
                            cx={r.x}
                            cy={r.y}
                            r={isHovered ? 5 : 3}
                            fill="#10b981"
                            className="transition-all"
                          />
                          {/* Expenses Dot */}
                          <circle
                            cx={e.x}
                            cy={e.y}
                            r={isHovered ? 5 : 3}
                            fill="#f43f5e"
                            className="transition-all"
                          />

                          {/* X-Axis Month Labels */}
                          <text
                            x={s.x}
                            y={chartHeight - 6}
                            textAnchor="middle"
                            fontSize="10"
                            fill="currentColor"
                            className={isHovered ? "text-foreground font-bold" : "text-muted-foreground"}
                            fontFamily="monospace"
                          >
                            {item.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Legend on the Right */}
              <div className="lg:col-span-3 space-y-4 lg:border-l border-border lg:pl-6">
                {/* Total Sales */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Total Sales</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold font-mono text-foreground pl-4">
                    {formatCurrency(totalSales)}
                  </p>
                </div>

                {/* Total Receipts */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Receipts</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold font-mono text-foreground pl-4">
                    {formatCurrency(totalReceipts)}
                  </p>
                </div>

                {/* Total Expenses */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Total Expenses</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold font-mono text-foreground pl-4">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
