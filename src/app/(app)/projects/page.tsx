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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { safeToDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  Briefcase,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Project {
  id?: string;
  name: string;
  clientName: string;
  budget: number;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  createdAt: any;
  notes?: string;
}

export default function ProjectsPage() {
  const { business, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [budget, setBudget] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!business?.id || !firestore) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(firestore, `businessInstances/${business.id}/projects`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      setProjects(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [business?.id, firestore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientName || !business?.id || !firestore) {
      toast({ variant: 'destructive', title: 'Fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, `businessInstances/${business.id}/projects`), {
        name,
        clientName,
        budget: parseFloat(budget) || 0,
        status: 'in_progress',
        notes,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Project Created', description: `Project: ${name}` });
      setIsDialogOpen(false);
      setName('');
      setClientName('');
      setBudget('');
      setNotes('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error creating project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Project['status']) => {
    if (!business?.id || !firestore) return;
    try {
      await updateDoc(doc(firestore, `businessInstances/${business.id}/projects`, id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Project status updated to ${status.replace('_', ' ')}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    }
  };

  const handleBillProject = async (p: Project) => {
    if (!business?.id || !firestore) return;
    try {
      const invNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = p.budget || 0;

      await addDoc(collection(firestore, `businessInstances/${business.id}/receipts`), {
        type: 'invoice',
        receiptNumber: invNumber,
        invoiceNumber: invNumber,
        customerName: p.clientName,
        date: new Date().toISOString(),
        paymentMethod: 'Invoice',
        status: 'pending',
        subtotal: amount,
        tax: 0,
        total: amount,
        items: [
          {
            id: p.id || 'project-deliverables',
            name: `Project: ${p.name}`,
            price: amount,
            quantity: 1,
            amount: amount,
          }
        ],
        notes: `Invoiced from Project: ${p.name}. Scope: ${p.notes || 'Full milestone billing'}`,
        createdAt: serverTimestamp(),
      });

      if (p.id) {
        await updateDoc(doc(firestore, `businessInstances/${business.id}/projects`, p.id), {
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Project Invoiced!',
        description: `Generated Invoice #${invNumber} for ${p.clientName}.`,
      });

      router.push('/invoices');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to generate invoice' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    if (!business?.id || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `businessInstances/${business.id}/projects`, id));
      toast({ title: 'Project deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const activeProjectsCount = projects.filter(p => p.status === 'in_progress').length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <PageTitle title="Client Projects" />
          <p className="text-xs text-muted-foreground mt-1">
            Track client job deliverables, project budgets, and time billing
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Project Budgets</CardDescription>
            <CardTitle className="text-2xl font-bold"><CurrencyAmount amount={totalBudget} currency={currencySymbol} /></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Active Projects</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">{activeProjectsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Completed Projects</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === 'completed').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border/50 shadow-none">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Project Directory</CardTitle>
            <CardDescription>Monitor project execution and client milestones</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <Award className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No Projects Found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create projects to track time logs, billable deliverables, and budgets.</p>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create Project
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold text-sm">{p.name}</TableCell>
                      <TableCell className="font-medium">{p.clientName}</TableCell>
                      <TableCell className="font-semibold"><CurrencyAmount amount={p.budget} currency={currencySymbol} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.createdAt ? format(safeToDate(p.createdAt), 'MMM d, yyyy') : 'Just now'}
                      </TableCell>
                      <TableCell>
                        {p.status === 'completed' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>}
                        {p.status === 'in_progress' && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>}
                        {p.status === 'planning' && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Planning</Badge>}
                        {p.status === 'on_hold' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">On Hold</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            onClick={() => handleBillProject(p)}
                            title="Generate invoice for this project"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Bill Project
                          </Button>
                          {p.status !== 'completed' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(p.id!, 'completed')}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Complete
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id!)}>
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
            <DialogTitle>New Client Project</DialogTitle>
            <DialogDescription>Create a project container to track client work and billable hours.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prName">Project Title *</Label>
              <Input id="prName" placeholder="e.g. Website Redesign / ERP Implementation" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prClient">Client Name *</Label>
              <Input id="prClient" placeholder="Client or business name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prBudget">Project Budget ({currencySymbol})</Label>
              <Input id="prBudget" type="number" step="0.01" placeholder="0.00" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prNotes">Project Brief / Scope</Label>
              <Input id="prNotes" placeholder="Key deliverables..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
