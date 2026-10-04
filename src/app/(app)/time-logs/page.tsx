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
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  History as HistoryIcon,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  Play,
  Square,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface TimeLog {
  id?: string;
  projectName: string;
  taskDescription: string;
  hours: number;
  hourlyRate: number;
  billableAmount: number;
  status: 'unbilled' | 'billed';
  createdAt: any;
}

export default function TimeLogsPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [logs, setLogs] = React.useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [projectName, setProjectName] = React.useState('');
  const [taskDescription, setTaskDescription] = React.useState('');
  const [hours, setHours] = React.useState('');
  const [hourlyRate, setHourlyRate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/timeLogs`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TimeLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as TimeLog);
      });
      setLogs(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !taskDescription || !hours || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    const hrs = parseFloat(hours) || 0;
    const rate = parseFloat(hourlyRate) || 0;
    const billable = hrs * rate;

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `businessInstances/${business.id}/timeLogs`), {
        projectName,
        taskDescription,
        hours: hrs,
        hourlyRate: rate,
        billableAmount: billable,
        status: 'unbilled',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Time Logged', description: `${hrs} hrs logged for ${projectName}` });
      setIsDialogOpen(false);
      setProjectName('');
      setTaskDescription('');
      setHours('');
      setHourlyRate('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error logging time' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkBilled = async (id: string) => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/timeLogs`, id), {
        status: 'billed',
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Time log marked as billed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update' });
    }
  };

  const handleInvoiceTimeLog = async (log: TimeLog) => {
    if (!business?.id || !firestore) return;
    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = log.billableAmount || 0;

      await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: log.projectName,
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: amount,
        tax: 0,
        total: amount,
        items: [
          {
            id: log.id || 'time-log-item',
            name: `${log.projectName}: ${log.taskDescription} (${log.hours} hrs @ ${currencySymbol}${log.hourlyRate}/hr)`,
            price: amount,
            quantity: 1,
            amount: amount,
          }
        ],
        notes: `Invoiced from Time Log: ${log.hours} hours logged for ${log.projectName}.`,
        createdAt: serverTimestamp(),
      });

      if (log.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/timeLogs`, log.id), {
          status: 'billed',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Hours Invoiced!',
        description: `Generated Invoice #${invNumber} for ${log.projectName}.`,
      });

      router.push('/invoices');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to invoice time log' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/timeLogs`, id));
      toast({ title: 'Time log deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = logs.filter(l =>
    l.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.taskDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);
  const unbilledAmount = logs.filter(l => l.status === 'unbilled').reduce((sum, l) => sum + (l.billableAmount || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Time Logs & Hours" />
          <p className="text-xs text-muted-foreground mt-1">
            Log billable client hours, tasks, and consulting time entries
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Log Hours
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Unbilled Hours Value</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600"><CurrencyAmount amount={unbilledAmount} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Hours Logged</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalHours} hrs</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Time Entries</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Time Log Sheet</CardTitle>
            <CardDescription>Audited billable work hours by project</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search time logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Time Logs Recorded</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Log consulting or project hours to convert directly to invoices.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Log Hours
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Task / Description</TableHead>
                    <TableHead>Hours Logged</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Billable Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-bold text-sm">{l.projectName}</TableCell>
                      <TableCell className="text-sm">{l.taskDescription}</TableCell>
                      <TableCell className="font-mono text-sm">{l.hours} hrs</TableCell>
                      <TableCell className="text-xs text-muted-foreground"><CurrencyAmount amount={l.hourlyRate} currency={currencySymbol} /> / hr</TableCell>
                      <TableCell className="font-semibold"><CurrencyAmount amount={l.billableAmount} currency={currencySymbol} /></TableCell>
                      <TableCell>
                        {l.status === 'billed' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Billed</Badge>}
                        {l.status === 'unbilled' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Unbilled</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {l.status === 'unbilled' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => handleInvoiceTimeLog(l)}
                                title="Generate invoice from this time log"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMarkBilled(l.id!)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Mark Billed
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l.id!)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Billable Hours</DialogTitle>
            <DialogDescription>Record work hours performed for a client project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tProject">Project Name *</Label>
              <Input id="tProject" placeholder="Project or client title" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tTask">Task / Activity Description *</Label>
              <Input id="tTask" placeholder="e.g. Frontend UI coding / Client consultation" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tHours">Hours Logged *</Label>
                <Input id="tHours" type="number" step="0.5" placeholder="e.g. 4.5" value={hours} onChange={(e) => setHours(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tRate">Hourly Rate ({currencySymbol})</Label>
                <Input id="tRate" type="number" step="0.01" placeholder="0.00" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Log Hours</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
