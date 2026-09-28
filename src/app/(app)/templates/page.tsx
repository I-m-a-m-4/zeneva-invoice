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
  Printer,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Receipt } from '@/types';
import { INVOICE_TEMPLATES, type TemplateDefinition } from '@/components/invoices/template-picker-modal';

export default function TemplatesPage() {
  const { business, mutateBusiness, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocType, setSelectedDocType] = React.useState<'invoices' | 'quotes' | 'credit-notes' | 'receipts' | 'statements'>('invoices');
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const activeTemplate = (business?.settings as any)?.invoiceTemplate || 'standard';

  const filteredTemplates = React.useMemo(() => {
    if (activeCategory === 'all') return INVOICE_TEMPLATES;
    return INVOICE_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

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
      name: 'Acme Global Corporation / 山田 太郎',
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
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs">
              Zoho Compatible Layouts
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Choose print, PDF, and online invoice formats designed for professional business accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold border-border">
            <Link href="/getting-started">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-600 dark:text-purple-400" />
              Getting Started
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white">
            <Link href="/invoices/new">
              Create Invoice <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Container mirroring Zoho Templates Window */}
      <div className="mt-6 flex-1 rounded-2xl border border-border bg-card text-card-foreground shadow-sm flex flex-col lg:flex-row overflow-hidden min-h-[720px]">
        {/* Left Sidebar: Document Types */}
        <div className="w-full lg:w-64 bg-muted/30 border-b lg:border-b-0 lg:border-r border-border p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Document Types
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
                  onClick={() => setSelectedDocType(item.id as any)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left',
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground')} />
                    <span>{item.label}</span>
                  </div>
                  {item.count && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-mono', isSelected ? 'bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 font-bold' : 'text-muted-foreground bg-muted')}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5 text-purple-950 dark:text-purple-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Automatic Branding</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every invoice template adapts your company logo, bank details, and currency symbol automatically when printed or downloaded as a PDF.
            </p>
          </div>
        </div>

        {/* Right Gallery: Category Tabs & Template Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Header Bar: Category Tabs */}
          <div className="px-6 pt-5 pb-3 border-b border-border bg-card/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Choose a Template</h2>
              <div className="text-xs text-muted-foreground font-mono">
                Currently Active: <span className="text-purple-600 dark:text-purple-400 font-bold capitalize">{activeTemplate}</span>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-6 mt-4 border-b border-border text-xs overflow-x-auto pb-px">
              {[
                { id: 'all', label: 'All (22)' },
                { id: 'standard', label: 'Standard (7)' },
                { id: 'spreadsheet', label: 'Spreadsheet (4)' },
                { id: 'premium', label: 'Premium (3)' },
                { id: 'universal', label: 'Universal (4)' },
                { id: 'retail', label: 'Retail (4)' },
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
          </div>

          {/* Template Grid Canvas */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10 space-y-6">
            <div className="text-xs font-black tracking-wider uppercase text-muted-foreground">
              {activeCategory === 'all' ? 'STANDARD' : `${activeCategory.toUpperCase()}`}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((tmpl) => {
                const isActive = activeTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className={cn(
                      'group bg-card text-card-foreground rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-lg',
                      isActive
                        ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    {/* Visual Miniature Preview Container */}
                    <div
                      className="relative bg-muted/40 p-4 border-b border-border aspect-[1/1.2] flex flex-col justify-between overflow-hidden cursor-pointer"
                      onClick={() => setPreviewTemplate(tmpl.id)}
                    >
                      {/* Standard Layout Miniature */}
                      {tmpl.id === 'standard' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-200 p-3 text-[7px] flex flex-col justify-between">
                          <div className="flex justify-between items-start border-b border-zinc-200 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-4 w-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[7px]">Z</div>
                              <div>
                                <div className="font-bold text-zinc-800">Your Business</div>
                                <div className="text-[6px] text-zinc-400">123 Market St</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-zinc-900 text-[8px]">INVOICE</div>
                              <div className="text-zinc-500 text-[6px]">#INV-000045</div>
                            </div>
                          </div>
                          <div className="my-1.5 bg-zinc-50 p-1 rounded border border-zinc-100">
                            <div className="text-[6px] text-zinc-400 font-bold uppercase">Bill To</div>
                            <div className="font-semibold text-zinc-800">Acme Global Corp</div>
                          </div>
                          <div className="border border-zinc-200 my-1 overflow-hidden rounded">
                            <div className="bg-[#1f2937] text-white flex justify-between px-1.5 py-0.5 font-bold text-[6px]">
                              <span>Item & Description</span>
                              <span>Amount</span>
                            </div>
                            <div className="divide-y divide-zinc-100 bg-white">
                              <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
                                <span>Software Development</span>
                                <span className="font-mono">$1,500.00</span>
                              </div>
                              <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
                                <span>Cloud Architecture</span>
                                <span className="font-mono">$750.00</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-0.5 text-right font-mono text-[6px] pt-1">
                            <div className="text-zinc-500">Sub Total: $2,250.00</div>
                            <div className="bg-zinc-100 px-1.5 py-0.5 rounded font-black text-zinc-900 text-[7px] inline-block border border-zinc-200">
                              Balance Due: $2,250.00
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Standard - Japanese Style Miniature (With Seal Boxes) */}
                      {tmpl.id === 'standard-japanese' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-black text-[8px] tracking-wider text-zinc-900">御 請 求 書</div>
                              <div className="text-zinc-500">No. INV-000045</div>
                              <div className="text-zinc-400 text-[5px]">登録番号: T1234567890123</div>
                            </div>
                            {/* 3 Hanko Seal Boxes */}
                            <div className="border border-zinc-600 divide-x divide-zinc-600 flex text-center text-[5px] w-20 bg-white">
                              <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">承認</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                              <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">審査</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                              <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">作成</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                            </div>
                          </div>
                          <div className="border-b border-zinc-800 pb-1 mt-1 flex justify-between">
                            <span className="font-bold text-zinc-900">得意先 御中</span>
                            <span className="text-zinc-500">Zeneva Business</span>
                          </div>
                          <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between font-bold my-1">
                            <span>ご請求金額 (税込)</span>
                            <span>¥279,500</span>
                          </div>
                          <div className="border border-zinc-400 divide-y divide-zinc-300">
                            <div className="bg-zinc-800 text-white flex justify-between px-1 py-0.5 font-bold">
                              <span>品名・項目</span>
                              <span>金額</span>
                            </div>
                            <div className="flex justify-between px-1 py-0.5 text-zinc-700">
                              <span>システム開発業務</span>
                              <span>¥260,000</span>
                            </div>
                          </div>
                          <div className="text-right text-zinc-500 text-[5px] pt-1">
                            消費税 (10%対象): ¥19,500
                          </div>
                        </div>
                      )}

                      {/* Standard - Japanese Style (Without Seal Boxes) */}
                      {tmpl.id === 'standard-japanese-no-seal' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between">
                          <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-1">
                            <div>
                              <div className="font-black text-[8px] tracking-wider text-zinc-900">御 請 求 書</div>
                              <div className="text-zinc-500">INV-000045</div>
                            </div>
                            <div className="text-right text-[5px] text-zinc-500">
                              <div className="font-bold text-zinc-800">Zeneva Business</div>
                              <div>発行日: 2026/09/28</div>
                            </div>
                          </div>
                          <div className="my-1">
                            <span className="font-bold text-zinc-900 border-b border-zinc-400 pb-0.5">株式会社 テスト 御中</span>
                          </div>
                          <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between font-bold">
                            <span>ご請求金額 (税込)</span>
                            <span className="font-mono">¥279,500</span>
                          </div>
                          <div className="border border-zinc-400 divide-y divide-zinc-300 my-1">
                            <div className="bg-zinc-800 text-white flex justify-between px-1 py-0.5 font-bold">
                              <span>品名</span>
                              <span>金額</span>
                            </div>
                            <div className="flex justify-between px-1 py-0.5 text-zinc-700">
                              <span>コンサルティング業務</span>
                              <span>¥260,000</span>
                            </div>
                          </div>
                          <div className="text-[5px] text-zinc-400">振込先: ○○銀行 ○○支店</div>
                        </div>
                      )}

                      {/* Spreadsheet Miniature */}
                      {tmpl.id === 'spreadsheet' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border-2 border-zinc-800 p-2 text-[6px] flex flex-col justify-between">
                          <div className="border border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800 p-1">
                            <div className="font-bold">ZENEVA LEDGER</div>
                            <div className="text-right font-mono">#INV-000045</div>
                          </div>
                          <div className="border border-zinc-800 my-1">
                            <div className="grid grid-cols-3 divide-x divide-zinc-700 bg-zinc-800 text-white font-bold p-0.5">
                              <div>ITEM</div>
                              <div>QTY</div>
                              <div className="text-right">AMT</div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5">
                              <div>Engineering</div>
                              <div>1</div>
                              <div className="text-right">$1,500</div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5 bg-zinc-50">
                              <div>DevOps SLA</div>
                              <div>1</div>
                              <div className="text-right">$750</div>
                            </div>
                          </div>
                          <div className="border border-zinc-800 bg-zinc-900 text-white flex justify-between p-1 font-bold">
                            <span>TOTAL BALANCE</span>
                            <span>$2,250.00</span>
                          </div>
                        </div>
                      )}

                      {/* Premium Miniature */}
                      {tmpl.id === 'continental' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-200 overflow-hidden flex flex-col justify-between text-[6px]">
                          <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-2 flex justify-between items-start">
                            <div>
                              <div className="font-black text-[7px]">ZENEVA CORP</div>
                              <div className="text-purple-200 text-[5px]">Executive Edition</div>
                            </div>
                            <div className="text-right font-bold">INVOICE</div>
                          </div>
                          <div className="p-2 space-y-1">
                            <div className="bg-zinc-50 p-1 rounded border border-zinc-200 flex justify-between">
                              <span>Client: Acme Corp</span>
                              <span className="text-purple-700 font-bold">Net 15</span>
                            </div>
                            <div className="border-b border-zinc-200 pb-1 flex justify-between">
                              <span>Software Engineering</span>
                              <span className="font-bold">$2,250.00</span>
                            </div>
                          </div>
                          <div className="p-1.5 bg-purple-50 text-purple-900 flex justify-between font-bold border-t border-purple-200">
                            <span>TOTAL AMOUNT:</span>
                            <span>$2,250.00</span>
                          </div>
                        </div>
                      )}

                      {/* Universal Miniature */}
                      {tmpl.id === 'universal' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-200 p-3 text-[6px] flex flex-col justify-between">
                          <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
                            <span className="font-bold text-zinc-900 text-[7px]">Zeneva</span>
                            <span className="text-purple-600 font-mono">#000045</span>
                          </div>
                          <div className="my-1 text-zinc-600">
                            <div>Acme Global Corp</div>
                            <div className="text-zinc-400">Due in 15 days</div>
                          </div>
                          <div className="border-t border-b border-zinc-100 py-1 flex justify-between">
                            <span>Platform Engineering</span>
                            <span className="font-mono">$2,250.00</span>
                          </div>
                          <div className="flex justify-between font-bold text-zinc-900 pt-1">
                            <span>Total Due</span>
                            <span className="text-purple-600 font-mono">$2,250.00</span>
                          </div>
                        </div>
                      )}

                      {/* Retail Miniature */}
                      {tmpl.id === 'retail' && (
                        <div className="h-full w-full bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-300 p-2 font-mono text-[5px] flex flex-col justify-between">
                          <div className="text-center border-b border-dashed border-zinc-300 pb-1">
                            <div className="font-bold text-[6px]">STORE RECEIPT</div>
                            <div className="text-zinc-400">#INV-000045</div>
                          </div>
                          <div className="my-1 space-y-0.5">
                            <div className="flex justify-between"><span>ITEM 1</span><span>$150.00</span></div>
                            <div className="flex justify-between"><span>ITEM 2</span><span>$75.00</span></div>
                          </div>
                          <div className="border-t border-dashed border-zinc-300 pt-1 text-right font-bold text-[6px]">
                            TOTAL: $225.00
                          </div>
                          <div className="text-center text-[4px] tracking-widest text-zinc-400 mt-1">
                            |||| |||| ||||
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay with Preview Button */}
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

                    {/* Card Body */}
                    <div className="p-4 flex flex-col justify-between flex-1 bg-card">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-foreground truncate" title={tmpl.name}>
                            {tmpl.name}
                          </h3>
                          {tmpl.badge && (
                            <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
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
                          onClick={() => handleApplyTemplate(tmpl.id)}
                          disabled={isSaving}
                          variant={isActive ? 'default' : 'outline'}
                          className={cn(
                            'flex-1 text-xs font-bold h-8',
                            isActive
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
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
                          onClick={() => setPreviewTemplate(tmpl.id)}
                          title="Preview full layout"
                        >
                          <Eye className="h-4 w-4" />
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

      {/* Live Full Invoice Preview Dialog */}
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
                    handleApplyTemplate(previewTemplate);
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
    </div>
  );
}
