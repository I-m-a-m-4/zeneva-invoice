'use client';

import * as React from 'react';
import PageTitle from '@/components/shared/page-title';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate, cn } from '@/lib/utils';
import { format, isThisMonth, subMonths, isSameMonth } from 'date-fns';
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building2,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  Download,
  Filter,
  BarChart3,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Expense {
  id?: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  vendor?: string;
  referenceNumber?: string;
  expenseDate?: string;
  createdAt: any;
}

const CATEGORIES = [
  'Rent & Utilities',
  'Salaries & Wages',
  'Logistics & Shipping',
  'Marketing & Ads',
  'Equipment & Repairs',
  'Software & Cloud',
  'Office Supplies',
  'Taxes & Legal',
  'Miscellaneous'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Rent & Utilities': '#ea580c', // Orange
  'Salaries & Wages': '#0284c7', // Sky
  'Logistics & Shipping': '#10b981', // Emerald
  'Marketing & Ads': '#8b5cf6', // Violet
  'Equipment & Repairs': '#f59e0b', // Amber
  'Software & Cloud': '#06b6d4', // Cyan
  'Office Supplies': '#64748b', // Slate
  'Taxes & Legal': '#e11d48', // Rose
  'Miscellaneous': '#6b7280' // Gray
};

export default function ExpensesPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('ledger');

  // Form State
  const [category, setCategory] = React.useState('Rent & Utilities');
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState('Bank Transfer');
  const [vendor, setVendor] = React.useState('');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [expenseDate, setExpenseDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Expense[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Expense);
        });
        setExpenses(items);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching expenses:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Missing required fields', description: 'Please provide a description and amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `businessInstances/${business.id}/expenses`), {
        category,
        description,
        amount: parseFloat(amount) || 0,
        paymentMode,
        vendor: vendor.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        expenseDate: expenseDate || format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Expense Recorded Successfully',
        description: `${category}: ${currencySymbol}${parseFloat(amount).toLocaleString()}`,
      });
      setIsDialogOpen(false);
      setDescription('');
      setAmount('');
      setVendor('');
      setReferenceNumber('');
      setActiveTab('ledger');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error logging expense', description: 'Failed to record expense. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this expense record?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/expenses`, id));
      toast({ title: 'Expense Record Deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete expense' });
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast({ title: 'No records to export' });
      return;
    }

    const headers = ['Category', 'Description', 'Vendor', 'Payment Mode', 'Date', 'Amount', 'Reference'];
    const rows = expenses.map(ex => [
      `"${ex.category || ''}"`,
      `"${ex.description.replace(/"/g, '""')}"`,
      `"${(ex.vendor || '').replace(/"/g, '""')}"`,
      `"${ex.paymentMode || ''}"`,
      `"${ex.expenseDate || (ex.createdAt ? format(safeToDate(ex.createdAt), 'yyyy-MM-dd') : '')}"`,
      ex.amount || 0,
      `"${ex.referenceNumber || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zeneva_expenses_${format(new Date(), 'yyyy_MM_dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered List
  const filtered = expenses.filter(ex => {
    const matchesSearch =
      ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.vendor && ex.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.referenceNumber && ex.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
    const matchesPayment = paymentFilter === 'all' || ex.paymentMode === paymentFilter;

    return matchesSearch && matchesCategory && matchesPayment;
  });

  // Analytics Computations
  const totalExpenseAmount = expenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

  const now = new Date();
  const thisMonthExpenses = expenses.filter(ex => {
    const d = safeToDate(ex.createdAt);
    return isSameMonth(d, now);
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

  const lastMonth = subMonths(now, 1);
  const lastMonthExpenses = expenses.filter(ex => {
    const d = safeToDate(ex.createdAt);
    return isSameMonth(d, lastMonth);
  });
  const lastMonthTotal = lastMonthExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

  const monthTrend = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : 0;

  // Category Breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(ex => {
    categoryTotals[ex.category] = (categoryTotals[ex.category] || 0) + (ex.amount || 0);
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategoryName = sortedCategories.length > 0 ? sortedCategories[0][0] : 'None';
  const topCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;
  const topCategoryShare = totalExpenseAmount > 0 ? Math.round((topCategoryAmount / totalExpenseAmount) * 100) : 0;

  // Payment Mode Breakdown
  const paymentTotals: Record<string, number> = {};
  expenses.forEach(ex => {
    const mode = ex.paymentMode || 'Cash';
    paymentTotals[mode] = (paymentTotals[mode] || 0) + (ex.amount || 0);
  });
  const sortedPaymentModes = Object.entries(paymentTotals).sort((a, b) => b[1] - a[1]);
  const topPaymentMode = sortedPaymentModes.length > 0 ? sortedPaymentModes[0][0] : 'Bank Transfer';
  const topPaymentShare = totalExpenseAmount > 0 && sortedPaymentModes.length > 0
    ? Math.round((sortedPaymentModes[0][1] / totalExpenseAmount) * 100)
    : 0;

  const averageExpense = expenses.length > 0 ? Math.round(totalExpenseAmount / expenses.length) : 0;
  const largestExpense = expenses.reduce((max, ex) => Math.max(max, ex.amount || 0), 0);

  // Monthly Chart Data (Last 6 Months)
  const monthlyChartData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const mName = format(mDate, 'MMM yyyy');
      const mTotal = expenses
        .filter(ex => isSameMonth(safeToDate(ex.createdAt), mDate))
        .reduce((sum, ex) => sum + (ex.amount || 0), 0);

      months.push({
        month: format(mDate, 'MMM'),
        fullMonth: mName,
        total: mTotal,
      });
    }
    return months;
  }, [expenses]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full max-w-[1700px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <PageTitle title="Business Expenses" />
          <p className="text-xs text-muted-foreground mt-1">
            Track operational spending, vendor disbursements, payroll, and company cashflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-border/60">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Log Expense
          </Button>
        </div>
      </div>

      {/* Taller, Richer Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="border border-border/70 shadow-sm min-h-[148px] flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Expenses</span>
              <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-destructive mt-1">
              <CurrencyAmount amount={totalExpenseAmount} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2.5 mt-2">
              <span>{expenses.length} Total records</span>
              <span className="font-medium text-foreground">Avg <CurrencyAmount amount={averageExpense} currency={currencySymbol} /></span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border border-border/70 shadow-sm min-h-[148px] flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Month</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-1">
              <CurrencyAmount amount={thisMonthTotal} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5 mt-2">
              <span className="text-muted-foreground">{thisMonthExpenses.length} entries this month</span>
              {monthTrend !== 0 ? (
                <span className={cn('font-semibold flex items-center gap-0.5', monthTrend > 0 ? 'text-destructive' : 'text-emerald-600')}>
                  {monthTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(Math.round(monthTrend))}% vs last mo
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">On track</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border border-border/70 shadow-sm min-h-[148px] flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Spending Category</span>
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <PieChartIcon className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-1 truncate" title={topCategoryName}>
              {topCategoryName}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5 mt-2">
              <span className="text-muted-foreground">{topCategoryShare}% of total outflow</span>
              <span className="font-semibold text-primary"><CurrencyAmount amount={topCategoryAmount} currency={currencySymbol} /></span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border border-border/70 shadow-sm min-h-[148px] flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader className="pb-1 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Largest Expense</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-1">
              <CurrencyAmount amount={largestExpense} currency={currencySymbol} />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2.5 mt-2">
              <span className="text-muted-foreground">Primary: {topPaymentMode}</span>
              <span className="font-semibold text-muted-foreground">{topPaymentShare}% share</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="ledger" className="text-xs font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" /> All Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics & Breakdown
            </TabsTrigger>
            <TabsTrigger value="new" className="text-xs font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Quick Log Form
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: ALL EXPENSES LEDGER */}
        <TabsContent value="ledger" className="space-y-4">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Expense Ledger</CardTitle>
                <CardDescription>Audited real-time ledger of company expenditures</CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-56 min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search description, vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs w-[140px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="h-9 text-xs w-[130px]">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="USSD">USSD</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-base font-semibold text-foreground">No Expenses Found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                    {expenses.length === 0
                      ? 'Keep your business accounting healthy by recording operational costs as they occur.'
                      : 'No expense records matched your current search filters.'}
                  </p>
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-1.5" /> Log First Expense
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Category</TableHead>
                        <TableHead className="font-semibold text-xs">Description</TableHead>
                        <TableHead className="font-semibold text-xs">Vendor / Payee</TableHead>
                        <TableHead className="font-semibold text-xs">Payment Mode</TableHead>
                        <TableHead className="font-semibold text-xs">Date</TableHead>
                        <TableHead className="font-semibold text-xs">Amount</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((ex) => (
                        <TableRow key={ex.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold px-2 py-0.5 border"
                              style={{
                                borderColor: `${CATEGORY_COLORS[ex.category] || '#ea580c'}40`,
                                color: CATEGORY_COLORS[ex.category] || '#ea580c',
                                backgroundColor: `${CATEGORY_COLORS[ex.category] || '#ea580c'}10`
                              }}
                            >
                              {ex.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div>
                              <span>{ex.description}</span>
                              {ex.referenceNumber && (
                                <span className="block text-[11px] text-muted-foreground font-mono">
                                  Ref: {ex.referenceNumber}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ex.vendor || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <CreditCard className="h-3 w-3" />
                              {ex.paymentMode || 'Cash'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {ex.expenseDate
                              ? format(new Date(ex.expenseDate), 'MMM d, yyyy')
                              : ex.createdAt
                              ? format(safeToDate(ex.createdAt), 'MMM d, yyyy')
                              : 'Recent'}
                          </TableCell>
                          <TableCell className="font-bold text-destructive whitespace-nowrap">
                            -<CurrencyAmount amount={ex.amount} currency={currencySymbol} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(ex.id!)}
                              title="Delete Expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ANALYTICS & BREAKDOWN */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart: Monthly Expense Trend */}
            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Monthly Expense Trend (Last 6 Months)
                </CardTitle>
                <CardDescription>Visual comparison of total monthly expenditure</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} textAnchor="middle" />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${currencySymbol}${val > 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, 'Total Expenses']}
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {monthlyChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === monthlyChartData.length - 1 ? '#ea580c' : '#f9731680'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown Progress */}
            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" /> Spending by Category
                </CardTitle>
                <CardDescription>Relative share of expenses across operational departments</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {sortedCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No expenses recorded yet.</p>
                ) : (
                  sortedCategories.map(([cat, amt]) => {
                    const percentage = totalExpenseAmount > 0 ? Math.round((amt / totalExpenseAmount) * 100) : 0;
                    const color = CATEGORY_COLORS[cat] || '#ea580c';
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            {cat}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              <CurrencyAmount amount={amt} currency={currencySymbol} />
                            </span>
                            <span className="text-muted-foreground w-9 text-right font-mono">{percentage}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Split & Burn Velocity */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Payment Method Breakdown
                </CardTitle>
                <CardDescription>Disbursements by payment channel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedPaymentModes.map(([mode, amt]) => {
                  const percent = totalExpenseAmount > 0 ? Math.round((amt / totalExpenseAmount) * 100) : 0;
                  return (
                    <div key={mode} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {mode.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{mode}</p>
                          <p className="text-[11px] text-muted-foreground">{percent}% of total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          <CurrencyAmount amount={amt} currency={currencySymbol} />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Outflow & Burn Analytics
                </CardTitle>
                <CardDescription>Key metrics to optimize company operational health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Estimated Monthly Run Rate</p>
                    <p className="text-[11px] text-muted-foreground">Based on this month's average burn</p>
                  </div>
                  <p className="text-base font-bold text-destructive">
                    <CurrencyAmount amount={thisMonthTotal} currency={currencySymbol} />
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Average Expense Transaction</p>
                    <p className="text-[11px] text-muted-foreground">Across all {expenses.length} records</p>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    <CurrencyAmount amount={averageExpense} currency={currencySymbol} />
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Single Largest Outflow</p>
                    <p className="text-[11px] text-muted-foreground">Peak capital disbursement</p>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    <CurrencyAmount amount={largestExpense} currency={currencySymbol} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: DEDICATED LOG FORM */}
        <TabsContent value="new">
          <Card className="border border-border/70 shadow-sm w-full max-w-4xl">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Log New Expense
              </CardTitle>
              <CardDescription>
                Record a vendor payment, operational utility, staff salary, or overhead cost
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="inlineCat" className="text-xs font-semibold">Expense Category *</Label>
                    <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                      <SelectTrigger id="inlineCat" className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inlineAmount" className="text-xs font-semibold">Amount ({currencySymbol}) *</Label>
                    <Input
                      id="inlineAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10 font-bold text-destructive"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inlineDesc" className="text-xs font-semibold">Description / Purpose *</Label>
                  <Input
                    id="inlineDesc"
                    placeholder="e.g. Server hosting renewal, office generator fuel, delivery courier"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="inlineVendor" className="text-xs font-semibold">Vendor / Merchant</Label>
                    <Input
                      id="inlineVendor"
                      placeholder="e.g. AWS, Total Energies"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inlineMode" className="text-xs font-semibold">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                      <SelectTrigger id="inlineMode" className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="USSD">USSD</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inlineDate" className="text-xs font-semibold">Date of Expense</Label>
                    <Input
                      id="inlineDate"
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inlineRef" className="text-xs font-semibold">Reference / Receipt Number (Optional)</Label>
                  <Input
                    id="inlineRef"
                    placeholder="e.g. REC-2026-098 / Transfer Ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-border/40 pt-4">
                <Button type="button" variant="outline" onClick={() => setActiveTab('ledger')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {isSubmitting ? 'Recording...' : 'Save & Record Expense'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Dialog Modal (Quick Action) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Log Operating Expense
            </DialogTitle>
            <DialogDescription>Quickly record business spending or overhead expenses.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exCat" className="text-xs font-semibold">Category *</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger id="exCat" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exDesc" className="text-xs font-semibold">Description / Purpose *</Label>
              <Input
                id="exDesc"
                placeholder="e.g. Office generator fuel / Internet subscription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exAmount" className="text-xs font-semibold">Amount ({currencySymbol}) *</Label>
                <Input
                  id="exAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-bold text-destructive"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exMode" className="text-xs font-semibold">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                  <SelectTrigger id="exMode" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="USSD">USSD</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exVendor" className="text-xs font-semibold">Vendor (Optional)</Label>
                <Input
                  id="exVendor"
                  placeholder="e.g. Shell / MTN"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exDate" className="text-xs font-semibold">Date</Label>
                <Input
                  id="exDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {isSubmitting ? 'Logging...' : 'Log Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
