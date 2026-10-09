'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ReceiptDetails from '@/components/receipts/receipt-details';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FileText,
  FileCheck,
  CreditCard,
  Receipt as ReceiptIcon,
  Users,
  Check,
  Eye,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Receipt } from '@/types';
import {
  INVOICE_TEMPLATES,
  OTHER_DOC_TEMPLATES,
  type TemplateDefinition
} from '@/lib/invoice-templates-catalog';
import { InvoiceMiniatureCard } from '@/components/invoices/invoice-miniature-card';

type DocType = 'invoices' | 'quotes' | 'credit-notes' | 'receipts' | 'statements';

export default function TemplatesPage() {
  const { business, mutateBusiness, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocType, setSelectedDocType] = React.useState<DocType>('invoices');
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const activeTemplate = (business?.settings as any)?.invoiceTemplate || 'standard';

  // Category counts calculated dynamically from INVOICE_TEMPLATES
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: INVOICE_TEMPLATES.length,
      standard: INVOICE_TEMPLATES.filter((t) => t.category === 'standard').length,
      spreadsheet: INVOICE_TEMPLATES.filter((t) => t.category === 'spreadsheet').length,
      premium: INVOICE_TEMPLATES.filter((t) => t.category === 'premium').length,
      universal: INVOICE_TEMPLATES.filter((t) => t.category === 'universal').length,
      retail: INVOICE_TEMPLATES.filter((t) => t.category === 'retail').length,
    };
    return counts;
  }, []);

  // Filter templates based on category and search query
  const templatesToDisplay = React.useMemo(() => {
    if (selectedDocType !== 'invoices') {
      const otherList = OTHER_DOC_TEMPLATES[selectedDocType] || [];
      if (!searchQuery) return otherList;
      return otherList.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    let list = INVOICE_TEMPLATES;
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (searchQuery) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [selectedDocType, activeCategory, searchQuery]);

  // Group templates by category when in 'all' view
  const groupedSections = React.useMemo(() => {
    if (selectedDocType !== 'invoices' || activeCategory !== 'all' || searchQuery) {
      return null;
    }
    const categories: Array<{ id: string; label: string; items: TemplateDefinition[] }> = [
      { id: 'standard', label: 'STANDARD', items: INVOICE_TEMPLATES.filter((t) => t.category === 'standard') },
      { id: 'universal', label: 'UNIVERSAL', items: INVOICE_TEMPLATES.filter((t) => t.category === 'universal') },
      { id: 'retail', label: 'RETAIL', items: INVOICE_TEMPLATES.filter((t) => t.category === 'retail') },
      { id: 'spreadsheet', label: 'SPREADSHEET', items: INVOICE_TEMPLATES.filter((t) => t.category === 'spreadsheet') },
      { id: 'premium', label: 'PREMIUM', items: INVOICE_TEMPLATES.filter((t) => t.category === 'premium') },
    ];
    return categories.filter((c) => c.items.length > 0);
  }, [selectedDocType, activeCategory, searchQuery]);

  const handleApplyTemplate = async (templateId: string) => {
    if (!business?.id || !firestore) {
      toast({ title: 'Template chosen', description: `${templateId} template selected.` });
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
        description: `Your default invoice layout is now set to ${templateId}.`,
      });
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
      name: 'Acme Global Corporation / 山田商事 株式会社',
      email: 'billing@acmeglobal.com',
    },
    items: [
      { productId: 'p1', name: 'Software Architecture & Development', price: 150000, quantity: 1, total: 150000 },
      { productId: 'p2', name: 'Enterprise Cloud Deployment & Monitoring', price: 75000, quantity: 1, total: 75000 },
      { productId: 'p3', name: 'Dedicated Technical Support & Maintenance', price: 35000, quantity: 1, total: 35000 },
    ],
    subtotal: 260000,
    tax: 19500,
    discount: 0,
    total: 279500,
    status: 'unpaid',
    paymentMethod: 'Invoice',
  }), [business?.id]);

  return (
    <div className="flex-1 w-full bg-background text-foreground min-h-screen flex flex-col p-4 sm:p-6 md:p-8">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Invoice Templates</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              22 Professional Layouts
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Choose print, PDF, and online invoice formats designed for professional business accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold border-border">
            <Link href="/getting-started">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Getting Started
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/invoices/new">
              Create Invoice <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Container mirroring Zoho Templates Window */}
      <div className="mt-4 sm:mt-6 flex-1 rounded-2xl border border-border bg-card text-card-foreground shadow-sm flex flex-col lg:flex-row overflow-hidden min-h-0 lg:min-h-[760px]">
        {/* Left Sidebar: Document Types matching screenshot */}
        <div className="w-full lg:w-64 bg-muted/30 border-b lg:border-b-0 lg:border-r border-border p-3 sm:p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="px-1.5 lg:px-3 py-1 lg:py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Document Types
            </div>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
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
                      setSelectedDocType(item.id as DocType);
                      setActiveCategory('all');
                    }}
                    className={cn(
                      'shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap',
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{item.label}</span>
                    </div>
                    {item.count && (
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-mono', isSelected ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground bg-muted')}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1.5 text-foreground">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Automatic Branding</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every invoice template adapts your company logo, bank details, and currency symbol automatically when printed or downloaded as a PDF.
            </p>
          </div>
        </div>

        {/* Right Gallery: Category Tabs & Template Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          {/* Header Bar: Category Tabs matching Zoho Screenshots */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border bg-card/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {selectedDocType === 'invoices' ? 'Choose a Template' : `${selectedDocType.replace('-', ' ').toUpperCase()} TEMPLATES`}
                </h2>
                <div className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-0.5 rounded-md border border-border">
                  Active: <span className="text-primary font-bold capitalize">{activeTemplate}</span>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-56">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs for Invoices matching screenshot exactly */}
            {selectedDocType === 'invoices' && (
              <div className="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4 border-b border-border text-xs overflow-x-auto pb-px scrollbar-none">
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
                          ? 'text-primary font-bold border-b-2 border-primary'
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

          {/* Template Grid Canvas */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-muted/10 space-y-6 sm:space-y-8">
            {/* Render grouped sections when "All (22)" is selected */}
            {groupedSections ? (
              groupedSections.map((section) => (
                <div key={section.id} className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                      {section.label} ({section.items.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {section.items.map((tmpl) => (
                      <TemplateCardItem
                        key={tmpl.id}
                        tmpl={tmpl}
                        isActive={activeTemplate === tmpl.id}
                        isSaving={isSaving}
                        businessName={business?.name || 'Zeneva Retail Ltd'}
                        currencySymbol={currencySymbol || '₦'}
                        onPreview={() => setPreviewTemplate(tmpl.id)}
                        onApply={() => handleApplyTemplate(tmpl.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-black tracking-wider uppercase text-muted-foreground">
                    {activeCategory === 'all' ? 'TEMPLATES' : activeCategory.toUpperCase()} ({templatesToDisplay.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {templatesToDisplay.map((tmpl) => (
                    <TemplateCardItem
                      key={tmpl.id}
                      tmpl={tmpl}
                      isActive={activeTemplate === tmpl.id}
                      isSaving={isSaving}
                      businessName={business?.name || 'Zeneva Retail Ltd'}
                      currencySymbol={currencySymbol || '₦'}
                      onPreview={() => setPreviewTemplate(tmpl.id)}
                      onApply={() => handleApplyTemplate(tmpl.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {templatesToDisplay.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No templates found matching your filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Full Invoice Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-zinc-100 text-zinc-900 border-zinc-300">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between z-10 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-zinc-900">
                  Previewing: <span className="text-primary capitalize">{previewTemplate}</span> Template
                </span>
                {previewTemplate === activeTemplate && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    Active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    handleApplyTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3.5 flex-1 sm:flex-initial"
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

            <div className="p-2 sm:p-6 md:p-10 flex justify-center overflow-x-auto">
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
    </div>
  );
}

// Individual Template Card Item Component
interface TemplateCardItemProps {
  tmpl: TemplateDefinition;
  isActive: boolean;
  isSaving: boolean;
  businessName: string;
  currencySymbol: string;
  onPreview: () => void;
  onApply: () => void;
}

function TemplateCardItem({
  tmpl,
  isActive,
  isSaving,
  businessName,
  currencySymbol,
  onPreview,
  onApply,
}: TemplateCardItemProps) {
  return (
    <div
      className={cn(
        'group bg-card text-card-foreground rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-lg',
        isActive
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/40'
      )}
    >
      {/* Visual Miniature Preview Container matching Zoho paper sheet */}
      <div
        className="relative bg-muted/40 p-4 border-b border-border aspect-[1/1.2] flex flex-col justify-between overflow-hidden cursor-pointer"
        onClick={onPreview}
      >
        <InvoiceMiniatureCard
          template={tmpl}
          businessName={businessName}
          currencySymbol={currencySymbol}
        />

        {/* Hover Overlay with Preview Button */}
        <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col justify-between flex-1 bg-card">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-foreground truncate" title={tmpl.name}>
              {tmpl.name}
            </h3>
            {tmpl.badge && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20"
              >
                {tmpl.badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
            {tmpl.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
          <Button
            onClick={onApply}
            disabled={isSaving}
            variant={isActive ? 'default' : 'outline'}
            className={cn(
              'flex-1 text-xs font-bold h-8',
              isActive
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                : 'border-border text-foreground hover:bg-muted'
            )}
          >
            {isActive ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 stroke-[3]" /> Active Template
              </span>
            ) : (
              'Use This Template'
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onPreview}
            title="Preview full layout"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
