'use client';

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ReceiptDetails from '@/components/receipts/receipt-details';
import {
  FileText,
  FileCheck,
  CreditCard,
  Receipt as ReceiptIcon,
  Users,
  Check,
  Eye,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Receipt } from '@/types';
import {
  INVOICE_TEMPLATES,
  OTHER_DOC_TEMPLATES,
  type TemplateDefinition,
} from '@/lib/invoice-templates-catalog';
import { InvoiceMiniatureCard } from './invoice-miniature-card';

export { INVOICE_TEMPLATES, type TemplateDefinition };

export interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string) => void;
  currentTemplateId?: string;
}

export function TemplatePickerModal({
  open,
  onOpenChange,
  onSelectTemplate,
  currentTemplateId,
}: TemplatePickerModalProps) {
  const { business, mutateBusiness, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocType, setSelectedDocType] = React.useState<'invoices' | 'quotes' | 'credit-notes' | 'receipts' | 'statements'>('invoices');
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const activeTemplate = currentTemplateId || (business?.settings as any)?.invoiceTemplate || 'standard';

  const categoryCounts = React.useMemo(() => {
    return {
      all: INVOICE_TEMPLATES.length,
      standard: INVOICE_TEMPLATES.filter((t) => t.category === 'standard').length,
      spreadsheet: INVOICE_TEMPLATES.filter((t) => t.category === 'spreadsheet').length,
      premium: INVOICE_TEMPLATES.filter((t) => t.category === 'premium').length,
      universal: INVOICE_TEMPLATES.filter((t) => t.category === 'universal').length,
      retail: INVOICE_TEMPLATES.filter((t) => t.category === 'retail').length,
    };
  }, []);

  const filteredTemplates = React.useMemo(() => {
    if (selectedDocType !== 'invoices') {
      return OTHER_DOC_TEMPLATES[selectedDocType] || [];
    }
    if (activeCategory === 'all') return INVOICE_TEMPLATES;
    return INVOICE_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [selectedDocType, activeCategory]);

  const handleApply = async (templateId: string) => {
    if (onSelectTemplate) {
      onSelectTemplate(templateId);
    }

    if (!business?.id || !firestore) {
      toast({ title: 'Template chosen', description: `${templateId} template selected.` });
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'businessInstances', business.id), {
        'settings.invoiceTemplate': templateId,
        updatedAt: serverTimestamp(),
      });
      if (mutateBusiness) mutateBusiness();
      toast({
        variant: 'success',
        title: 'Template Activated',
        description: `Invoices will now format using the ${templateId} template.`,
      });
      onOpenChange(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update template' });
    } finally {
      setIsSaving(false);
    }
  };

  const sampleReceipt: Receipt = React.useMemo(() => ({
    id: 'sample-001',
    receiptNumber: 'INV-000045',
    businessId: business?.id || 'sample-biz',
    createdAt: new Date() as any,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString() as any,
    customer: {
      name: 'Acme Global Corporation',
      email: 'billing@acmeglobal.com',
    },
    items: [
      { productId: 'p1', name: 'Software Development & API Integration', price: 120000, quantity: 1, total: 120000 },
      { productId: 'p2', name: 'Cloud Infrastructure Setup & Security Audit', price: 65000, quantity: 1, total: 65000 },
      { productId: 'p3', name: 'Monthly Maintenance & Support SLA', price: 35000, quantity: 1, total: 35000 },
    ],
    subtotal: 220000,
    tax: 16500,
    discount: 0,
    total: 236500,
    status: 'unpaid',
    paymentMethod: 'Invoice',
  }), [business?.id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl h-[88vh] max-h-[820px] flex flex-col rounded-xl">
          {/* Window Title Bar matching Zoho Screenshot */}
          <div className="bg-[#1e222d] text-white px-5 py-3 flex items-center justify-between border-b border-zinc-800 select-none">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded bg-purple-600 flex items-center justify-center text-[11px] font-bold">
                Z
              </div>
              <span className="font-semibold text-sm tracking-wide">Zeneva Invoice - Templates</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-zinc-400 font-mono">
                Active: <span className="text-white font-bold capitalize">{activeTemplate}</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Layout: Left Sidebar + Right Gallery */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Document Types */}
            <div className="w-56 bg-muted/30 border-r border-border p-3 flex flex-col justify-between select-none">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Documents
                </div>
                {[
                  { id: 'quotes', label: 'Quotes', icon: FileCheck },
                  { id: 'invoices', label: 'Invoices', icon: FileText, count: '22' },
                  { id: 'credit-notes', label: 'Credit Notes', icon: CreditCard },
                  { id: 'receipts', label: 'Payment Receipts', icon: ReceiptIcon },
                  { id: 'statements', label: 'Customer Statement', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedDocType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocType(item.id as any);
                        setActiveCategory('all');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left',
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground')} />
                        <span>{item.label}</span>
                      </div>
                      {item.count && (
                        <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono', isSelected ? 'bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 font-bold' : 'text-muted-foreground bg-muted')}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-950 dark:text-purple-200">
                <div className="flex items-center gap-1 font-bold mb-1">
                  <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <span>Instant Switch</span>
                </div>
                Selecting a template applies it across all existing and new invoices immediately.
              </div>
            </div>

            {/* Right Main Gallery */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Header Bar */}
              <div className="px-6 pt-5 pb-3 border-b border-border bg-card/40">
                <h1 className="text-xl font-bold text-foreground">
                  {selectedDocType === 'invoices' ? 'Choose a Template' : `${selectedDocType.toUpperCase()} TEMPLATES`}
                </h1>

                {/* Filter Tabs matching Zoho screenshot */}
                {selectedDocType === 'invoices' && (
                  <div className="flex items-center gap-6 mt-4 border-b border-border text-xs overflow-x-auto pb-px">
                    {[
                      { id: 'all', label: `All (${categoryCounts.all})` },
                      { id: 'standard', label: `Standard (${categoryCounts.standard})` },
                      { id: 'spreadsheet', label: `Spreadsheet (${categoryCounts.spreadsheet})` },
                      { id: 'premium', label: `Premium (${categoryCounts.premium})` },
                      { id: 'universal', label: `Universal (${categoryCounts.universal})` },
                      { id: 'retail', label: `Retail (${categoryCounts.retail})` },
                    ].map((tab) => {
                      const isActive = activeCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveCategory(tab.id)}
                          className={cn(
                            'pb-2.5 font-medium transition-colors relative whitespace-nowrap',
                            isActive
                              ? 'text-purple-600 dark:text-purple-400 font-bold border-b-2 border-purple-600 dark:border-purple-400'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scrollable Template Cards Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                <div className="mb-4 text-xs font-black tracking-wider uppercase text-muted-foreground">
                  {activeCategory === 'all' ? 'TEMPLATES' : `${activeCategory.toUpperCase()} TEMPLATES`} ({filteredTemplates.length})
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((tmpl) => {
                    const isActive = activeTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        className={cn(
                          'group bg-card text-card-foreground rounded-xl border-2 transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-md',
                          isActive ? 'border-purple-600 ring-2 ring-purple-500/20' : 'border-border hover:border-muted-foreground/40'
                        )}
                      >
                        {/* Miniature Template Preview Canvas */}
                        <div
                          className="relative bg-muted/40 p-4 border-b border-border aspect-[1/1.15] flex flex-col justify-between overflow-hidden cursor-pointer"
                          onClick={() => setPreviewTemplate(tmpl.id)}
                        >
                          <InvoiceMiniatureCard
                            template={tmpl}
                            businessName={business?.name || 'Zylker Inc'}
                            currencySymbol={currencySymbol || '$'}
                          />

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(tmpl.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Preview
                            </Button>
                          </div>
                        </div>

                        {/* Card Info and Buttons */}
                        <div className="p-3.5 flex flex-col justify-between flex-1 bg-card">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="font-bold text-xs text-foreground truncate" title={tmpl.name}>
                                {tmpl.name}
                              </h3>
                              {tmpl.badge && (
                                <Badge variant="outline" className="text-[9px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0">
                                  {tmpl.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {tmpl.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-2">
                            <Button
                              onClick={() => handleApply(tmpl.id)}
                              disabled={isSaving}
                              variant={isActive ? 'default' : 'outline'}
                              className={cn(
                                'flex-1 text-xs font-bold h-7.5',
                                isActive
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'border-border text-foreground hover:bg-muted'
                              )}
                            >
                              {isActive ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3 w-3 stroke-[3]" /> Active
                                </span>
                              ) : (
                                'Use Template'
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setPreviewTemplate(tmpl.id)}
                              title="Full preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Live Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-zinc-100 text-zinc-900 border-zinc-300">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-3.5 flex items-center justify-between z-10 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900">
                  Previewing: <span className="text-purple-600 capitalize">{previewTemplate}</span> Template
                </span>
                {previewTemplate === activeTemplate && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    Currently Active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    handleApply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5 stroke-[3]" />
                  Apply This Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-8 text-xs border-zinc-300 text-zinc-700"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6 sm:p-10 flex justify-center">
              <ReceiptDetails
                receipt={sampleReceipt}
                business={business}
                currencySymbol={currencySymbol || '₦'}
                isInvoice={true}
                overrideTemplate={previewTemplate}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
